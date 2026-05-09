import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import ReportsController from '../controllers/ReportsController';
import { UserRole } from '../types';

const router = Router();

router.use(protect);

/** Reports are landlord/agent-side only. Tenants don't have a use case. */
router.get(
  '/summary',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  ReportsController.getSummary
);

router.get(
  '/balance-sheet',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  ReportsController.getBalanceSheet
);

router.get(
  '/cash-flow',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  ReportsController.getCashFlow
);

router.get(
  '/summary.csv',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  ReportsController.getSummaryCsv
);

router.get(
  '/summary.pdf',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  ReportsController.getSummaryPdf
);

export default router;
