import { Request, Response } from 'express';
import { generateUserAccessToken } from '../utils/twitchAPI';
import TwitchAdminService from '../services/twitchAdminService';

export const handleExchangeToken = async (req: Request, res: Response) => {
    try {
        const code = req.body.code;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Code is required' });
        }

        const tokenResponse = await generateUserAccessToken(code);
        if (!tokenResponse.success || !tokenResponse.data) {
            return res.status(500).json({ success: false, message: 'Error generating user token' });
        }

        const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;

        const initialized = await TwitchAdminService.getInstance().initializeToken(
            access_token,
            refresh_token,
            expires_in,
            scope
        );

        if (!initialized) {
            return res.status(500).json({ success: false, message: 'Error initializing token' });
        }

        return res.status(200).json({ success: true, message: 'Token initialized successfully' });
    }
    catch (err) {
        console.error('Error in handleExchangeToken:', err);
        return res.status(500).json({ success: false, message: 'Error exchanging token' });
    }
};

export const handleGetToken = async (req: Request, res: Response) => {
    try {
        const tokenInfo = TwitchAdminService.getInstance().getTokenInfo();

        // Check if token is initialized
        if (!tokenInfo.accessToken || !tokenInfo.refreshToken) {
            return res.status(404).json({ success: false, message: 'Token not initialized' });
        }

        return res.status(200).json({
            accessToken: tokenInfo.accessToken,
            refreshToken: tokenInfo.refreshToken,
            tokenExpiresAt: tokenInfo.tokenExpiresAt,
            scopes: tokenInfo.scopes
        });
    }
    catch (err) {
        console.error('Error in handleGetToken:', err);
        return res.status(500).json({ success: false, message: 'Error getting token info' });
    }
};

