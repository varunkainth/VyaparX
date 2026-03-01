export interface TokenPayload {
    userId: string;
    email: string;
    businessId?: string;
    role?: string;
    tokenVersion?: number;
    jti?: string;
    exp?: number;
    iat?: number;
}
