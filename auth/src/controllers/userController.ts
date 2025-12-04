import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import { AuthUserRequest, User } from '../types/userSchema';

interface ResetPasswordRequestBody {
    password: string;
    newPassword: string;
}

export const handleResetPassword = async (req: Request, res: Response) => {
    try {
        const { password, newPassword } = req.body as ResetPasswordRequestBody;
        if ( !password || !newPassword ) return res.status(400).json({ 'message': 'Current password and new password are required.' });
        if ( password === newPassword ) return res.status(400).json({ 'message': 'New password cannot be the same as the current password.' });

        const { _id } = req as AuthUserRequest;

        const foundUser = await mongoConnector.getOne<User>('users', { _id });
        if (!foundUser) return res.sendStatus(401);

        const pMatch = await bcrypt.compare(password, foundUser.password);
        if (pMatch) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            foundUser.password = hashedPassword;
            await mongoConnector.updateOne<User>('users', foundUser);
            res.json({ 'message': 'Password updated successfully.' });
        }
        else {
            return res.sendStatus(401);
        }
    }
    catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ 'message': 'Error resetting password.' });
    }
}

interface DeleteSelfRequestBody {
    password: string;
}

export const handleDeleteSelf = async (req: Request, res: Response) => {
    try {
        const { password } = req.body as DeleteSelfRequestBody;
        if ( !password ) return res.status(400).json({ 'message': 'Password is required.' });

        const { _id } = req as AuthUserRequest;

        const foundUser = await mongoConnector.getOne<User>('users', { _id });
        if (!foundUser) return res.sendStatus(401);

        const pMatch = await bcrypt.compare(password, foundUser.password);
        if (pMatch) {
            await mongoConnector.deleteOne<User>('users', foundUser);
            res.json({ 'message': 'User deleted successfully.' });
        }
        else {
            return res.sendStatus(401);
        }
    }
    catch (err) {
        console.error('Error deleting self:', err);
        res.status(500).json({ 'message': 'Error deleting self.' });
    }
}
