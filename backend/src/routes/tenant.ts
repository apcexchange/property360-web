import { Router } from 'express';
import TenantController from '../controllers/TenantController';
import PaymentController from '../controllers/PaymentController';
import { protect, authorize, validate, checkAgentPermission } from '../middleware';
import { UserRole } from '../types';
import {
  assignTenantValidation,
  unitIdValidation,
  propertyIdParamValidation,
  searchTenantValidation,
  renewLeaseValidation,
  recordPaymentValidation,
  voidPaymentValidation,
} from '../validations';

const router = Router();

// All routes are protected
router.use(protect);

// Get all tenants for the landlord (across all properties)
// Note: Agents should use /agents/my/properties to get properties they manage
router.get(
  '/',
  authorize(UserRole.LANDLORD),
  TenantController.getAllTenants
);

// Get all occupied units for the landlord
router.get(
  '/occupied-units',
  authorize(UserRole.LANDLORD),
  TenantController.getOccupiedUnits
);

// Search for existing users to assign as tenants
router.get(
  '/search',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(searchTenantValidation),
  TenantController.searchTenants
);

// Get tenants for a specific property
router.get(
  '/property/:propertyId',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(propertyIdParamValidation),
  checkAgentPermission('canViewPayments'), // Agents need at least view permission
  TenantController.getTenantsByProperty
);

// Get vacant units for a property (for tenant assignment flow)
router.get(
  '/property/:propertyId/vacant-units',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(propertyIdParamValidation),
  checkAgentPermission('canAddTenant'),
  TenantController.getVacantUnits
);

// Assign a tenant to a unit
router.post(
  '/unit/:unitId/assign',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(assignTenantValidation),
  checkAgentPermission('canAddTenant'),
  TenantController.assignTenant
);

// Remove a tenant from a unit
router.delete(
  '/unit/:unitId',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(unitIdValidation),
  checkAgentPermission('canRemoveTenant'),
  TenantController.removeTenant
);

// Renew an existing lease
router.put(
  '/lease/:leaseId/renew',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(renewLeaseValidation),
  checkAgentPermission('canRenewLease'),
  TenantController.renewLease
);

// Guarantor routes
router.get(
  '/lease/:leaseId/guarantor',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canViewPayments'), // Read access
  TenantController.getGuarantor
);

router.put(
  '/lease/:leaseId/guarantor',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canAddTenant'), // Write access
  TenantController.updateGuarantor
);

router.delete(
  '/lease/:leaseId/guarantor',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canRemoveTenant'),
  TenantController.deleteGuarantor
);

// Emergency contacts routes
router.get(
  '/lease/:leaseId/emergency-contacts',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canViewPayments'), // Read access
  TenantController.getEmergencyContacts
);

router.post(
  '/lease/:leaseId/emergency-contacts',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canAddTenant'),
  TenantController.addEmergencyContact
);

router.put(
  '/lease/:leaseId/emergency-contacts/:contactIndex',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canAddTenant'),
  TenantController.updateEmergencyContact
);

router.delete(
  '/lease/:leaseId/emergency-contacts/:contactIndex',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canRemoveTenant'),
  TenantController.deleteEmergencyContact
);

// Send payment reminder
router.post(
  '/lease/:leaseId/payment-reminder',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canRecordPayment'),
  TenantController.sendPaymentReminder
);

// ============ Payment Routes ============

// Record a payment for a lease
router.post(
  '/lease/:leaseId/payments',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(recordPaymentValidation),
  checkAgentPermission('canRecordPayment'),
  PaymentController.recordPayment
);

// Get payment history for a lease
router.get(
  '/lease/:leaseId/payments',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canViewPayments'),
  PaymentController.getPaymentHistory
);

// Get lease balance summary
router.get(
  '/lease/:leaseId/balance',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canViewPayments'),
  PaymentController.getLeaseBalance
);

// Void a payment
router.delete(
  '/lease/:leaseId/payments/:paymentId',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(voidPaymentValidation),
  checkAgentPermission('canRecordPayment'),
  PaymentController.voidPayment
);

export default router;
