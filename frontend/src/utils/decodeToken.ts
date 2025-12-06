import { jwtDecode, JwtPayload } from 'jwt-decode';

interface UserJwtPayload extends JwtPayload {
    UserInfo: {
        _id: string;
        username: string;
        roles: number[];
        twitch_user_id?: string;
    };
}

export const decodeToken = (accessToken: string) => {
    if (!accessToken) return null;

    try {
        const decoded = jwtDecode<UserJwtPayload>(accessToken);
        const { _id, username, roles, twitch_user_id } = decoded.UserInfo;
        return {
            accessToken: accessToken,
            user: {
                _id: _id || '',
                username: username || '',
                roles: roles || [],
                twitch_user_id: twitch_user_id || '',
            }
        };
    }
    catch (err) {
        console.error('Invalid access token:', err);
        return null;
    }
}