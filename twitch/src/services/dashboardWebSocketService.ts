import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface DashboardEvent {
    type: 'stream_started' | 'stream_ended' | 'new_follower' | 'new_subscriber';
    data: {
        username?: string;
        timestamp: string;
    };
}

/**
 * Service for managing Socket.IO connections to dashboard clients.
 * Broadcasts EventSub notifications to all connected dashboard clients.
 */
class DashboardWebSocketService {
    private static instance: DashboardWebSocketService;
    private io: SocketIOServer | null = null;

    private constructor() {}

    public static getInstance(): DashboardWebSocketService {
        if (!DashboardWebSocketService.instance) {
            DashboardWebSocketService.instance = new DashboardWebSocketService();
        }
        return DashboardWebSocketService.instance;
    }

    /**
     * Initializes the Socket.IO server on the HTTP server.
     * @param server - HTTP server instance to attach Socket.IO server to
     */
    public initialize(server: HTTPServer): void {
        if (this.io) {
            console.log('Dashboard Socket.IO server already initialized');
            return;
        }

        this.io = new SocketIOServer(server, {
            path: '/dashboard/socket.io',
            cors: {
                origin: process.env.ENVIRONMENT === 'dev' ? '*' : [
                    'https://savidgeapps.com',
                    'https://www.savidgeapps.com'
                ],
                methods: ['GET', 'POST'],
                credentials: false
            }
        });

        this.io.on('connection', (socket) => {
            console.log(`Dashboard client connected: ${socket.id} (Total: ${this.io?.sockets.sockets.size || 0})`);

            // Send welcome message
            socket.emit('connected', {
                clientId: socket.id,
                timestamp: new Date().toISOString()
            });

            socket.on('disconnect', (reason) => {
                console.log(`Dashboard client disconnected: ${socket.id} (Reason: ${reason}) (Total: ${this.io?.sockets.sockets.size || 0})`);
            });

            socket.on('error', (error) => {
                console.error(`Dashboard Socket.IO error for client ${socket.id}:`, error);
            });
        });

        console.log('Dashboard Socket.IO server initialized on /dashboard/socket.io');
    }

    /**
     * Broadcasts an event to all connected dashboard clients.
     * @param event - Event to broadcast
     */
    public broadcastEvent(event: DashboardEvent): void {
        if (!this.io) {
            return;
        }

        const connectedCount = this.io.sockets.sockets.size;
        if (connectedCount === 0) {
            return;
        }

        this.io.emit('dashboard_event', event);
        console.log(`Broadcasted ${event.type} event to ${connectedCount} dashboard client(s)`);
    }

    /**
     * Broadcasts a stream started event.
     */
    public broadcastStreamStarted(): void {
        this.broadcastEvent({
            type: 'stream_started',
            data: {
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Broadcasts a stream ended event.
     */
    public broadcastStreamEnded(): void {
        this.broadcastEvent({
            type: 'stream_ended',
            data: {
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Broadcasts a new follower event.
     * @param username - Username of the new follower
     */
    public broadcastNewFollower(username: string): void {
        this.broadcastEvent({
            type: 'new_follower',
            data: {
                username,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Broadcasts a new subscriber event.
     * @param username - Username of the new subscriber
     */
    public broadcastNewSubscriber(username: string): void {
        this.broadcastEvent({
            type: 'new_subscriber',
            data: {
                username,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Gets the number of connected dashboard clients.
     */
    public getConnectedClientsCount(): number {
        return this.io?.sockets.sockets.size || 0;
    }
}

export default DashboardWebSocketService;
