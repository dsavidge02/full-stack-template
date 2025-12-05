import express from 'express';
import { handleGetUsers, handleDeleteUser, handleUpdateUserRoles, handleUnlockUser } from '../../controllers/usersController';
import { verifyJWT } from '../../middleware/verifyJWT';
import { verifyRoles } from '../../middleware/verifyRoles';
import { ROLES_LIST } from '../../config/roles_list';
import { validate, validationRules } from '../../middleware/validators';

const router = express.Router();
router.route('/')
    .get(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), handleGetUsers);

router.route('/delete')
    .post(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), validate(validationRules.deleteUser), handleDeleteUser);

router.route('/roles')
    .post(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), validate(validationRules.updateUserRoles), handleUpdateUserRoles);

router.route('/unlock')
    .post(verifyJWT, verifyRoles(ROLES_LIST.ADMIN), validate(validationRules.unlockUser), handleUnlockUser);

export default router;