import { createEventSubSubscription, getEventSubSubscriptions, deleteEventSubSubscription } from '../utils/eventSubAPI';
import TwitchAdminService from './twitchAdminService';
import WebSocket from 'ws';

interface SubscriptionInfo {
    subscriptionId: string;
    type: string;
    status: string;
    sessionId: string;
    createdAt: Date;
}

/**
 * Supported EventSub subscription types.
 * These are the event types that can be subscribed to via Twitch EventSub.
 */
const SUPPORTED_SUBSCRIPTION_TYPES = [
    'channel.chat.message',
    'channel.follow',
    'channel.subscribe',
    'channel.subscription.end',
    'channel.subscription.gift',
    'channel.subscription.message',
    'stream.online',
    'stream.offline'
];

/**
 * EventSub subscription type versions.
 * Each subscription type has a specific version that must be used when creating subscriptions.
 */
const SUBSCRIPTION_VERSIONS: Record<string, string> = {
    'channel.chat.message': '1',
    'channel.follow': '2',
    'channel.subscribe': '1',
    'channel.subscription.end': '1',
    'channel.subscription.gift': '1',
    'channel.subscription.message': '1',
    'stream.online': '1',
    'stream.offline': '1'
};

/**
 * Singleton service for managing Twitch EventSub subscriptions via WebSocket.
 * 
 * This service handles:
 * - WebSocket connection lifecycle to Twitch EventSub
 * - Creating, retrieving, and deleting EventSub subscriptions
 * - Processing incoming EventSub notifications
 * - Managing subscription state in memory
 * - Automatic cleanup of old subscriptions on startup
 * 
 * Uses a singleton pattern to ensure only one instance manages the WebSocket connection.
 */
class TwitchEventSubService {
    private static instance: TwitchEventSubService;
    
    // In-memory storage of active subscriptions (key: subscription type)
    private subscriptions: Map<string, SubscriptionInfo> = new Map();
    // WebSocket session ID from Twitch (required for creating subscriptions)
    private sessionId: string | null = null;
    // Broadcaster and moderator user IDs for subscription conditions
    private broadcasterUserId: string | null = null;
    private moderatorUserId: string | null = null;
    // WebSocket connection instance
    private websocket: WebSocket | null = null;
    // Flag to prevent multiple simultaneous connection attempts
    private isConnecting: boolean = false;
    // Reconnect URL provided by Twitch when reconnection is needed
    private reconnectUrl: string | null = null;
    // Promise that resolves when session ID is received from Twitch
    private sessionReadyPromise: Promise<string> | null = null;
    // Promise resolve/reject handlers for session ID
    private sessionReadyResolve: ((sessionId: string) => void) | null = null;
    private sessionReadyReject: ((error: Error) => void) | null = null;

    private constructor() {}

    /**
     * Gets the singleton instance of TwitchEventSubService.
     * Creates a new instance if one doesn't exist.
     */
    public static getInstance(): TwitchEventSubService {
        if (!TwitchEventSubService.instance) {
            TwitchEventSubService.instance = new TwitchEventSubService();
        }
        return TwitchEventSubService.instance;
    }

    /**
     * Initializes the EventSub service on startup.
     * Queries Twitch API for existing subscriptions matching our supported types
     * and deletes them to prevent orphaned subscriptions from previous runs.
     * 
     * Should be called once when the service starts up.
     */
    public async initialize(): Promise<void> {
        try {
            const accessToken = await TwitchAdminService.getInstance().getValidAccessToken();
            if (!accessToken) {
                console.warn('EventSub service: No valid access token available for initialization');
                return;
            }

            // Query existing subscriptions to clean up old ones
            const existingSubs = await getEventSubSubscriptions(accessToken);
            
            if (existingSubs.success && existingSubs.data) {
                // Delete any subscriptions that match our supported types
                for (const sub of existingSubs.data) {
                    if (SUPPORTED_SUBSCRIPTION_TYPES.includes(sub.type)) {
                        console.log(`Deleting old subscription: ${sub.type} (${sub.id})`);
                        await deleteEventSubSubscription(sub.id, accessToken);
                    }
                }
            }

            console.log('EventSub service initialized and old subscriptions cleaned up');
        } catch (err) {
            console.error('Error initializing EventSub service:', err);
        }
    }

    /**
     * Sets the WebSocket session ID (typically called internally when session is established).
     */
    public setWebSocketSessionId(sessionId: string): void {
        this.sessionId = sessionId;
    }

    /**
     * Gets the current WebSocket session ID.
     * @returns Session ID if connected, null otherwise
     */
    public getWebSocketSessionId(): string | null {
        return this.sessionId;
    }

    /**
     * Sets the broadcaster user ID (used for subscription conditions).
     */
    public setBroadcasterUserId(broadcasterUserId: string): void {
        this.broadcasterUserId = broadcasterUserId;
    }

    /**
     * Sets the moderator user ID (used for channel.follow subscriptions).
     */
    public setModeratorUserId(moderatorUserId: string): void {
        this.moderatorUserId = moderatorUserId;
    }

    /**
     * Creates a new EventSub subscription for a specific event type.
     * 
     * Automatically starts WebSocket connection if not already connected.
     * Validates subscription type, checks for duplicates, builds condition object
     * based on subscription type requirements, and creates subscription via Twitch API.
     * Stores subscription info in memory upon success.
     * 
     * @param type - Subscription type (e.g., 'channel.follow', 'channel.chat.message')
     * @param broadcasterUserId - Broadcaster's Twitch user ID (required for all subscriptions)
     * @param moderatorUserId - Moderator user ID (required for 'channel.follow' type)
     * @param userId - User ID (required for 'channel.chat.message' type)
     * @returns Promise with success status, subscription data if successful, or error message
     */
    public async createSubscription(
        type: string,
        broadcasterUserId: string,
        moderatorUserId?: string,
        userId?: string
    ): Promise<{ success: boolean; data?: SubscriptionInfo; error?: string }> {
        try {
            // Validate subscription type
            if (!SUPPORTED_SUBSCRIPTION_TYPES.includes(type)) {
                return { success: false, error: `Unsupported subscription type: ${type}` };
            }

            // Check if already exists
            if (this.subscriptions.has(type)) {
                return { success: false, error: `Subscription for type ${type} already exists` };
            }

            // Check if WebSocket is connected, if not, start it
            if (!this.isWebSocketConnected()) {
                const wsResult = await this.startWebSocketConnection();
                if (!wsResult.success) {
                    return { success: false, error: wsResult.error || 'Failed to establish WebSocket connection' };
                }
            }

            // Wait for session ID if connection is still being established
            if (!this.sessionId && this.sessionReadyPromise) {
                try {
                    this.sessionId = await this.sessionReadyPromise;
                } catch (err: any) {
                    return { success: false, error: `Failed to get session ID: ${err.message}` };
                }
            }

            if (!this.sessionId) {
                return { success: false, error: 'WebSocket session ID not available' };
            }

            // Get valid access token
            const accessToken = await TwitchAdminService.getInstance().getValidAccessToken();
            if (!accessToken) {
                return { success: false, error: 'No valid access token available' };
            }

            // Build condition object based on subscription type
            const condition: Record<string, string> = {
                broadcaster_user_id: broadcasterUserId
            };

            // channel.follow requires moderator_user_id
            if (type === 'channel.follow') {
                if (!moderatorUserId) {
                    return { success: false, error: 'moderator_user_id is required for channel.follow subscription' };
                }
                condition.moderator_user_id = moderatorUserId;
            }

            // channel.chat.message requires user_id
            if (type === 'channel.chat.message') {
                if (!userId) {
                    return { success: false, error: 'user_id is required for channel.chat.message subscription' };
                }
                condition.user_id = userId;
            }

            // Get version for this subscription type
            const version = SUBSCRIPTION_VERSIONS[type];

            // Create subscription via Twitch API
            const result = await createEventSubSubscription(
                type,
                version,
                condition,
                this.sessionId,
                accessToken
            );

            if (!result.success || !result.data) {
                return { success: false, error: result.error || 'Failed to create subscription' };
            }

            // Store subscription info in memory
            const subscriptionInfo: SubscriptionInfo = {
                subscriptionId: result.data.id,
                type: result.data.type,
                status: result.data.status,
                sessionId: this.sessionId,
                createdAt: new Date(result.data.created_at)
            };

            this.subscriptions.set(type, subscriptionInfo);

            return { success: true, data: subscriptionInfo };
        } catch (err: any) {
            console.error('Error creating subscription:', err);
            return { success: false, error: err.message || 'Unknown error' };
        }
    }

    /**
     * Gets a subscription by type from in-memory storage.
     * @param type - Subscription type to retrieve
     * @returns Subscription info if found, null otherwise
     */
    public getSubscription(type: string): SubscriptionInfo | null {
        return this.subscriptions.get(type) || null;
    }

    /**
     * Gets all subscriptions from in-memory storage.
     * @returns Array of all subscription info objects
     */
    public getAllSubscriptions(): SubscriptionInfo[] {
        return Array.from(this.subscriptions.values());
    }

    /**
     * Deletes a subscription by subscription ID.
     * Finds the subscription in memory by ID, deletes it from Twitch API,
     * and removes it from in-memory storage.
     * 
     * @param subscriptionId - The Twitch subscription ID to delete
     * @returns Promise with success status or error message
     */
    public async deleteSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Find subscription by ID
            let subscriptionType: string | null = null;
            for (const [type, info] of this.subscriptions.entries()) {
                if (info.subscriptionId === subscriptionId) {
                    subscriptionType = type;
                    break;
                }
            }

            if (!subscriptionType) {
                return { success: false, error: 'Subscription not found in memory' };
            }

            // Get valid access token
            const accessToken = await TwitchAdminService.getInstance().getValidAccessToken();
            if (!accessToken) {
                return { success: false, error: 'No valid access token available' };
            }

            // Delete from Twitch
            const result = await deleteEventSubSubscription(subscriptionId, accessToken);
            if (!result.success) {
                return { success: false, error: result.error || 'Failed to delete subscription' };
            }

            // Remove from memory
            this.subscriptions.delete(subscriptionType);

            return { success: true };
        } catch (err: any) {
            console.error('Error deleting subscription:', err);
            return { success: false, error: err.message || 'Unknown error' };
        }
    }

    /**
     * Deletes a subscription by subscription type.
     * Convenience method that looks up the subscription ID by type and calls deleteSubscription.
     * 
     * @param type - Subscription type to delete
     * @returns Promise with success status or error message
     */
    public async deleteSubscriptionByType(type: string): Promise<{ success: boolean; error?: string }> {
        const subscription = this.subscriptions.get(type);
        if (!subscription) {
            return { success: false, error: `Subscription for type ${type} not found` };
        }

        return await this.deleteSubscription(subscription.subscriptionId);
    }

    /**
     * Updates the status of a subscription in memory.
     * Called when receiving status updates from Twitch (e.g., revocation messages).
     * 
     * @param subscriptionId - Subscription ID to update
     * @param status - New status value (e.g., 'enabled', 'authorization_revoked')
     */
    public updateSubscriptionStatus(subscriptionId: string, status: string): void {
        for (const [type, info] of this.subscriptions.entries()) {
            if (info.subscriptionId === subscriptionId) {
                info.status = status;
                break;
            }
        }
    }

    /**
     * Checks if the WebSocket connection is active and ready.
     * Connection is considered ready when WebSocket is open and session ID is available.
     * 
     * @returns true if connected and ready, false otherwise
     */
    public isWebSocketConnected(): boolean {
        return this.websocket !== null && 
               this.websocket.readyState === WebSocket.OPEN && 
               this.sessionId !== null;
    }

    /**
     * Starts the WebSocket connection to Twitch EventSub.
     * 
     * Establishes connection to wss://eventsub.wss.twitch.tv/ws (or reconnect URL if provided).
     * Waits for session_welcome message to receive session ID.
     * Sets up message handlers for all EventSub message types.
     * Handles connection errors and timeouts (30 second timeout).
     * 
     * If already connected or currently connecting, returns success immediately.
     * 
     * @returns Promise with success status or error message
     */
    public async startWebSocketConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            // If already connected, return success
            if (this.isWebSocketConnected()) {
                return { success: true };
            }

            // If already connecting, wait for it
            if (this.isConnecting && this.sessionReadyPromise) {
                try {
                    await this.sessionReadyPromise;
                    return { success: true };
                } catch (err: any) {
                    return { success: false, error: err.message };
                }
            }

            // Close existing connection if it exists but isn't open
            if (this.websocket) {
                this.websocket.removeAllListeners();
                if (this.websocket.readyState !== WebSocket.CLOSED) {
                    this.websocket.close();
                }
                this.websocket = null;
            }

            this.isConnecting = true;
            this.sessionId = null;
            this.reconnectUrl = null;

            // Create promise for session ID
            this.sessionReadyPromise = new Promise<string>((resolve, reject) => {
                this.sessionReadyResolve = resolve;
                this.sessionReadyReject = reject;

                // Timeout after 30 seconds
                setTimeout(() => {
                    if (this.sessionReadyReject) {
                        this.sessionReadyReject(new Error('WebSocket connection timeout'));
                        this.sessionReadyReject = null;
                        this.sessionReadyResolve = null;
                        this.sessionReadyPromise = null;
                        this.isConnecting = false;
                    }
                }, 30000);
            });

            // Connect to Twitch EventSub WebSocket
            const wsUrl = this.reconnectUrl || 'wss://eventsub.wss.twitch.tv/ws';
            console.log(`Connecting to Twitch EventSub WebSocket: ${wsUrl}`);
            
            this.websocket = new WebSocket(wsUrl);

            this.websocket.on('open', () => {
                console.log('EventSub WebSocket connection opened');
            });

            this.websocket.on('message', (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleWebSocketMessage(message);
                } catch (err: any) {
                    console.error('Error parsing WebSocket message:', err);
                    console.error('Raw message:', data.toString());
                }
            });

            this.websocket.on('error', (error: Error) => {
                console.error('EventSub WebSocket error:', error);
                if (this.sessionReadyReject) {
                    this.sessionReadyReject(error);
                    this.sessionReadyReject = null;
                    this.sessionReadyResolve = null;
                    this.sessionReadyPromise = null;
                }
                this.isConnecting = false;
            });

            this.websocket.on('close', (code: number, reason: Buffer) => {
                const reasonStr = reason.toString();
                console.log(`EventSub WebSocket closed: ${code} - ${reasonStr}`);
                
                // Handle specific close codes
                if (code === 4003) {
                    console.warn('EventSub: Connection closed due to being unused. You must create at least one subscription within 10 seconds of connecting.');
                } else if (code === 4008) {
                    console.warn('EventSub: Connection closed due to reconnection timeout.');
                } else if (code === 4009) {
                    console.warn('EventSub: Connection closed due to invalid message received.');
                }
                
                this.websocket = null;
                this.isConnecting = false;
                this.sessionId = null;
                this.sessionReadyPromise = null;
                this.sessionReadyResolve = null;
                this.sessionReadyReject = null;
            });

            // Wait for session ID
            try {
                await this.sessionReadyPromise;
                return { success: true };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        } catch (err: any) {
            console.error('Error starting WebSocket connection:', err);
            this.isConnecting = false;
            return { success: false, error: err.message || 'Unknown error' };
        }
    }

    /**
     * Stops the WebSocket connection to Twitch EventSub.
     * 
     * Before closing the connection:
     * 1. Deletes all active subscriptions from Twitch API to prevent orphaned subscriptions
     * 2. Clears subscriptions from in-memory storage
     * 3. Closes the WebSocket connection
     * 
     * If some subscriptions fail to delete, the WebSocket is still closed,
     * but an error message is included in the response.
     * 
     * @returns Promise with success status or error message
     */
    public async stopWebSocketConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            // First, delete all active subscriptions
            const subscriptionTypes = Array.from(this.subscriptions.keys());
            const deletionErrors: string[] = [];

            for (const type of subscriptionTypes) {
                const result = await this.deleteSubscriptionByType(type);
                if (!result.success) {
                    deletionErrors.push(`Failed to delete ${type}: ${result.error || 'Unknown error'}`);
                    console.error(`Error deleting subscription ${type}:`, result.error);
                }
            }

            // Clear subscriptions from memory
            this.subscriptions.clear();

            // Now close the WebSocket connection
            if (!this.websocket) {
                return { success: true };
            }

            return new Promise((resolve) => {
                try {
                    this.websocket!.once('close', () => {
                        console.log('EventSub WebSocket connection closed');
                        this.websocket = null;
                        this.sessionId = null;
                        this.isConnecting = false;
                        this.sessionReadyPromise = null;
                        this.sessionReadyResolve = null;
                        this.sessionReadyReject = null;
                        
                        // If there were deletion errors, include them in the response
                        if (deletionErrors.length > 0) {
                            resolve({ 
                                success: true, 
                                error: `WebSocket closed, but some subscriptions failed to delete: ${deletionErrors.join('; ')}` 
                            });
                        } else {
                            resolve({ success: true });
                        }
                    });

                    this.websocket!.close();
                } catch (err: any) {
                    console.error('Error closing WebSocket connection:', err);
                    resolve({ success: false, error: err.message || 'Unknown error' });
                }
            });
        } catch (err: any) {
            console.error('Error stopping WebSocket connection:', err);
            return { success: false, error: err.message || 'Unknown error' };
        }
    }

    /**
     * Handles incoming WebSocket messages from Twitch EventSub.
     * 
     * Parses message structure (can be metadata/payload format or direct format)
     * and routes to appropriate handler based on message_type:
     * - session_welcome: Initial connection, contains session ID
     * - session_keepalive: Keepalive ping (no action needed)
     * - session_reconnect: Twitch requesting reconnection with new URL
     * - notification: Event notification (e.g., new follower, chat message)
     * - revocation: Subscription revoked by Twitch
     * 
     * @param message - Raw WebSocket message from Twitch
     */
    private handleWebSocketMessage(message: any): void {
        // Twitch EventSub messages can have metadata/payload structure or be direct
        let metadata = message.metadata;
        let payload = message.payload;
        let messageType: string | null = null;

        // Check if message has metadata structure
        if (metadata && metadata.message_type) {
            messageType = metadata.message_type;
        } 
        // Check if message is direct (some message types like session_welcome are direct)
        else if (message.message_type) {
            messageType = message.message_type;
            payload = message;
        }
        // Check if it's a direct payload (notification format)
        else if (message.subscription) {
            // This is a notification message
            messageType = 'notification';
            payload = message;
        }

        if (!messageType) {
            console.warn('EventSub: Received message without message_type:', JSON.stringify(message, null, 2));
            return;
        }

        switch (messageType) {
            case 'session_welcome':
                this.handleSessionWelcome(payload);
                break;
            case 'session_keepalive':
                // Keepalive messages don't require a response, they're just to keep connection alive
                console.log('EventSub: Received keepalive');
                break;
            case 'session_reconnect':
                this.handleSessionReconnect(payload);
                break;
            case 'notification':
                this.handleNotification(payload);
                break;
            case 'revocation':
                this.handleRevocation(payload);
                break;
            default:
                console.warn(`EventSub: Unknown message type: ${messageType}`, JSON.stringify(message, null, 2));
        }
    }

    /**
     * Handles session_welcome message from Twitch.
     * Extracts session ID and resolves the sessionReadyPromise so that
     * subscription creation can proceed.
     * 
     * @param payload - Welcome message payload containing session information
     */
    private handleSessionWelcome(payload: any): void {
        try {
            const sessionId = payload.session?.id;
            if (!sessionId) {
                console.error('EventSub: Welcome message missing session ID');
                if (this.sessionReadyReject) {
                    this.sessionReadyReject(new Error('Welcome message missing session ID'));
                }
                return;
            }

            this.sessionId = sessionId;
            this.setWebSocketSessionId(sessionId);
            this.isConnecting = false;

            console.log(`EventSub: Session welcome received, session ID: ${sessionId}`);

            if (this.sessionReadyResolve) {
                this.sessionReadyResolve(sessionId);
                this.sessionReadyResolve = null;
                this.sessionReadyReject = null;
                this.sessionReadyPromise = null;
            }
        } catch (err: any) {
            console.error('Error handling session welcome:', err);
            if (this.sessionReadyReject) {
                this.sessionReadyReject(err);
                this.sessionReadyReject = null;
                this.sessionReadyResolve = null;
                this.sessionReadyPromise = null;
            }
            this.isConnecting = false;
        }
    }

    /**
     * Handles session_reconnect message from Twitch.
     * Twitch may request reconnection to a new URL for maintenance or load balancing.
     * Stores the reconnect URL, closes current connection, and reconnects after a delay.
     * 
     * @param payload - Reconnect message payload containing new connection URL
     */
    private handleSessionReconnect(payload: any): void {
        try {
            const reconnectUrl = payload.session?.reconnect_url;
            if (!reconnectUrl) {
                console.error('EventSub: Reconnect message missing reconnect URL');
                return;
            }

            console.log(`EventSub: Reconnect requested, new URL: ${reconnectUrl}`);
            this.reconnectUrl = reconnectUrl;

            // Close current connection and reconnect
            if (this.websocket) {
                this.websocket.close();
            }

            // Reconnect after a short delay
            setTimeout(() => {
                this.startWebSocketConnection().catch(err => {
                    console.error('Error reconnecting WebSocket:', err);
                });
            }, 1000);
        } catch (err: any) {
            console.error('Error handling session reconnect:', err);
        }
    }

    /**
     * Handles revocation message from Twitch.
     * Occurs when a subscription is revoked (e.g., authorization revoked, user removed).
     * Updates subscription status in memory and removes it if fully revoked.
     * 
     * @param payload - Revocation message payload containing subscription information
     */
    private handleRevocation(payload: any): void {
        try {
            const subscription = payload.subscription;
            if (!subscription) {
                console.warn('EventSub: Revocation message missing subscription info');
                return;
            }

            const subscriptionId = subscription.id;
            const subscriptionType = subscription.type;
            const status = subscription.status;

            console.log(`EventSub: Subscription revoked - ${subscriptionType} (${subscriptionId}), status: ${status}`);

            // Update status and optionally remove from memory
            this.updateSubscriptionStatus(subscriptionId, status);

            // Remove from memory if revoked
            if (status === 'authorization_revoked' || status === 'user_removed') {
                for (const [type, info] of this.subscriptions.entries()) {
                    if (info.subscriptionId === subscriptionId) {
                        this.subscriptions.delete(type);
                        console.log(`EventSub: Removed revoked subscription from memory: ${type}`);
                        break;
                    }
                }
            }
        } catch (err: any) {
            console.error('Error handling revocation:', err);
        }
    }

    /**
     * Handles EventSub notification messages (actual event data).
     * 
     * Processes incoming event notifications (e.g., new follower, chat message, stream online).
     * Logs notification details to console with formatted output.
     * Updates subscription status if changed.
     * Calls logEventDetails for type-specific logging.
     * 
     * This is the main handler for receiving real-time events from Twitch.
     * 
     * @param notification - Notification payload containing subscription and event data
     */
    public handleNotification(notification: any): void {
        try {
            // Extract notification metadata
            const subscription = notification.subscription;
            const event = notification.event;
            
            if (!subscription || !event) {
                console.warn('EventSub: Received malformed notification:', JSON.stringify(notification, null, 2));
                return;
            }

            const subscriptionType = subscription.type;
            const subscriptionId = subscription.id;
            const status = subscription.status;

            // Log the notification with formatted output
            console.log('='.repeat(80));
            console.log(`[EventSub Notification] ${subscriptionType}`);
            console.log(`Subscription ID: ${subscriptionId}`);
            console.log(`Status: ${status}`);
            console.log(`Timestamp: ${new Date().toISOString()}`);
            console.log('Event Data:', JSON.stringify(event, null, 2));
            console.log('='.repeat(80));

            // Update subscription status if it changed
            if (status) {
                this.updateSubscriptionStatus(subscriptionId, status);
            }

            // Log specific event details based on type
            this.logEventDetails(subscriptionType, event);

            // Broadcast to dashboard WebSocket clients
            this.broadcastToDashboard(subscriptionType, event);
        } catch (err: any) {
            console.error('Error handling EventSub notification:', err);
            console.error('Notification payload:', JSON.stringify(notification, null, 2));
        }
    }

    /**
     * Broadcasts EventSub notifications to dashboard WebSocket clients.
     * @param subscriptionType - Type of subscription (e.g., 'stream.online', 'channel.follow')
     * @param event - Event data from Twitch
     */
    private broadcastToDashboard(subscriptionType: string, event: any): void {
        try {
            // Lazy import to avoid circular dependency
            import('./dashboardWebSocketService').then(module => {
                const DashboardWebSocketService = module.default;
                const dashboardService = DashboardWebSocketService.getInstance();

                switch (subscriptionType) {
                    case 'stream.online':
                        dashboardService.broadcastStreamStarted();
                        break;
                    case 'stream.offline':
                        dashboardService.broadcastStreamEnded();
                        break;
                    case 'channel.follow':
                        const followerUsername = event.user_name || event.user_login || 'Unknown';
                        dashboardService.broadcastNewFollower(followerUsername);
                        break;
                    case 'channel.subscribe':
                        const subscriberUsername = event.user_name || event.user_login || 'Unknown';
                        dashboardService.broadcastNewSubscriber(subscriberUsername);
                        break;
                }
            }).catch(() => {
                // Silently fail if dashboard service is not available
                // This allows EventSub to work even if dashboard WebSocket is not initialized
            });
        } catch (err: any) {
            // Silently fail if dashboard service is not available
        }
    }

    /**
     * Logs type-specific event details to console.
     * Provides human-readable summaries for each event type.
     * 
     * @param type - Subscription type (e.g., 'channel.follow', 'channel.chat.message')
     * @param event - Event data payload from Twitch
     */
    private logEventDetails(type: string, event: any): void {
        try {
            switch (type) {
                case 'channel.chat.message':
                    console.log(`[Chat Message] ${event.chatter_user_name || event.chatter_user_login || 'Unknown'}: ${event.message?.text || 'N/A'}`);
                    break;
                case 'channel.follow':
                    console.log(`[New Follower] ${event.user_name || event.user_login || 'Unknown'} (${event.user_login || 'N/A'}) followed the channel`);
                    break;
                case 'channel.subscribe':
                    console.log(`[New Subscriber] ${event.user_name || event.user_login || 'Unknown'} (${event.user_login || 'N/A'}) subscribed`);
                    break;
                case 'channel.subscription.end':
                    console.log(`[Subscription Ended] ${event.user_name || event.user_login || 'Unknown'} (${event.user_login || 'N/A'}) subscription ended`);
                    break;
                case 'channel.subscription.gift':
                    console.log(`[Gift Subscription] ${event.user_name || event.user_login || 'Unknown'} gifted ${event.total || 'N/A'} subscriptions`);
                    break;
                case 'channel.subscription.message':
                    console.log(`[Resub Message] ${event.user_name || event.user_login || 'Unknown'}: ${event.message?.text || 'N/A'} (${event.cumulative_months || 0} months)`);
                    break;
                case 'stream.online':
                    console.log(`[Stream Online] Stream started: ${event.title || 'N/A'} (${event.type || 'N/A'})`);
                    break;
                case 'stream.offline':
                    console.log(`[Stream Offline] Stream ended`);
                    break;
                default:
                    // Generic log for unknown types
                    break;
            }
        } catch (err: any) {
            console.error('Error logging event details:', err);
        }
    }
}

export default TwitchEventSubService;

