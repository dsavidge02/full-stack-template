import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { mongoConnector } from '@dsavidge02/mongo-connector-ts';
import { User } from '../types/userSchema'
import { SECURITY_CONFIG } from '../config/security_config';

interface LoginRequestBody {
    username: string;
    password: string;
}

// Get certificate path from environment or use defaults
const certPath = process.env.CERT_PATH || '/app/certs';
const privateKeyPath = path.join(certPath, 'private.pem');
// Fallback to local dev path if CERT_PATH not set and file doesn't exist at production path
let privateKey: Buffer;
if (fs.existsSync(privateKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath);
} else {
    // Fallback to local development path
    privateKey = fs.readFileSync(path.join(__dirname, '../../certs/private.pem'));
}

const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
if (!refreshTokenSecret) throw new Error("Missing REFRESH_TOKEN_SECRET env variable.");

export const handleLogin = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body as LoginRequestBody;

        const foundUser = await mongoConnector.getOne<User>('users', { username });
        if (!foundUser) {
            // Don't reveal if user exists - same response as wrong password
            return res.status(401).json({
                'message': 'Invalid credentials.'
            });
        }

        const now = new Date();
        if (foundUser.failedLogin && foundUser.failedLogin.isLocked) {
            if (foundUser.failedLogin.accountLockedUntil > now) {
                const minutesRemaining = Math.ceil(
                    (foundUser.failedLogin.accountLockedUntil.getTime() - now.getTime()) / (60 * 1000)
                );
                return res.status(423).json({
                    'message': `Account locked. Try again in ${minutesRemaining} minutes.`
                });
            }
            else {
                foundUser.failedLogin.isLocked = false;
                foundUser.failedLogin.failedLoginAttempts = 0;
            }
        }

        const pMatch = await bcrypt.compare(password, foundUser.password);
        if (pMatch) {

            if ( SECURITY_CONFIG.RESET_ATTEMPTS_ON_SUCCESS && foundUser.failedLogin) foundUser.failedLogin = false;

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
                    expiresIn: '1500s'
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

            if (!result || result.username !== username) {
                return res.status(401).json({
                    'message': 'Invalid credentials.'
                });
            }

            res.cookie('jwt', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });

            res.json({ accessToken });
        }
        else {
            if (!foundUser.failedLogin) {
                foundUser.failedLogin = {
                    failedLoginAttempts: 1,
                    lastFailedLoginAttempt: now,
                    isLocked: false,
                    accountLockedUntil: new Date(0)
                };
            } 
            else {
                foundUser.failedLogin.failedLoginAttempts++;
                foundUser.failedLogin.lastFailedLoginAttempt = now;
            }

            if (foundUser.failedLogin.failedLoginAttempts >= SECURITY_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS) {
                foundUser.failedLogin.isLocked = true;
                foundUser.failedLogin.accountLockedUntil = new Date(
                    now.getTime() + SECURITY_CONFIG.LOCKOUT_DURATION_MS
                );

                await mongoConnector.updateOne<User>('users', foundUser);

                return res.status(423).json({
                    'message': `Account locked due to too many failed login attempts. Please try again in ${
                        Math.ceil(SECURITY_CONFIG.LOCKOUT_DURATION_MS / (60 * 1000))
                    } minutes.`
                });
            }

            await mongoConnector.updateOne<User>('users', foundUser);

            return res.status(401).json({
                'message': 'Invalid credentials.'
            });
        }
    }
    catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ 'message': 'Error logging in.' });
    }
};

interface LogoutRequestBody extends Request {
    cookies: {
        jwt?: string;
    }
}

export const handleLogout = async (req: LogoutRequestBody, res: Response) => {
    try {
        const cookies = req.cookies;

        if (!cookies?.jwt) return res.sendStatus(204);

        const refreshToken = cookies.jwt;

        const foundUser = await mongoConnector.getOne<User>('users', { refreshToken });
        if (!foundUser) {
            res.clearCookie('jwt', { 
                httpOnly: true, 
                secure: true,
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 
            });

            return res.sendStatus(204);
        }

        foundUser.refreshToken = '';

        await mongoConnector.updateOne<User>('users', foundUser);

        res.clearCookie('jwt', { 
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 
        });

        res.sendStatus(204);
    }
    catch (err) {
        console.error('Error logging out:', err);
        res.status(500).json({ 'message': 'Error logging out.' });
    }
}