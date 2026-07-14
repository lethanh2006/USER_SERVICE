import type { Request, Response, NextFunction } from "express";
export interface AuthenticatedRequest extends Request {
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