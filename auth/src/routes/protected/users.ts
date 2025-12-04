import express from 'express';
import { handleGetUsers, handleDeleteUser, handleUpdateUserRoles } from '../../controllers/usersController';
import { verifyJWT } from '../../middleware/verifyJWT';
import { verifyRoles } from '../../middleware/verifyRoles';
import { ROLES_LIST } from '../../config/roles_list';

const router = express.Router();
router.route('/')
    .get(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), handleGetUsers);

router.route('/delete')
    .post(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), handleDeleteUser);

router.route('/roles')
    .post(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), handleUpdateUserRoles);

export default router;