import { Request, Response } from 'express';
import TwitchEventSubService from '../services/twitchEventSubService';
import TwitchAdminService from '../services/twitchAdminService';
import { getUserInfoByLogin } from '../utils/twitchAPI';

/**
 * Handles POST /eventsub/subscriptions
 * Creates a new EventSub subscription for a specific event type.
 * 
 * Request body:
 * - type (required): Subscription type (e.g., 'channel.follow', 'channel.chat.message')
 * - broadcasterUserId (optional): Broadcaster's Twitch user ID (fetched from channel login if not provided)
 * - moderatorUserId (optional): Required for 'channel.follow' type (defaults to broadcasterUserId)
 * - userId (optional): Required for 'channel.chat.message' type (defaults to broadcasterUserId)
 * 
 * Automatically starts WebSocket connection if not already connected.
 * Returns 201 on success, 400/401/409/500 on error.
 */
export const handleCreateSubscription = async (req: Request, res: Response) => {
    try {
        const { type, broadcasterUserId, moderatorUserId, userId } = req.body;

        if (!type) {
            return res.status(400).json({ success: false, message: 'Subscription type is required' });
        }

        // Get broadcaster user ID - use provided one or fetch from channel login
        let broadcasterId = broadcasterUserId;
        if (!broadcasterId) {
            const accessToken = await TwitchAdminService.getInstance().getValidAccessToken();
            if (!accessToken) {
                return res.status(401).json({ success: false, message: 'No valid access token available' });
            }

            const channelLogin = process.env.TWITCH_CHANNEL_LOGIN || 'savidge_af';
            const userInfoResponse = await getUserInfoByLogin(accessToken, channelLogin);
            if (!userInfoResponse.success || !userInfoResponse.data) {
                return res.status(400).json({ success: false, message: 'Failed to get broadcaster user ID' });
            }
            broadcasterId = userInfoResponse.data.id;
        }

        // For channel.follow, we need moderator_user_id
        // If not provided, use broadcaster_user_id (self-moderator)
        let moderatorId: string | undefined;
        if (type === 'channel.follow') {
            moderatorId = moderatorUserId || broadcasterId;
        }

        // For channel.chat.message, we need user_id
        // If not provided, use broadcaster_user_id (to receive all chat messages for the channel)
        let chatUserId: string | undefined;
        if (type === 'channel.chat.message') {
            chatUserId = userId || broadcasterId;
        }

        const result = await TwitchEventSubService.getInstance().createSubscription(
            type,
            broadcasterId,
            moderatorId,
            chatUserId
        );

        if (!result.success) {
            const statusCode = result.error?.includes('already exists') ? 409 : 
                             result.error?.includes('access token') ? 401 : 500;
            return res.status(statusCode).json({ 
                success: false, 
                message: result.error || 'Failed to create subscription' 
            });
        }

        return res.status(201).json({
            success: true,
            data: result.data,
            message: 'Subscription created successfully'
        });
    } catch (err: any) {
        console.error('Error in handleCreateSubscription:', err);
        return res.status(500).json({ success: false, message: 'Error creating subscription' });
    }
};

/**
 * Handles GET /eventsub/subscriptions
 * Retrieves EventSub subscriptions from in-memory storage.
 * 
 * Query parameters:
 * - type (optional): If provided, returns only the subscription for that type
 * 
 * If type is provided, returns single subscription or 404 if not found.
 * If type is not provided, returns all subscriptions.
 * Returns 200 on success, 404/500 on error.
 */
export const handleGetSubscriptions = async (req: Request, res: Response) => {
    try {
        const { type } = req.query;

        if (type && typeof type === 'string') {
            // Get single subscription by type
            const subscription = TwitchEventSubService.getInstance().getSubscription(type);
            if (!subscription) {
                return res.status(404).json({ 
                    success: false, 
                    message: `Subscription for type ${type} not found` 
                });
            }
            return res.status(200).json({ success: true, data: subscription });
        }

        // Get all subscriptions
        const subscriptions = TwitchEventSubService.getInstance().getAllSubscriptions();
        return res.status(200).json({ success: true, data: subscriptions });
    } catch (err: any) {
        console.error('Error in handleGetSubscriptions:', err);
        return res.status(500).json({ success: false, message: 'Error getting subscriptions' });
    }
};

/**
 * Handles GET /eventsub/subscriptions/:type
 * Retrieves a specific EventSub subscription by type from in-memory storage.
 * 
 * URL parameters:
 * - type (required): Subscription type to retrieve
 * 
 * Returns 200 with subscription data on success, 400/404/500 on error.
 */
export const handleGetSubscription = async (req: Request, res: Response) => {
    try {
        const { type } = req.params;

        if (!type) {
            return res.status(400).json({ success: false, message: 'Subscription type is required' });
        }

        const subscription = TwitchEventSubService.getInstance().getSubscription(type);
        if (!subscription) {
            return res.status(404).json({ 
                success: false, 
                message: `Subscription for type ${type} not found` 
            });
        }

        return res.status(200).json({ success: true, data: subscription });
    } catch (err: any) {
        console.error('Error in handleGetSubscription:', err);
        return res.status(500).json({ success: false, message: 'Error getting subscription' });
    }
};

/**
 * Handles DELETE /eventsub/subscriptions/:type or DELETE /eventsub/subscriptions/id/:id
 * Deletes an EventSub subscription either by type or by subscription ID.
 * 
 * URL parameters:
 * - type (optional): Subscription type to delete
 * - id (optional): Subscription ID to delete (takes precedence over type)
 * 
 * Deletes the subscription from both Twitch's API and in-memory storage.
 * Returns 200 on success, 400/404/500 on error.
 */
export const handleDeleteSubscription = async (req: Request, res: Response) => {
    try {
        const { type, id } = req.params;

        let result;
        if (id) {
            // Delete by subscription ID
            result = await TwitchEventSubService.getInstance().deleteSubscription(id);
        } else if (type) {
            // Delete by subscription type
            result = await TwitchEventSubService.getInstance().deleteSubscriptionByType(type);
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'Either subscription type or ID is required' 
            });
        }

        if (!result.success) {
            const statusCode = result.error?.includes('not found') ? 404 : 500;
            return res.status(statusCode).json({ 
                success: false, 
                message: result.error || 'Failed to delete subscription' 
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Subscription deleted successfully' 
        });
    } catch (err: any) {
        console.error('Error in handleDeleteSubscription:', err);
        return res.status(500).json({ success: false, message: 'Error deleting subscription' });
    }
};

/**
 * Handles POST /eventsub/websocket/start
 * Starts the EventSub WebSocket connection to Twitch.
 * 
 * If already connected, returns success with existing session ID.
 * Establishes connection and waits for session ID from Twitch.
 * Returns 200 with sessionId on success, 500 on error.
 */
export const handleStartWebSocket = async (req: Request, res: Response) => {
    try {
        const service = TwitchEventSubService.getInstance();
        
        // Check if already connected
        if (service.isWebSocketConnected()) {
            return res.status(200).json({ 
                success: true, 
                message: 'WebSocket connection already established',
                sessionId: service.getWebSocketSessionId()
            });
        }

        const result = await service.startWebSocketConnection();
        
        if (!result.success) {
            return res.status(500).json({ 
                success: false, 
                message: result.error || 'Failed to start WebSocket connection' 
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'WebSocket connection started successfully',
            sessionId: service.getWebSocketSessionId()
        });
    } catch (err: any) {
        console.error('Error in handleStartWebSocket:', err);
        return res.status(500).json({ success: false, message: 'Error starting WebSocket connection' });
    }
};

/**
 * Handles POST /eventsub/websocket/stop
 * Stops the EventSub WebSocket connection to Twitch.
 * 
 * Before closing the connection, deletes all active subscriptions from Twitch's API
 * to prevent orphaned subscriptions. Then closes the WebSocket connection.
 * 
 * If already disconnected, returns success immediately.
 * Returns 200 on success, 500 on error.
 */
export const handleStopWebSocket = async (req: Request, res: Response) => {
    try {
        const service = TwitchEventSubService.getInstance();
        
        // Check if already disconnected
        if (!service.isWebSocketConnected()) {
            return res.status(200).json({ 
                success: true, 
                message: 'WebSocket connection already stopped'
            });
        }

        const result = await service.stopWebSocketConnection();
        
        if (!result.success) {
            return res.status(500).json({ 
                success: false, 
                message: result.error || 'Failed to stop WebSocket connection' 
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'WebSocket connection stopped successfully'
        });
    } catch (err: any) {
        console.error('Error in handleStopWebSocket:', err);
        return res.status(500).json({ success: false, message: 'Error stopping WebSocket connection' });
    }
};

/**
 * Handles GET /eventsub/websocket/status (Admin only)
 * Returns the current WebSocket connection status including session ID.
 * 
 * Returns:
 * - connected: boolean indicating if WebSocket is connected
 * - sessionId: string | null - The Twitch EventSub session ID (if connected)
 * - message: Status message
 * 
 * This endpoint requires admin authentication and exposes the session ID.
 * Returns 200 on success, 500 on error.
 */
export const handleWebSocketStatus = async (req: Request, res: Response) => {
    try {
        const service = TwitchEventSubService.getInstance();
        const isConnected = service.isWebSocketConnected();
        const sessionId = service.getWebSocketSessionId();

        return res.status(200).json({
            success: true,
            connected: isConnected,
            sessionId: sessionId,
            message: isConnected 
                ? 'WebSocket connection is active' 
                : 'WebSocket connection is not active'
        });
    } catch (err: any) {
        console.error('Error in handleWebSocketStatus:', err);
        return res.status(500).json({ success: false, message: 'Error getting WebSocket status' });
    }
};

/**
 * Handles GET /eventsub/websocket/health (Public)
 * Returns the current WebSocket connection status without sensitive information.
 * 
 * Returns:
 * - connected: boolean indicating if WebSocket is connected
 * - message: Status message
 * 
 * This is a public endpoint (no authentication required) and does not expose
 * the session ID. Useful for health checks and monitoring.
 * Returns 200 on success, 500 on error.
 */
export const handleWebSocketHealth = async (req: Request, res: Response) => {
    try {
        const service = TwitchEventSubService.getInstance();
        const isConnected = service.isWebSocketConnected();

        return res.status(200).json({
            success: true,
            connected: isConnected,
            message: isConnected 
                ? 'WebSocket connection is active' 
                : 'WebSocket connection is not active'
        });
    } catch (err: any) {
        console.error('Error in handleWebSocketHealth:', err);
        return res.status(500).json({ success: false, message: 'Error getting WebSocket health' });
    }
};

