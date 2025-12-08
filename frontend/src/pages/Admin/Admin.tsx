import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useTwitchAxiosPrivate from '../../hooks/useTwitchAxiosPrivate';
import { 
    getTwitchAdminToken, 
    exchangeTwitchAdminToken,
    startEventSubWebSocket,
    stopEventSubWebSocket,
    getEventSubWebSocketStatus,
    createEventSubSubscription,
    getEventSubSubscriptions,
    deleteEventSubSubscription,
    setFollowerGoal,
    setSubscriberGoal,
    getAllGoalStatuses
} from '../../api/api';
import './Admin.css';

interface TokenInfo {
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: string | null;
    scopes: string[];
}

interface SubscriptionInfo {
    subscriptionId: string;
    type: string;
    status: string;
    sessionId: string;
    createdAt: string;
}

const SUBSCRIPTION_TYPES = [
    { value: 'channel.chat.message', label: 'Chat Messages' },
    { value: 'channel.follow', label: 'New Followers' },
    { value: 'channel.subscribe', label: 'New Subscriptions' },
    { value: 'channel.subscription.end', label: 'Subscription Ended' },
    { value: 'channel.subscription.gift', label: 'Gift Subscriptions' },
    { value: 'channel.subscription.message', label: 'Resubscription Messages' },
    { value: 'stream.online', label: 'Stream Online' },
    { value: 'stream.offline', label: 'Stream Offline' }
];

function Admin() {
    const [searchParams] = useSearchParams();
    const twitchAxiosPrivate = useTwitchAxiosPrivate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [code, setCode] = useState('');
    
    // WebSocket state
    const [wsConnected, setWsConnected] = useState(false);
    const [wsSessionId, setWsSessionId] = useState<string | null>(null);
    const [wsLoading, setWsLoading] = useState(false);
    
    // Subscription state
    const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
    const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
    const [selectedSubscriptionType, setSelectedSubscriptionType] = useState('');
    
    // Goal state
    interface GoalStatus {
        current: number;
        goal: number;
        met: boolean;
        remaining: number;
        percentage: number;
    }
    const [goalStatuses, setGoalStatuses] = useState<{ follower?: GoalStatus; subscriber?: GoalStatus } | null>(null);
    const [goalLoading, setGoalLoading] = useState(false);
    const [followerGoalInput, setFollowerGoalInput] = useState('');
    const [subscriberGoalInput, setSubscriberGoalInput] = useState('');

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
        loadWebSocketStatus();
        loadSubscriptions();
        loadGoalStatuses();
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
            `https://savidgeapps.com/admin`
            // 'http://localhost:5173/admin'
        );
        const scopes = encodeURIComponent('channel:read:polls channel:manage:polls moderator:read:followers channel:read:subscriptions user:read:chat');
        
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

    // WebSocket Management Functions
    const loadWebSocketStatus = async () => {
        try {
            const response = await getEventSubWebSocketStatus(twitchAxiosPrivate);
            if (response.success) {
                setWsConnected(response.connected);
                setWsSessionId(response.sessionId);
            }
        } catch (err: any) {
            console.error('Error loading WebSocket status:', err);
        }
    };

    const handleStartWebSocket = async () => {
        setWsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await startEventSubWebSocket(twitchAxiosPrivate);
            if (response.success) {
                setSuccess('WebSocket connection started successfully');
                setWsConnected(true);
                setWsSessionId(response.sessionId);
            } else {
                setError(response.message || 'Failed to start WebSocket connection');
            }
        } catch (err: any) {
            console.error('Error starting WebSocket:', err);
            setError(err.response?.data?.message || 'Failed to start WebSocket connection');
        } finally {
            setWsLoading(false);
        }
    };

    const handleStopWebSocket = async () => {
        setWsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await stopEventSubWebSocket(twitchAxiosPrivate);
            if (response.success) {
                setSuccess('WebSocket connection stopped successfully');
                setWsConnected(false);
                setWsSessionId(null);
            } else {
                setError(response.message || 'Failed to stop WebSocket connection');
            }
        } catch (err: any) {
            console.error('Error stopping WebSocket:', err);
            setError(err.response?.data?.message || 'Failed to stop WebSocket connection');
        } finally {
            setWsLoading(false);
        }
    };

    // Subscription Management Functions
    const loadSubscriptions = async () => {
        setSubscriptionsLoading(true);
        try {
            const response = await getEventSubSubscriptions(twitchAxiosPrivate);
            if (response.success) {
                setSubscriptions(response.data || []);
            }
        } catch (err: any) {
            console.error('Error loading subscriptions:', err);
        } finally {
            setSubscriptionsLoading(false);
        }
    };

    const handleCreateSubscription = async () => {
        if (!selectedSubscriptionType) {
            setError('Please select a subscription type');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await createEventSubSubscription(
                twitchAxiosPrivate, 
                selectedSubscriptionType
            );
            if (response.success) {
                setSuccess(`Subscription created successfully: ${selectedSubscriptionType}`);
                setSelectedSubscriptionType('');
                await loadSubscriptions();
            } else {
                setError(response.message || 'Failed to create subscription');
            }
        } catch (err: any) {
            console.error('Error creating subscription:', err);
            setError(err.response?.data?.message || 'Failed to create subscription');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubscription = async (type: string) => {
        if (!confirm(`Are you sure you want to delete the subscription for ${type}?`)) {
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await deleteEventSubSubscription(twitchAxiosPrivate, type);
            if (response.success) {
                setSuccess(`Subscription deleted successfully: ${type}`);
                await loadSubscriptions();
            } else {
                setError(response.message || 'Failed to delete subscription');
            }
        } catch (err: any) {
            console.error('Error deleting subscription:', err);
            setError(err.response?.data?.message || 'Failed to delete subscription');
        } finally {
            setLoading(false);
        }
    };

    const loadGoalStatuses = async () => {
        setGoalLoading(true);
        try {
            const response = await getAllGoalStatuses(twitchAxiosPrivate);
            if (response.success && response.data) {
                setGoalStatuses(response.data);
            }
        } catch (err: any) {
            console.error('Error loading goal statuses:', err);
        } finally {
            setGoalLoading(false);
        }
    };

    const handleSetFollowerGoal = async () => {
        const goal = parseInt(followerGoalInput);
        if (isNaN(goal) || goal <= 0) {
            setError('Please enter a valid positive number');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await setFollowerGoal(twitchAxiosPrivate, goal);
            if (response.success) {
                setSuccess('Follower goal set successfully');
                setFollowerGoalInput('');
                await loadGoalStatuses();
            } else {
                setError(response.message || 'Failed to set follower goal');
            }
        } catch (err: any) {
            console.error('Error setting follower goal:', err);
            setError(err.response?.data?.message || 'Failed to set follower goal');
        } finally {
            setLoading(false);
        }
    };

    const handleSetSubscriberGoal = async () => {
        const goal = parseInt(subscriberGoalInput);
        if (isNaN(goal) || goal <= 0) {
            setError('Please enter a valid positive number');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await setSubscriberGoal(twitchAxiosPrivate, goal);
            if (response.success) {
                setSuccess('Subscriber goal set successfully');
                setSubscriberGoalInput('');
                await loadGoalStatuses();
            } else {
                setError(response.message || 'Failed to set subscriber goal');
            }
        } catch (err: any) {
            console.error('Error setting subscriber goal:', err);
            setError(err.response?.data?.message || 'Failed to set subscriber goal');
        } finally {
            setLoading(false);
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

                {/* WebSocket Connection Section */}
                {tokenInfo && (
                    <div className="token-section">
                        <h2>EventSub WebSocket Connection</h2>
                        <div className="websocket-status">
                            <div className="status-indicator">
                                <span className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`}></span>
                                <span className="status-text">
                                    {wsConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            {wsSessionId && (
                                <div className="session-info">
                                    <strong>Session ID:</strong> {wsSessionId}
                                </div>
                            )}
                        </div>
                        <div className="token-actions">
                            <button 
                                onClick={handleStartWebSocket} 
                                className="admin-button primary"
                                disabled={wsLoading || wsConnected}
                            >
                                {wsLoading ? 'Starting...' : 'Start WebSocket'}
                            </button>
                            <button 
                                onClick={handleStopWebSocket} 
                                className="admin-button"
                                disabled={wsLoading || !wsConnected}
                            >
                                {wsLoading ? 'Stopping...' : 'Stop WebSocket'}
                            </button>
                            <button 
                                onClick={loadWebSocketStatus} 
                                className="admin-button secondary"
                                disabled={wsLoading}
                            >
                                Refresh Status
                            </button>
                        </div>
                    </div>
                )}

                {/* Subscription Management Section */}
                {tokenInfo && (
                    <div className="token-section">
                        <h2>EventSub Subscriptions</h2>
                        <p className="section-description">
                            Manage Twitch EventSub subscriptions. WebSocket connection must be active to create subscriptions.
                        </p>

                        <div className="subscription-controls">
                            <h3>Create Subscription</h3>
                            <div className="create-subscription-form">
                                <select
                                    value={selectedSubscriptionType}
                                    onChange={(e) => setSelectedSubscriptionType(e.target.value)}
                                    className="subscription-select"
                                    disabled={loading || !wsConnected}
                                >
                                    <option value="">Select subscription type...</option>
                                    {SUBSCRIPTION_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label} ({type.value})
                                        </option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleCreateSubscription} 
                                    className="admin-button primary"
                                    disabled={loading || !selectedSubscriptionType || !wsConnected}
                                >
                                    {loading ? 'Creating...' : 'Create Subscription'}
                                </button>
                            </div>
                            {!wsConnected && (
                                <p className="warning-text">
                                    ⚠️ WebSocket connection must be started before creating subscriptions.
                                </p>
                            )}
                        </div>

                        <div className="subscriptions-list">
                            <div className="subscriptions-header">
                                <h3>Active Subscriptions</h3>
                                <button 
                                    onClick={loadSubscriptions} 
                                    className="admin-button secondary small"
                                    disabled={subscriptionsLoading}
                                >
                                    {subscriptionsLoading ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                            {subscriptions.length === 0 ? (
                                <p className="no-subscriptions">No active subscriptions</p>
                            ) : (
                                <div className="subscriptions-grid">
                                    {subscriptions.map((sub) => (
                                        <div key={sub.subscriptionId} className="subscription-card">
                                            <div className="subscription-header">
                                                <h4>{SUBSCRIPTION_TYPES.find(t => t.value === sub.type)?.label || sub.type}</h4>
                                                <span className={`subscription-status ${sub.status}`}>
                                                    {sub.status}
                                                </span>
                                            </div>
                                            <div className="subscription-details">
                                                <div className="detail-item">
                                                    <strong>Type:</strong> {sub.type}
                                                </div>
                                                <div className="detail-item">
                                                    <strong>ID:</strong> {sub.subscriptionId}
                                                </div>
                                                <div className="detail-item">
                                                    <strong>Created:</strong> {formatDate(sub.createdAt)}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteSubscription(sub.type)}
                                                className="admin-button danger small"
                                                disabled={loading}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Goals Section */}
                <div className="token-section">
                    <h2>Follower & Subscriber Goals</h2>
                    <p className="section-description">
                        Set and track follower and subscriber goals for your channel.
                    </p>

                    <div className="goals-container">
                        {/* Follower Goal */}
                        <div className="goal-card">
                            <h3>Follower Goal</h3>
                            {goalStatuses?.follower ? (
                                <div className="goal-status">
                                    <div className="goal-progress">
                                        <div className="progress-bar-container">
                                            <div 
                                                className="progress-bar" 
                                                style={{ width: `${Math.min(100, goalStatuses.follower.percentage)}%` }}
                                            ></div>
                                        </div>
                                        <div className="progress-text">
                                            {goalStatuses.follower.current.toLocaleString()} / {goalStatuses.follower.goal.toLocaleString()} 
                                            ({goalStatuses.follower.percentage.toFixed(1)}%)
                                        </div>
                                    </div>
                                    <div className="goal-details">
                                        <div className="goal-detail-item">
                                            <strong>Remaining:</strong> {goalStatuses.follower.remaining.toLocaleString()}
                                        </div>
                                        <div className={`goal-status-badge ${goalStatuses.follower.met ? 'met' : 'not-met'}`}>
                                            {goalStatuses.follower.met ? '✓ Goal Met!' : 'In Progress'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="no-goal">No follower goal set</p>
                            )}
                            <div className="goal-input-group">
                                <input
                                    type="number"
                                    value={followerGoalInput}
                                    onChange={(e) => setFollowerGoalInput(e.target.value)}
                                    placeholder="Enter follower goal"
                                    className="goal-input"
                                    min="1"
                                    disabled={loading}
                                />
                                <button
                                    onClick={handleSetFollowerGoal}
                                    className="admin-button primary"
                                    disabled={loading || !followerGoalInput}
                                >
                                    {loading ? 'Setting...' : 'Set Goal'}
                                </button>
                            </div>
                        </div>

                        {/* Subscriber Goal */}
                        <div className="goal-card">
                            <h3>Subscriber Goal</h3>
                            {goalStatuses?.subscriber ? (
                                <div className="goal-status">
                                    <div className="goal-progress">
                                        <div className="progress-bar-container">
                                            <div 
                                                className="progress-bar" 
                                                style={{ width: `${Math.min(100, goalStatuses.subscriber.percentage)}%` }}
                                            ></div>
                                        </div>
                                        <div className="progress-text">
                                            {goalStatuses.subscriber.current.toLocaleString()} / {goalStatuses.subscriber.goal.toLocaleString()} 
                                            ({goalStatuses.subscriber.percentage.toFixed(1)}%)
                                        </div>
                                    </div>
                                    <div className="goal-details">
                                        <div className="goal-detail-item">
                                            <strong>Remaining:</strong> {goalStatuses.subscriber.remaining.toLocaleString()}
                                        </div>
                                        <div className={`goal-status-badge ${goalStatuses.subscriber.met ? 'met' : 'not-met'}`}>
                                            {goalStatuses.subscriber.met ? '✓ Goal Met!' : 'In Progress'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="no-goal">No subscriber goal set</p>
                            )}
                            <div className="goal-input-group">
                                <input
                                    type="number"
                                    value={subscriberGoalInput}
                                    onChange={(e) => setSubscriberGoalInput(e.target.value)}
                                    placeholder="Enter subscriber goal"
                                    className="goal-input"
                                    min="1"
                                    disabled={loading}
                                />
                                <button
                                    onClick={handleSetSubscriberGoal}
                                    className="admin-button primary"
                                    disabled={loading || !subscriberGoalInput}
                                >
                                    {loading ? 'Setting...' : 'Set Goal'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="goal-actions">
                        <button
                            onClick={loadGoalStatuses}
                            className="admin-button secondary"
                            disabled={goalLoading}
                        >
                            {goalLoading ? 'Loading...' : 'Refresh Goals'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Admin;

