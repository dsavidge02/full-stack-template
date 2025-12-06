import { getUserInfo, refreshUserAccessToken, getChannelFollowers, getChannelSubscribers } from '../utils/twitchAPI';

class TwitchAdminService {
    private static instance: TwitchAdminService;
    
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private streamerId: string | null = null;
    private tokenExpiresAt: Date | null = null;
    private scopes: string[] = [];

    private constructor() {}

    public static getInstance(): TwitchAdminService {
        if (!TwitchAdminService.instance) {
            TwitchAdminService.instance = new TwitchAdminService();
        }
        return TwitchAdminService.instance;
    }

    public async initializeToken(accessToken: string, refreshToken: string, expiresIn: number, scopes: string[]): Promise<boolean> {
        try {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.scopes = scopes;
            
            // Calculate expiration time (expiresIn is in seconds)
            this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

            // Fetch streamer ID
            const streamerId = await this.fetchStreamerId(accessToken);
            if (streamerId) {
                this.streamerId = streamerId;
            } else {
                console.error('Failed to fetch streamer ID, but token was stored');
            }

            return true;
        } catch (err) {
            console.error('Error initializing token:', err);
            return false;
        }
    }

    public async getValidAccessToken(): Promise<string | null> {
        if (!this.accessToken || !this.refreshToken) {
            return null;
        }

        // Check if token needs refresh
        if (this.isTokenExpired()) {
            const refreshed = await this.refreshTokenIfNeeded();
            if (!refreshed) {
                return null;
            }
        }

        return this.accessToken;
    }

    public getTokenInfo(): { accessToken: string | null; refreshToken: string | null; tokenExpiresAt: Date | null; scopes: string[] } {
        return {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            tokenExpiresAt: this.tokenExpiresAt,
            scopes: this.scopes
        };
    }

    public async getChannelFollowers(userId?: string): Promise<{ success: boolean; data?: { total: number; followers: any[] } }> {
        const accessToken = await this.getValidAccessToken();
        if (!accessToken) {
            return { success: false };
        }

        if (!this.streamerId) {
            console.error('Streamer ID not available');
            return { success: false };
        }

        return await getChannelFollowers(accessToken, this.streamerId, userId);
    }

    public async getChannelSubscribers(userId?: string): Promise<{ success: boolean; data?: { total: number; points: number; subscribers: any[] } }> {
        const accessToken = await this.getValidAccessToken();
        if (!accessToken) {
            return { success: false };
        }

        if (!this.streamerId) {
            console.error('Streamer ID not available');
            return { success: false };
        }

        return await getChannelSubscribers(accessToken, this.streamerId, userId);
    }

    private async fetchStreamerId(accessToken: string): Promise<string | null> {
        try {
            const userInfoResponse = await getUserInfo(accessToken);
            if (userInfoResponse.success && userInfoResponse.data) {
                return userInfoResponse.data.id;
            }
            return null;
        } catch (err) {
            console.error('Error fetching streamer ID:', err);
            return null;
        }
    }

    private async refreshTokenIfNeeded(): Promise<boolean> {
        if (!this.refreshToken) {
            return false;
        }

        try {
            const refreshResponse = await refreshUserAccessToken(this.refreshToken);
            if (!refreshResponse.success || !refreshResponse.data) {
                console.error('Failed to refresh token');
                return false;
            }

            // Update tokens
            this.accessToken = refreshResponse.data.access_token;
            this.refreshToken = refreshResponse.data.refresh_token;
            this.scopes = refreshResponse.data.scope;
            this.tokenExpiresAt = new Date(Date.now() + refreshResponse.data.expires_in * 1000);

            // Update streamer ID if needed (shouldn't change, but just in case)
            if (!this.streamerId) {
                const streamerId = await this.fetchStreamerId(this.accessToken);
                if (streamerId) {
                    this.streamerId = streamerId;
                }
            }

            return true;
        } catch (err) {
            console.error('Error refreshing token:', err);
            return false;
        }
    }

    private isTokenExpired(): boolean {
        if (!this.tokenExpiresAt) {
            return true;
        }

        // Add 5-minute buffer before actual expiration
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        return Date.now() >= (this.tokenExpiresAt.getTime() - bufferTime);
    }
}

export default TwitchAdminService;

