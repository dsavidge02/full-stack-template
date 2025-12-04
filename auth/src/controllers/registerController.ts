import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import { NewUser } from '../types/userSchema';
import { ROLES_LIST } from '../config/roles_list';

interface RegisterRequestBody {
    username: string;
    email: string;
    password: string;
}

export const handleRegister = async (req: Request, res: Response) => {
    const { username, email, password } = req.body as RegisterRequestBody;

    if ( !username || !email || !password ) return res.status(400).json({ 'message': 'Username, email, and password are required.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: NewUser = {
        username,
        email,
        password: hashedPassword,
        roles: [ROLES_LIST.USER]
    };

    const uniqueFields: (keyof NewUser)[] = ['username', 'email'];

    try {
        const result = await mongoConnector.createOne<NewUser>('users', newUser, uniqueFields);
        res.status(201).json({ 'message': 'User created successfully.' });
    }
    catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ 'message': 'Error registering user.' });
    }
}