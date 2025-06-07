/*
 * File: Cocoon/Source/Shim/Process.ts
 * Responsibility: Provides a controlled and secure interface for extensions to interact with the Node.js process environment, ensuring that sensitive operations are managed and preventing unintended access or modification of critical system resources.
 * Modified: 2025-06-07 00:57:38 UTC
 * Dependency: events, node:process, process
 * Export: ProcessShim
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Process Shim
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in `process` global object. This shim is
 * intended to be supplied by the `NodeModuleShimFactory` when an extension executes
 * `require('process')`.
 *
 * The goal of this shim is to provide extensions with a controlled and potentially
 * restricted view of the actual Cocoon host process. It exposes commonly used,
 * generally safe properties and methods, while managing or stubbing more sensitive
 * operations that could affect the stability or security of the Cocoon environment.
 *
 * Responsibilities:
 * - Exposing common `process` properties like `pid`, `platform`, `arch`, `versions`,
 *   `execPath`, and `title` by delegating to the actual `process` object of the
 *   Cocoon environment.
 * - Providing read-only copies for `env`, `argv`, and `execArgv` to prevent direct
 *   mutation by extensions, with warnings for accessing potentially sensitive `argv`
 *   and `execArgv`.
 * - Implementing a `kill(pid, signal)` method that delegates to the global `process.kill`,
 *   which itself may be patched by `cocoon-bootstrap.ts` for controlled behavior.
 * - Implementing an `exit(code)` method that delegates to the global `process.exit`,
 *   which is patched by `cocoon-bootstrap.ts` to prevent unintentional termination
 *   unless explicitly allowed by the host application (Mountain).
 * - Exposing utility methods like `cwd()`, `memoryUsage()`, `hrtime()`, `uptime()`,
 *   and `nextTick()` through direct delegation.
 * - Partially mimicking the `EventEmitter` nature of the `process` object by
 *   extending `EventEmitter`, allowing extensions to use `on`, `emit`, etc., on the
 *   shim instance (though it doesn't automatically proxy all events from the
 *   actual `process` object).
 * - Intentionally omitting or restricting access to highly sensitive methods like
 *   `chdir()`, direct UID/GID manipulation functions (`setuid`, `setgid`), or `umask`,
 *   as these are generally not safe for extensions to call directly in a shared host.
 *
 * Key Interactions:
 * - An instance of this shim is returned by `NodeModuleShimFactory` when an extension
 *   issues `require('process')`.
 * - It relies on the actual Node.js `process` object available in the Cocoon runtime
 *   for most of its property and method delegations.
 * - Its `exit()` and `kill()` methods interact with the versions of these functions
 *   that have been patched by `cocoon-bootstrap.ts`, thus respecting Cocoon's
 *   overall process control policies.
 *
 * TODO (Architectural):
 * - Consider virtualizing `cwd()` to an extension-specific or workspace root if stricter
 *   sandboxing is required. Current behavior returns Cocoon's actual CWD.
 * - Consider providing a filtered view of `process.env` for enhanced security, rather than
 *   a full shallow copy.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

// For EventEmitter base class, allowing the shim to emit/listen for events.
import { EventEmitter } from "events";
// For type information from @types/node, assuming it's a dev dependency.
import type * as NodeProcessTypes from "node:process";

// --- Type Definitions ---

/**
 * Defines the public interface of the Cocoon process shim.
 * This interface aims to match relevant and generally safe parts of the `NodeJS.Process` API,
 * providing a controlled environment for extensions. It extends `NodeJS.EventEmitter`.
 */
export interface ProcessShim extends NodeJS.EventEmitter {
	// Common, generally safe properties:
	/** The Process ID (PID) of the Cocoon host process. */
	readonly pid?: number;
	/**
	 * An object containing the Cocoon process's environment variables.
	 * Returns a shallow copy to prevent direct modification by extensions.
	 */
	readonly env: NodeJS.ProcessEnv;
	/** The operating system platform Cocoon is running on (e.g., 'darwin', 'linux', 'win32'). */
	readonly platform: NodeJS.Platform;
	/** The CPU architecture Cocoon is running on (e.g., 'x64', 'arm64'). */
	readonly arch: string;
	/** An object exposing version strings for Node.js and its dependencies. Returns a copy. */
	readonly versions: NodeJS.ProcessVersions;
	/**
	 * An array containing the command-line arguments passed when the Cocoon process was launched.
	 * The first element is `process.execPath`. Subsequent elements are script path and other arguments.
	 * Returns a copy.
	 * **Note:** Exposing this might reveal sensitive launch parameters.
	 */
	readonly argv: string[];
	/**
	 * An array containing the set of Node.js-specific command-line options passed when Cocoon was launched.
	 * Returns a copy.
	 * **Note:** Exposing this might reveal sensitive Node.js configuration.
	 */
	readonly execArgv: string[];
	/** The absolute pathname of the executable that started the Node.js process (i.e., Cocoon's Node runtime). */
	readonly execPath: string;
	/** The title of the current process (behavior and value can vary across operating systems). */
	readonly title: string;

	// Common, generally safe methods:
	/** Returns the current working directory of the Cocoon process.
	 * TODO: Evaluate if this should return a virtualized path for sandboxing.
	 */
	cwd(): string;
	/**
	 * Sends a signal to a process. This delegates to the global `process.kill`, which may be
	 * patched by `cocoon-bootstrap.ts` to control signals to Cocoon's own process.
	 * @param pid The process ID to send the signal to.
	 * @param signal The signal to send (e.g., 'SIGTERM', 'SIGINT', or a signal number). Defaults to 'SIGTERM'.
	 * @returns `true` if the signal was successfully sent (or, for signal 0, if the process exists), `false` otherwise.
	 * @throws Error if the `pid` or `signal` is invalid, or if permissions are insufficient (for non-zero signals).
	 */
	kill(pid: number, signal?: string | number): boolean;
	/**
	 * Instructs Node.js to terminate the process. This delegates to the global `process.exit`,
	 * which is patched by `cocoon-bootstrap.ts` to make termination conditional based on host policy.
	 * @param code The exit code. Defaults to 0 (success).
	 * @returns This function never returns due to process termination (or throwing an error if prevented).
	 */
	exit(code?: number): never;
	/** Returns an object describing the memory usage of the Node.js process (Cocoon) in bytes. */
	memoryUsage(): NodeProcessTypes.MemoryUsage;
	/**
	 * Returns the current high-resolution real time in a `[seconds, nanoseconds]` tuple Array.
	 * If `time` (a previous `hrtime` result) is provided, it returns the difference.
	 */
	hrtime(time?: [number, number]): [number, number];
	/** Returns the system uptime (not process uptime) in number of seconds. */
	uptime(): number;
	/**
	 * Adds the `callback` to the "next tick queue". This queue is fully drained after the
	 * current operation on the JavaScript stack runs to completion and before the event loop
	 * is allowed to continue.
	 */
	nextTick(callback: (...args: any[]) => void, ...args: any[]): void;

	// Events like `beforeExit`, `exit`, `multipleResolves`, `rejectionHandled`, `uncaughtException`,
	// `unhandledRejection`, `warning`, `message`, `signal events` (SIGINT, etc.) are part of NodeJS.EventEmitter.
	// This shim uses its own EventEmitter instance and does not automatically proxy these specific
	// lifecycle or signal events from the actual `process` object. `uncaughtException` and `unhandledRejection`
	// are handled globally by `ErrorHandler` in `index.ts`.
}

// Base class for the shim to correctly inherit EventEmitter methods and properties.
// This ensures `require('process').on(...)` works as expected on the shim instance.
class ProcessShimBase extends EventEmitter {}

// Keep a reference to the real Node.js global `process` object from the Cocoon environment.
const actualNodeProcessGlobal: NodeJS.Process = process;

/**
 * The singleton instance of the Cocoon process shim, implementing `ProcessShim`.
 */
const processShimInstanceInternal: ProcessShim = {
	// --- NodeJS.EventEmitter properties/methods ---
	// Spread methods from a new, clean EventEmitter instance. This allows extensions to use
	// `on`, `emit`, etc., on `require('process')` without interfering with or observing
	// internal events on the actual `actualNodeProcessGlobal` object, unless explicitly proxied.
	...new ProcessShimBase(),

	// --- Process properties ---
	get pid(): number | undefined {
		return actualNodeProcessGlobal.pid;
	},
	get env(): NodeJS.ProcessEnv {
		// Return a shallow copy to prevent extensions from directly modifying Cocoon's `process.env`.
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
		// Note: Exposing `argv` might reveal sensitive information about how Cocoon was launched.
		console.warn(
			"[Cocoon Process Shim] Access to process.argv. This may expose Cocoon's launch arguments and potentially sensitive information.",
		);
		return [...actualNodeProcessGlobal.argv]; // Return a copy.
	},
	get execArgv(): string[] {
		// Note: Exposing `execArgv` can also be a security concern (Node.js flags).
		console.warn(
			"[Cocoon Process Shim] Access to process.execArgv. This may expose Cocoon's Node.js launch flags and potentially sensitive information.",
		);
		return [...actualNodeProcessGlobal.execArgv]; // Return a copy.
	},
	get execPath(): string {
		return actualNodeProcessGlobal.execPath;
	},
	get title(): string {
		// The value of `process.title` can vary; it's what appears in `ps`.
		return actualNodeProcessGlobal.title;
	},

	// --- Process methods ---
	cwd(): string {
		// TODO (Architectural): Evaluate if extensions should see Cocoon's actual Current Working Directory
		// or if this should be virtualized/sandboxed to a workspace root or similar.
		// For now, passes through the actual CWD of the Cocoon process.
		return actualNodeProcessGlobal.cwd();
	},

	kill: (pidToKill: number, signal?: string | number): boolean => {
		console.warn(
			`[Cocoon Process Shim] Extension called require('process').kill(pid: ${pidToKill}, signal: ${signal || "SIGTERM"}). ` +
				`This call delegates to the global 'process.kill', which may be patched by Cocoon's bootstrap logic to control termination of Cocoon's own process.`,
		);
		try {
			// This will invoke the global `process.kill`. If `cocoon-bootstrap.ts` has patched it,
			// that patched version will handle calls targeting Cocoon's own PID.
			// For other PIDs, it behaves like the native `process.kill`.
			return actualNodeProcessGlobal.kill(
				pidToKill,
				signal as string | number | undefined,
			);
		} catch (e: any) {
			// `actualNodeProcessGlobal.kill` throws for errors like EPERM (permission denied) or EINVAL (invalid signal).
			// For ESRCH (no such process) with signal 0, it returns false without throwing.
			console.warn(
				`[Cocoon Process Shim] Call to actualNodeProcessGlobal.kill for PID ${pidToKill} (signal: ${signal || "SIGTERM"}) resulted in an error: ${e.message}${e.code ? ` (Code: ${e.code})` : ""}`,
			);
			if (
				e.code === "ESRCH" &&
				(signal === 0 ||
					signal === "0" ||
					signal ===
						undefined) /* Node default is 0 for undefined signal */
			) {
				return false; // Mimic Node.js behavior for kill(pid, 0) when process doesn't exist.
			}
			throw e; // Rethrow other errors (like EPERM) as the native `kill` would.
		}
	},

	exit: (code?: number): never => {
		// This method on the shim delegates to the global `process.exit`.
		// The global `process.exit` is patched by `cocoon-bootstrap.ts` to consult `allowExitFn`
		// before actually terminating the Cocoon process.
		console.warn(
			`[Cocoon Process Shim] Extension called require('process').exit(${code ?? ""}). ` +
				`This call delegates to the global 'process.exit', which is subject to Cocoon's host termination policy.`,
		);
		return actualNodeProcessGlobal.exit(code); // Invokes the (potentially patched) global exit.
	},

	memoryUsage: (): NodeProcessTypes.MemoryUsage =>
		actualNodeProcessGlobal.memoryUsage(),
	hrtime: (time?: [number, number]): [number, number] =>
		actualNodeProcessGlobal.hrtime(time),
	uptime: (): number => actualNodeProcessGlobal.uptime(), // System uptime, not process uptime.
	nextTick: (callback: (...args: any[]) => void, ...args: any[]): void =>
		actualNodeProcessGlobal.nextTick(callback, ...args),
};

// Sanity check to ensure EventEmitter methods are correctly available on the shim instance.
if (
	typeof processShimInstanceInternal.on !== "function" ||
	typeof processShimInstanceInternal.emit !== "function"
) {
	console.error(
		"[Cocoon Process Shim] CRITICAL FAILURE: EventEmitter methods are not correctly applied to the shim instance! Event-related functionality on require('process') will not work as expected.",
	);
}

export default processShimInstanceInternal;
