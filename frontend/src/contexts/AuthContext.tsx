import { createContext, useContext, useState } from 'react';
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
    doLogin: (loginBody: { username: string, password: string }) => Promise<{ success: boolean, status: number }>;
    doLogout: () => Promise<{ success: boolean, status: number }>;
    doRegister: (registerBody: { username: string, email: string, password: string }) => Promise<{ success: boolean, status: number }>;
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
        catch (err) {
            console.error('Login failed:', err);
            return { success: false, status: 500 };
        }
    }

    const doLogout = async () => {
        setAuth({ user: null, accessToken: '' });
        try {
            await axiosAuthUnprotected.post('/logout');
            return { success: true, status: 200 };
        }
        catch (err) {
            console.error('Logout failed:', err);
            return { success: false, status: 500 };
        }
    }

    const doRegister = async (registerBody: { username: string, email: string, password: string }) => {
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
        <AuthContext.Provider value={{ auth, setAuth, getUser, doLogin, doLogout, doRegister }}>
            {children}
        </AuthContext.Provider>
    );
}