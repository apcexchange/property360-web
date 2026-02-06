import { body, param } from 'express-validator';

export const createPropertyValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Property name is required'),
  body('address.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('propertyType')
    .isIn(['apartment', 'house', 'commercial', 'land'])
    .withMessage('Invalid property type'),
];

export const updatePropertyValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Property name cannot be empty'),
  body('propertyType')
    .optional()
    .isIn(['apartment', 'house', 'commercial', 'land'])
    .withMessage('Invalid property type'),
];

export const propertyIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID'),
];

export const addUnitValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID'),
  body('unitNumber')
    .trim()
    .notEmpty()
    .withMessage('Unit number is required'),
  body('rentAmount')
    .isNumeric()
    .withMessage('Rent amount must be a number'),
];

export const assignAgentValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID'),
  body('agentId')
    .isMongoId()
    .withMessage('Invalid agent ID'),
];
