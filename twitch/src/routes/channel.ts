import express from 'express';
import { handleGetFollowers, handleGetSubscribers, handleVerifyUserById } from '../controllers/channelController';

const router = express.Router();
router.get('/followers', handleGetFollowers);
router.get('/subscribers', handleGetSubscribers);
router.post('/verify', handleVerifyUserById);

export default router;

