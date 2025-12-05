import express from 'express';
import { verifyJWT } from '../../middleware/verifyJWT';
import { handleResetPassword, handleDeleteSelf } from '../../controllers/userController';
import { validate, validationRules } from '../../middleware/validators';

const router = express.Router();
router.route('/password')
    .post(verifyJWT, validate(validationRules.resetPassword), handleResetPassword);

router.route('/delete')
    .post(verifyJWT, validate(validationRules.deleteSelf), handleDeleteSelf);

export default router;