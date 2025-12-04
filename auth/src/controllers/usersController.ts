import { Request, Response } from 'express';
import { User, CleanUser } from '../types/userSchema';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import { ObjectId } from 'mongodb';
import { ROLES_LIST } from '../config/roles_list';

export const handleGetUsers = async (req: Request, res: Response) => {
    const usersArray = await mongoConnector.getCollectionArray<User>('users');
    if (!usersArray) return res.sendStatus(404);

    const cleanUsers: CleanUser[] = usersArray.map(({
        password,
        refreshToken,
        ...user
    }) => user);

    res.json({ 'users': cleanUsers });
};

interface DeleteUserRequestBody {
    userId: ObjectId;
}

export const handleDeleteUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body as DeleteUserRequestBody;
        if ( !userId ) return res.status(400).json({ 'message': 'User ID is required.' });

        const foundUser = await mongoConnector.getOne<User>('users', { '_id': userId });
        if (!foundUser) return res.sendStatus(401);

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
        if ( !userId || !roles ) return res.status(400).json({ 'message': 'User ID and roles are required.' });

        const foundUser = await mongoConnector.getOne<User>('users', { '_id': userId });
        if (!foundUser) return res.sendStatus(401);

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