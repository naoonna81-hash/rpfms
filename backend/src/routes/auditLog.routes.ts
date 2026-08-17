import { Router } from 'express';
import * as auditLogController from '../controllers/auditLog.controller';
import { authenticate, requireSystemRole } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireSystemRole('ADMIN'));
router.get('/', auditLogController.listAuditLogs);

export default router;
