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

export const handleSetFollowerGoal = async (req: Request, res: Response) => {
    try {
        const { goal } = req.body;

        if (!goal || typeof goal !== 'number' || goal <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Goal must be a positive number' 
            });
        }

        const existing = await mongoConnector.getOne<GoalDocument>(
            COLLECTION_NAME,
            { type: 'follower' }
        );

        if (existing) {
            existing.goal = goal;
            existing.updatedAt = new Date();
            await mongoConnector.updateOne<GoalDocument>(
                COLLECTION_NAME,
                existing
            );
        } else {
            const goalDoc: GoalDocument = {
                type: 'follower',
                goal,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await mongoConnector.createOne<GoalDocument>(
                COLLECTION_NAME,
                goalDoc,
                ['type'] // unique field
            );
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Follower goal set successfully',
            data: { goal }
        });
    } catch (err: any) {
        console.error('Error setting follower goal:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error setting follower goal' 
        });
    }
};

export const handleSetSubscriberGoal = async (req: Request, res: Response) => {
    try {
        const { goal } = req.body;

        if (!goal || typeof goal !== 'number' || goal <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Goal must be a positive number' 
            });
        }

        const existing = await mongoConnector.getOne<GoalDocument>(
            COLLECTION_NAME,
            { type: 'subscriber' }
        );

        if (existing) {
            existing.goal = goal;
            existing.updatedAt = new Date();
            await mongoConnector.updateOne<GoalDocument>(
                COLLECTION_NAME,
                existing
            );
        } else {
            const goalDoc: GoalDocument = {
                type: 'subscriber',
                goal,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await mongoConnector.createOne<GoalDocument>(
                COLLECTION_NAME,
                goalDoc,
                ['type'] // unique field
            );
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Subscriber goal set successfully',
            data: { goal }
        });
    } catch (err: any) {
        console.error('Error setting subscriber goal:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error setting subscriber goal' 
        });
    }
};

export const handleGetFollowerGoalStatus = async (req: Request, res: Response) => {
    try {
        const goal = await mongoConnector.getOne<GoalDocument>(
            COLLECTION_NAME,
            { type: 'follower' }
        );

        if (!goal) {
            return res.status(404).json({ 
                success: false, 
                message: 'Follower goal not set' 
            });
        }

        const countResult = await TwitchAdminService.getInstance().getChannelFollowers();
        if (!countResult.success || !countResult.data) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to get follower count' 
            });
        }

        const current = countResult.data.total;
        const goalValue = goal.goal;
        const met = current >= goalValue;
        const remaining = Math.max(0, goalValue - current);
        const percentage = goalValue > 0 ? Math.min(100, (current / goalValue) * 100) : 0;

        const status: GoalStatus = {
            current,
            goal: goalValue,
            met,
            remaining,
            percentage
        };

        return res.status(200).json({ 
            success: true, 
            data: status 
        });
    } catch (err: any) {
        console.error('Error getting follower goal status:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error getting follower goal status' 
        });
    }
};

export const handleGetSubscriberGoalStatus = async (req: Request, res: Response) => {
    try {
        const goal = await mongoConnector.getOne<GoalDocument>(
            COLLECTION_NAME,
            { type: 'subscriber' }
        );

        if (!goal) {
            return res.status(404).json({ 
                success: false, 
                message: 'Subscriber goal not set' 
            });
        }

        const countResult = await TwitchAdminService.getInstance().getChannelSubscribers();
        if (!countResult.success || !countResult.data) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to get subscriber count' 
            });
        }

        const current = countResult.data.total;
        const goalValue = goal.goal;
        const met = current >= goalValue;
        const remaining = Math.max(0, goalValue - current);
        const percentage = goalValue > 0 ? Math.min(100, (current / goalValue) * 100) : 0;

        const status: GoalStatus = {
            current,
            goal: goalValue,
            met,
            remaining,
            percentage
        };

        return res.status(200).json({ 
            success: true, 
            data: status 
        });
    } catch (err: any) {
        console.error('Error getting subscriber goal status:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error getting subscriber goal status' 
        });
    }
};

export const handleGetAllGoalStatuses = async (req: Request, res: Response) => {
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
        console.error('Error getting all goal statuses:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error getting all goal statuses' 
        });
    }
};

