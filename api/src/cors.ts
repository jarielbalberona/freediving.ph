import { CorsOptions } from "cors";

import originStore from "@/utils/originStore";

// CORS configuration with options
export const corsOptions: CorsOptions = {
	origin: function (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void
  ) {
    console.log("corsOptions origin", origin)
    console.log("corsOptions process.env.ORIGIN_UR", process.env.ORIGIN_URL)
    console.log("corsOptions process.env.ORIGIN_URL.split(",").includes(origin)", process.env.ORIGIN_URL.split(",").includes(origin || ""))
		if (!origin || process.env.ORIGIN_URL.split(",").includes(origin)) {
      if (origin) {
        console.log("corsOptions originStore.setOriginUrl(origin)", origin)
				originStore.setOriginUrl(origin);
      }
      console.log("corsOptions callback true")
			callback(null, true);
		} else {
      console.log("corsOptions callback false")
			callback(new Error("Not allowed by CORS"));
		}
	},
	credentials: true,

	methods: ["GET", "POST", "PUT", "DELETE"],

	allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token", "ngrok-skip-browser-warning"],
	maxAge: 3600
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
