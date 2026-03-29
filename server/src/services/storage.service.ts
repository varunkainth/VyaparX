import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import env from "../config/env";

const r2Client = env.R2_ENABLED
    ? new S3Client({
          region: "auto",
          endpoint: env.R2_ENDPOINT,
          credentials: {
              accessKeyId: env.R2_ACCESS_KEY_ID,
              secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
      })
    : null;

const encodeObjectKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

export const isR2StorageEnabled = () => Boolean(r2Client);

export const getStorageHealth = async () => {
    if (!env.R2_ENABLED) {
        return {
            enabled: false,
            configured: Boolean(
                env.R2_ENDPOINT &&
                    env.R2_BUCKET &&
                    env.R2_ACCESS_KEY_ID &&
                    env.R2_SECRET_ACCESS_KEY &&
                    env.R2_PUBLIC_BASE_URL
            ),
            provider: "r2",
            status: "disabled" as const,
        };
    }

    if (!r2Client) {
        return {
            enabled: true,
            configured: false,
            provider: "r2",
            status: "unconfigured" as const,
        };
    }

    try {
        await r2Client.send(
            new HeadBucketCommand({
                Bucket: env.R2_BUCKET,
            })
        );

        return {
            enabled: true,
            configured: true,
            provider: "r2",
            status: "ok" as const,
            bucket: env.R2_BUCKET,
            endpoint: env.R2_ENDPOINT,
            public_base_url: env.R2_PUBLIC_BASE_URL,
        };
    } catch (error) {
        return {
            enabled: true,
            configured: true,
            provider: "r2",
            status: "error" as const,
            bucket: env.R2_BUCKET,
            endpoint: env.R2_ENDPOINT,
            public_base_url: env.R2_PUBLIC_BASE_URL,
            error: error instanceof Error ? error.message : "Unknown storage error",
        };
    }
};

export const buildR2PublicUrl = (key: string) => {
    if (!env.R2_PUBLIC_BASE_URL) return null;
    return `${env.R2_PUBLIC_BASE_URL}/${encodeObjectKey(key)}`;
};

export const uploadPdfToR2 = async (key: string, body: Buffer, fileName: string) => {
    if (!r2Client) {
        throw new Error("R2 storage is not configured");
    }

    await r2Client.send(
        new PutObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: "application/pdf",
            ContentDisposition: `inline; filename="${fileName}"`,
        })
    );

    return {
        key,
        url: buildR2PublicUrl(key),
    };
};

export const downloadPdfFromR2 = async (key: string): Promise<Buffer> => {
    if (!r2Client) {
        throw new Error("R2 storage is not configured");
    }

    const response = await r2Client.send(
        new GetObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
        })
    );

    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
        throw new Error("Failed to read PDF from R2");
    }

    return Buffer.from(bytes);
};
