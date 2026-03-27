import { Router } from 'express';
import PayoutController from '../controllers/PayoutController';
import { protect, authorize } from '../middleware';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication and landlord role
router.use(protect);
router.use(authorize(UserRole.LANDLORD));

// POST /payouts - Request a payout
router.post('/', PayoutController.requestPayout);

// GET /payouts - Get payout history
router.get('/', PayoutController.getPayoutHistory);

// GET /payouts/:id - Get payout details
router.get('/:id', PayoutController.getPayoutDetails);

// POST /payouts/:id/retry - Retry a failed payout
router.post('/:id/retry', PayoutController.retryPayout);

export default router;
