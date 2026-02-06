import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique transaction reference
 */
export const generateTransactionRef = (): string => {
  const timestamp = Date.now().toString(36);
  const uuid = uuidv4().split('-')[0];
  return `TXN-${timestamp}-${uuid}`.toUpperCase();
};

/**
 * Format currency to Nigerian Naira
 */
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

/**
 * Format Nigerian phone number
 */
export const formatNigerianPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.substring(1)}`;
  }
  return `+234${cleaned}`;
};

/**
 * Validate Nigerian phone number
 */
export const isValidNigerianPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  const nigerianPhoneRegex = /^(234|0)?[789][01]\d{8}$/;
  return nigerianPhoneRegex.test(cleaned);
};

/**
 * Paginate results
 */
export const paginate = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return { skip, limit };
};

/**
 * Calculate pagination metadata
 */
export const getPaginationMeta = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export default {
  generateTransactionRef,
  formatNaira,
  formatNigerianPhone,
  isValidNigerianPhone,
  paginate,
  getPaginationMeta,
};
