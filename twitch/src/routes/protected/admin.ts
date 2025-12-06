import express from 'express';
import { handleExchangeToken, handleGetToken } from '../../controllers/adminController';
import { verifyJWT } from '../../middleware/verifyJWT';
import { verifyRoles } from '../../middleware/verifyRoles';
import { ROLES_LIST } from '../../config/roles_list';

const router = express.Router();
router.route('/exchange').post(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), handleExchangeToken);
router.route('/token').get(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), handleGetToken);

export default router;

