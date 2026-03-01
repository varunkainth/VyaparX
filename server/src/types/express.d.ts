import { Request } from "express";
import type { TokenPayload } from "./jwt";

declare global {
    namespace Express {
        interface Request {
            id?: string;
            user?: {
                id: string;
                email?: string;
                business_id?: string;
                role?: string;
            };
            authToken?: TokenPayload;
        }
    }
}
