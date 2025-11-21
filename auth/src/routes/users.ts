import express from 'express';
import { handleGetUsers } from '../controllers/usersController';
import { ROLES_LIST } from '../config/roles_list';

const router = express.Router();
router.route('/')
    .get(handleGetUsers);

export default router;