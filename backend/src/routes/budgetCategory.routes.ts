import { Router } from 'express';
import * as controller from '../controllers/budgetCategory.controller';
import { requireProjectRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBudgetCategorySchema, updateBudgetCategorySchema } from '../validators/budgetCategory.validators';

const router = Router({ mergeParams: true });

router.get('/', controller.listCategories);
router.post('/', requireProjectRole('EDITOR'), validate({ body: createBudgetCategorySchema }), controller.createCategory);
router.put('/:categoryId', requireProjectRole('EDITOR'), validate({ body: updateBudgetCategorySchema }), controller.updateCategory);
router.delete('/:categoryId', requireProjectRole('EDITOR'), controller.deleteCategory);

export default router;
