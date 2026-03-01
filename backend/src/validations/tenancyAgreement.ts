import { param, query } from 'express-validator';

export const uploadAgreementValidation = [
  param('leaseId')
    .isMongoId()
    .withMessage('Invalid lease ID'),
];

export const getAgreementsByLeaseValidation = [
  param('leaseId')
    .isMongoId()
    .withMessage('Invalid lease ID'),
];

export const getAgreementsByPropertyValidation = [
  param('propertyId')
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

export const agreementIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid agreement ID'),
];
