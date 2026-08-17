import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { authenticate, requireProjectRole, requireSystemRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  addFundingSchema,
  addMemberSchema,
  createProjectSchema,
  updateMemberSchema,
  updateProjectSchema,
  updateWorkPackageSchema,
  workPackageSchema,
} from '../validators/project.validators';
import budgetCategoryRoutes from './budgetCategory.routes';
import incomeRoutes from './income.routes';
import importExportRoutes from './importExport.routes';

const router = Router();

router.use(authenticate);

router.get('/', projectController.listProjects);
router.post('/', requireSystemRole('ADMIN'), validate({ body: createProjectSchema }), projectController.createProject);
router.get('/:id', requireProjectRole('VIEWER'), projectController.getProject);
router.put('/:id', requireProjectRole('OWNER'), validate({ body: updateProjectSchema }), projectController.updateProject);
router.delete('/:id', requireSystemRole('ADMIN'), projectController.deleteProject);
router.get('/:id/summary', requireProjectRole('VIEWER'), projectController.getProjectSummary);

router.post('/:id/members', requireProjectRole('OWNER'), validate({ body: addMemberSchema }), projectController.addMember);
router.patch(
  '/:id/members/:userId',
  requireProjectRole('OWNER'),
  validate({ body: updateMemberSchema }),
  projectController.updateMemberRole
);
router.delete('/:id/members/:userId', requireProjectRole('OWNER'), projectController.removeMember);

router.post('/:id/fundings', requireProjectRole('OWNER'), validate({ body: addFundingSchema }), projectController.addFunding);

router.get('/:id/work-packages', requireProjectRole('VIEWER'), projectController.listWorkPackages);
router.post(
  '/:id/work-packages',
  requireProjectRole('EDITOR'),
  validate({ body: workPackageSchema }),
  projectController.createWorkPackage
);
router.put(
  '/:id/work-packages/:wpId',
  requireProjectRole('EDITOR'),
  validate({ body: updateWorkPackageSchema }),
  projectController.updateWorkPackage
);
router.delete('/:id/work-packages/:wpId', requireProjectRole('EDITOR'), projectController.deleteWorkPackage);

router.use('/:id/budget-categories', requireProjectRole('VIEWER'), budgetCategoryRoutes);
router.use('/:id/incomes', requireProjectRole('VIEWER'), incomeRoutes);
router.use('/:id', importExportRoutes);

export default router;
