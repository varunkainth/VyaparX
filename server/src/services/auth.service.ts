import jwt, { type SignOptions, } from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import pool from "../config/db";
import env from "../config/env";
import { ERROR_CODES } from "../constants/errorCodes";
import { refreshTokenRepository } from "../repository/refreshToken.repository";
import type { TokenPayload } from "../types/jwt";
import { userRepository } from "../repository/user.repository";
import type { UserRole } from "../types/user";
import { AppError } from "../utils/appError";

class AuthService {
    /* ===========================
       JWT Configuration
    ============================ */
    private readonly accessTokenSecret: string;
    private readonly refreshTokenSecret: string;
    private readonly accessTokenOptions: SignOptions;
    private readonly refreshTokenOptions: SignOptions;

    constructor() {
        if (!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET) {
            throw new Error("JWT secrets are not defined in environment variables");
        }

        this.accessTokenSecret = env.JWT_ACCESS_SECRET;
        this.refreshTokenSecret = env.JWT_REFRESH_SECRET;

        this.accessTokenOptions = {
            expiresIn: (env.JWT_ACCESS_EXPIRY as SignOptions["expiresIn"]) ?? 60 * 15, // 15 min
            issuer: "vyaparx-api",
            audience: "vyaparx-client",
        };

        this.refreshTokenOptions = {
            expiresIn: (env.JWT_REFRESH_EXPIRY as SignOptions["expiresIn"]) ?? 60 * 60 * 24 * 7, // 7 days
            issuer: "vyaparx-api",
            audience: "vyaparx-client",
        };
    }

    /* ===========================
       Token Generation
    ============================ */

    generateAccessToken(payload: TokenPayload): string {
        return jwt.sign(payload, this.accessTokenSecret, this.accessTokenOptions);
    }

    generateRefreshToken(payload: TokenPayload): string {
        return jwt.sign(payload, this.refreshTokenSecret, this.refreshTokenOptions);
    }

    generateTokens(payload: TokenPayload) {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
        };
    }

    async generateTokensForUserSession(params: {
        userId: string;
        businessId?: string;
    }) {
        const user = await userRepository.findById(params.userId);
        if (!user) {
            throw new Error("User not found");
        }

        let role: UserRole | undefined;
        if (params.businessId) {
            role = await userRepository.getBusinessMemberRole(params.businessId, params.userId) ?? undefined;
            if (!role) {
                throw new Error("User is not an active member of the selected business");
            }
        }

        const payload: TokenPayload = {
            userId: user.id,
            email: user.email,
            businessId: params.businessId,
            role,
            tokenVersion: user.token_version,
        };

        const refreshTokenId = uuid();
        const accessToken = this.generateAccessToken(payload);
        const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
            ...this.refreshTokenOptions,
            jwtid: refreshTokenId,
        });

        const decodedRefresh = this.verifyRefreshToken(refreshToken);
        if (!decodedRefresh?.exp) {
            throw new Error("Failed to derive refresh token expiry");
        }

        await refreshTokenRepository.create({
            tokenId: refreshTokenId,
            userId: user.id,
            businessId: params.businessId,
            expiresAt: new Date(decodedRefresh.exp * 1000),
        });

        return { accessToken, refreshToken };
    }

    async rotateRefreshTokenSession(decodedRefreshToken: TokenPayload) {
        const currentTokenId = decodedRefreshToken.jti;
        if (!currentTokenId) {
            throw new AppError("Invalid refresh token", 401, ERROR_CODES.UNAUTHORIZED);
        }

        const user = await userRepository.findById(decodedRefreshToken.userId);
        if (!user || (decodedRefreshToken.tokenVersion !== undefined && user.token_version !== decodedRefreshToken.tokenVersion)) {
            throw new AppError("Please login again", 401, ERROR_CODES.SESSION_EXPIRED);
        }

        const role = decodedRefreshToken.businessId
            ? await userRepository.getBusinessMemberRole(decodedRefreshToken.businessId, decodedRefreshToken.userId) ?? undefined
            : undefined;

        if (decodedRefreshToken.businessId && !role) {
            throw new AppError("Business access denied", 403, ERROR_CODES.BUSINESS_ACCESS_DENIED);
        }

        const payload: TokenPayload = {
            userId: user.id,
            email: user.email,
            businessId: decodedRefreshToken.businessId,
            role,
            tokenVersion: user.token_version,
        };

        const newRefreshTokenId = uuid();
        const newAccessToken = this.generateAccessToken(payload);
        const newRefreshToken = jwt.sign(payload, this.refreshTokenSecret, {
            ...this.refreshTokenOptions,
            jwtid: newRefreshTokenId,
        });

        const newDecodedRefresh = this.verifyRefreshToken(newRefreshToken);
        if (!newDecodedRefresh?.exp) {
            throw new AppError("Failed to rotate refresh token", 500, ERROR_CODES.INTERNAL_ERROR);
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const current = await refreshTokenRepository.lockActiveTokenById(currentTokenId, client);
            if (!current) {
                throw new AppError("Refresh token expired or revoked", 401, ERROR_CODES.SESSION_EXPIRED);
            }

            await refreshTokenRepository.create({
                tokenId: newRefreshTokenId,
                userId: user.id,
                businessId: decodedRefreshToken.businessId,
                expiresAt: new Date(newDecodedRefresh.exp * 1000),
                client,
            });

            await refreshTokenRepository.revokeAndReplace(currentTokenId, newRefreshTokenId, client);

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    /* ===========================
       Token Verification
    ============================ */

    verifyAccessToken(token: string): TokenPayload | null {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret, {
                issuer: "vyaparx-api",
                audience: "vyaparx-client",
                algorithms: ["HS256"],
            });

            return decoded as TokenPayload;
        } catch {
            return null;
        }
    }

    verifyRefreshToken(token: string): TokenPayload | null {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret, {
                issuer: "vyaparx-api",
                audience: "vyaparx-client",
                algorithms: ["HS256"],
            });

            return decoded as TokenPayload;
        } catch {
            return null;
        }
    }

    /* ===========================
       Password Handling
    ============================ */

    async hashPassword(password: string): Promise<string> {
        return Bun.password.hash(password, {
            algorithm: "argon2id",
            memoryCost: 65536, // 64 MiB
            timeCost: 3,
        });
    }

    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return Bun.password.verify(password, hash);
    }
}

export const authService = new AuthService();
