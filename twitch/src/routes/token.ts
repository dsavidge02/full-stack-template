import express from 'express';
import { handleGenerateUserAccessToken, handleGetUserInfo, handleVerifyUserByCode } from '../controllers/tokenController';

const router = express.Router();
router.post('/exchange', handleGenerateUserAccessToken);
router.post('/userInfo', handleGetUserInfo);
router.post('/verify', handleVerifyUserByCode);

export default router;