/*---------------------------------------------------------------------------------------------
 * Cocoon Process Shim (process-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in `process` global object. This shim is intended
 * to be supplied by the `NodeModuleShimFactory` when an extension executes `require('process')`.
 *
 * It aims to provide a controlled and potentially restricted view of the actual Cocoon
 * host process, exposing safer properties and methods while managing or stubbing
 * more sensitive operations.
 *
 * Responsibilities:
 * - Exposing common `process` properties like `pid`, `env`, `platform`, `arch`, `versions`.
 * - Providing a `kill` method that delegates to the (potentially patched by
 *   `cocoon-bootstrap.ts`) global `process.kill`.
 * - Providing an `exit` method that delegates to the patched global `process.exit`.
 * - Exposing utility methods like `cwd()`, `memoryUsage()`, `hrtime()`, `uptime()`, `nextTick()`.
 * - Partially mimicking the `EventEmitter` nature of the `process` object.
 * - Omitting or restricting access to sensitive methods like `chdir()` or direct
 *   manipulation of UID/GID, unless explicitly decided otherwise.
 *
 * Key Interactions:
 * - Returned by `NodeModuleShimFactory` when `require('process')` is intercepted.
 * - Uses the actual Node.js `process` object of the Cocoon environment for most property
 *   and method delegations.
 * - Its `exit` and `kill` methods interact with the versions patched by `cocoon-bootstrap.ts`.
 *

 *--------------------------------------------------------------------------------------------*/

// For EventEmitter base
import { EventEmitter } from "events";
// For type information from @types/node, assuming it's a dev dependency.
import type * as NodeProcessTypes from "node:process";

// --- Type Definitions ---

/**
 * Defines the public interface of the Cocoon process shim.
 * This interface aims to match relevant and safe parts of the `NodeJS.Process` API.
 * It extends `NodeJS.EventEmitter` to include event-related methods.
 */
export interface ProcessShim extends NodeJS.EventEmitter {
	// Common, generally safe properties
	readonly pid?: number;

	readonly env: NodeJS.ProcessEnv;

	readonly platform: NodeJS.Platform;

	readonly arch: string;

	readonly versions: NodeJS.ProcessVersions;

	/**
	 * The command-line arguments passed to the Cocoon process.
	 * Note: Exposing this might have security implications if arguments are sensitive.
	 */
	readonly argv: string[];

	/**
	 * The set of Node.js-specific command-line options passed when the Cocoon process was launched.
	 * Note: Exposing this might have security implications.
	 */
	readonly execArgv: string[];

	/** The absolute pathname of the executable that started the Node.js process (Cocoon). */
	readonly execPath: string;

	/** The title of the current process (value may vary across OS). */
	readonly title: string;

	// Common, generally safe methods
	/** Returns the current working directory of the Cocoon process. */
	cwd(): string;

	/**
	 * Sends a signal to a process.
	 * This delegates to the global `process.kill`, which may be patched by `cocoon-bootstrap.ts`.
	 * @param pid The process ID.
	 * @param signal The signal to send (e.g., 'SIGTERM' or a signal number). Defaults to 'SIGTERM'.
	 * @returns `true` if the signal was successfully sent, `false` otherwise.
	 */
	kill(pid: number, signal?: string | number): boolean;

	/**
	 * Instructs Node.js to terminate the process synchronously with an exit status of `code`.
	 * This delegates to the global `process.exit`, which is patched by `cocoon-bootstrap.ts`
	 * to prevent unintentional termination unless allowed by the host.
	 * @param code The exit code. Defaults to 0.
	 */
	exit(code?: number): never;

	/** Returns an object describing the memory usage of the Node.js process measured in bytes. */
	memoryUsage(): NodeProcessTypes.MemoryUsage;

	/**
	 * Returns the current high-resolution real time in a `[seconds, nanoseconds]` tuple Array,
	 *
	 *
	 *
	 * or the difference from a previous `hrtime` call.
	 */
	hrtime(time?: [number, number]): [number, number];

	/** Returns the system uptime in number of seconds. */
	uptime(): number;

	/** Adds the `callback` to the "next tick queue". */
	nextTick(callback: (...args: any[]) => void, ...args: any[]): void;

	// TODO: Consider adding other commonly used but safe process methods/properties if needed:
	// e.g., resourceUsage(), getegid(), geteuid(), getgid(), getgroups(), getuid()
	// Methods like chdir(), setgid(), setuid(), umask() are generally considered unsafe
	// for extensions and are intentionally omitted from this shim's public interface.
}

// Base class for the shim to correctly inherit EventEmitter methods and properties.
class ProcessShimBase extends EventEmitter {}

// Keep a reference to the real Node.js process object from the Cocoon environment.
const actualNodeProcessGlobal = process;

const processShimInstanceInternal: ProcessShim = {
	// --- NodeJS.EventEmitter properties/methods ---
	// Spread methods from a new EventEmitter instance to ensure this shim
	// behaves like an EventEmitter without directly exposing the global process's emitter.
	...new ProcessShimBase(),

	// --- Process properties (mostly direct pass-through) ---
	get pid(): number | undefined {
		return actualNodeProcessGlobal.pid;
	},

	get env(): NodeJS.ProcessEnv {
		// Return a copy to prevent extensions from modifying Cocoon's process.env directly.
		// This is a shallow copy; deeper modifications to nested objects in env would still affect the original.
		// For stricter sandboxing, a deep clone or a read-only proxy could be used.
		return { ...actualNodeProcessGlobal.env };
	},

	get platform(): NodeJS.Platform {
		return actualNodeProcessGlobal.platform;
	},

	get arch(): string {
		return actualNodeProcessGlobal.arch;
	},

	get versions(): NodeJS.ProcessVersions {
		// Return a copy of the versions object.
		return { ...actualNodeProcessGlobal.versions };
	},

	get argv(): string[] {
		// Exposing argv might reveal sensitive information about Cocoon's launch.
		// Consider if this should be restricted or filtered. For now, pass through a copy.
		console.warn(
			"[Cocoon Process Shim] Access to process.argv. This might expose sensitive launch arguments.",
		);

		return [...actualNodeProcessGlobal.argv];
	},

	get execArgv(): string[] {
		// Exposing execArgv can also be a security concern.
		console.warn(
			"[Cocoon Process Shim] Access to process.execArgv. This might expose sensitive Node.js launch flags.",
		);

		return [...actualNodeProcessGlobal.execArgv];
	},

	get execPath(): string {
		return actualNodeProcessGlobal.execPath;
	},

	get title(): string {
		return actualNodeProcessGlobal.title;
	},

	// --- Process methods ---
	cwd(): string {
		// TODO: Evaluate if extensions should see Cocoon's actual CWD or a virtualized/restricted path.
		// For now, passes through the actual CWD.
		return actualNodeProcessGlobal.cwd();
	},

	kill: (pidToKill: number, signal?: string | number): boolean => {
		console.warn(
			`[Cocoon Process Shim] Extension called require('process').kill(pid: ${pidToKill}, signal: ${signal || "SIGTERM"}). This delegates to the global process.kill, which may be patched by Cocoon bootstrap.`,
		);

		try {
			// This will call the globally patched process.kill if cocoon-bootstrap.ts ran.
			// That patched version handles whether the kill is allowed on Cocoon's own PID.
			return actualNodeProcessGlobal.kill(
				pidToKill,

				signal as string | number | undefined,
			);
		} catch (e: any) {
			// Log the error from the actual kill attempt.
			// Common errors:
			// - ESRCH: No such process
			// - EPERM: Permission denied (e.g., trying to kill a process owned by another user)
			console.warn(
				`[Cocoon Process Shim] actualNodeProcessGlobal.kill failed for PID ${pidToKill} with signal ${signal || "SIGTERM"}:`,

				e.message,

				e.code ? `(code: ${e.code})` : "",
			);

			// `process.kill` throws on error (like EPERM or invalid signal).
			// It returns true on success, and for signal 0, true if process exists, false if not (without throwing ESRCH).
			// This shim should try to match that behavior if possible or clearly document deviations.
			// Special case for kill(pid, 0)
			if (e.code === "ESRCH" && signal === 0) return false;

			// Rethrow other errors as the native `kill` would.
			throw e;
		}
	},

	exit: (code?: number): never => {
		console.warn(
			`[Cocoon Process Shim] Extension called require('process').exit(${code ?? ""}). This delegates to the global process.exit, which is patched by Cocoon bootstrap to control termination.`,
		);

		// This will invoke the version patched by `cocoon-bootstrap.ts`.
		return actualNodeProcessGlobal.exit(code);
	},

	memoryUsage: (): NodeProcessTypes.MemoryUsage =>
		actualNodeProcessGlobal.memoryUsage(),

	hrtime: (time?: [number, number]): [number, number] =>
		actualNodeProcessGlobal.hrtime(time),

	uptime: (): number => actualNodeProcessGlobal.uptime(),

	nextTick: (callback: (...args: any[]) => void, ...args: any[]): void =>
		actualNodeProcessGlobal.nextTick(callback, ...args),
};

// Verify EventEmitter methods are present (sanity check, should be inherited via spread).
if (
	typeof processShimInstanceInternal.on !== "function" ||
	typeof processShimInstanceInternal.emit !== "function"
) {
	console.error(
		"[Cocoon Process Shim] CRITICAL: EventEmitter methods not correctly applied to shim instance! Events will not work.",
	);
}

export default processShimInstanceInternal;
