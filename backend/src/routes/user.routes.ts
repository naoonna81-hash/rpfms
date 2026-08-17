import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, requireSystemRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../validators/user.validators';

const router = Router();

router.use(authenticate, requireSystemRole('ADMIN'));

router.get('/', userController.listUsers);
router.get('/:id', userController.getUser);
router.patch('/:id', validate({ body: updateUserSchema }), userController.updateUser);
router.delete('/:id', userController.deactivateUser);

export default router;
