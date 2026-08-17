import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller';
import * as approvalController from '../controllers/approval.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadExpenseFile } from '../middleware/upload';
import { approvalActionSchema, createExpenseSchema, updateExpenseSchema } from '../validators/expense.validators';

const router = Router();

router.use(authenticate);

router.get('/', expenseController.listExpenses);
router.post('/', validate({ body: createExpenseSchema }), expenseController.createExpense);
router.get('/:id', expenseController.getExpense);
router.put('/:id', validate({ body: updateExpenseSchema }), expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);
router.post('/:id/submit', expenseController.submitExpense);

router.post('/:id/files', uploadExpenseFile.single('file'), expenseController.uploadFile);
router.post('/:id/files/:fileId/ocr', expenseController.runOcr);
router.delete('/:id/files/:fileId', expenseController.deleteFile);

router.get('/:expenseId/approvals', approvalController.listApprovals);
router.post('/:expenseId/approvals/approve', validate({ body: approvalActionSchema }), approvalController.approveExpense);
router.post('/:expenseId/approvals/reject', validate({ body: approvalActionSchema }), approvalController.rejectExpense);

export default router;
