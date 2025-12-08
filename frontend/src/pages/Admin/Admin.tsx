import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useTwitchAxiosPrivate from '../../hooks/useTwitchAxiosPrivate';
import { getTwitchAdminToken, exchangeTwitchAdminToken } from '../../api/api';
import './Admin.css';

interface TokenInfo {
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: string | null;
    scopes: string[];
}

function Admin() {
    const [searchParams] = useSearchParams();
    const twitchAxiosPrivate = useTwitchAxiosPrivate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [code, setCode] = useState('');

    // Check for callback code
    useEffect(() => {
        const callbackCode = searchParams.get('code');
        if (callbackCode) {
            handleExchange(callbackCode);
            // Clean up URL params
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [searchParams]);

    // Load token info on mount
    useEffect(() => {
        loadTokenInfo();
    }, []);

    const loadTokenInfo = async () => {
        try {
            const response = await getTwitchAdminToken(twitchAxiosPrivate);
            if (response.accessToken) {
                setTokenInfo({
                    accessToken: response.accessToken,
                    refreshToken: response.refreshToken,
                    tokenExpiresAt: response.tokenExpiresAt,
                    scopes: response.scopes || []
                });
            } else {
                setTokenInfo(null);
            }
        } catch (err: any) {
            if (err.response?.status === 404) {
                setTokenInfo(null);
            } else {
                console.error('Error loading token info:', err);
                setError('Failed to load token information');
            }
        }
    };

    const handleExchange = async (authCode: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await exchangeTwitchAdminToken(twitchAxiosPrivate, authCode);
            if (response.success) {
                setSuccess('Token initialized successfully!');
                setCode('');
                // Reload token info
                await loadTokenInfo();
            } else {
                setError(response.message || 'Failed to initialize token');
            }
        } catch (err: any) {
            console.error('Error exchanging token:', err);
            setError(
                err.response?.data?.message || 
                'Failed to exchange authorization code. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            setError('Please enter an authorization code');
            return;
        }
        handleExchange(code);
    };

    const initiateOAuth = () => {
        // Generate random state for CSRF protection
        const state = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('twitch_admin_oauth_state', state);

        // Build Twitch authorization URL
        const clientId = 'oq27qs5xtr75kpnrwyp3xixylz1crt';
        const redirectUri = encodeURIComponent(
            // `https://savidgeapps.com/admin`
            'http://localhost:5173/admin'
        );
        const scopes = encodeURIComponent('channel:read:polls channel:manage:polls moderator:read:followers channel:read:subscriptions');
        
        const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
            `response_type=code` +
            `&client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&scope=${scopes}` +
            `&state=${state}`;

        // Redirect to Twitch
        window.location.href = authUrl;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-card">
                <h1>Twitch Admin</h1>
                <p className="admin-description">
                    Manage your Twitch admin token for accessing channel followers and subscribers.
                </p>

                {success && (
                    <div className="success-message">
                        {success}
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="loading-message">
                        Processing...
                    </div>
                )}

                {!tokenInfo ? (
                    <div className="token-section">
                        <h2>Initialize Token</h2>
                        <p className="section-description">
                            No token is currently initialized. You can either:
                        </p>
                        <div className="init-options">
                            <div className="option-card">
                                <h3>Option 1: OAuth Flow</h3>
                                <p>Click the button below to authorize via Twitch OAuth</p>
                                <button 
                                    onClick={initiateOAuth} 
                                    className="admin-button primary"
                                    disabled={loading}
                                >
                                    Authorize with Twitch
                                </button>
                            </div>
                            <div className="option-card">
                                <h3>Option 2: Manual Code</h3>
                                <p>If you already have an authorization code, enter it below:</p>
                                <form onSubmit={handleSubmit} className="code-form">
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="Enter authorization code"
                                        className="code-input"
                                        disabled={loading}
                                    />
                                    <button 
                                        type="submit" 
                                        className="admin-button"
                                        disabled={loading || !code.trim()}
                                    >
                                        Exchange Code
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="token-section">
                        <h2>Token Information</h2>
                        <div className="token-info-grid">
                            <div className="info-item">
                                <h3>Access Token</h3>
                                <div className="token-value">{tokenInfo.accessToken}</div>
                            </div>
                            <div className="info-item">
                                <h3>Refresh Token</h3>
                                <div className="token-value">{tokenInfo.refreshToken}</div>
                            </div>
                            <div className="info-item">
                                <h3>Expires At</h3>
                                <div className="token-value">{formatDate(tokenInfo.tokenExpiresAt)}</div>
                            </div>
                            <div className="info-item">
                                <h3>Scopes</h3>
                                <div className="scopes-list">
                                    {tokenInfo.scopes.length > 0 ? (
                                        tokenInfo.scopes.map((scope, index) => (
                                            <span key={index} className="scope-tag">{scope}</span>
                                        ))
                                    ) : (
                                        <span className="no-scopes">No scopes</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="token-actions">
                            <button 
                                onClick={initiateOAuth} 
                                className="admin-button"
                                disabled={loading}
                            >
                                Re-initialize Token
                            </button>
                            <button 
                                onClick={loadTokenInfo} 
                                className="admin-button secondary"
                                disabled={loading}
                            >
                                Refresh Info
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Admin;

