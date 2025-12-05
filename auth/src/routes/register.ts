import express from 'express';
import { handleRegister } from '../controllers/registerController';
import { validate, validationRules } from '../middleware/validators';

const router = express.Router();
router.post('/', validate(validationRules.register), handleRegister);

export default router;