import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTwitchHealthCheck } from '../../hooks/useTwitchHealthCheck';
import './Register.css';

interface TwitchRegisterData {
    email: string;
    username: string;
    twitch_user_id: string;
    verified: boolean;
}

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [twitchData, setTwitchData] = useState<TwitchRegisterData | null>(null);
    const { doRegister } = useAuthContext();
    const navigate = useNavigate();
    const { isHealthy: isTwitchHealthy, isAdminReady, isLoading: isTwitchHealthLoading } = useTwitchHealthCheck();

    useEffect(() => {
        // Check for Twitch data from callback
        const twitchDataStr = sessionStorage.getItem('twitch_register_data');
        if (twitchDataStr) {
            try {
                const data = JSON.parse(twitchDataStr) as TwitchRegisterData;
                setTwitchData(data);
                setEmail(data.email);
                // Clear from sessionStorage after reading
                sessionStorage.removeItem('twitch_register_data');
            } catch (err) {
                console.error('Error parsing Twitch data:', err);
            }
        }
    }, []);

    const initiateOAuth = () => {
        // Generate random state for CSRF protection
        const state = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('twitch_register_oauth_state', state);

        // Build Twitch authorization URL
        const clientId = 'oq27qs5xtr75kpnrwyp3xixylz1crt';
        const redirectUri = encodeURIComponent(
            `http://localhost:5173/register/callback`
        );
        const scopes = encodeURIComponent('user:read:email');
        
        const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
            `response_type=code` +
            `&client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&scope=${scopes}` +
            `&state=${state}`;

        // Redirect to Twitch
        window.location.href = authUrl;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!username || !email || !password) {
            setError('Username, email, and password are required');
            setLoading(false);
            return;
        }

        // Include twitch_user_id if available
        const registerBody: { username: string; email: string; password: string; twitch_user_id?: string } = {
            username,
            email,
            password
        };

        if (twitchData?.twitch_user_id) {
            registerBody.twitch_user_id = twitchData.twitch_user_id;
        }

        const result = await doRegister(registerBody);
        
        if (result.success) {
            navigate('/login');
        } else {
            setError('Registration failed. Please try again.');
        }
        
        setLoading(false);
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h1>Register</h1>
                
                {!isTwitchHealthLoading && (!isTwitchHealthy || !isAdminReady) && (
                    <div className="error-message" style={{ marginBottom: '1.5rem' }}>
                        <strong>⚠️ Twitch Service Unavailable</strong>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                            {!isTwitchHealthy 
                                ? 'The Twitch service is currently down. You cannot create a new account at this time, but you can still log into an existing account.'
                                : 'The Twitch admin service is not initialized. You cannot create a new account at this time, but you can still log into an existing account.'
                            }
                        </p>
                    </div>
                )}
                
                {!twitchData && (
                    <div className="twitch-connect-section">
                        <p className="twitch-connect-description">
                            To register, you must first connect your Twitch account and be following or subscribed to the channel.
                        </p>
                        <button 
                            type="button"
                            onClick={initiateOAuth}
                            className="twitch-connect-button"
                            disabled={loading}
                        >
                            Connect with Twitch
                        </button>
                    </div>
                )}

                {twitchData && (
                    <div className="success-message">
                        ✓ Twitch account verified! Email has been prefilled from your Twitch account.
                    </div>
                )}


                {twitchData && (
                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                required
                                placeholder="Choose your username"
                            />
                            {twitchData.username && (
                                <small className="form-hint">Your Twitch username: {twitchData.username}</small>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={true}
                                required
                                className="disabled-input"
                            />
                            <small className="form-hint">Email from your Twitch account (locked)</small>
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button type="submit" disabled={loading} className="submit-button">
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Register;

