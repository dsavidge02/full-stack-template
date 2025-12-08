import { Request, Response } from 'express';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import TwitchAdminService from '../services/twitchAdminService';

interface GoalDocument {
    _id?: any;
    type: 'follower' | 'subscriber';
    goal: number;
    createdAt: Date;
    updatedAt: Date;
}

interface GoalStatus {
    current: number;
    goal: number;
    met: boolean;
    remaining: number;
    percentage: number;
}

const COLLECTION_NAME = 'goals';

/**
 * Handles GET /dashboard/goals (Public)
 * Returns goal statuses for the dashboard without authentication.
 * Used by the public dashboard page to display follower and subscriber goals.
 */
export const handleGetDashboardGoals = async (req: Request, res: Response) => {
    try {
        const [followerGoal, subscriberGoal, followersResult, subscribersResult] = await Promise.all([
            mongoConnector.getOne<GoalDocument>(COLLECTION_NAME, { type: 'follower' }),
            mongoConnector.getOne<GoalDocument>(COLLECTION_NAME, { type: 'subscriber' }),
            TwitchAdminService.getInstance().getChannelFollowers(),
            TwitchAdminService.getInstance().getChannelSubscribers()
        ]);

        const result: { follower?: GoalStatus; subscriber?: GoalStatus } = {};

        if (followerGoal && followersResult.success && followersResult.data) {
            const current = followersResult.data.total;
            const goalValue = followerGoal.goal;
            result.follower = {
                current,
                goal: goalValue,
                met: current >= goalValue,
                remaining: Math.max(0, goalValue - current),
                percentage: goalValue > 0 ? Math.min(100, (current / goalValue) * 100) : 0
            };
        }

        if (subscriberGoal && subscribersResult.success && subscribersResult.data) {
            const current = subscribersResult.data.total;
            const goalValue = subscriberGoal.goal;
            result.subscriber = {
                current,
                goal: goalValue,
                met: current >= goalValue,
                remaining: Math.max(0, goalValue - current),
                percentage: goalValue > 0 ? Math.min(100, (current / goalValue) * 100) : 0
            };
        }

        return res.status(200).json({ 
            success: true, 
            data: result 
        });
    } catch (err: any) {
        console.error('Error getting dashboard goals:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error getting dashboard goals' 
        });
    }
};

