import { body, param, query } from 'express-validator';

export const invoiceIdValidation = [
  param('invoiceId')
    .isMongoId()
    .withMessage('Invalid invoice ID'),
];

export const createInvoiceValidation = [
  body('tenantId')
    .isMongoId()
    .withMessage('Invalid tenant ID'),
  body('propertyId')
    .isMongoId()
    .withMessage('Invalid property ID'),
  body('unitId')
    .optional()
    .isMongoId()
    .withMessage('Invalid unit ID'),
  body('leaseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid lease ID'),
  body('lineItems')
    .isArray({ min: 1 })
    .withMessage('At least one line item is required'),
  body('lineItems.*.description')
    .trim()
    .notEmpty()
    .withMessage('Line item description is required')
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('lineItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('lineItems.*.rate')
    .isFloat({ min: 0 })
    .withMessage('Rate cannot be negative'),
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Tax rate must be between 0 and 1'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Internal notes cannot exceed 1000 characters'),
  body('saveAsDraft')
    .optional()
    .isBoolean()
    .withMessage('saveAsDraft must be a boolean'),
];

export const updateInvoiceValidation = [
  body('lineItems')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one line item is required'),
  body('lineItems.*.description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Line item description is required')
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('lineItems.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('lineItems.*.rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rate cannot be negative'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Tax rate must be between 0 and 1'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Internal notes cannot exceed 1000 characters'),
];

export const markPaidValidation = [
  body('transactionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid transaction ID'),
];

export const getInvoicesValidation = [
  query('status')
    .optional()
    .isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
    .withMessage('Status must be one of: draft, sent, paid, overdue, cancelled'),
  query('tenantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid tenant ID'),
  query('propertyId')
    .optional()
    .isMongoId()
    .withMessage('Invalid property ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
