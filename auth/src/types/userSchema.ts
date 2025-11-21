import { ObjectId } from 'mongodb'; 

export interface User {
    _id: ObjectId;
    username: string;
    email: string;
    password: string;
    roles: number[];
    twitch_user_id?: string;
    refreshToken?: string;
};