import axios from 'axios';

const clientId = process.env.TWITCH_CLIENT_ID;
if (!clientId) throw new Error('Missing TWITCH_CLIENT_ID.');

interface EventSubSubscription {
    id: string;
    status: string;
    type: string;
    version: string;
    condition: Record<string, string>;
    created_at: string;
    transport: {
        method: string;
        session_id?: string;
        callback?: string;
        connected_at?: string;
        disconnected_at?: string;
    };
    cost: number;
}

interface CreateEventSubResponse {
    data: EventSubSubscription[];
    total: number;
    total_cost: number;
    max_total_cost: number;
}

interface GetEventSubResponse {
    data: EventSubSubscription[];
    total: number;
    total_cost: number;
    max_total_cost: number;
    pagination?: {
        cursor?: string;
    };
}

/**
 * Creates a new EventSub subscription via Twitch's API.
 * This subscription will receive real-time notifications for the specified event type
 * through the WebSocket connection identified by the sessionId.
 * 
 * @param type - The EventSub subscription type (e.g., 'channel.follow', 'channel.chat.message')
 * @param version - The version of the subscription type (e.g., '1', '2')
 * @param condition - Object containing condition fields required for the subscription type
 *                    (e.g., { broadcaster_user_id: '123', user_id: '456' })
 * @param sessionId - The WebSocket session ID from the established EventSub WebSocket connection
 * @param accessToken - Twitch API access token with appropriate scopes
 * @returns Promise with success status, subscription data if successful, or error message
 */
export const createEventSubSubscription = async (
    type: string,
    version: string,
    condition: Record<string, string>,
    sessionId: string,
    accessToken: string
): Promise<{ success: boolean; data?: EventSubSubscription; error?: string }> => {
    try {
        const response = await axios.post<CreateEventSubResponse>(
            'https://api.twitch.tv/helix/eventsub/subscriptions',
            {
                type,
                version,
                condition,
                transport: {
                    method: 'websocket',
                    session_id: sessionId
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-Id': clientId,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.data && response.data.data.length > 0) {
            return { success: true, data: response.data.data[0] };
        }

        return { success: false, error: 'No subscription data returned' };
    } catch (err: any) {
        console.error('Error creating EventSub subscription:', err);
        if (err.response) {
            return { 
                success: false, 
                error: err.response.data?.message || `HTTP ${err.response.status}: ${err.response.statusText}` 
            };
        }
        return { success: false, error: err.message || 'Unknown error' };
    }
};

/**
 * Retrieves EventSub subscriptions from Twitch's API.
 * Can optionally filter by status, type, user_id, or subscription_id.
 * Used for querying existing subscriptions, such as during service startup cleanup.
 * 
 * @param accessToken - Twitch API access token with appropriate scopes
 * @param filters - Optional filters to narrow down the subscription list:
 *                  - status: Filter by subscription status (e.g., 'enabled', 'webhook_callback_verification_pending')
 *                  - type: Filter by subscription type (e.g., 'channel.follow')
 *                  - user_id: Filter by broadcaster user ID
 *                  - subscription_id: Filter by specific subscription ID
 * @returns Promise with success status, array of subscriptions if successful, or error message
 */
export const getEventSubSubscriptions = async (
    accessToken: string,
    filters?: {
        status?: string;
        type?: string;
        user_id?: string;
        subscription_id?: string;
    }
): Promise<{ success: boolean; data?: EventSubSubscription[]; error?: string }> => {
    try {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.type) params.append('type', filters.type);
        if (filters?.user_id) params.append('user_id', filters.user_id);
        if (filters?.subscription_id) params.append('subscription_id', filters.subscription_id);

        const url = `https://api.twitch.tv/helix/eventsub/subscriptions${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await axios.get<GetEventSubResponse>(
            url,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-Id': clientId
                }
            }
        );

        return { success: true, data: response.data.data || [] };
    } catch (err: any) {
        console.error('Error getting EventSub subscriptions:', err);
        if (err.response) {
            return { 
                success: false, 
                error: err.response.data?.message || `HTTP ${err.response.status}: ${err.response.statusText}` 
            };
        }
        return { success: false, error: err.message || 'Unknown error' };
    }
};

/**
 * Deletes an EventSub subscription from Twitch's API.
 * This removes the subscription, so no further notifications will be received for that event type.
 * Note: A 404 response is treated as success since the subscription may already be deleted.
 * 
 * @param subscriptionId - The unique ID of the subscription to delete
 * @param accessToken - Twitch API access token with appropriate scopes
 * @returns Promise with success status or error message
 */
export const deleteEventSubSubscription = async (
    subscriptionId: string,
    accessToken: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        await axios.delete(
            `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-Id': clientId
                }
            }
        );

        return { success: true };
    } catch (err: any) {
        console.error('Error deleting EventSub subscription:', err);
        if (err.response) {
            // 404 is acceptable - subscription might already be deleted
            if (err.response.status === 404) {
                return { success: true };
            }
            return { 
                success: false, 
                error: err.response.data?.message || `HTTP ${err.response.status}: ${err.response.statusText}` 
            };
        }
        return { success: false, error: err.message || 'Unknown error' };
    }
};

