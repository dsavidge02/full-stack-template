import express from 'express';
import { 
    handleCreateSubscription, 
    handleGetSubscriptions, 
    handleGetSubscription, 
    handleDeleteSubscription,
    handleStartWebSocket,
    handleStopWebSocket,
    handleWebSocketStatus,
    handleWebSocketHealth
} from '../../controllers/eventSubController';
import { verifyJWT } from '../../middleware/verifyJWT';
import { verifyRoles } from '../../middleware/verifyRoles';
import { ROLES_LIST } from '../../config/roles_list';

const router = express.Router();

// Public health endpoint (no authentication required)
router.get('/websocket/health', handleWebSocketHealth);

// All other routes require admin authentication
router.use(verifyJWT);
router.use(verifyRoles(ROLES_LIST.ADMIN));

// WebSocket management routes
router.post('/websocket/start', handleStartWebSocket);
router.post('/websocket/stop', handleStopWebSocket);
router.get('/websocket/status', handleWebSocketStatus);

// Create subscription
router.post('/subscriptions', handleCreateSubscription);

// Get all subscriptions or filter by type (query param)
router.get('/subscriptions', handleGetSubscriptions);

// Get specific subscription by type
router.get('/subscriptions/:type', handleGetSubscription);

// Delete subscription by type
router.delete('/subscriptions/:type', handleDeleteSubscription);

// Delete subscription by ID
router.delete('/subscriptions/id/:id', handleDeleteSubscription);

export default router;

