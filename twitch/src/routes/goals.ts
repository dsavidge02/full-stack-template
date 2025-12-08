import express from 'express';
import { 
    handleSetFollowerGoal, 
    handleSetSubscriberGoal, 
    handleGetFollowerGoalStatus, 
    handleGetSubscriberGoalStatus,
    handleGetAllGoalStatuses
} from '../controllers/goalController';
import { verifyJWT } from '../middleware/verifyJWT';
import { verifyRoles } from '../middleware/verifyRoles';
import { ROLES_LIST } from '../config/roles_list';

const router = express.Router();

// Public routes (no authentication required)
router.get('/', handleGetAllGoalStatuses);
router.get('/follower', handleGetFollowerGoalStatus);
router.get('/subscriber', handleGetSubscriberGoalStatus);

// Protected routes (admin only)
router.post('/follower', verifyJWT, verifyRoles(ROLES_LIST.ADMIN), handleSetFollowerGoal);
router.post('/subscriber', verifyJWT, verifyRoles(ROLES_LIST.ADMIN), handleSetSubscriberGoal);

export default router;

