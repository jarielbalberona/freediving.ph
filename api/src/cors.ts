import { CorsOptions } from "cors";

import originStore from "@/utils/originStore";

// CORS configuration with options
export const corsOptions: CorsOptions = {
	origin: function (origin, callback) {
		console.log("CORS origin:", origin);
		console.log("Allowed origins:", process.env.ORIGIN_URL);

		// Normalize both values by stripping 'https://' or 'http://'
		const formattedOrigin = origin?.replace(/^https?:\/\//, "") || "";
		const allowedOrigins = process.env.ORIGIN_URL.split(",").map(o => o.replace(/^https?:\/\//, ""));

		console.log("Formatted request origin:", formattedOrigin);
		console.log("Formatted allowed origins:", allowedOrigins);

		if (!origin || allowedOrigins.includes(formattedOrigin)) {
			callback(null, true);
		} else {
			console.log("CORS check result: false");
			callback(new Error("Not allowed by CORS"));
		}
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE"],
	allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token", "ngrok-skip-browser-warning"],
	maxAge: 3600,
};

export const socketCorsConfig = {
	origin: function (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void
	) {
		if (!origin || process.env.ORIGIN_URL.split(",").includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	methods: ["GET", "POST"],
	credentials: true
};
