import express from 'express';
import { handleLogin } from '../controllers/loginController';

const router = express.Router();
router.post('/', handleLogin);

export default router;