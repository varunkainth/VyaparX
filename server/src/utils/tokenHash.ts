import crypto from "crypto";

export const hashOpaqueToken = (token: string): string =>
    crypto.createHash("sha256").update(token).digest("hex");
