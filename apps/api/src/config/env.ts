import "dotenv/config";
import { z } from "zod";

const optionalString = z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().optional(),
);

const optionalUrl = z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
);

const optionalBoolean = z.preprocess((value) => {
    if (value === undefined || value === "") return undefined;
    if (typeof value === "boolean") return value;
    return String(value).toLowerCase() === "true";
}, z.boolean().optional());

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
    JWT_EXPIRES_DAYS: z.coerce.number().positive().default(7),
    S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
    AWS_REGION: z.string().default("us-east-1"),
    S3_ENDPOINT: optionalUrl,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
    COOKIE_SECURE: optionalBoolean,
    MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
    if (cached) return cached;

    const parsed = EnvSchema.safeParse(process.env);

    if (!parsed.success) {
        const fields = parsed.error.flatten().fieldErrors;
        console.error("Invalid environment configuration:", fields);
        throw new Error(`Invalid environment configuration: ${JSON.stringify(fields)}`);
    }

    cached = parsed.data;
    return cached;
}

export function isProduction(): boolean {
    return getEnv().NODE_ENV === "production";
}

export function useSecureCookies(): boolean {
    const env = getEnv();
    return env.COOKIE_SECURE ?? env.NODE_ENV === "production";
}
