import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/income', reportController.incomeReport);
router.get('/expense', reportController.expenseReport);
router.get('/remaining-budget', reportController.remainingBudgetReport);
router.get('/by-project', reportController.byProjectReport);
router.get('/by-category', reportController.byCategoryReport);
router.get('/monthly', reportController.monthlyReport);
router.get('/annual', reportController.annualReport);

export default router;
