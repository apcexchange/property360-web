import { body, param, query } from 'express-validator';

export const assignTenantValidation = [
  param('unitId')
    .isMongoId()
    .withMessage('Invalid unit ID'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('leaseStartDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  body('leaseEndDate')
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.leaseStartDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('rentAmount')
    .isNumeric()
    .withMessage('Rent amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Rent amount must be greater than 0');
      }
      return true;
    }),
  body('securityDeposit')
    .optional()
    .isNumeric()
    .withMessage('Security deposit must be a number'),
  body('paymentFrequency')
    .optional()
    .isIn(['monthly', 'quarterly', 'annually'])
    .withMessage('Payment frequency must be monthly, quarterly, or annually'),
];

export const unitIdValidation = [
  param('unitId')
    .isMongoId()
    .withMessage('Invalid unit ID'),
];

export const propertyIdParamValidation = [
  param('propertyId')
    .isMongoId()
    .withMessage('Invalid property ID'),
];

export const searchTenantValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
];

export const renewLeaseValidation = [
  param('leaseId')
    .isMongoId()
    .withMessage('Invalid lease ID'),
  body('newStartDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  body('newEndDate')
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.newStartDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('rentAmount')
    .isNumeric()
    .withMessage('Rent amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Rent amount must be greater than 0');
      }
      return true;
    }),
  body('paymentFrequency')
    .optional()
    .isIn(['monthly', 'quarterly', 'annually'])
    .withMessage('Payment frequency must be monthly, quarterly, or annually'),
];
