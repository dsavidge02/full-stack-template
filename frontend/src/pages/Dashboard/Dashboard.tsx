import { useState, useEffect, useRef } from 'react';
import { getDashboardGoalStatuses, createDashboardSocket } from '../../api/dashboardAPI';
import { Socket } from 'socket.io-client';
import './Dashboard.css';

interface GoalStatus {
    current: number;
    goal: number;
    met: boolean;
    remaining: number;
    percentage: number;
}

interface DashboardEvent {
    type: 'stream_started' | 'stream_ended' | 'new_follower' | 'new_subscriber';
    data: {
        username?: string;
        timestamp: string;
    };
}

interface Notification {
    id: string;
    type: 'stream_started' | 'stream_ended' | 'new_follower' | 'new_subscriber';
    message: string;
    timestamp: number;
}

const DISPLAY_ROTATION_INTERVAL = 15000; // 15 seconds
const NOTIFICATION_DURATION = 5000; // 5 seconds

type DisplayType = 'follower' | 'subscriber';

function Dashboard() {
    const [goalStatuses, setGoalStatuses] = useState<{ follower?: GoalStatus; subscriber?: GoalStatus } | null>(null);
    const [currentDisplay, setCurrentDisplay] = useState<DisplayType>('follower');
    const [isStreamLive, setIsStreamLive] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [wsConnected, setWsConnected] = useState(false);
    
    const socketRef = useRef<Socket | null>(null);
    const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const notificationTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Load goal statuses on mount and periodically
    useEffect(() => {
        const loadGoals = async () => {
            try {
                const response = await getDashboardGoalStatuses();
                if (response.success && response.data) {
                    setGoalStatuses(response.data);
                }
            } catch (err) {
                console.error('Error loading goal statuses:', err);
            }
        };

        loadGoals();
        const interval = setInterval(loadGoals, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Setup Socket.IO connection
    useEffect(() => {
        const socket = createDashboardSocket(
            (event: DashboardEvent) => {
                // Handle stream events
                if (event.type === 'stream_started') {
                    setIsStreamLive(true);
                    addNotification('stream_started', '🎥 Stream Started!');
                } else if (event.type === 'stream_ended') {
                    setIsStreamLive(false);
                    addNotification('stream_ended', '🎬 Stream Ended');
                } else if (event.type === 'new_follower') {
                    const username = event.data.username || 'Someone';
                    addNotification('new_follower', `🎉 ${username} followed!`);
                } else if (event.type === 'new_subscriber') {
                    const username = event.data.username || 'Someone';
                    addNotification('new_subscriber', `🎉 ${username} subscribed!`);
                }
            },
            () => {
                setWsConnected(true);
            },
            () => {
                setWsConnected(false);
            },
            (error) => {
                console.error('Socket.IO error:', error);
                setWsConnected(false);
            }
        );

        socketRef.current = socket;

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Setup display rotation
    useEffect(() => {
        const rotate = () => {
            setCurrentDisplay(prev => prev === 'follower' ? 'subscriber' : 'follower');
        };

        rotationTimerRef.current = setInterval(rotate, DISPLAY_ROTATION_INTERVAL);

        return () => {
            if (rotationTimerRef.current) {
                clearInterval(rotationTimerRef.current);
            }
        };
    }, []);

    // Clean up notification timers
    useEffect(() => {
        return () => {
            notificationTimersRef.current.forEach(timer => clearTimeout(timer));
            notificationTimersRef.current.clear();
        };
    }, []);

    const addNotification = (type: Notification['type'], message: string) => {
        const id = `${type}-${Date.now()}-${Math.random()}`;
        const notification: Notification = {
            id,
            type,
            message,
            timestamp: Date.now()
        };

        setNotifications(prev => [...prev, notification]);

        // Remove notification after duration
        const timer = setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
            notificationTimersRef.current.delete(id);
        }, NOTIFICATION_DURATION);

        notificationTimersRef.current.set(id, timer);
    };

    const currentGoal = currentDisplay === 'follower' 
        ? goalStatuses?.follower 
        : goalStatuses?.subscriber;

    const goalLabel = currentDisplay === 'follower' ? 'Followers' : 'Subscribers';

    return (
        <div className="dashboard-container">
            {/* Live Indicator */}
            {isStreamLive && (
                <div className="live-indicator">
                    <span className="live-dot"></span>
                    LIVE
                </div>
            )}

            {/* Main Display */}
            <div className="dashboard-display">
                {currentGoal ? (
                    <div className="goal-display">
                        <h2 className="goal-label">{goalLabel} Goal</h2>
                        <div className="goal-progress-container">
                            <div className="goal-progress-bar">
                                <div 
                                    className={`goal-progress-fill ${currentGoal.met ? 'met' : 'in-progress'}`}
                                    style={{ width: `${Math.min(100, currentGoal.percentage)}%` }}
                                ></div>
                            </div>
                            <div className="goal-stats">
                                <span className="goal-current">{currentGoal.current.toLocaleString()}</span>
                                <span className="goal-separator">/</span>
                                <span className="goal-target">{currentGoal.goal.toLocaleString()}</span>
                                <span className="goal-percentage">({currentGoal.percentage.toFixed(1)}%)</span>
                            </div>
                        </div>
                        {currentGoal.met && (
                            <div className="goal-met-badge">✓ Goal Met!</div>
                        )}
                    </div>
                ) : (
                    <div className="goal-display">
                        <h2 className="goal-label">{goalLabel} Goal</h2>
                        <p className="no-goal-message">No {goalLabel.toLowerCase()} goal set</p>
                    </div>
                )}
            </div>

            {/* Notifications */}
            <div className="notifications-container">
                {notifications.map(notification => (
                    <div 
                        key={notification.id} 
                        className={`notification ${notification.type}`}
                    >
                        {notification.message}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;

