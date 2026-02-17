export class TimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TimeoutError";
	}
}

export const withTimeout = async <T>(
	promiseFactory: () => Promise<T>,
	timeoutMs: number,
	timeoutMessage: string
): Promise<T> => {
	return new Promise<T>((resolve, reject) => {
		const timeoutRef = setTimeout(() => {
			reject(new TimeoutError(timeoutMessage));
		}, timeoutMs);

		promiseFactory()
			.then(result => {
				clearTimeout(timeoutRef);
				resolve(result);
			})
			.catch(error => {
				clearTimeout(timeoutRef);
				reject(error);
			});
	});
};

export const retryAsync = async <T>(
	task: () => Promise<T>,
	options: { attempts: number; backoffMs: number; retryIf?: (error: unknown) => boolean }
): Promise<T> => {
	let attempt = 0;
	let lastError: unknown;

	while (attempt < options.attempts) {
		try {
			return await task();
		} catch (error) {
			lastError = error;
			attempt += 1;

			const shouldRetry = options.retryIf ? options.retryIf(error) : true;
			if (!shouldRetry || attempt >= options.attempts) {
				break;
			}

			await new Promise(resolve => setTimeout(resolve, options.backoffMs * attempt));
		}
	}

	throw lastError;
};
