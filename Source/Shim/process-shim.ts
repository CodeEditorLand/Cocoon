// Basic process shim, trying to align with NodeJS.Process
// For full NodeJS.Process type, you'd need `@types/node`

// Define an interface for the parts of NodeJS.Process we are shimming.
// This helps in type-checking the shim.
export interface ProcessShim extends NodeJS.EventEmitter {
	// process is also an EventEmitter
	// pid can be undefined in some environments, though typically present in Node
	pid?: number;

	kill(pid: number, signal?: string | number): boolean;

	env: NodeJS.ProcessEnv;

	// Add other common process properties/methods if needed by extensions
	// For example:
	// platform: NodeJS.Platform;

	// arch: string;

	// cwd(): string;

	// versions: NodeJS.ProcessVersions;

	// argv: string[];

	// execArgv: string[];

	// exit(code?: number): never;

	// memoryUsage(): NodeJS.MemoryUsage;

	// hrtime(time?: [number, number]): [number, number];

	// on(event: string, listener: (...args: any[]) => void): this;

	// ... and so on
}

const processShimInstance: ProcessShim = {
	// --- NodeJS.EventEmitter properties/methods (process inherits from EventEmitter) ---
	// These would typically be provided by a base EventEmitter implementation or by
	// directly using Node's `process` if parts of it are not shimmed.
	// For a pure shim, you might need to implement these or use a minimal EventEmitter.
	// Let's assume for this shim these are NOPs or delegate if possible without full re-implementation.
	addListener: (
		event: string | symbol,

		listener: (...args: any[]) => void,
	): any => {
		console.warn(
			`[Cocoon Process Shim] addListener(${String(event)}) called - STUB`,
		);

		return processShimInstance;
	},

	on: (event: string | symbol, listener: (...args: any[]) => void): any => {
		console.warn(
			`[Cocoon Process Shim] on(${String(event)}) called - STUB`,
		);

		return processShimInstance;
	},

	once: (event: string | symbol, listener: (...args: any[]) => void): any => {
		console.warn(
			`[Cocoon Process Shim] once(${String(event)}) called - STUB`,
		);

		return processShimInstance;
	},

	removeListener: (
		event: string | symbol,

		listener: (...args: any[]) => void,
	): any => {
		console.warn(
			`[Cocoon Process Shim] removeListener(${String(event)}) called - STUB`,
		);

		return processShimInstance;
	},

	off: (event: string | symbol, listener: (...args: any[]) => void): any => {
		console.warn(
			`[Cocoon Process Shim] off(${String(event)}) called - STUB`,
		);

		return processShimInstance;
	},

	removeAllListeners: (event?: string | symbol): any => {
		console.warn(
			`[Cocoon Process Shim] removeAllListeners(${String(event || "")}) called - STUB`,
		);

		return processShimInstance;
	},

	setMaxListeners: (n: number): any => {
		console.warn(
			`[Cocoon Process Shim] setMaxListeners(${n}) called - STUB`,
		);

		return processShimInstance;
	},

	getMaxListeners: (): number => {
		console.warn(`[Cocoon Process Shim] getMaxListeners() called - STUB`);

		return 10;

		// Default Node value
	},

	listeners: (event: string | symbol): Function[] => {
		console.warn(
			`[Cocoon Process Shim] listeners(${String(event)}) called - STUB`,
		);

		return [];
	},

	rawListeners: (event: string | symbol): Function[] => {
		console.warn(
			`[Cocoon Process Shim] rawListeners(${String(event)}) called - STUB`,
		);

		return [];
	},

	emit: (event: string | symbol, ...args: any[]): boolean => {
		console.warn(
			`[Cocoon Process Shim] emit(${String(event)}) called - STUB`,
		);

		return false;
	},

	listenerCount: (event: string | symbol): number => {
		console.warn(
			`[Cocoon Process Shim] listenerCount(${String(event)}) called - STUB`,
		);

		return 0;
	},

	prependListener: (
		event: string | symbol,

		listener: (...args: any[]) => void,
	): any => {
		console.warn(
			`[Cocoon Process Shim] prependListener(${String(event)}) called - STUB`,
		);

		return processShimInstance;
	},

	prependOnceListener: (
		event: string | symbol,

		listener: (...args: any[]) => void,
	): any => {
		console.warn(
			`[Cocoon Process Shim] prependOnceListener(${String(event)}) called - STUB`,
		);

		return processShimInstance;
	},

	eventNames: (): Array<string | symbol> => {
		console.warn(`[Cocoon Process Shim] eventNames() called - STUB`);

		return [];
	},

	// --- Actual Process properties/methods ---
	// Use the actual pid of the Cocoon process
	pid: process.pid,

	kill: (pidToKill: number, signal?: string | number): boolean => {
		console.warn(
			`[Cocoon Process Shim] kill(${pidToKill}, ${signal || "SIGTERM"}) called.`,
		);

		// Check if trying to "kill" itself with signal 0 (check existence)
		if (pidToKill === process.pid && (signal === 0 || signal === "0")) {
			console.log(
				"[Cocoon Process Shim] kill(self, 0) - process exists.",
			);

			// Process exists
			return true;
		}

		// For other PIDs, attempt to use Node's native process.kill
		// This is risky in a sandboxed/sidecar environment and might be disallowed.
		// If disallowed, this should throw or always return false for external PIDs.
		// TODO: If killing other pids is needed, potentially proxy via Vine to Mountain? (Highly risky).
		try {
			// Node's process.kill can throw if pid doesn't exist or permissions are denied.
			// It returns true on success (signal sent), but this doesn't mean process died.
			const result = process.kill(
				pidToKill,

				signal as string | number | undefined,

				// Cast to allow undefined for default signal
			);

			console.log(
				`[Cocoon Process Shim] Native process.kill(${pidToKill}, ${signal}) returned ${result}.`,
			);

			// Should be true if signal was sent
			return result;
		} catch (e: any) {
			console.warn(
				`[Cocoon Process Shim] Native process.kill failed for PID ${pidToKill}:`,

				e.message,
			);

			// Emulate typical errors:
			// ESRCH: No such process
			// Signal could not be sent because PID doesn't exist
			if (e.code === "ESRCH") return false;

			// EPERM: Operation not permitted
			if (e.code === "EPERM") {
				// console.error("[Cocoon Process Shim] Permission denied to kill PID", pidToKill);

				// Depending on desired behavior, either rethrow or return false.
				// Throwing is more accurate to Node's behavior if permissions fail.
				throw e;
			}

			// Rethrow other unhandled errors, or return false to indicate failure.
			// For a shim, returning false might be safer than rethrowing unexpected errors.
			return false;
		}
	},

	// Pass through the environment variables of the Cocoon process
	env: process.env,

	// ... other process properties/methods if needed by host ...
	// platform: process.platform,

	// arch: process.arch,

	// cwd: () => process.cwd(),

	// versions: process.versions,

	// argv: process.argv,

	// execArgv: process.execArgv,

	// exit: (code?: number): never => {

	//     console.warn(`[Cocoon Process Shim] process.exit(${code}) called! This would terminate Cocoon.`);

	// In a real shim, you might notify Mountain before actually exiting, or prevent exit.
	//
	// This will terminate the Cocoon process itself. Use with extreme caution.
	//     return process.exit(code);

	// },

	// memoryUsage: () => process.memoryUsage(),

	// hrtime: (time?: [number, number]) => process.hrtime(time),
};

export default processShimInstance;

// Original JS export
// module.exports = { ... }

// `export default ...` handles this in TS.
