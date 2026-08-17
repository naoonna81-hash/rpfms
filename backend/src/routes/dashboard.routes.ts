import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', dashboardController.dashboardSummary);
router.get('/monthly', dashboardController.dashboardMonthly);
router.get('/by-category', dashboardController.dashboardByCategory);
router.get('/by-project', dashboardController.dashboardByProject);

export default router;
