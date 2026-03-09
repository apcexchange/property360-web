import { body, param } from 'express-validator';

export const recordPaymentValidation = [
  param('leaseId')
    .isMongoId()
    .withMessage('Invalid lease ID'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  body('paymentMethod')
    .isIn(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'other'])
    .withMessage('Payment method must be one of: cash, bank_transfer, cheque, mobile_money, other'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be a valid date')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Payment date cannot be in the future');
      }
      return true;
    }),
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('type')
    .optional()
    .isIn(['rent', 'deposit', 'maintenance', 'other'])
    .withMessage('Type must be one of: rent, deposit, maintenance, other'),
];

export const voidPaymentValidation = [
  param('leaseId')
    .isMongoId()
    .withMessage('Invalid lease ID'),
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required when voiding a payment')
    .isLength({ min: 3, max: 500 })
    .withMessage('Reason must be between 3 and 500 characters'),
];
