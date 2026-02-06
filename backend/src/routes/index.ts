import { Router } from 'express';
import authRoutes from './auth';
import propertyRoutes from './property';

const router = Router();

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);

export default router;
