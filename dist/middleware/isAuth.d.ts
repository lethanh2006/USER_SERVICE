import type { Request, Response, NextFunction } from "express";
export interface AuthenticatedRequest extends Request {
    user?: {
        _id: string;
        email: string;
        username: string;
        role: string;
    } | null;
}
export declare const isAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=isAuth.d.ts.map