import { CookieOptions } from 'express';

/**
 * Get cookie options based on the current environment.
 * In development: uses 'lax' sameSite and secure: false (allows HTTP)
 * In production: uses 'strict' sameSite and secure: true (HTTPS only)
 */
export const getCookieOptions = (): CookieOptions => {
    const isDev = process.env.ENVIRONMENT === 'dev';
    return {
        httpOnly: true,
        secure: !isDev,
        sameSite: isDev ? 'lax' : 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };
};

