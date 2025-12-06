import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import { NewUser } from '../types/userSchema';
import { ROLES_LIST } from '../config/roles_list';

interface RegisterRequestBody {
    username: string;
    email: string;
    password: string;
    twitch_user_id?: string;
}

export const handleRegister = async (req: Request, res: Response) => {
    try {
        const { username, email, password, twitch_user_id } = req.body as RegisterRequestBody;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser: NewUser = {
            username,
            email,
            password: hashedPassword,
            roles: [ROLES_LIST.USER],
            ...(twitch_user_id && { twitch_user_id })
        };

        const uniqueFields: (keyof NewUser)[] = ['username', 'email'];
    
        await mongoConnector.createOne<NewUser>('users', newUser, uniqueFields);
        res.status(201).json({ 'message': 'User created successfully.' });
    }
    catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ 'message': 'Error registering user.' });
    }
}