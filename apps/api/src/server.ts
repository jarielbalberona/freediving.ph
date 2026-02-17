import ip from "ip";

import app from "@/app";
import "@/core/env";

const startServer = async () => {
	const initialPort = process.env.PORT || 8080;
	const ENV = process.env.NODE_ENV || "development";

	// Function to find an available port
	const findAvailablePort = (startPort: number): Promise<number> => {
		return new Promise((resolve, reject) => {
			const server = app.listen(startPort, () => {
				server.close(() => resolve(startPort));
			});

			server.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "EACCES" || err.code === "EADDRINUSE") {
					// Try the next port
					resolve(findAvailablePort(startPort + 1));
				} else {
					reject(err);
				}
			});
		});
	};

	try {
		const port = await findAvailablePort(Number(initialPort));
		const ipAddress = ip.address();

		const server = app.listen(port, () => {
			console.log(`- Local:        http://localhost:${port}`);
			console.log(`- Network:      http://${ipAddress}:${port}`);
			console.log(`- Environment:  ${ENV}`);
			console.log();
		});

		server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 15000);
		server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 16000);
		server.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || 5000);
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
};

startServer();
