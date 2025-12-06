import { Request, Response } from 'express';
import { generateUserAccessToken, getUserInfo } from '../utils/twitchAPI';
import TwitchAdminService from '../services/twitchAdminService';

export const handleGenerateUserAccessToken = async (req: Request, res: Response) => {
    try {
        const code = req.body.code;
        if (!code) return res.status(400).json({ message: 'Code is required' });

        const tokenResponse = await generateUserAccessToken(code);

        if (!tokenResponse.success) return res.status(500).json({ message: 'Error generating user token' });

        return res.status(200).json(tokenResponse.data);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error generating user token' });
    }
}

export const handleGetUserInfo = async (req: Request, res: Response) => {
    try {
        const accessToken = req.body.accessToken;
        if (!accessToken) return res.status(400).json({ message: 'Access token is required' });

        const userInfoResponse = await getUserInfo(accessToken);

        if (!userInfoResponse.success) return res.status(500).json({ message: 'Error getting user info' });

        return res.status(200).json(userInfoResponse.data);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error getting user info' });
    }
}

export const handleVerifyUserByCode = async (req: Request, res: Response) => {
    try {
        const code = req.body.code;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Code is required' });
        }

        // Exchange code for access token
        const tokenResponse = await generateUserAccessToken(code);
        if (!tokenResponse.success || !tokenResponse.data) {
            return res.status(500).json({ success: false, message: 'Error generating user token' });
        }

        const accessToken = tokenResponse.data.access_token;

        // Get user info to extract user ID
        const userInfoResponse = await getUserInfo(accessToken);
        if (!userInfoResponse.success || !userInfoResponse.data) {
            return res.status(500).json({ success: false, message: 'Error getting user info' });
        }

        const userId = userInfoResponse.data.id;
        if (!userId) {
            return res.status(500).json({ success: false, message: 'User ID not found' });
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
        console.error('Error in handleVerifyUserByCode:', err);
        return res.status(500).json({ success: false, message: 'Error verifying user' });
    }
}