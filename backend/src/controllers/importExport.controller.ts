import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError';
import { ok } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import {
  buildExpenseImportTemplate,
  IMPORT_TEMPLATE_COLUMNS,
  parseExpenseImportExcel,
} from '../services/importExport.service';
import { Prisma } from '@prisma/client';

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === 'number' ? d : Number(d);
}

export const downloadImportTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const buffer = await buildExpenseImportTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="expense-import-template.xlsx"');
  res.send(Buffer.from(buffer));
});

export const importExpenses = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { budgetCategories: true, workPackages: true } });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');

  if (!req.file) throw ApiError.validation('ไม่พบไฟล์ที่อัปโหลด');
  const rows = await parseExpenseImportExcel(req.file.buffer);

  const categoryByName = new Map(project.budgetCategories.map((c) => [c.name, c]));
  const workPackageByName = new Map(project.workPackages.map((w) => [w.name, w]));
  const VALID_PAYMENT_METHODS = new Set(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'OTHER']);

  const errors: { row: number; message: string }[] = [];
  const toCreate: Prisma.ExpenseCreateManyInput[] = [];

  rows.forEach((r) => {
    const category = categoryByName.get(r.category);
    if (!category) {
      errors.push({ row: r.rowNumber, message: `ไม่พบหมวดงบประมาณ "${r.category}" ในโครงการนี้` });
      return;
    }
    if (!r.date) {
      errors.push({ row: r.rowNumber, message: 'วันที่ไม่ถูกต้อง' });
      return;
    }
    if (!r.amount || r.amount <= 0) {
      errors.push({ row: r.rowNumber, message: 'จำนวนเงินไม่ถูกต้อง' });
      return;
    }
    if (!r.description) {
      errors.push({ row: r.rowNumber, message: 'ไม่พบคำอธิบายรายการ' });
      return;
    }
    const paymentMethod = VALID_PAYMENT_METHODS.has(r.paymentMethod) ? r.paymentMethod : 'BANK_TRANSFER';
    const workPackage = r.workPackage ? workPackageByName.get(r.workPackage) : undefined;

    toCreate.push({
      projectId,
      categoryId: category.id,
      workPackageId: workPackage?.id,
      date: new Date(r.date),
      documentNo: r.documentNo || undefined,
      description: r.description,
      amount: r.amount,
      payee: r.payee || '-',
      paymentMethod: paymentMethod as never,
      status: 'DRAFT',
      submittedById: req.user!.id,
    });
  });

  let createdCount = 0;
  if (toCreate.length > 0) {
    const result = await prisma.expense.createMany({ data: toCreate });
    createdCount = result.count;
  }

  req.auditContext = {
    entityType: 'expenses',
    action: 'CREATE',
    entityId: projectId,
    newValue: { importedCount: createdCount, errorCount: errors.length },
  };

  return ok(res, { importedCount: createdCount, errorCount: errors.length, errors, totalRows: rows.length });
});

export const exportProjectExcel = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      budgetCategories: true,
      workPackages: true,
      expenses: { include: { category: true, workPackage: true } },
      incomes: { include: { fundingSource: true } },
    },
  });
  if (!project) throw ApiError.notFound('ไม่พบโครงการ');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RPFMS';

  const infoSheet = workbook.addWorksheet('project');
  infoSheet.addRows([
    ['รหัสโครงการ', project.code],
    ['ชื่อโครงการ', project.nameTh],
    ['หัวหน้าโครงการ', project.principalInvestigator],
    ['ปีงบประมาณ', project.fiscalYear],
    ['งบประมาณรวม', toNum(project.totalBudget)],
    ['วันที่เริ่ม', project.startDate.toISOString().slice(0, 10)],
    ['วันที่สิ้นสุด', project.endDate.toISOString().slice(0, 10)],
  ]);

  const categorySheet = workbook.addWorksheet('budget_categories');
  categorySheet.columns = [
    { header: 'ชื่อหมวด', key: 'name', width: 30 },
    { header: 'รหัส', key: 'code', width: 15 },
    { header: 'งบจัดสรร', key: 'allocatedAmount', width: 15 },
  ];
  project.budgetCategories.forEach((c) => categorySheet.addRow({ name: c.name, code: c.code, allocatedAmount: toNum(c.allocatedAmount) }));

  const expenseSheet = workbook.addWorksheet('expenses');
  expenseSheet.columns = IMPORT_TEMPLATE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  project.expenses.forEach((e) =>
    expenseSheet.addRow({
      date: e.date.toISOString().slice(0, 10),
      documentNo: e.documentNo,
      description: e.description,
      amount: toNum(e.amount),
      payee: e.payee,
      paymentMethod: e.paymentMethod,
      category: e.category.name,
      workPackage: e.workPackage?.name ?? '',
    })
  );

  const incomeSheet = workbook.addWorksheet('incomes');
  incomeSheet.columns = [
    { header: 'งวดเงิน', key: 'installment', width: 20 },
    { header: 'วันที่รับ', key: 'receivedDate', width: 15 },
    { header: 'จำนวนเงิน', key: 'amount', width: 15 },
    { header: 'แหล่งทุน', key: 'fundingSource', width: 25 },
    { header: 'เลขที่เอกสาร', key: 'documentNo', width: 20 },
  ];
  project.incomes.forEach((i) =>
    incomeSheet.addRow({
      installment: i.installment,
      receivedDate: i.receivedDate.toISOString().slice(0, 10),
      amount: toNum(i.amount),
      fundingSource: i.fundingSource?.name ?? '',
      documentNo: i.documentNo,
    })
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${project.code}-export.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});
