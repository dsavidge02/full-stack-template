import { useState, useEffect } from 'react';
import twitchAxios from '../../api/twitchAxios';
import { getChannelFollowers, getChannelSubscribers } from '../../api/api';
import './Twitch.css';

interface Follower {
    user_id: string;
    user_name: string;
    user_login: string;
    followed_at: string;
}

interface Subscriber {
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
}

interface FollowersData {
    total: number;
    followers: Follower[];
}

interface SubscribersData {
    total: number;
    points: number;
    subscribers: Subscriber[];
}

function Twitch() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followers, setFollowers] = useState<FollowersData | null>(null);
    const [subscribers, setSubscribers] = useState<SubscribersData | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Try to load both followers and subscribers
            const [followersResponse, subscribersResponse] = await Promise.allSettled([
                getChannelFollowers(twitchAxios),
                getChannelSubscribers(twitchAxios)
            ]);

            // Handle followers
            if (followersResponse.status === 'fulfilled' && followersResponse.value.success) {
                setFollowers(followersResponse.value.data);
            } else {
                console.error('Failed to load followers:', followersResponse);
            }

            // Handle subscribers
            if (subscribersResponse.status === 'fulfilled' && subscribersResponse.value.success) {
                setSubscribers(subscribersResponse.value.data);
            } else {
                console.error('Failed to load subscribers:', subscribersResponse);
            }

            // Check if we got any data
            const hasFollowers = followersResponse.status === 'fulfilled' && followersResponse.value.success;
            const hasSubscribers = subscribersResponse.status === 'fulfilled' && subscribersResponse.value.success;

            if (!hasFollowers && !hasSubscribers) {
                setError('Error connecting to Twitch service');
            }
        } catch (err: any) {
            console.error('Error loading Twitch data:', err);
            setError('Error connecting to Twitch service');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    if (loading) {
        return (
            <div className="twitch-container">
                <div className="twitch-card">
                    <h1>Twitch Channel</h1>
                    <div className="loading-message">Loading channel data...</div>
                </div>
            </div>
        );
    }

    if (error && !followers && !subscribers) {
        return (
            <div className="twitch-container">
                <div className="twitch-card">
                    <h1>Twitch Channel</h1>
                    <div className="error-message">
                        <h3>Error</h3>
                        <p>{error}</p>
                        <button onClick={loadData} className="twitch-connect-button">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="twitch-container">
            <div className="twitch-card">
                <h1>Twitch Channel</h1>
                <p className="twitch-description">
                    View your channel followers and subscribers
                </p>

                {followers && (
                    <div className="data-section">
                        <h2>Followers</h2>
                        <div className="stats-bar">
                            <span className="stat-item">Total: <strong>{followers.total}</strong></span>
                        </div>
                        {followers.followers.length > 0 ? (
                            <div className="data-list">
                                {followers.followers.map((follower, index) => (
                                    <div key={follower.user_id || index} className="data-item">
                                        <div className="item-main">
                                            <span className="item-name">{follower.user_name}</span>
                                            <span className="item-login">@{follower.user_login}</span>
                                        </div>
                                        <div className="item-meta">
                                            Followed: {formatDate(follower.followed_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-data">No followers found</p>
                        )}
                    </div>
                )}

                {subscribers && (
                    <div className="data-section">
                        <h2>Subscribers</h2>
                        <div className="stats-bar">
                            <span className="stat-item">Total: <strong>{subscribers.total}</strong></span>
                            <span className="stat-item">Points: <strong>{subscribers.points}</strong></span>
                        </div>
                        {subscribers.subscribers.length > 0 ? (
                            <div className="data-list">
                                {subscribers.subscribers.map((subscriber, index) => (
                                    <div key={subscriber.user_id || index} className="data-item">
                                        <div className="item-main">
                                            <span className="item-name">{subscriber.user_name}</span>
                                            <span className="item-login">@{subscriber.user_login}</span>
                                            <span className={`tier-badge tier-${subscriber.tier}`}>
                                                Tier {subscriber.tier === '1000' ? '1' : subscriber.tier === '2000' ? '2' : subscriber.tier === '3000' ? '3' : subscriber.tier}
                                            </span>
                                        </div>
                                        <div className="item-meta">
                                            {subscriber.is_gift && (
                                                <span className="gift-badge">
                                                    Gift from {subscriber.gifter_name || subscriber.gifter_login}
                                                </span>
                                            )}
                                            <span className="plan-name">{subscriber.plan_name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-data">No subscribers found</p>
                        )}
                    </div>
                )}

                {!followers && !subscribers && !error && (
                    <div className="no-data-message">
                        <p>No data available</p>
                        <button onClick={loadData} className="twitch-connect-button">
                            Refresh
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Twitch;
