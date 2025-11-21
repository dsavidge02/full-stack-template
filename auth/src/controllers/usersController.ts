import { Request, Response } from 'express';
import { User } from '../types/userSchema';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';

export const handleGetUsers = async (req: Request, res: Response) => {
    const usersArray = await mongoConnector.getCollectionArray<User>('users');
    if (!usersArray) return res.sendStatus(404);

    res.json({ 'users': usersArray });
};