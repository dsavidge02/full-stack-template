import { Request, Response } from 'express';
import TwitchAdminService from '../services/twitchAdminService';

export const handleGetFollowers = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string | undefined;

        const result = await TwitchAdminService.getInstance().getChannelFollowers(userId);

        if (!result.success) {
            // Check if token is not initialized
            const tokenInfo = TwitchAdminService.getInstance().getTokenInfo();
            if (!tokenInfo.accessToken || !tokenInfo.refreshToken) {
                return res.status(404).json({ success: false, message: 'Token not initialized' });
            }
            // Otherwise it's likely a token refresh failure
            return res.status(401).json({ success: false, message: 'Failed to get followers. Token may need to be refreshed.' });
        }

        return res.status(200).json(result);
    }
    catch (err) {
        console.error('Error in handleGetFollowers:', err);
        return res.status(500).json({ success: false, message: 'Error getting followers' });
    }
};

export const handleGetSubscribers = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string | undefined;

        const result = await TwitchAdminService.getInstance().getChannelSubscribers(userId);

        if (!result.success) {
            // Check if token is not initialized
            const tokenInfo = TwitchAdminService.getInstance().getTokenInfo();
            if (!tokenInfo.accessToken || !tokenInfo.refreshToken) {
                return res.status(404).json({ success: false, message: 'Token not initialized' });
            }
            // Otherwise it's likely a token refresh failure
            return res.status(401).json({ success: false, message: 'Failed to get subscribers. Token may need to be refreshed.' });
        }

        return res.status(200).json(result);
    }
    catch (err) {
        console.error('Error in handleGetSubscribers:', err);
        return res.status(500).json({ success: false, message: 'Error getting subscribers' });
    }
};

export const handleVerifyUserById = async (req: Request, res: Response) => {
    try {
        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Check if service is initialized
        const tokenInfo = TwitchAdminService.getInstance().getTokenInfo();
        if (!tokenInfo.accessToken || !tokenInfo.refreshToken) {
            return res.status(404).json({ success: false, message: 'Token not initialized' });
        }

        // Check follower and subscriber status in parallel
        const [followersResult, subscribersResult] = await Promise.allSettled([
            TwitchAdminService.getInstance().getChannelFollowers(userId),
            TwitchAdminService.getInstance().getChannelSubscribers(userId)
        ]);

        let following = false;
        let subscribed = false;

        // Check followers result
        if (followersResult.status === 'fulfilled' && followersResult.value.success) {
            following = !!(followersResult.value.data?.followers && followersResult.value.data.followers.length > 0);
        }

        // Check subscribers result
        if (subscribersResult.status === 'fulfilled' && subscribersResult.value.success) {
            subscribed = !!(subscribersResult.value.data?.subscribers && subscribersResult.value.data.subscribers.length > 0);
        }

        return res.status(200).json({
            following,
            subscribed
        });
    }
    catch (err) {
        console.error('Error in handleVerifyUserById:', err);
        return res.status(500).json({ success: false, message: 'Error verifying user' });
    }
};

