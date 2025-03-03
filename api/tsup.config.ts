import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src", "drizzle.config.ts"],
  format: ["esm"],
	splitting: false,
	sourcemap: true,
	clean: true,
  define: {
    "process.env.NODE_ENV": "'production'",
    "process.env.DATABASE_URL": "'postgres://fphbuddies:bPZ6SdIth7@dev-freediving-ph-rds.cji8vqdamzfa.ap-southeast-1.rds.amazonaws.com'",
    "process.env.PORT": "'4000'",
    "process.env.SECRET": "'secretcsrffdph'",
    "process.env.JWT_COOKIE_NAME": "'jwtauthfdph'",
    "process.env.SESSION_COOKIE_NAME": "'sessauthfdph'",
    "process.env.ORIGIN_URL": "'dev.freediving.ph'",
    "process.env.APP_URL": "'dev.freediving.ph'",
    "process.env.API_URL": "'api-dev.freediving.ph'",
  },
	loader: { ".ejs": "copy" }
})
