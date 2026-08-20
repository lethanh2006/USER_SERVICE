import type { Response, NextFunction } from "express";
import type { RequestWithContext } from "../common/interfaces/request-context.interface.js";

export interface AuthenticatedRequest extends RequestWithContext {
    user?: {
        _id: string;
        email: string;
        username: string;
        role: string;
    } | null;
}
export const isAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const payload = req.headers['x-user-payload'];
    if (!payload) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    req.user = JSON.parse(Buffer.from(payload as string, 'base64').toString('utf8'));
    next();
};
