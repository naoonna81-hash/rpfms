import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/burn-rate', analyticsController.burnRate);
router.get('/budget-utilization', analyticsController.budgetUtilization);
router.get('/top-categories', analyticsController.topCategories);

export default router;
