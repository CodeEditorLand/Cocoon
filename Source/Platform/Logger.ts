/**
 * @module Platform/Logger
 * @description Logger utility for Cocoon services.
 */

export class Logger {

	private readonly Prefix: string;

	constructor(Prefix: string = "Cocoon") {
		this.Prefix = Prefix;
	}

	Info(Message: string, ...Args: unknown[]): void {
		console.log(`[${this.Prefix}] ${Message}`, ...Args);
	}

	Warn(Message: string, ...Args: unknown[]): void {
		console.warn(`[${this.Prefix}] ${Message}`, ...Args);
	}

	Error(Message: string, ...Args: unknown[]): void {
		console.error(`[${this.Prefix}] ${Message}`, ...Args);
	}

	Debug(Message: string, ...Args: unknown[]): void {
		if (process.env.NODE_ENV !== "production") {
			console.debug(`[${this.Prefix}] ${Message}`, ...Args;
		}
	}
}

export default Logger;
