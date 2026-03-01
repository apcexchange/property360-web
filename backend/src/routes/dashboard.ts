import { Router, Response } from 'express';
import { protect } from '../middleware';
import { AuthRequest } from '../types';
import DashboardService from '../services/DashboardService';

const router = Router();

// All dashboard routes require authentication
router.use(protect);

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const stats = await DashboardService.getStats(userId);

    res.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get dashboard stats',
    });
  }
});

// Get recent activities
router.get('/activities', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const activities = await DashboardService.getRecentActivities(userId);

    res.json({
      success: true,
      message: 'Recent activities retrieved successfully',
      data: activities,
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get recent activities',
    });
  }
});

export default router;
