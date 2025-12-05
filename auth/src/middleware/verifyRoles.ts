import { Request, Response, NextFunction } from "express";
import { AuthUserRequest } from "../types/userSchema";

export const verifyRoles = (...allowedRoles: number[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthUserRequest;
        if (!authReq.roles) return res.sendStatus(401);

        const hasRole = authReq.roles.some(role => allowedRoles.includes(role));
        if (!hasRole) return res.sendStatus(401);

        next();
    };
};