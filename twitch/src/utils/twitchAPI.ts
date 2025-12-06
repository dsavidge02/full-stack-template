import qs from 'qs';
import axios from 'axios';

const clientId = process.env.TWITCH_CLIENT_ID;
if (!clientId) throw new Error('Missing TWITCH_CLIENT_ID.');
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
if (!clientSecret) throw new Error('Missing TWITCH_CLIENT_SECRET.');
const redirectUri = process.env.TWITCH_REDIRECT_URI;
if (!redirectUri) throw new Error('Missing TWITCH_REDIRECT_URI.');

interface TokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string[];
    token_type: string;
}

export const generateUserAccessToken = async (code: string) => {
    try {
        const tokenRequestBody = qs.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        });

        const tokenResponse = await axios.post<TokenResponse>(
            'https://id.twitch.tv/oauth2/token',
            tokenRequestBody,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        return { success: true, data: tokenResponse.data};
    }
    catch (err) {
        console.error(err);
        return { success: false }
    }
}

export const refreshUserAccessToken = async (refreshToken: string) => {
    try {
        const tokenRequestBody = qs.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });

        const tokenResponse = await axios.post<TokenResponse>(
            'https://id.twitch.tv/oauth2/token',
            tokenRequestBody,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        return { success: true, data: tokenResponse.data };
    }
    catch (err) {
        console.error(err);
        return { success: false }
    }
}

interface UserInfoResponse {
    data: {
        id: string;
        login: string;
        display_name: string;
        type: string;
        broadcaster_type: string;
        description: string;
        profile_image_url: string;
        offline_image_url: string;
        view_count: number;
        email: string;
        created_at: string;
    }[];
}

export const getUserInfo = async (accessToken: string) => {
    try {
        const userInfoResponse = await axios.get<UserInfoResponse>(
            'https://api.twitch.tv/helix/users',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': clientId,
                },
            }
        );

        return { success: true, data:userInfoResponse.data.data[0]};
    }
    catch (err) {
        console.error(err);
        return { success: false }
    }
}

export const getUserInfoById = async (accessToken: string, userId: string) => {
    try {
        const userInfoResponse = await axios.get<UserInfoResponse>(
            `https://api.twitch.tv/helix/users?id=${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': clientId,
                },
            }
        );

        if (!userInfoResponse.data.data || userInfoResponse.data.data.length === 0) {
            return { success: false };
        }

        return { success: true, data: userInfoResponse.data.data[0] };
    }
    catch (err) {
        console.error(err);
        return { success: false }
    }
}

export const getUserInfoByLogin = async (accessToken: string, login: string) => {
    try {
        const userInfoResponse = await axios.get<UserInfoResponse>(
            `https://api.twitch.tv/helix/users?login=${login}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': clientId,
                },
            }
        );

        if (!userInfoResponse.data.data || userInfoResponse.data.data.length === 0) {
            return { success: false };
        }

        return { success: true, data: userInfoResponse.data.data[0] };
    }
    catch (err) {
        console.error(err);
        return { success: false }
    }
}

interface ChannelFollowersResponse {
    total: number;
    data: {
        user_id: string;
        user_name: string;
        user_login: string;
        followed_at: string;
    }[];
    pagination: {
        cursor?: string;
    };
}

export const getChannelFollowers = async (channelAccessToken: string, streamerId: string, userId?: string) => {
    try {
        const params: Record<string, string> = {
            broadcaster_id: streamerId,
        };

        if (userId) {
            params.user_id = userId;
        }

        const allFollowers: ChannelFollowersResponse['data'] = [];
        let cursor: string | undefined;
        let total: number | undefined;

        do {
            const queryParams = new URLSearchParams(params);
            if (cursor) {
                queryParams.set('after', cursor);
            }

            queryParams.set('first', '100');

            const followersResponse = await axios.get<ChannelFollowersResponse>(
                `https://api.twitch.tv/helix/channels/followers?${queryParams.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${channelAccessToken}`,
                        'Client-ID': clientId,
                    }
                }
            );

            const responseData = followersResponse.data;

            if (total === undefined) {
                total = responseData.total;
            }

            if (responseData.data && responseData.data.length > 0) {
                allFollowers.push(...responseData.data);
            }

            cursor = responseData.pagination?.cursor;

            // If checking for a specific user and found them, we can stop
            if (userId && responseData.data && responseData.data.length > 0) {
                break;
            }
            
        } while (cursor);

        return {
            success: true,
            data: {
                total: total || 0,
                followers: allFollowers,
            }
        };
    }
    catch (err) {
        console.error(err);
        return { success: false };
    }
}

interface ChannelSubscribersResponse {
    total: number;
    points: number;
    data: {
        broadcaster_id: string;
        broadcaster_login: string;
        broadcaster_name: string;
        gifter_id: string;
        gifter_login: string;
        gifter_name: string;
        is_gift: boolean;
        plan_name: string;
        tier: string;
        user_id: string;
        user_name: string;
        user_login: string;
    }[];
    pagination: {
        cursor?: string;
    };
}

export const getChannelSubscribers = async (channelAccessToken: string, streamerId: string, userId?: string) => {
    try {
        const params: Record<string, string> = {
            broadcaster_id: streamerId,
        };

        if (userId) {
            params.user_id = userId;
        }

        const allSubscribers: ChannelSubscribersResponse['data'] = [];
        let cursor: string | undefined;
        let total: number | undefined;
        let points: number | undefined;

        do {
            const queryParams = new URLSearchParams(params);
            if (cursor) {
                queryParams.set('after', cursor);
            }

            queryParams.set('first', '100');

            const subscribersResponse = await axios.get<ChannelSubscribersResponse>(
                `https://api.twitch.tv/helix/subscriptions?${queryParams.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${channelAccessToken}`,
                        'Client-ID': clientId,
                    }
                }
            );

            const responseData = subscribersResponse.data;

            if (total === undefined) {
                total = responseData.total;
            }

            if (points === undefined) {
                points = responseData.points;
            }

            if (responseData.data && responseData.data.length > 0) {
                allSubscribers.push(...responseData.data);
            }

            cursor = responseData.pagination?.cursor;

            // If checking for a specific user and found them, we can stop
            if (userId && responseData.data && responseData.data.length > 0) {
                break;
            }
            
        } while (cursor);

        return {
            success: true,
            data: {
                total: total || 0,
                points: points || 0,
                subscribers: allSubscribers,
            }
        };
    }
    catch (err) {
        console.error(err);
        return { success: false };
    }
}
