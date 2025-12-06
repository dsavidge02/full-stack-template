import { Request } from 'express';
import { ObjectId } from 'mongodb';

export interface AuthUserRequest extends Request {
    _id: ObjectId;
    username: string;
    roles: number[];
}