import { z } from "zod";
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    APP_STAGE: z.ZodDefault<z.ZodEnum<{
        dev: "dev";
        production: "production";
        test: "test";
    }>>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    DATABASE_URL: z.ZodString;
    DATABASE_URL_DIRECT: z.ZodOptional<z.ZodString>;
    RESEND_API_KEY: z.ZodString;
    RESEND_FROM_EMAIL: z.ZodString;
    FRONTEND_URL: z.ZodString;
    JWT_SECRET: z.ZodString;
    REFRESH_TOKEN_EXPIRES_DAYS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    INVITE_EXPIRES_DAYS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    BCRYPT_ROUNDS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    ALLOWED_ORIGINS: z.ZodDefault<z.ZodString>;
    R2_ACCOUNT_ID: z.ZodOptional<z.ZodString>;
    R2_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    R2_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    R2_BUCKET: z.ZodOptional<z.ZodString>;
    R2_PUBLIC_URL: z.ZodOptional<z.ZodString>;
    R2_ENDPOINT: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Env = z.infer<typeof envSchema>;
declare let env: Env;
export declare const isProd: () => boolean;
export declare const isTest: () => boolean;
export declare const isDev: () => boolean;
export declare const getAllowedOrigins: () => string[];
export { env };
export default env;
//# sourceMappingURL=env.d.ts.map