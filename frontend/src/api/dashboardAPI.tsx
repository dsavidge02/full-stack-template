import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// Use the same base URL pattern as twitchAxios
// const TWITCH_BASE_URL = 'http://localhost:4001'; // Local development
const TWITCH_BASE_URL = '/api/twitch/'; // Production

const dashboardAxios = axios.create({
    baseURL: TWITCH_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: false // Public endpoint, no credentials needed
});

/**
 * Gets goal statuses for the dashboard (public endpoint).
 */
export const getDashboardGoalStatuses = async () => {
    const response = await dashboardAxios.get('/dashboard/goals');
    return response.data;
};

/**
 * Creates a Socket.IO connection to the dashboard WebSocket server.
 * @param onEvent - Callback function for dashboard events
 * @param onConnect - Callback function for connection
 * @param onDisconnect - Callback function for disconnection
 * @param onError - Callback function for errors
 * @returns Socket.IO instance
 */
export const createDashboardSocket = (
    onEvent: (event: { type: string; data: any }) => void,
    onConnect?: () => void,
    onDisconnect?: () => void,
    onError?: (error: Error) => void
): Socket => {
    // Hardcoded production URL
    const PRODUCTION_URL = 'https://savidgeapps.com';
    const LOCAL_URL = 'http://localhost:4001';
    
    // Determine if we're in production by checking the hostname
    const isProduction = window.location.hostname === 'savidgeapps.com' || 
                         window.location.hostname === 'www.savidgeapps.com';
    
    const socketUrl = isProduction ? PRODUCTION_URL : LOCAL_URL;
    const socketPath = isProduction ? '/api/twitch/dashboard/socket.io' : '/dashboard/socket.io';
    
    const socket = io(socketUrl, {
        path: socketPath,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        reconnectionDelayMax: 5000
    });
    
    socket.on('connect', () => {
        console.log('Dashboard Socket.IO connected:', socket.id);
        if (onConnect) onConnect();
    });
    
    socket.on('disconnect', (reason) => {
        console.log('Dashboard Socket.IO disconnected:', reason);
        if (onDisconnect) onDisconnect();
    });
    
    socket.on('connect_error', (error) => {
        console.error('Dashboard Socket.IO connection error:', error);
        if (onError) onError(error);
    });
    
    socket.on('connected', (data) => {
        console.log('Dashboard Socket.IO welcome:', data);
    });
    
    socket.on('dashboard_event', (event) => {
        onEvent(event);
    });
    
    return socket;
};
