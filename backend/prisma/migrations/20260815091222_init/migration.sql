-- RPFMS initial schema migration
-- Hand-authored to exactly match prisma/schema.prisma (see note in backend/README.md
-- section 7: this sandbox could not reach binaries.prisma.sh to run `prisma migrate dev`
-- itself, so this migration was written by hand and applied directly via psql, then
-- validated against the seed data). Once `prisma migrate dev` can run in an environment
-- with normal internet access it will recognize/replay this same history.

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'OTHER');
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'PENDING_STAFF', 'PENDING_LEAD', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "ApprovalStep" AS ENUM ('STAFF_REVIEW', 'PROJECT_LEAD_APPROVAL', 'CLOSED');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "NotificationType" AS ENUM ('BUDGET_LOW', 'BUDGET_OVER', 'PENDING_APPROVAL', 'PROJECT_ENDING', 'EXPENSE_REJECTED', 'EXPENSE_PAID');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'EXPORT');

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable: refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateTable: funding_sources
CREATE TABLE "funding_sources" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "contactInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "funding_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "funding_sources_code_key" ON "funding_sources"("code");

-- CreateTable: projects
CREATE TABLE "projects" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "principalInvestigator" TEXT NOT NULL,
    "department" TEXT,
    "fiscalYear" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalBudget" DECIMAL(14,2) NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");
CREATE INDEX "projects_fiscalYear_idx" ON "projects"("fiscalYear");

-- CreateTable: project_members
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");

-- CreateTable: project_fundings
CREATE TABLE "project_fundings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "projectId" TEXT NOT NULL,
    "fundingSourceId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_fundings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: work_packages
CREATE TABLE "work_packages" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budgetAllocated" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: budget_categories
CREATE TABLE "budget_categories" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "allocatedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "budget_categories_projectId_name_key" ON "budget_categories"("projectId", "name");

-- CreateTable: expenses
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "projectId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "workPackageId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "documentNo" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "payee" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "expenses_projectId_status_idx" ON "expenses"("projectId", "status");
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- CreateTable: expense_files
CREATE TABLE "expense_files" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "expenseId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "ocrText" TEXT,
    "ocrExtractedData" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable: approvals
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "expenseId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "step" "ApprovalStep" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approvals_expenseId_idx" ON "approvals"("expenseId");

-- CreateTable: incomes
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "projectId" TEXT NOT NULL,
    "fundingSourceId" TEXT,
    "installment" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "documentNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_fundings" ADD CONSTRAINT "project_fundings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_fundings" ADD CONSTRAINT "project_fundings_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "funding_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "budget_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "work_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_files" ADD CONSTRAINT "expense_files_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "funding_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
