import { ObjectId } from 'mongodb';
import { Request } from 'express';

export interface User {
    _id: ObjectId;
    username: string;
    email: string;
    password: string;
    roles: number[];
    twitch_user_id?: string;
    refreshToken?: string;
    failedLogin?: false |{
        failedLoginAttempts: number;
        lastFailedLoginAttempt: Date;
        isLocked: boolean;
        accountLockedUntil: Date;
    }
};

export interface NewUser {
    username: string;
    email: string;
    password: string;
    roles: number[];
}

export interface CleanUser {
    _id: ObjectId;
    username: string;
    email: string;
    roles: number[];
    twitch_user_id?: string;
    failedLogin?: false | {
        failedLoginAttempts: number;
        lastFailedLoginAttempt: Date;
        isLocked: boolean;
        accountLockedUntil: Date;
    };
}

export interface AuthUserRequest extends Request {
    _id: ObjectId;
    username: string;
    roles: number[];
}