import express from 'express';
import { handleLogout } from '../controllers/loginController';

const router = express.Router();
    router.get('/', handleLogout);

export default router;