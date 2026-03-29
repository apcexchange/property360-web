import { Router } from 'express';
import ReservationController from '../controllers/ReservationController';
import { protect, authorize, validate } from '../middleware';
import { UserRole } from '../types';
import { param, body, query } from 'express-validator';

const router = Router();

// All routes are protected
router.use(protect);

// ============ Tenant Routes ============

// Create a reservation request
router.post(
  '/request/:unitId',
  authorize(UserRole.TENANT),
  validate([
    param('unitId').isMongoId().withMessage('Invalid unit ID'),
    body('message').optional().isString().isLength({ max: 1000 }).withMessage('Message too long'),
  ]),
  ReservationController.createRequest
);

// Get tenant's own requests
router.get(
  '/my-requests',
  authorize(UserRole.TENANT),
  ReservationController.getTenantRequests
);

// Initiate payment for an approved request
router.post(
  '/:id/pay',
  authorize(UserRole.TENANT),
  validate([
    param('id').isMongoId().withMessage('Invalid request ID'),
    body('paymentType')
      .isIn(['inspection', 'full'])
      .withMessage('Payment type must be inspection or full'),
  ]),
  ReservationController.initiatePayment
);

// Mark as paid via bank transfer
router.post(
  '/:id/bank-transfer',
  authorize(UserRole.TENANT),
  validate([
    param('id').isMongoId().withMessage('Invalid request ID'),
  ]),
  ReservationController.markPaidByTransfer
);

// Cancel a pending request
router.post(
  '/:id/cancel',
  authorize(UserRole.TENANT),
  validate([
    param('id').isMongoId().withMessage('Invalid request ID'),
  ]),
  ReservationController.cancelRequest
);

// ============ Landlord/Agent Routes ============

// Get landlord's reservation requests
router.get(
  '/landlord-requests',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate([
    query('status')
      .optional()
      .isIn(['pending', 'approved', 'declined', 'paid', 'expired', 'cancelled'])
      .withMessage('Invalid status filter'),
  ]),
  ReservationController.getLandlordRequests
);

// Approve a reservation request
router.post(
  '/:id/approve',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate([
    param('id').isMongoId().withMessage('Invalid request ID'),
  ]),
  ReservationController.approveRequest
);

// Decline a reservation request
router.post(
  '/:id/decline',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate([
    param('id').isMongoId().withMessage('Invalid request ID'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason too long'),
  ]),
  ReservationController.declineRequest
);

export default router;
