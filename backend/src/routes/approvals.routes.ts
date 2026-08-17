import { Router } from 'express';
import * as approvalController from '../controllers/approval.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/pending', approvalController.listPendingApprovals);

export default router;
