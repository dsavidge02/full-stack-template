import express from 'express';
import { handleGetDashboardGoals } from '../controllers/dashboardController';

const router = express.Router();

// Public routes (no authentication required)
router.get('/goals', handleGetDashboardGoals);

export default router;

