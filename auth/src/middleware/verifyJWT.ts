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
        twitch_user_id?: string;
    }
    iat: number;
    exp: number;
}

// Get certificate path from environment or use defaults
const certPath = process.env.CERT_PATH || '/app/certs';
const publicKeyPath = path.join(certPath, 'public.pem');
// Fallback to local dev path if CERT_PATH not set and file doesn't exist at production path
let publicKey: Buffer;
if (fs.existsSync(publicKeyPath)) {
    publicKey = fs.readFileSync(publicKeyPath);
} else {
    // Fallback to local development path
    publicKey = fs.readFileSync(path.join(__dirname, '../../certs/public.pem'));
}

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
            const { _id, username, roles, twitch_user_id } = accessTokenContents.UserInfo;

            const authReq = req as AuthUserRequest;
            authReq._id = _id;
            authReq.username = username;
            authReq.roles = roles;
            authReq.twitch_user_id = twitch_user_id;
            next();
        }
    )
}

