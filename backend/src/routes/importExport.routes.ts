import { Router } from 'express';
import * as controller from '../controllers/importExport.controller';
import { requireProjectRole } from '../middleware/auth';
import { uploadImportFile } from '../middleware/upload';

const router = Router({ mergeParams: true });

router.get('/import/template', controller.downloadImportTemplate);
router.post('/import/excel', requireProjectRole('EDITOR'), uploadImportFile.single('file'), controller.importExpenses);
router.get('/export/excel', requireProjectRole('VIEWER'), controller.exportProjectExcel);

export default router;
