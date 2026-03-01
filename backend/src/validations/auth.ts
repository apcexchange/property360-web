import { body } from 'express-validator';
import { UserRole } from '../types';

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('role')
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
];

export const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

export const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty'),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty'),
];

export const sendOtpValidation = [
  body('type')
    .isIn(['phone', 'email'])
    .withMessage('Type must be either phone or email'),
  body('value')
    .trim()
    .notEmpty()
    .withMessage('Phone number or email is required'),
];

export const verifyOtpValidation = [
  body('type')
    .isIn(['phone', 'email'])
    .withMessage('Type must be either phone or email'),
  body('value')
    .trim()
    .notEmpty()
    .withMessage('Phone number or email is required'),
  body('otp')
    .trim()
    .isLength({ min: 4, max: 8 })
    .withMessage('OTP must be between 4 and 8 characters'),
];

export const requestPasswordResetValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

export const confirmPasswordResetValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 characters'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

export const deleteAccountValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account'),
];
