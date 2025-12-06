import { createContext, useContext, useState, useEffect } from 'react';
import { decodeToken } from '../utils/decodeToken';
import { axiosAuthUnprotected } from '../api/axios';

interface AuthState {
    user: {
        _id: string;
        username: string;
        roles: number[];
    } | null;
    accessToken?: string;
}

interface AuthContextType {
    auth: AuthState;
    setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
    getUser: () => AuthState['user'];   
    loading: boolean;
    doLogin: (loginBody: { username: string, password: string }) => Promise<{ success: boolean, status: number, message?: string }>;
    doLogout: () => Promise<{ success: boolean, status: number }>;
    doRegister: (registerBody: { username: string, email: string, password: string, twitch_user_id?: string }) => Promise<{ success: boolean, status: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [auth, setAuth] = useState<AuthState>({ user: null });
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                // Attempt to refresh the access token using the refresh token cookie
                const response = await axiosAuthUnprotected.get('/refresh');
                const newAuth = decodeToken(response?.data.accessToken);
                if (newAuth) {
                    setAuth({
                        accessToken: newAuth?.accessToken,
                        user: newAuth?.user || null,
                    });
                }
            } catch (err) {
                // No valid refresh token cookie or it's expired
                // Leave auth state as null (user is not logged in)
                setAuth({ user: null });
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    const doLogin = async (loginBody: { username: string, password: string }) => {
        try {
            const response = await axiosAuthUnprotected.post('/login', JSON.stringify(loginBody));
            const newAuth = decodeToken(response?.data.accessToken);
            setAuth({
                accessToken: newAuth?.accessToken,
                user: newAuth?.user || null,
            });
            return { success: true, status: 200 };
        }
        catch (err: any) {
            console.error('Login failed:', err);
            const status = err?.response?.status || 500;
            const message = err?.response?.data?.message || 'Login failed. Please try again.';
            return { 
                success: false, 
                status,
                message
            };
        }
    }

    const doLogout = async () => {
        setAuth({ user: null, accessToken: '' });
        try {
            await axiosAuthUnprotected.get('/logout');
            return { success: true, status: 200 };
        }
        catch (err) {
            console.error('Logout failed:', err);
            return { success: false, status: 500 };
        }
    }

    const doRegister = async (registerBody: { username: string, email: string, password: string, twitch_user_id?: string }) => {
        try {
            await axiosAuthUnprotected.post('/register', JSON.stringify(registerBody));
            return { success: true, status: 201 };
        }
        catch (err) {
            console.error('Registration failed:', err);
            return { success: false, status: 500 };
        }
    }

    const getUser = () => {
        return auth?.user || null;
    }

    return (
        <AuthContext.Provider value={{ auth, setAuth, getUser, loading, doLogin, doLogout, doRegister }}>
            {children}
        </AuthContext.Provider>
    );
}