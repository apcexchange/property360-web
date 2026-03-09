import { Router } from 'express';
import authRoutes from './auth';
import propertyRoutes from './property';
import kycRoutes from './kyc';
import dashboardRoutes from './dashboard';
import tenantRoutes from './tenant';
import tenancyAgreementRoutes from './tenancyAgreement';
import agentRoutes from './agent';
import tenantAppRoutes from './tenantApp';
import invoiceRoutes from './invoice';
import receiptRoutes from './receipt';
import TenancyAgreementController from '../controllers/TenancyAgreementController';
import TenantPaymentController from '../controllers/TenantPaymentController';

const router = Router();

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/kyc', kycRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/tenants', tenantRoutes);
router.use('/tenancy-agreements', tenancyAgreementRoutes);
router.use('/agents', agentRoutes);
router.use('/tenant', tenantAppRoutes); // Tenant app specific routes
router.use('/invoices', invoiceRoutes);
router.use('/receipts', receiptRoutes);

// Webhooks (no authentication required)
router.post('/webhooks/docuseal', TenancyAgreementController.handleWebhook);
router.post('/webhooks/paystack', TenantPaymentController.handlePaystackWebhook);

export default router;
