import { Router } from 'express';
import ReceiptController from '../controllers/ReceiptController';
import { protect, authorize, validate } from '../middleware';
import { UserRole } from '../types';
import { param, query } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(protect);

// Validation rules
const receiptIdValidation = [
  param('receiptId')
    .isMongoId()
    .withMessage('Invalid receipt ID'),
];

const transactionIdValidation = [
  param('transactionId')
    .isMongoId()
    .withMessage('Invalid transaction ID'),
];

const getReceiptsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('tenantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid tenant ID'),
  query('propertyId')
    .optional()
    .isMongoId()
    .withMessage('Invalid property ID'),
];

// Landlord/Agent routes
router.get(
  '/',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(getReceiptsValidation),
  ReceiptController.getLandlordReceipts
);

router.get(
  '/:receiptId',
  authorize(UserRole.LANDLORD, UserRole.AGENT, UserRole.TENANT),
  validate(receiptIdValidation),
  ReceiptController.getReceiptById
);

router.get(
  '/transaction/:transactionId',
  authorize(UserRole.LANDLORD, UserRole.AGENT, UserRole.TENANT),
  validate(transactionIdValidation),
  ReceiptController.getReceiptByTransaction
);

router.post(
  '/:receiptId/email',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(receiptIdValidation),
  ReceiptController.emailReceipt
);

export default router;
