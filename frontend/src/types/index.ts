// ประเภทข้อมูลหลักของระบบ RPFMS อ้างอิงจาก docs/API_DESIGN.md และ docs/ER_DIAGRAM.md

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; [k: string]: unknown };
};

export type ApiError = {
  success: false;
  error: { code: ApiErrorCode; message: string };
};

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type Role = "SUPER_ADMIN" | "ADMIN" | "RESEARCHER" | "STAFF" | "VIEWER";

export type ProjectMemberRole = "OWNER" | "EDITOR" | "VIEWER";

export type ProjectStatus = "ACTIVE" | "COMPLETED" | "SUSPENDED" | "CLOSED";

export type ExpenseStatus =
  | "DRAFT"
  | "PENDING_STAFF"
  | "PENDING_LEAD"
  | "APPROVED"
  | "PAID"
  | "REJECTED";

export type ApprovalStep = "STAFF" | "LEAD" | "CLOSE";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PaymentMethod = "CASH" | "TRANSFER" | "CHEQUE" | "CREDIT_CARD" | "OTHER";

export type NotificationType =
  | "BUDGET_LOW"
  | "BUDGET_OVER"
  | "PENDING_APPROVAL"
  | "PROJECT_ENDING"
  | "GENERAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  code: string;
  nameTh: string;
  nameEn?: string | null;
  principalInvestigator: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  totalBudget: number;
  status: ProjectStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  memberRole?: ProjectMemberRole;
}

export interface ProjectSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  totalIncome: number;
  expenseCount: number;
  utilizationPercent: number;
  burnRatePerMonth?: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  user?: User;
}

export interface FundingSource {
  id: string;
  name: string;
  code: string;
}

export interface ProjectFunding {
  id: string;
  projectId: string;
  fundingSourceId: string;
  amount: number;
  fundingSource?: FundingSource;
}

export interface WorkPackage {
  id: string;
  projectId: string;
  name: string;
  budgetAllocated: number;
}

export interface BudgetCategory {
  id: string;
  projectId: string;
  name: string;
  allocatedAmount: number;
  spentAmount?: number;
}

export interface ExpenseFile {
  id: string;
  expenseId: string;
  fileUrl: string;
  fileType: string;
  ocrExtractedData?: OcrResult | null;
  createdAt?: string;
}

export interface OcrField<T> {
  value: T;
  confidence: number;
}

export interface OcrResult {
  date?: OcrField<string>;
  amount?: OcrField<number>;
  documentNo?: OcrField<string>;
  rawText?: string;
}

export interface Expense {
  id: string;
  projectId: string;
  categoryId: string;
  workPackageId?: string | null;
  date: string;
  documentNo: string;
  description: string;
  amount: number;
  payee: string;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  submittedById: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  category?: BudgetCategory;
  files?: ExpenseFile[];
  approvals?: Approval[];
}

export interface Approval {
  id: string;
  expenseId: string;
  approverId: string;
  step: ApprovalStep;
  status: ApprovalStatus;
  comment?: string | null;
  createdAt: string;
  approver?: User;
}

export interface Income {
  id: string;
  projectId: string;
  fundingSourceId?: string | null;
  installment: string;
  receivedDate: string;
  amount: number;
  documentNo: string;
  notes?: string | null;
  fundingSource?: FundingSource;
}

export interface Notification {
  id: string;
  userId: string;
  projectId?: string | null;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  totalProjects: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  totalExpenseCount: number;
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  amount: number;
  income?: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  allocatedAmount: number;
  spentAmount: number;
}

export interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  totalBudget: number;
  spentAmount: number;
}

export interface BurnRatePoint {
  month: string;
  planned: number;
  actual: number;
}

export interface BudgetUtilization {
  projectId: string;
  totalBudget: number;
  totalSpent: number;
  utilizationPercent: number;
}

export interface TopCategory {
  categoryId: string;
  categoryName: string;
  amount: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
  user?: User;
}

export interface SearchResult {
  projects: Project[];
  expenses: Expense[];
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  sort?: string;
  q?: string;
}
