import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate, requireSystemRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.post('/generate', requireSystemRole('ADMIN'), notificationController.triggerGenerate);

export default router;
