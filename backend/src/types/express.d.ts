import { SystemRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: SystemRole;
      };
      auditContext?: {
        action?: string;
        entityType?: string;
        entityId?: string;
        oldValue?: unknown;
        newValue?: unknown;
      };
    }
  }
}

export {};
