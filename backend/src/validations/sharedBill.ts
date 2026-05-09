import { body, param } from 'express-validator';

export const createSharedBillValidation = [
  param('propertyId').isMongoId().withMessage('Invalid property ID'),
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required (max 200 chars)'),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('category')
    .isIn(['water', 'fuel', 'security', 'cleaning', 'repairs', 'other'])
    .withMessage('Invalid category'),
  body('totalAmount')
    .isFloat({ gt: 0 })
    .withMessage('Total amount must be greater than zero'),
  body('splitMethod')
    .optional()
    .isIn(['equal', 'by_unit_count', 'custom'])
    .withMessage('Invalid split method'),
  body('exemptTenantIds').optional().isArray().withMessage('exemptTenantIds must be an array'),
  body('exemptTenantIds.*').optional().isMongoId().withMessage('Invalid tenant ID'),
  body('creatorIncluded').optional().isBoolean(),
  body('customAmounts').optional().isArray(),
  body('customAmounts.*.tenant').optional().isMongoId(),
  body('customAmounts.*.amount').optional().isFloat({ gt: 0 }),
  body('bankDetails.accountName').isString().trim().notEmpty().withMessage('Account name is required'),
  body('bankDetails.accountNumber').isString().trim().notEmpty().withMessage('Account number is required'),
  body('bankDetails.bankName').isString().trim().notEmpty().withMessage('Bank name is required'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
];

export const billIdParamValidation = [
  param('billId').isMongoId().withMessage('Invalid bill ID'),
];

export const shareIdParamValidation = [
  param('billId').isMongoId().withMessage('Invalid bill ID'),
  param('shareId').isMongoId().withMessage('Invalid share ID'),
];

export const disputeShareValidation = [
  ...shareIdParamValidation,
  body('reason').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Reason is required'),
];

export const markShareAsPaidValidation = [
  ...shareIdParamValidation,
  body('note').optional().isString().isLength({ max: 200 }),
];
