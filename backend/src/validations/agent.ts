import { body, param } from 'express-validator';

export const inviteAgentValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('propertyIds')
    .isArray({ min: 1 })
    .withMessage('At least one property must be selected'),
  body('propertyIds.*')
    .isMongoId()
    .withMessage('Invalid property ID'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  body('permissions.canAddTenant')
    .optional()
    .isBoolean()
    .withMessage('canAddTenant must be a boolean'),
  body('permissions.canRemoveTenant')
    .optional()
    .isBoolean()
    .withMessage('canRemoveTenant must be a boolean'),
  body('permissions.canRecordPayment')
    .optional()
    .isBoolean()
    .withMessage('canRecordPayment must be a boolean'),
  body('permissions.canViewPayments')
    .optional()
    .isBoolean()
    .withMessage('canViewPayments must be a boolean'),
  body('permissions.canRenewLease')
    .optional()
    .isBoolean()
    .withMessage('canRenewLease must be a boolean'),
  body('permissions.canManageMaintenance')
    .optional()
    .isBoolean()
    .withMessage('canManageMaintenance must be a boolean'),
  body('permissions.canViewReports')
    .optional()
    .isBoolean()
    .withMessage('canViewReports must be a boolean'),
  body('permissions.canUploadAgreements')
    .optional()
    .isBoolean()
    .withMessage('canUploadAgreements must be a boolean'),
];

export const updateAgentValidation = [
  param('agentId')
    .isMongoId()
    .withMessage('Invalid agent ID'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  body('permissions.canAddTenant')
    .optional()
    .isBoolean()
    .withMessage('canAddTenant must be a boolean'),
  body('permissions.canRemoveTenant')
    .optional()
    .isBoolean()
    .withMessage('canRemoveTenant must be a boolean'),
  body('permissions.canRecordPayment')
    .optional()
    .isBoolean()
    .withMessage('canRecordPayment must be a boolean'),
  body('permissions.canViewPayments')
    .optional()
    .isBoolean()
    .withMessage('canViewPayments must be a boolean'),
  body('permissions.canRenewLease')
    .optional()
    .isBoolean()
    .withMessage('canRenewLease must be a boolean'),
  body('permissions.canManageMaintenance')
    .optional()
    .isBoolean()
    .withMessage('canManageMaintenance must be a boolean'),
  body('permissions.canViewReports')
    .optional()
    .isBoolean()
    .withMessage('canViewReports must be a boolean'),
  body('permissions.canUploadAgreements')
    .optional()
    .isBoolean()
    .withMessage('canUploadAgreements must be a boolean'),
  body('propertyIds')
    .optional()
    .isArray()
    .withMessage('propertyIds must be an array'),
  body('propertyIds.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid property ID'),
];

export const setAgentStatusValidation = [
  param('agentId')
    .isMongoId()
    .withMessage('Invalid agent ID'),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];
