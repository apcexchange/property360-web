import { Router } from 'express';
import authRoutes from './auth';
import propertyRoutes from './property';
import kycRoutes from './kyc';
import dashboardRoutes from './dashboard';
import tenantRoutes from './tenant';
import tenancyAgreementRoutes from './tenancyAgreement';
import TenancyAgreementController from '../controllers/TenancyAgreementController';

const router = Router();

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/kyc', kycRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/tenants', tenantRoutes);
router.use('/tenancy-agreements', tenancyAgreementRoutes);

// DocuSeal webhook (no authentication required)
router.post('/webhooks/docuseal', TenancyAgreementController.handleWebhook);

export default router;
