import { apiFetch, apiFetchList, buildQuery } from "@/lib/api/client";
import type {
  Approval,
  AuditLog,
  BudgetCategory,
  BudgetUtilization,
  BurnRatePoint,
  CategoryBreakdown,
  DashboardSummary,
  Expense,
  ExpenseFile,
  ExpenseStatus,
  FundingSource,
  Income,
  MonthlyPoint,
  Notification,
  OcrResult,
  Project,
  ProjectBreakdown,
  ProjectMember,
  ProjectMemberRole,
  ProjectSummary,
  Role,
  SearchResult,
  TopCategory,
  User,
  WorkPackage,
} from "@/types";

/* ---------------- Auth ---------------- */
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiFetch<{ user: User; accessToken: string }>("/auth/register", { method: "POST", body: data, skipAuth: true }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ user: User; accessToken: string }>("/auth/login", { method: "POST", body: data, skipAuth: true }),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  me: () => apiFetch<User>("/auth/me"),
  updateMe: (data: Partial<{ name: string; email: string; currentPassword: string; newPassword: string }>) =>
    apiFetch<User>("/auth/me", { method: "PATCH", body: data }),
};

/* ---------------- Users ---------------- */
export const usersApi = {
  list: (params: { page?: number; limit?: number; q?: string } = {}) =>
    apiFetchList<User>(`/users${buildQuery(params)}`),
  get: (id: string) => apiFetch<User>(`/users/${id}`),
  update: (id: string, data: Partial<{ role: Role; isActive: boolean }>) =>
    apiFetch<User>(`/users/${id}`, { method: "PATCH", body: data }),
  remove: (id: string) => apiFetch<void>(`/users/${id}`, { method: "DELETE" }),
};

/* ---------------- Projects ---------------- */
export const projectsApi = {
  list: (params: { page?: number; limit?: number; q?: string; fiscalYear?: number; status?: string; sort?: string } = {}) =>
    apiFetchList<Project>(`/projects${buildQuery(params)}`),
  get: (id: string) => apiFetch<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => apiFetch<Project>("/projects", { method: "POST", body: data }),
  update: (id: string, data: Partial<Project>) => apiFetch<Project>(`/projects/${id}`, { method: "PUT", body: data }),
  remove: (id: string) => apiFetch<void>(`/projects/${id}`, { method: "DELETE" }),
  summary: (id: string) => apiFetch<ProjectSummary>(`/projects/${id}/summary`),
  addMember: (id: string, data: { email: string; role: ProjectMemberRole }) =>
    apiFetch<ProjectMember>(`/projects/${id}/members`, { method: "POST", body: data }),
  updateMember: (id: string, userId: string, data: { role: ProjectMemberRole }) =>
    apiFetch<ProjectMember>(`/projects/${id}/members/${userId}`, { method: "PATCH", body: data }),
  removeMember: (id: string, userId: string) =>
    apiFetch<void>(`/projects/${id}/members/${userId}`, { method: "DELETE" }),
  members: (id: string) => apiFetchList<ProjectMember>(`/projects/${id}/members`),
  addFunding: (id: string, data: { fundingSourceId: string; amount: number }) =>
    apiFetch<unknown>(`/projects/${id}/fundings`, { method: "POST", body: data }),
  workPackages: (id: string) => apiFetchList<WorkPackage>(`/projects/${id}/work-packages`),
  createWorkPackage: (id: string, data: { name: string; budgetAllocated: number }) =>
    apiFetch<WorkPackage>(`/projects/${id}/work-packages`, { method: "POST", body: data }),
  exportExcel: (id: string) => `/projects/${id}/export/excel`,
};

/* ---------------- Budget Categories ---------------- */
export const budgetCategoriesApi = {
  list: (projectId: string) => apiFetchList<BudgetCategory>(`/projects/${projectId}/budget-categories`),
  create: (projectId: string, data: { name: string; allocatedAmount: number }) =>
    apiFetch<BudgetCategory>(`/projects/${projectId}/budget-categories`, { method: "POST", body: data }),
  update: (projectId: string, id: string, data: Partial<{ name: string; allocatedAmount: number }>) =>
    apiFetch<BudgetCategory>(`/projects/${projectId}/budget-categories/${id}`, { method: "PUT", body: data }),
  remove: (projectId: string, id: string) =>
    apiFetch<void>(`/projects/${projectId}/budget-categories/${id}`, { method: "DELETE" }),
};

/* ---------------- Expenses ---------------- */
export interface ExpenseFilters {
  page?: number;
  limit?: number;
  projectId?: string;
  categoryId?: string;
  status?: ExpenseStatus;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  sort?: string;
}

export const expensesApi = {
  list: (params: ExpenseFilters = {}) => apiFetchList<Expense>(`/expenses${buildQuery(params)}`),
  get: (id: string) => apiFetch<Expense>(`/expenses/${id}`),
  create: (data: Partial<Expense>) => apiFetch<Expense>("/expenses", { method: "POST", body: data }),
  update: (id: string, data: Partial<Expense>) => apiFetch<Expense>(`/expenses/${id}`, { method: "PUT", body: data }),
  remove: (id: string) => apiFetch<void>(`/expenses/${id}`, { method: "DELETE" }),
  submit: (id: string) => apiFetch<Expense>(`/expenses/${id}/submit`, { method: "POST" }),
  uploadFile: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<ExpenseFile>(`/expenses/${id}/files`, { method: "POST", body: form, isForm: true });
  },
  runOcr: (id: string, fileId: string) =>
    apiFetch<OcrResult>(`/expenses/${id}/files/${fileId}/ocr`, { method: "POST" }),
  removeFile: (id: string, fileId: string) =>
    apiFetch<void>(`/expenses/${id}/files/${fileId}`, { method: "DELETE" }),
};

/* ---------------- Approvals ---------------- */
export const approvalsApi = {
  history: (expenseId: string) => apiFetchList<Approval>(`/expenses/${expenseId}/approvals`),
  approve: (expenseId: string, comment?: string) =>
    apiFetch<Approval>(`/expenses/${expenseId}/approvals/approve`, { method: "POST", body: { comment } }),
  reject: (expenseId: string, comment: string) =>
    apiFetch<Approval>(`/expenses/${expenseId}/approvals/reject`, { method: "POST", body: { comment } }),
  pending: (params: { page?: number; limit?: number } = {}) =>
    apiFetchList<Expense>(`/approvals/pending${buildQuery(params)}`),
};

/* ---------------- Income ---------------- */
export const incomeApi = {
  list: (projectId: string, params: { page?: number; limit?: number } = {}) =>
    apiFetchList<Income>(`/projects/${projectId}/incomes${buildQuery(params)}`),
  get: (projectId: string, id: string) => apiFetch<Income>(`/projects/${projectId}/incomes/${id}`),
  create: (projectId: string, data: Partial<Income>) =>
    apiFetch<Income>(`/projects/${projectId}/incomes`, { method: "POST", body: data }),
  update: (projectId: string, id: string, data: Partial<Income>) =>
    apiFetch<Income>(`/projects/${projectId}/incomes/${id}`, { method: "PUT", body: data }),
  remove: (projectId: string, id: string) =>
    apiFetch<void>(`/projects/${projectId}/incomes/${id}`, { method: "DELETE" }),
};

/* ---------------- Funding sources ---------------- */
export const fundingSourcesApi = {
  list: () => apiFetchList<FundingSource>("/funding-sources"),
};

/* ---------------- Dashboard & Analytics ---------------- */
export const dashboardApi = {
  summary: (params: { fiscalYear?: number } = {}) =>
    apiFetch<DashboardSummary>(`/dashboard/summary${buildQuery(params)}`),
  monthly: (params: { fiscalYear?: number; projectId?: string } = {}) =>
    apiFetch<MonthlyPoint[]>(`/dashboard/monthly${buildQuery(params)}`),
  byCategory: (params: { fiscalYear?: number; projectId?: string } = {}) =>
    apiFetch<CategoryBreakdown[]>(`/dashboard/by-category${buildQuery(params)}`),
  byProject: (params: { fiscalYear?: number } = {}) =>
    apiFetch<ProjectBreakdown[]>(`/dashboard/by-project${buildQuery(params)}`),
};

export const analyticsApi = {
  burnRate: (projectId: string) => apiFetch<BurnRatePoint[]>(`/analytics/burn-rate${buildQuery({ projectId })}`),
  budgetUtilization: (projectId: string) =>
    apiFetch<BudgetUtilization>(`/analytics/budget-utilization${buildQuery({ projectId })}`),
  topCategories: (projectId: string) =>
    apiFetch<TopCategory[]>(`/analytics/top-categories${buildQuery({ projectId })}`),
};

/* ---------------- Reports ---------------- */
export type ReportType =
  | "income"
  | "expense"
  | "remaining-budget"
  | "by-project"
  | "by-category"
  | "monthly"
  | "annual";
export type ReportFormat = "pdf" | "excel" | "csv";

export function reportDownloadPath(
  type: ReportType,
  format: ReportFormat,
  params: Record<string, string | number | undefined> = {},
) {
  return `/reports/${type}${buildQuery({ ...params, format })}`;
}

/* ---------------- Search ---------------- */
export const searchApi = {
  search: (params: {
    q?: string;
    type?: "project" | "expense" | "all";
    projectId?: string;
    categoryId?: string;
    fiscalYear?: number;
    dateFrom?: string;
    dateTo?: string;
  }) => apiFetch<SearchResult>(`/search${buildQuery(params)}`),
};

/* ---------------- Notifications ---------------- */
export const notificationsApi = {
  list: (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) =>
    apiFetchList<Notification>(`/notifications${buildQuery(params)}`),
  markRead: (id: string) => apiFetch<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiFetch<void>("/notifications/read-all", { method: "PATCH" }),
};

/* ---------------- Import/Export ---------------- */
export const importExportApi = {
  importExcel: (projectId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<unknown>(`/projects/${projectId}/import/excel`, { method: "POST", body: form, isForm: true });
  },
};

/* ---------------- Audit Logs ---------------- */
export const auditLogsApi = {
  list: (params: { entityType?: string; entityId?: string; userId?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {}) =>
    apiFetchList<AuditLog>(`/audit-logs${buildQuery(params)}`),
};
