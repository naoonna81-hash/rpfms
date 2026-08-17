# ER Diagram — RPFMS

```mermaid
erDiagram
    USERS ||--o{ PROJECT_MEMBERS : "has"
    USERS ||--o{ PROJECTS : "creates"
    USERS ||--o{ EXPENSES : "submits"
    USERS ||--o{ APPROVALS : "approves"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_LOGS : "performs"
    USERS ||--o{ REFRESH_TOKENS : "owns"

    PROJECTS ||--o{ PROJECT_MEMBERS : "shared with"
    PROJECTS ||--o{ PROJECT_FUNDINGS : "funded by"
    PROJECTS ||--o{ WORK_PACKAGES : "contains"
    PROJECTS ||--o{ BUDGET_CATEGORIES : "defines"
    PROJECTS ||--o{ EXPENSES : "has"
    PROJECTS ||--o{ INCOMES : "receives"
    PROJECTS ||--o{ NOTIFICATIONS : "triggers"

    FUNDING_SOURCES ||--o{ PROJECT_FUNDINGS : "funds"
    FUNDING_SOURCES ||--o{ INCOMES : "source of"

    BUDGET_CATEGORIES ||--o{ EXPENSES : "classifies"
    WORK_PACKAGES ||--o{ EXPENSES : "groups"

    EXPENSES ||--o{ EXPENSE_FILES : "attaches"
    EXPENSES ||--o{ APPROVALS : "goes through"

    USERS {
        uuid id PK
        string name
        string email UK
        string passwordHash
        enum role
        boolean isActive
    }
    PROJECTS {
        uuid id PK
        string code UK
        string nameTh
        string nameEn
        string principalInvestigator
        int fiscalYear
        date startDate
        date endDate
        decimal totalBudget
        enum status
        uuid createdById FK
    }
    PROJECT_MEMBERS {
        uuid id PK
        uuid projectId FK
        uuid userId FK
        enum role
    }
    FUNDING_SOURCES {
        uuid id PK
        string name
        string code UK
    }
    PROJECT_FUNDINGS {
        uuid id PK
        uuid projectId FK
        uuid fundingSourceId FK
        decimal amount
    }
    WORK_PACKAGES {
        uuid id PK
        uuid projectId FK
        string name
        decimal budgetAllocated
    }
    BUDGET_CATEGORIES {
        uuid id PK
        uuid projectId FK
        string name
        decimal allocatedAmount
    }
    EXPENSES {
        uuid id PK
        uuid projectId FK
        uuid categoryId FK
        uuid workPackageId FK
        date date
        string documentNo
        string description
        decimal amount
        string payee
        enum paymentMethod
        enum status
        uuid submittedById FK
    }
    EXPENSE_FILES {
        uuid id PK
        uuid expenseId FK
        string fileUrl
        string fileType
        json ocrExtractedData
    }
    APPROVALS {
        uuid id PK
        uuid expenseId FK
        uuid approverId FK
        enum step
        enum status
        string comment
    }
    INCOMES {
        uuid id PK
        uuid projectId FK
        uuid fundingSourceId FK
        string installment
        date receivedDate
        decimal amount
    }
    NOTIFICATIONS {
        uuid id PK
        uuid userId FK
        uuid projectId FK
        enum type
        string message
        boolean isRead
    }
    AUDIT_LOGS {
        uuid id PK
        uuid userId FK
        enum action
        string entityType
        string entityId
        json oldValue
        json newValue
    }
    REFRESH_TOKENS {
        uuid id PK
        uuid userId FK
        string tokenHash
        datetime expiresAt
    }
```

ตาราง PK เป็น UUID ทั้งหมด (v4) ยกเว้นไม่มี — FK ทุกจุดตั้ง `onDelete: Cascade` สำหรับ child entity ที่ผูกกับ parent โดยตรง (เช่น ExpenseFile → Expense, ProjectMember → Project) เพื่อป้องกันข้อมูลกำพร้า ยกเว้นความสัมพันธ์เชิงอ้างอิง (เช่น Expense → User submittedBy) ที่คง restrict ไว้

Schema ต้นฉบับ (Prisma, ใช้ generate migration จริง): `backend/prisma/schema.prisma`
