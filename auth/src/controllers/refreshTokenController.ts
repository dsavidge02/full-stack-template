import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import { User } from '../types/userSchema';

interface RefreshTokenRequestBody extends Request {
    cookies: {
        jwt?: string;
    }
}

interface RefreshTokenContents {
    username: string;
    iat: number;
    exp: number;
}

const privateKey = fs.readFileSync(path.join(__dirname, '../../certs/private.pem'));
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
if (!refreshTokenSecret) throw new Error("Missing REFRESH_TOKEN_SECRET env variable.");

export const handleRefreshToken = async (req: RefreshTokenRequestBody, res: Response) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);

    const refreshToken = cookies.jwt;

    const foundUser = await mongoConnector.getOne<User>('users', { refreshToken });
    if (!foundUser) return res.sendStatus(403);

    jwt.verify(
        refreshToken,
        refreshTokenSecret,
        (err, decoded) => {
            if (err) return res.sendStatus(403);

            const refreshTokenContents = decoded as RefreshTokenContents;
            if (foundUser.username !== refreshTokenContents.username) return res.sendStatus(403);

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

            res.json({ accessToken });
        }
    )
};