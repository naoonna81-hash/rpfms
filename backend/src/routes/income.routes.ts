import { Router } from 'express';
import * as controller from '../controllers/income.controller';
import { requireProjectRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createIncomeSchema, updateIncomeSchema } from '../validators/income.validators';

const router = Router({ mergeParams: true });

router.get('/', controller.listIncomes);
router.post('/', requireProjectRole('EDITOR'), validate({ body: createIncomeSchema }), controller.createIncome);
router.get('/:incomeId', controller.getIncome);
router.put('/:incomeId', requireProjectRole('EDITOR'), validate({ body: updateIncomeSchema }), controller.updateIncome);
router.delete('/:incomeId', requireProjectRole('EDITOR'), controller.deleteIncome);

export default router;
