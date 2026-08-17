import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import expenseRoutes from './expense.routes';
import approvalsRoutes from './approvals.routes';
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';
import reportRoutes from './report.routes';
import searchRoutes from './search.routes';
import notificationRoutes from './notification.routes';
import auditLogRoutes from './auditLog.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/expenses', expenseRoutes);
router.use('/approvals', approvalsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
