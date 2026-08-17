import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, updateMeSchema } from '../validators/auth.validators';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'พยายามเข้าสู่ระบบถี่เกินไป กรุณาลองใหม่ภายหลัง' } },
});

router.post('/register', authRateLimit, validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimit, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authRateLimit, authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate({ body: updateMeSchema }), authController.updateMe);

export default router;
