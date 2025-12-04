import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import { User } from '../types/userSchema'

interface LoginRequestBody {
    username: string;
    password: string;
}

const privateKey = fs.readFileSync(path.join(__dirname, '../../certs/private.pem'));
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
if (!refreshTokenSecret) throw new Error("Missing REFRESH_TOKEN_SECRET env variable.");

export const handleLogin = async (req: Request, res: Response) => {
    const { username, password } = req.body as LoginRequestBody;

    if ( !username || ! password ) return res.status(400).json({ 'message': 'Username and password are required. '});

    const foundUser = await mongoConnector.getOne<User>('users', { username });
    if (!foundUser) return res.sendStatus(401);

    const pMatch = await bcrypt.compare(password, foundUser.password);
    if (pMatch) {
        const accessToken = jwt.sign(
            {
                UserInfo: {
                    _id: foundUser._id,
                    username: foundUser.username,
                    roles: foundUser.roles
                }
            },
            privateKey,
            {
                algorithm: 'RS256',
                expiresIn: '30s'
            }
        );

        const refreshToken = jwt.sign(
            {
                username: foundUser.username
            },
            refreshTokenSecret,
            {
                expiresIn: '1d'
            }
        );

        foundUser.refreshToken = refreshToken;

        const result = await mongoConnector.updateOne<User>('users', foundUser);

        if (!result || result.username !== username) return res.sendStatus(401);

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ accessToken });
    }
    else {
        res.sendStatus(401);
    }
};

interface LogoutRequestBody extends Request {
    cookies: {
        jwt?: string;
    }
}

export const handleLogout = async (req: LogoutRequestBody, res: Response) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(204);

    const refreshToken = cookies.jwt;

    const foundUser = await mongoConnector.getOne<User>('users', { refreshToken });
    if (!foundUser) {
        res.clearCookie('jwt', { 
            httpOnly: true, 
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 
        });

        return res.sendStatus(204);
    }

    foundUser.refreshToken = '';

    await mongoConnector.updateOne<User>('users', foundUser);

    res.clearCookie('jwt', { 
        httpOnly: true, 
        sameSite: 'lax', 
        maxAge: 24 * 60 * 60 * 1000 
    });

    res.sendStatus(204);
}