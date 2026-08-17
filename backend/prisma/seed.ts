/**
 * RPFMS seed script
 * ------------------
 * Loads /home/claude/rpfms/scripts/seed-data.json (real data extracted from 4 funded
 * research proposals: MASLD, HCC surveillance, viral hepatitis, dMDT) and populates the
 * database end to end: admin user, project-lead + finance-staff users, 4 projects with
 * their budget categories/work packages/expenses/incomes, and a small approval history
 * for non-DRAFT expenses so the approval workflow has something to look at out of the box.
 *
 * Passwords:
 *  - The SUPER_ADMIN account uses the password given in seed-data.json ("admin.password").
 *  - EVERY OTHER seeded user gets the password: Welcome@2569
 *    (documented here and in backend/README.md - users should change it after first login).
 *
 * Run with: npm run seed  (wraps `tsx prisma/seed.ts`)
 * Safe to re-run: each project is deleted (cascades to its categories/work packages/
 * expenses/approvals/incomes) and recreated from the JSON on every run.
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient, PaymentMethod, ExpenseStatus } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_DATA_PATH = path.resolve(__dirname, '../../scripts/seed-data.json');
const DEFAULT_PASSWORD = 'Welcome@2569';

interface SeedCategory {
  name: string;
  allocatedAmount: number;
}
interface SeedWorkPackage {
  name: string;
  budgetAllocated: number;
}
interface SeedExpense {
  category: string;
  date: string;
  documentNo: string;
  description: string;
  amount: number;
  payee: string;
  paymentMethod: string;
  status: string;
}
interface SeedIncome {
  installment: string;
  receivedDate: string;
  amount: number;
  documentNo: string;
  notes?: string;
}
interface SeedProject {
  code: string;
  nameTh: string;
  nameEn?: string;
  principalInvestigator: string;
  department?: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  totalBudget: number;
  fundingAmount: number;
  categories: SeedCategory[];
  workPackages: SeedWorkPackage[];
  expenses: SeedExpense[];
  incomes: SeedIncome[];
}
interface SeedUser {
  name: string;
  email: string;
  role: string;
  projectRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  onProject: string; // project code, or "ALL"
}
interface SeedData {
  note: string;
  admin: { name: string; email: string; password: string; role: string };
  fundingSources: { code: string; name: string }[];
  users: SeedUser[];
  projects: SeedProject[];
}

async function main() {
  const raw = fs.readFileSync(SEED_DATA_PATH, 'utf-8');
  const data: SeedData = JSON.parse(raw);

  console.log(`[seed] ${data.note}`);

  // --- Admin --------------------------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash(data.admin.password, 10);
  const admin = await prisma.user.upsert({
    where: { email: data.admin.email },
    update: { name: data.admin.name, role: 'SUPER_ADMIN', passwordHash: adminPasswordHash, isActive: true },
    create: { name: data.admin.name, email: data.admin.email, role: 'SUPER_ADMIN', passwordHash: adminPasswordHash },
  });
  console.log(`[seed] admin user ready: ${admin.email}`);

  // --- Funding sources ------------------------------------------------------------------
  const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const fundingSourcesByCode = new Map<string, string>(); // code -> id
  for (const fs_ of data.fundingSources) {
    const source = await prisma.fundingSource.upsert({
      where: { code: fs_.code },
      update: { name: fs_.name },
      create: { code: fs_.code, name: fs_.name },
    });
    fundingSourcesByCode.set(fs_.code, source.id);
  }

  // --- Users ------------------------------------------------------------------------------
  const usersByEmail = new Map<string, { id: string; projectRole: string; onProject: string }>();
  for (const u of data.users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role as never, isActive: true },
      create: { name: u.name, email: u.email, role: u.role as never, passwordHash: defaultPasswordHash },
    });
    usersByEmail.set(u.email, { id: user.id, projectRole: u.projectRole, onProject: u.onProject });
  }
  console.log(`[seed] ${data.users.length} project users ready (password: ${DEFAULT_PASSWORD})`);

  const financeStaffEntry = [...usersByEmail.entries()].find(([, v]) => v.onProject === 'ALL');
  const financeStaffId = financeStaffEntry?.[1].id;

  // --- Projects -----------------------------------------------------------------------
  for (const p of data.projects) {
    // Idempotent re-seed: cascade-delete any existing project with the same code first.
    await prisma.project.deleteMany({ where: { code: p.code } });

    const project = await prisma.project.create({
      data: {
        code: p.code,
        nameTh: p.nameTh,
        nameEn: p.nameEn,
        principalInvestigator: p.principalInvestigator,
        department: p.department,
        fiscalYear: p.fiscalYear,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        totalBudget: p.totalBudget,
        status: 'ACTIVE',
        createdById: admin.id,
      },
    });

    // Members: project-lead (OWNER) + finance staff (EDITOR on every project)
    const leadEntry = [...usersByEmail.entries()].find(([, v]) => v.onProject === p.code);
    if (leadEntry) {
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: leadEntry[1].id, role: leadEntry[1].projectRole as never },
      });
    }
    if (financeStaffId) {
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: financeStaffId, role: 'EDITOR' },
      });
    }

    // Funding
    const hsriId = fundingSourcesByCode.get('HSRI');
    if (hsriId) {
      await prisma.projectFunding.create({
        data: { projectId: project.id, fundingSourceId: hsriId, amount: p.fundingAmount, notes: 'ทุนหลักจาก สวรส.' },
      });
    }

    // Budget categories
    const categoryByName = new Map<string, string>(); // name -> id
    for (const [idx, cat] of p.categories.entries()) {
      const category = await prisma.budgetCategory.create({
        data: { projectId: project.id, name: cat.name, allocatedAmount: cat.allocatedAmount, sortOrder: idx },
      });
      categoryByName.set(cat.name, category.id);
    }

    // Work packages
    for (const wp of p.workPackages) {
      await prisma.workPackage.create({
        data: { projectId: project.id, name: wp.name, budgetAllocated: wp.budgetAllocated },
      });
    }

    // Expenses (+ synthesized approval history matching each expense's seeded status)
    for (const exp of p.expenses) {
      const categoryId = categoryByName.get(exp.category);
      if (!categoryId) {
        console.warn(`[seed] WARNING: category "${exp.category}" not found for project ${p.code}, skipping expense ${exp.documentNo}`);
        continue;
      }
      const submitterId = financeStaffId ?? admin.id;
      const expenseDate = new Date(exp.date);

      const expense = await prisma.expense.create({
        data: {
          projectId: project.id,
          categoryId,
          date: expenseDate,
          documentNo: exp.documentNo,
          description: exp.description,
          amount: exp.amount,
          payee: exp.payee,
          paymentMethod: exp.paymentMethod as PaymentMethod,
          status: exp.status as ExpenseStatus,
          submittedById: submitterId,
        },
      });

      const leadId = leadEntry?.[1].id ?? admin.id;
      const approvalHistory = buildApprovalHistory(exp.status as ExpenseStatus, expenseDate, submitterId, leadId);
      for (const step of approvalHistory) {
        await prisma.approval.create({
          data: {
            expenseId: expense.id,
            approverId: step.approverId,
            step: step.step,
            status: step.status,
            comment: step.comment,
            actedAt: step.actedAt,
          },
        });
      }
    }

    // Incomes
    const hsriIdForIncome = fundingSourcesByCode.get('HSRI');
    for (const inc of p.incomes) {
      await prisma.income.create({
        data: {
          projectId: project.id,
          fundingSourceId: hsriIdForIncome,
          installment: inc.installment,
          receivedDate: new Date(inc.receivedDate),
          amount: inc.amount,
          documentNo: inc.documentNo,
          notes: inc.notes,
        },
      });
    }

    console.log(
      `[seed] project ${p.code}: ${p.categories.length} categories, ${p.workPackages.length} work packages, ${p.expenses.length} expenses, ${p.incomes.length} incomes`
    );
  }

  console.log('[seed] done.');
}

interface ApprovalStep {
  step: 'STAFF_REVIEW' | 'PROJECT_LEAD_APPROVAL' | 'CLOSED';
  status: 'APPROVED' | 'REJECTED';
  approverId: string;
  actedAt: Date;
  comment?: string;
}

/** Synthesizes a plausible approval trail for a seeded expense based on its final status. */
function buildApprovalHistory(status: ExpenseStatus, expenseDate: Date, staffId: string, leadId: string): ApprovalStep[] {
  const day = (offset: number) => new Date(expenseDate.getTime() + offset * 24 * 60 * 60 * 1000);
  switch (status) {
    case 'PENDING_LEAD':
      return [{ step: 'STAFF_REVIEW', status: 'APPROVED', approverId: staffId, actedAt: day(1) }];
    case 'APPROVED':
      return [
        { step: 'STAFF_REVIEW', status: 'APPROVED', approverId: staffId, actedAt: day(1) },
        { step: 'PROJECT_LEAD_APPROVAL', status: 'APPROVED', approverId: leadId, actedAt: day(3) },
      ];
    case 'PAID':
      return [
        { step: 'STAFF_REVIEW', status: 'APPROVED', approverId: staffId, actedAt: day(1) },
        { step: 'PROJECT_LEAD_APPROVAL', status: 'APPROVED', approverId: leadId, actedAt: day(3) },
        { step: 'CLOSED', status: 'APPROVED', approverId: staffId, actedAt: day(7) },
      ];
    case 'REJECTED':
      return [
        {
          step: 'STAFF_REVIEW',
          status: 'REJECTED',
          approverId: staffId,
          actedAt: day(1),
          comment: 'เอกสารประกอบไม่ครบถ้วน กรุณาแนบใบเสร็จ/ใบกำกับภาษีเพิ่มเติม (ตัวอย่างข้อมูล seed)',
        },
      ];
    case 'DRAFT':
    case 'PENDING_STAFF':
    default:
      return [];
  }
}

main()
  .catch((err) => {
    console.error('[seed] FAILED', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
