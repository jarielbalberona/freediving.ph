import { z } from "zod";

import { validateEnum, validateString } from "@/validators/commonRules";

export const googleEnvSchema = z.object({
	GOOGLE_CLIENT_ID: validateString("GOOGLE_CLIENT_ID"),
	GOOGLE_CLIENT_SECRET: validateString("GOOGLE_CLIENT_SECRET"),
	GOOGLE_CALLBACK_URL: validateString("GOOGLE_CALLBACK_URL")
});

const emailEnvSchema = z.object({
	EMAIL_SERVER_HOST: validateString("EMAIL_SERVER_HOST"),
	EMAIL_SERVER_PORT: validateString("EMAIL_SERVER_PORT"),
	EMAIL_SERVER_USER: validateString("EMAIL_SERVER_USER"),
	EMAIL_SERVER_PASSWORD: validateString("EMAIL_SERVER_PASSWORD"),
	EMAIL_FROM: validateString("EMAIL_FROM")
});

export const envSchema = z.object({
	DATABASE_URL: validateString("DATABASE_URL"),
	PORT: validateString("PORT").refine(value => !isNaN(Number(value)), "PORT must be a number"),
	SECRET: validateString("SECRET"),
	NODE_ENV: validateEnum("NODE_ENV", ["development", "production"]),
	JWT_COOKIE_NAME: validateString("JWT_COOKIE_NAME"),
	SESSION_COOKIE_NAME: validateString("SESSION_COOKIE_NAME"),
	ORIGIN_URL: validateString("ORIGIN_URL"),
	APP_URL: validateString("APP_URL"),
	API_URL: validateString("API_URL"),
	AWS_REGION: validateString("AWS_REGION"),
	AWS_ACCESS_KEY: validateString("AWS_ACCESS_KEY"),
  AWS_SECRET_KEY: validateString("AWS_SECRET_KEY"),
	AWS_S3_FPH_BUCKET_NAME: validateString("AWS_S3_FPH_BUCKET_NAME"),
	...googleEnvSchema.shape,
	...emailEnvSchema.shape
});

const normalizedEnv = {
	...process.env,
	SECRET: process.env.SECRET ?? process.env.JWT_SECRET,
	JWT_COOKIE_NAME: process.env.JWT_COOKIE_NAME ?? "fph_jwt",
	SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? "fph_session",
	ORIGIN_URL: process.env.ORIGIN_URL ?? process.env.CORS_ORIGIN,
	APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
	API_URL: process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL,
	AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID,
	AWS_SECRET_KEY: process.env.AWS_SECRET_KEY ?? process.env.AWS_SECRET_ACCESS_KEY,
	AWS_S3_FPH_BUCKET_NAME: process.env.AWS_S3_FPH_BUCKET_NAME ?? process.env.AWS_S3_BUCKET,
	EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST ?? process.env.EMAIL_HOST,
	EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT ?? process.env.EMAIL_PORT,
	EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER ?? process.env.EMAIL_USER,
	EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD ?? process.env.EMAIL_PASS,
};

const Env = envSchema.safeParse(normalizedEnv);

if (!Env.success) {
	const errorMessages = Env.error.errors.map(e => e.message).join("\n");
	console.error(`Environment validation failed:\n${errorMessages}`);
	process.exit(1);
}

export type EnvType = z.infer<typeof envSchema>;

declare global {
	namespace NodeJS {
		interface ProcessEnv extends EnvType {}
	}
}
