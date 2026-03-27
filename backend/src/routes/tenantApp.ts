import { Router } from 'express';
import TenantAppController from '../controllers/TenantAppController';
import TenantPaymentController from '../controllers/TenantPaymentController';
import ReceiptController from '../controllers/ReceiptController';
import { protect, authorize, validate } from '../middleware';
import { UserRole } from '../types';
import { body, param, query } from 'express-validator';

const router = Router();

// All routes are protected and for tenants only
router.use(protect);
router.use(authorize(UserRole.TENANT));

// ============ Lease Invitations ============

// Get pending lease invitations
router.get('/invitations', TenantAppController.getPendingInvitations);

// Get invitation details
router.get(
  '/invitations/:leaseId',
  validate([
    param('leaseId')
      .isMongoId()
      .withMessage('Invalid lease ID'),
  ]),
  TenantAppController.getInvitationDetails
);

// Accept a lease invitation
router.post(
  '/invitations/:leaseId/accept',
  validate([
    param('leaseId')
      .isMongoId()
      .withMessage('Invalid lease ID'),
  ]),
  TenantAppController.acceptInvitation
);

// Decline a lease invitation
router.post(
  '/invitations/:leaseId/decline',
  validate([
    param('leaseId')
      .isMongoId()
      .withMessage('Invalid lease ID'),
  ]),
  TenantAppController.declineInvitation
);

// ============ Dashboard ============

// Get tenant dashboard (lease info, property, landlord)
router.get('/dashboard', TenantAppController.getDashboard);

// ============ Payments ============

// Get payment summary (monthly rent, next due date, total paid, outstanding)
router.get('/payments/summary', TenantAppController.getPaymentSummary);

// Get upcoming payments
router.get('/payments/upcoming', TenantAppController.getUpcomingPayments);

// Get payment history
router.get('/payments', TenantAppController.getPaymentHistory);

// ============ Online Payments ============

// Initiate a payment (Paystack)
router.post(
  '/payments/initiate',
  validate([
    body('invoiceId')
      .isMongoId()
      .withMessage('Invalid invoice ID'),
    body('amount')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Amount must be a positive number'),
    body('callbackUrl')
      .optional()
      .isURL()
      .withMessage('Invalid callback URL'),
  ]),
  TenantPaymentController.initiatePayment
);

// Verify a payment
router.get(
  '/payments/verify/:reference',
  validate([
    param('reference')
      .notEmpty()
      .withMessage('Payment reference is required'),
  ]),
  TenantPaymentController.verifyPayment
);

// Get payment by reference
router.get(
  '/payments/reference/:reference',
  validate([
    param('reference')
      .notEmpty()
      .withMessage('Payment reference is required'),
  ]),
  TenantPaymentController.getPaymentByReference
);

// Get online payment history
router.get(
  '/payments/online',
  validate([
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['pending', 'success', 'failed', 'abandoned'])
      .withMessage('Invalid status'),
  ]),
  TenantPaymentController.getOnlinePayments
);

// ============ Receipts ============

// Get tenant receipts
router.get(
  '/receipts',
  validate([
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  ReceiptController.getTenantReceipts
);

// Get single receipt
router.get(
  '/receipts/:receiptId',
  validate([
    param('receiptId')
      .isMongoId()
      .withMessage('Invalid receipt ID'),
  ]),
  ReceiptController.getReceiptById
);

// ============ Maintenance Requests ============

// Get all maintenance requests
router.get('/requests', TenantAppController.getMaintenanceRequests);

// Create a new maintenance request
router.post(
  '/requests',
  validate([
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 200 })
      .withMessage('Title must be less than 200 characters'),
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('priority')
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priority must be low, medium, high, or urgent'),
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array'),
  ]),
  TenantAppController.createMaintenanceRequest
);

// Get a single maintenance request
router.get(
  '/requests/:requestId',
  validate([
    param('requestId')
      .isMongoId()
      .withMessage('Invalid request ID'),
  ]),
  TenantAppController.getMaintenanceRequest
);

// Cancel a maintenance request
router.patch(
  '/requests/:requestId/cancel',
  validate([
    param('requestId')
      .isMongoId()
      .withMessage('Invalid request ID'),
  ]),
  TenantAppController.cancelMaintenanceRequest
);

export default router;
