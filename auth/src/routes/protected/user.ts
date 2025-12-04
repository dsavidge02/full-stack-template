import express from 'express';
import { verifyJWT } from '../../middleware/verifyJWT';
import { handleResetPassword, handleDeleteSelf } from '../../controllers/userController';

const router = express.Router();
router.route('/password')
    .post(verifyJWT, handleResetPassword);

router.route('/delete')
    .post(verifyJWT, handleDeleteSelf);

export default router;