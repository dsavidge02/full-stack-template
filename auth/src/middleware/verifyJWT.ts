import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AuthUserRequest } from '../types/userSchema';
import { ObjectId } from 'mongodb';

interface AccessTokenContents {
    UserInfo: {
        _id: ObjectId;
        username: string;
        roles: number[];
    }
    iat: number;
    exp: number;
}

const publicKey = fs.readFileSync(path.join(__dirname, '../../certs/public.pem'));

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.toString().startsWith('Bearer ')) return res.sendStatus(401);
    const token = authHeader.toString().split(' ')[1];
    jwt.verify(
        token,
        publicKey,
        { algorithms: ['RS256'] },
        (err, decoded) => {
            if (err) return res.sendStatus(403);

            const accessTokenContents = decoded as AccessTokenContents;
            const { _id, username, roles } = accessTokenContents.UserInfo;

            const authReq = req as AuthUserRequest;
            authReq._id = _id;
            authReq.username = username;
            authReq.roles = roles;
            next();
        }
    )
}

