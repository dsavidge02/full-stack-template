import { Request, Response } from 'express';
import { User, CleanUser } from '../types/userSchema';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import { ObjectId } from 'mongodb';
import { ROLES_LIST } from '../config/roles_list';

export const handleGetUsers = async (req: Request, res: Response) => {
    try {
        const usersArray = await mongoConnector.getCollectionArray<User>('users');
        if (!usersArray) return res.status(404).json({ 'message': 'Users not found.' });

        const cleanUsers: CleanUser[] = usersArray.map(({
            password,
            refreshToken,
            ...user
        }) => user);

        res.json({ 'users': cleanUsers });
    }
    catch (err) {
        console.error('Error getting users:', err);
        res.status(500).json({ 'message': 'Error getting users.' });
    }
};

interface DeleteUserRequestBody {
    userId: ObjectId;
}

export const handleDeleteUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body as DeleteUserRequestBody;

        const foundUser = await mongoConnector.getOne<User>('users', { '_id': userId });
        if (!foundUser) return res.status(404).json({ 'message': 'User not found.' });

        await mongoConnector.deleteOne<User>('users', foundUser);
        res.json({ 'message': 'User deleted successfully.' });
    }
    catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ 'message': 'Error deleting user.' });
    }
}

interface UpdateUserRolesRequestBody {
    userId: ObjectId;
    roles: number[];
}

export const handleUpdateUserRoles = async (req: Request, res: Response) => {
    try {
        const { userId, roles } = req.body as UpdateUserRolesRequestBody;

        const foundUser = await mongoConnector.getOne<User>('users', { '_id': userId });
        if (!foundUser) return res.status(404).json({ 'message': 'User not found.' });

        const validRoles = Object.values(ROLES_LIST);
        const updatedRoles = roles.filter(role => validRoles.includes(role));

        foundUser.roles = updatedRoles;
        await mongoConnector.updateOne<User>('users', foundUser);
        res.json({ 'message': 'User roles updated successfully.' });
    }
    catch (err) {
        console.error('Error updating user roles:', err);
        res.status(500).json({ 'message': 'Error updating user roles.' });
    }
}

interface UnlockUserRequestBody {
    userId: ObjectId;
}

export const handleUnlockUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body as UnlockUserRequestBody;

        const foundUser = await mongoConnector.getOne<User>('users', { '_id': userId });
        if (!foundUser) return res.status(404).json({ 'message': 'User not found.' });

        // Reset failed login attempts and unlock account
        foundUser.failedLogin = false;
        await mongoConnector.updateOne<User>('users', foundUser);
        res.json({ 'message': 'User unlocked successfully.' });
    }
    catch (err) {
        console.error('Error unlocking user:', err);
        res.status(500).json({ 'message': 'Error unlocking user.' });
    }
}