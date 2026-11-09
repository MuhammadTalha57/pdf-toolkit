import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getEnv } from "../config/env.js";

let client: S3Client | null = null;

function getClient(): S3Client {
    if (client) return client;

    const env = getEnv();

    client = new S3Client({
        region: env.AWS_REGION,
        ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
        ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
            ? {
                  credentials: {
                      accessKeyId: env.S3_ACCESS_KEY_ID,
                      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
                  },
              }
            : {}),
    });

    return client;
}

export function tempKey(): string {
    return `tmp/${randomUUID()}.pdf`;
}

export function resultKey(userId: string): string {
    return `users/${userId}/results/${randomUUID()}.pdf`;
}

export async function putObject(
    key: string,
    body: Buffer,
    contentType = "application/pdf",
): Promise<void> {
    await getClient().send(
        new PutObjectCommand({
            Bucket: getEnv().S3_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
    const result = await getClient().send(
        new GetObjectCommand({
            Bucket: getEnv().S3_BUCKET,
            Key: key,
        }),
    );

    if (!result.Body) {
        throw new Error(`S3 object has no body: ${key}`);
    }

    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
}

export async function getObjectStream(key: string): Promise<Readable> {
    const result = await getClient().send(
        new GetObjectCommand({
            Bucket: getEnv().S3_BUCKET,
            Key: key,
        }),
    );

    if (!result.Body) {
        throw new Error(`S3 object has no body: ${key}`);
    }

    return result.Body as Readable;
}

export async function deleteObject(key: string): Promise<void> {
    await getClient().send(
        new DeleteObjectCommand({
            Bucket: getEnv().S3_BUCKET,
            Key: key,
        }),
    );
}
