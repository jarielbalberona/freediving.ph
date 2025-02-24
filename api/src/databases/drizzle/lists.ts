export const ROLE_LIST = {
	SUPER_ADMIN: "SUPER_ADMIN",
	ADMINISTRATOR: "ADMINISTRATOR",
	EDITOR: "EDITOR",
	AUTHOR: "AUTHOR",
	CONTRIBUTOR: "CONTRIBUTOR",
	SUBSCRIBER: "SUBSCRIBER",
	USER: "USER",
	enumValues: [
		"SUPER_ADMIN",
		"ADMINISTRATOR",
		"EDITOR",
		"AUTHOR",
		"CONTRIBUTOR",
		"SUBSCRIBER",
		"USER"
	]
} as const;

export const TOKEN_LIST = {
	PASSWORD_RESET: "PASSWORD_RESET",
	EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
	LOGIN_OTP: "LOGIN_OTP",
	enumValues: ["PASSWORD_RESET", "EMAIL_VERIFICATION", "LOGIN_OTP"]
} as const;

export const DIVE_DIFFICULTY = {
	BEGINNER: "BEGINNER",
	INTERMEDIATE: "INTERMEDIATE",
	ADVANCED: "ADVANCED",
	enumValues: ["BEGINNER", "INTERMEDIATE", "ADVANCED"]
} as const;