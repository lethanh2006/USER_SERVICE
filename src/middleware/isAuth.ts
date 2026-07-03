import type { Request, Response, NextFunction } from "express";
export interface AuthenticatedRequest extends Request {
    user?: {
        _id: string;
        email: string;
        username: string;
        role: string;
    } | null;
}
export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const base64Payload = req.headers['x-user-payload'];
        if (!base64Payload) {
            res.status(401).json({ message: "Unauthorized: Missing identity payload" });
            return;
        }
        // Giải mã payload Base64 do Gateway inject
        const jsonString = Buffer.from(base64Payload as string, 'base64').toString('utf8');
        const userData = JSON.parse(jsonString);
        req.user = userData;
        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized: Invalid identity payload" });
    }
};