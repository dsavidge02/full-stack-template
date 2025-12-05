import express from 'express';
import { handleLogin } from '../controllers/loginController';
import { validate, validationRules } from '../middleware/validators';

const router = express.Router();
router.post('/', validate(validationRules.login), handleLogin);

export default router;