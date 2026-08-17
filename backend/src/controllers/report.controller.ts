import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { streamCsv } from '../services/report/csv.service';
import { streamExcel } from '../services/report/excel.service';
import { streamPdfTable } from '../services/report/pdf.service';
import { SPENT_STATUSES } from '../services/budget.service';

type Format = 'pdf' | 'excel' | 'csv';

interface Column {
  header: string;
  key: string;
  width: number;
}

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === 'number' ? d : Number(d);
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

async function dispatchReport(
  req: Request,
  res: Response,
  opts: { baseName: string; title: string; columns: Column[]; rows: Record<string, unknown>[] }
) {
  const format = ((req.query.format as string) ?? 'excel').toLowerCase() as Format;
  const stamp = new Date().toISOString().slice(0, 10);
  const filenameBase = `${opts.baseName}-${stamp}`;

  if (format === 'csv') {
    const headers = opts.columns.map((c) => c.header);
    const rows = opts.rows.map((r) => opts.columns.map((c) => r[c.key]));
    return streamCsv(res, `${filenameBase}.csv`, headers, rows);
  }
  if (format === 'pdf') {
    const pdfColumns = opts.columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    const rows = opts.rows.map((r) => opts.columns.map((c) => r[c.key]));
    return streamPdfTable(res, `${filenameBase}.pdf`, opts.title, pdfColumns, rows);
  }
  // default: excel
  return streamExcel(res, `${filenameBase}.xlsx`, opts.title.slice(0, 30), opts.columns, opts.rows);
}

async function resolveProjectScope(req: Request): Promise<string[] | undefined> {
  const projectId = req.query.projectId as string | undefined;
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('ไม่พบโครงการ');
    return [projectId];
  }
  if (req.user!.role === 'USER') {
    const memberships = await prisma.projectMember.findMany({ where: { userId: req.user!.id }, select: { projectId: true } });
    return memberships.map((m) => m.projectId);
  }
  return undefined;
}

export const incomeReport = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await resolveProjectScope(req);
  const where: Prisma.IncomeWhereInput = projectIds ? { projectId: { in: projectIds } } : {};
  const incomes = await prisma.income.findMany({
    where,
    include: { project: { select: { code: true, nameTh: true } }, fundingSource: true },
    orderBy: { receivedDate: 'asc' },
  });

  const columns: Column[] = [
    { header: 'รหัสโครงการ', key: 'projectCode', width: 90 },
    { header: 'งวดเงิน', key: 'installment', width: 80 },
    { header: 'วันที่รับ', key: 'receivedDate', width: 70 },
    { header: 'จำนวนเงิน', key: 'amount', width: 90 },
    { header: 'แหล่งทุน', key: 'fundingSource', width: 120 },
    { header: 'เลขที่เอกสาร', key: 'documentNo', width: 90 },
    { header: 'หมายเหตุ', key: 'notes', width: 150 },
  ];
  const rows = incomes.map((i) => ({
    projectCode: i.project.code,
    installment: i.installment,
    receivedDate: fmtDate(i.receivedDate),
    amount: toNum(i.amount),
    fundingSource: i.fundingSource?.name ?? '',
    documentNo: i.documentNo ?? '',
    notes: i.notes ?? '',
  }));

  return dispatchReport(req, res, { baseName: 'income-report', title: 'รายงานรายรับ', columns, rows });
});

export const expenseReport = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await resolveProjectScope(req);
  const { status, dateFrom, dateTo } = req.query as Record<string, string | undefined>;
  const where: Prisma.ExpenseWhereInput = projectIds ? { projectId: { in: projectIds } } : {};
  if (status) where.status = status as never;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { project: { select: { code: true } }, category: true },
    orderBy: { date: 'asc' },
  });

  const columns: Column[] = [
    { header: 'รหัสโครงการ', key: 'projectCode', width: 90 },
    { header: 'วันที่', key: 'date', width: 70 },
    { header: 'เลขที่เอกสาร', key: 'documentNo', width: 90 },
    { header: 'รายการ', key: 'description', width: 220 },
    { header: 'หมวด', key: 'category', width: 120 },
    { header: 'ผู้รับเงิน', key: 'payee', width: 120 },
    { header: 'จำนวนเงิน', key: 'amount', width: 90 },
    { header: 'สถานะ', key: 'status', width: 90 },
  ];
  const rows = expenses.map((e) => ({
    projectCode: e.project.code,
    date: fmtDate(e.date),
    documentNo: e.documentNo ?? '',
    description: e.description,
    category: e.category.name,
    payee: e.payee,
    amount: toNum(e.amount),
    status: e.status,
  }));

  return dispatchReport(req, res, { baseName: 'expense-report', title: 'รายงานรายจ่าย', columns, rows });
});

export const remainingBudgetReport = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await resolveProjectScope(req);
  const where: Prisma.ProjectWhereInput = projectIds ? { id: { in: projectIds } } : {};
  const projects = await prisma.project.findMany({ where, include: { budgetCategories: true } });

  const columns: Column[] = [
    { header: 'รหัสโครงการ', key: 'projectCode', width: 90 },
    { header: 'หมวดงบประมาณ', key: 'category', width: 150 },
    { header: 'งบจัดสรร', key: 'allocated', width: 90 },
    { header: 'ใช้ไปแล้ว', key: 'spent', width: 90 },
    { header: 'คงเหลือ', key: 'remaining', width: 90 },
  ];
  const rows: Record<string, unknown>[] = [];
  for (const p of projects) {
    for (const cat of p.budgetCategories) {
      const agg = await prisma.expense.aggregate({
        where: { categoryId: cat.id, status: { in: [...SPENT_STATUSES] } },
        _sum: { amount: true },
      });
      const spent = toNum(agg._sum.amount);
      const allocated = toNum(cat.allocatedAmount);
      rows.push({ projectCode: p.code, category: cat.name, allocated, spent, remaining: allocated - spent });
    }
  }

  return dispatchReport(req, res, { baseName: 'remaining-budget-report', title: 'รายงานงบคงเหลือ', columns, rows });
});

export const byProjectReport = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await resolveProjectScope(req);
  const where: Prisma.ProjectWhereInput = projectIds ? { id: { in: projectIds } } : {};
  const projects = await prisma.project.findMany({ where });

  const columns: Column[] = [
    { header: 'รหัสโครงการ', key: 'code', width: 90 },
    { header: 'ชื่อโครงการ', key: 'nameTh', width: 250 },
    { header: 'หัวหน้าโครงการ', key: 'pi', width: 150 },
    { header: 'งบประมาณรวม', key: 'totalBudget', width: 100 },
    { header: 'ใช้ไปแล้ว', key: 'spent', width: 100 },
    { header: 'คงเหลือ', key: 'remaining', width: 100 },
  ];
  const rows: Record<string, unknown>[] = [];
  for (const p of projects) {
    const agg = await prisma.expense.aggregate({
      where: { projectId: p.id, status: { in: [...SPENT_STATUSES] } },
      _sum: { amount: true },
    });
    const spent = toNum(agg._sum.amount);
    const totalBudget = toNum(p.totalBudget);
    rows.push({ code: p.code, nameTh: p.nameTh, pi: p.principalInvestigator, totalBudget, spent, remaining: totalBudget - spent });
  }

  return dispatchReport(req, res, { baseName: 'by-project-report', title: 'รายงานแยกตามโครงการ', columns, rows });
});

export const byCategoryReport = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await resolveProjectScope(req);
  const where: Prisma.ExpenseWhereInput = { status: { in: [...SPENT_STATUSES] } };
  if (projectIds) where.projectId = { in: projectIds };

  const expenses = await prisma.expense.findMany({ where, include: { category: true, project: { select: { code: true } } } });
  const buckets = new Map<string, { projectCode: string; category: string; total: number }>();
  for (const e of expenses) {
    const key = `${e.project.code}::${e.category.name}`;
    const existing = buckets.get(key);
    if (existing) existing.total += toNum(e.amount);
    else buckets.set(key, { projectCode: e.project.code, category: e.category.name, total: toNum(e.amount) });
  }

  const columns: Column[] = [
    { header: 'รหัสโครงการ', key: 'projectCode', width: 90 },
    { header: 'หมวดงบประมาณ', key: 'category', width: 150 },
    { header: 'ยอดใช้จ่ายรวม', key: 'total', width: 100 },
  ];
  const rows = [...buckets.values()].sort((a, b) => b.total - a.total);

  return dispatchReport(req, res, { baseName: 'by-category-report', title: 'รายงานแยกตามหมวดงบประมาณ', columns, rows });
});

export const monthlyReport = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await resolveProjectScope(req);
  const year = parseInt((req.query.year as string) ?? new Date().getFullYear().toString(), 10);

  const where: Prisma.ExpenseWhereInput = {
    status: { in: [...SPENT_STATUSES] },
    date: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
  };
  if (projectIds) where.projectId = { in: projectIds };

  const expenses = await prisma.expense.findMany({ where, select: { date: true, amount: true } });
  const buckets = new Map<number, number>();
  for (const e of expenses) {
    const m = e.date.getMonth() + 1;
    buckets.set(m, (buckets.get(m) ?? 0) + toNum(e.amount));
  }

  const columns: Column[] = [
    { header: 'เดือน', key: 'month', width: 60 },
    { header: 'ยอดใช้จ่าย', key: 'total', width: 100 },
  ];
  const rows = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: buckets.get(i + 1) ?? 0 }));

  return dispatchReport(req, res, { baseName: `monthly-report-${year}`, title: `รายงานรายเดือน ปี ${year}`, columns, rows });
});

export const annualReport = asyncHandler(async (req: Request, res: Response) => {
  const projectIds = await resolveProjectScope(req);
  const yearsParam = req.query.year as string | undefined;
  const currentYear = new Date().getFullYear();
  const years = yearsParam ? [parseInt(yearsParam, 10)] : [currentYear - 1, currentYear];

  const columns: Column[] = [
    { header: 'ปี', key: 'year', width: 60 },
    { header: 'รายรับรวม', key: 'income', width: 100 },
    { header: 'รายจ่ายรวม', key: 'expense', width: 100 },
  ];

  const rows: Record<string, unknown>[] = [];
  for (const year of years) {
    const dateWhere = { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) };
    const expenseWhere: Prisma.ExpenseWhereInput = { status: { in: [...SPENT_STATUSES] }, date: dateWhere };
    const incomeWhere: Prisma.IncomeWhereInput = { receivedDate: dateWhere };
    if (projectIds) {
      expenseWhere.projectId = { in: projectIds };
      incomeWhere.projectId = { in: projectIds };
    }
    const [expenseAgg, incomeAgg] = await Promise.all([
      prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      prisma.income.aggregate({ where: incomeWhere, _sum: { amount: true } }),
    ]);
    rows.push({ year, income: toNum(incomeAgg._sum.amount), expense: toNum(expenseAgg._sum.amount) });
  }

  return dispatchReport(req, res, { baseName: 'annual-report', title: 'รายงานรายปี', columns, rows });
});
