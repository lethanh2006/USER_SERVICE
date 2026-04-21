import type { IUser } from "../model/User.js";
import type { Request, Response, NextFunction } from "express";
export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}
export declare const isAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=isAuth.d.ts.map