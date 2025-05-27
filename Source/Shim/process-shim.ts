/*---------------------------------------------------------------------------------------------
 * Cocoon Process Shim (process-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in `process` global object. This shim is
 * intended to be supplied by the `NodeModuleShimFactory` when an extension executes
 * `require('process')`.
 *
 * The goal of this shim is to provide extensions with a controlled and potentially
 * restricted view of the actual Cocoon host process. It exposes commonly used,
 *
 * generally safe properties and methods, while managing or stubbing more sensitive
 * operations that could affect the stability or security of the Cocoon environment.
 *
 * Responsibilities:
 * - Exposing common `process` properties like `pid`, `platform`, `arch`, `versions`,
 *
 *   `execPath`, and `title` by delegating to the actual `process` object of the
 *   Cocoon environment.
 * - Providing read-only copies for `env`, `argv`, and `execArgv` to prevent direct
 *   mutation by extensions, with warnings for accessing potentially sensitive `argv`
 *   and `execArgv`.
 * - Implementing a `kill(pid, signal)` method that delegates to the global `process.kill`,
 *
 *   which itself may be patched by `cocoon-bootstrap.ts` for controlled behavior,
 *
 *   especially when targeting Cocoon's own process.
 * - Implementing an `exit(code)` method that delegates to the global `process.exit`,
 *
 *   which is patched by `cocoon-bootstrap.ts` to make termination conditional based on
 *   host policy (Mountain's decision via `allowExitFn`).
 * - Exposing utility methods like `cwd()`, `memoryUsage()`, `hrtime()`, `uptime()`,
 *
 *   and `nextTick()` through direct delegation to the actual `process` object.
 * - Partially mimicking the `EventEmitter` nature of the `process` object by
 *   deriving from `EventEmitter`. This allows extensions to use `on()`, `emit()`, etc.,
 *
 *   on the shim instance itself, though it does not automatically proxy or re-emit
 *   all lifecycle or signal events from the actual `process` global. Specific global
 *   process events like `uncaughtException` and `unhandledRejection` are handled by
 *   Cocoon's central `ErrorHandler`.
 * - Intentionally omitting or restricting access to highly sensitive methods like
 *   `chdir()`, direct UID/GID manipulation functions (`setuid`, `setgid`), or `umask`,
 *
 *   as these are generally not safe for extensions to call directly in a shared host
 *   environment like Cocoon.
 *
 * Key Interactions:
 * - An instance of this shim is returned by `NodeModuleShimFactory` when an extension
 *   issues `require('process')`.
 * - It relies on the actual Node.js `process` object available in the Cocoon runtime
 *   for most of its property and method delegations.
 * - Its `exit()` and `kill()` methods interact with the versions of these functions
 *   that have been patched by `cocoon-bootstrap.ts`, thus respecting Cocoon's
 *   overall process control policies set by the Mountain host.
 *
 *--------------------------------------------------------------------------------------------*/

// For EventEmitter base class, allowing the shim to behave like an EventEmitter.
import { EventEmitter } from "events";
// For type information from @types/node, ensuring API compatibility.
import type * as NodeProcessTypes from "node:process";

// --- Type Definitions ---

/**
 * Defines the public interface of the Cocoon process shim.
 * This interface aims to match relevant and generally safe parts of the `NodeJS.Process` API,
 *
 * providing a controlled environment for extensions. It extends `NodeJS.EventEmitter` to
 * allow extensions to use event methods like `on()`, `emit()`, etc., on the shim instance.
 */
export interface ProcessShim extends NodeJS.EventEmitter {
	// Common, generally safe properties:
	/** The Process ID (PID) of the Cocoon host process. Delegates to `process.pid`. */
	readonly pid?: number;

	/**
	 * An object containing the Cocoon process's environment variables.
	 * Returns a shallow copy to prevent direct modification of Cocoon's `process.env` by extensions.
	 * @see {@link NodeJS.ProcessEnv}
	 *
	 */
	readonly env: NodeJS.ProcessEnv;

	/** The operating system platform Cocoon is running on (e.g., 'darwin', 'linux', 'win32'). Delegates to `process.platform`. */
	readonly platform: NodeJS.Platform;

	/** The CPU architecture Cocoon is running on (e.g., 'x64', 'arm64'). Delegates to `process.arch`. */
	readonly arch: string;

	/** An object exposing version strings for Node.js and its dependencies (e.g., V8, OpenSSL). Returns a copy. Delegates to `process.versions`. */
	readonly versions: NodeJS.ProcessVersions;

	/**
	 * An array containing the command-line arguments passed when the Cocoon process was launched.
	 * The first element is typically `process.execPath` (path to Node.js executable).
	 * Subsequent elements are the path to the script being run and any further arguments.
	 * Returns a copy.
	 * **Warning:** Exposing `argv` might reveal sensitive launch parameters or paths specific to Cocoon's internal setup.
	 */
	readonly argv: string[];

	/**
	 * An array containing the set of Node.js-specific command-line options passed when the Cocoon process was launched.
	 * These are options that appear before the script name in the command line. Returns a copy.
	 * **Warning:** Exposing `execArgv` can reveal sensitive Node.js configuration details.
	 */
	readonly execArgv: string[];

	/** The absolute pathname of the executable that started the Node.js process (i.e., Cocoon's Node runtime). Delegates to `process.execPath`. */
	readonly execPath: string;

	/** The title of the current process (e.g., as displayed by `ps`). Behavior and value can vary across operating systems. Delegates to `process.title`. */
	readonly title: string;

	// Common, generally safe methods:
	/**
	 * Returns the current working directory of the Cocoon process.
	 * Delegates to `process.cwd()`.
	 * TODO: Evaluate if this should return a virtualized path for sandboxing extensions to a specific workspace root or similar.
	 */
	cwd(): string;

	/**
	 * Sends a signal to a process identified by `pid`.
	 * This delegates to the global `process.kill`, which may be patched by `cocoon-bootstrap.ts`
	 * to control signals sent to Cocoon's own process.
	 * @param pid The process ID to send the signal to.
	 * @param signal The signal to send (e.g., 'SIGTERM', 'SIGINT', or a signal number). Defaults to 'SIGTERM'.
	 * @returns `true` if the signal was successfully sent (or, for signal 0, if the process exists); `false` otherwise (e.g., process not found for signal 0).
	 * @throws Error if the `pid` or `signal` is invalid, or if permissions are insufficient (for non-zero signals).
	 */
	kill(pid: number, signal?: string | number): boolean;

	/**
	 * Instructs Node.js to terminate the Cocoon process synchronously with an exit status of `code`.
	 * This delegates to the global `process.exit`, which is patched by `cocoon-bootstrap.ts`
	 * to make termination conditional based on host policy (determined by `allowExitFn` from Mountain).
	 * If exit is prevented, the patched `process.exit` will throw an error.
	 * @param code The exit code. Defaults to 0 (success).
	 * @returns This function is typed as `never` because if allowed, it terminates the process and does not return.
	 *          If prevented, it throws an error.
	 */
	exit(code?: number): never;

	/** Returns an object describing the memory usage of the Node.js process (Cocoon) in bytes. Delegates to `process.memoryUsage()`. */
	memoryUsage(): NodeProcessTypes.MemoryUsage;

	/**
	 * Returns the current high-resolution real time in a `[seconds, nanoseconds]` tuple Array.
	 * If `time` (a previous `hrtime` result) is provided, it returns the difference between the
	 * current time and the `time` argument. Delegates to `process.hrtime()`.
	 */
	hrtime(time?: [number, number]): [number, number];

	/** Returns the system uptime (not process uptime) in number of seconds. Delegates to `process.uptime()`. */
	uptime(): number;

	/**
	 * Adds the `callback` to the "next tick queue". This queue is fully drained after the
	 * current operation on the JavaScript stack runs to completion and before the event loop
	 * is allowed to continue. Delegates to `process.nextTick()`.
	 */
	nextTick(callback: (...args: any[]) => void, ...args: any[]): void;

	// TODO: Consider adding other commonly used but generally safe process methods/properties if required by extensions:
	// - `process.cpuUsage(): CPUUsage` (for process CPU time)
	// - `process.resourceUsage(): ResourceUsage` (Node v12.6.0+, more comprehensive resource usage)
	// - POSIX UID/GID getters: `getuid?()`, `getgid?()`, `geteuid?()`, `getegid?()`, `getgroups?()`
	//   (if the platform supports them and they are deemed safe to expose from Cocoon's context).
	// Highly sensitive methods like `chdir()`, `setuid()`, `setgid()`, `umask()` are intentionally omitted
	// from this shim's public interface to enhance security and stability within the Cocoon environment.
	// Events like `beforeExit`, `exit` (from the actual global process), `multipleResolves`, `rejectionHandled`,

	// `uncaughtException`, `unhandledRejection`, `warning`, `message` (IPC with child processes),

	// and signal events (SIGINT, etc.) are part of NodeJS.EventEmitter on the global `process`.
	// This shim uses its own EventEmitter instance (via `ProcessShimBase`) and does *not* automatically
	// proxy or re-emit these specific lifecycle or signal events from the actual `process` object.
	// Global `uncaughtException` and `unhandledRejection` are handled centrally by `ErrorHandler` in `Cocoon/index.ts`.
}

// Base class for the shim to correctly inherit EventEmitter methods and properties.
// This allows extensions to use `on()`, `emit()`, etc., on the object returned by `require('process')`.
class ProcessShimBase extends EventEmitter {}

// Keep a reference to the real Node.js global `process` object from the Cocoon environment.
const actualNodeProcessGlobal: NodeJS.Process = process;

/**
 * The singleton instance of the Cocoon process shim, implementing `ProcessShim`.
 * This instance is provided by `NodeModuleShimFactory` when `require('process')` is intercepted.
 */
const processShimInstanceInternal: ProcessShim = {
	// --- NodeJS.EventEmitter properties/methods ---
	// Spread methods from a new, clean EventEmitter instance. This ensures that the shim
	// object itself is an EventEmitter, allowing extensions to attach listeners to it directly
	// (e.g., `require('process').on('customEvent', ...)`).
	// This does NOT mean that events from `actualNodeProcessGlobal` (like 'exit') are automatically
	// piped through this shim's emitter.
	...new ProcessShimBase(),

	// --- Process properties (mostly direct pass-through or read-only copies) ---
	get pid(): number | undefined {
		return actualNodeProcessGlobal.pid;
	},

	get env(): NodeJS.ProcessEnv {
		// Return a shallow copy to prevent extensions from directly modifying Cocoon's `process.env` object.
		// For stricter sandboxing against modification of nested objects within `env`, a deep clone
		// or a read-only Proxy could be considered, but a shallow copy is standard practice.
		return { ...actualNodeProcessGlobal.env };
	},

	get platform(): NodeJS.Platform {
		return actualNodeProcessGlobal.platform;
	},

	get arch(): string {
		return actualNodeProcessGlobal.arch;
	},

	get versions(): NodeJS.ProcessVersions {
		// Return a copy of the versions object to prevent modification.
		return { ...actualNodeProcessGlobal.versions };
	},

	get argv(): string[] {
		// Note: Exposing `argv` might reveal sensitive information about how Cocoon was launched or configured.
		// This should be reviewed based on Cocoon's security model. For now, a copy is passed through with a warning.
		console.warn(
			"[Cocoon Process Shim] Access to process.argv. This may expose Cocoon's launch arguments, which could include sensitive paths or configurations.",
		);

		// Return a copy.
		return [...actualNodeProcessGlobal.argv];
	},

	get execArgv(): string[] {
		// Note: Exposing `execArgv` can also be a security concern, revealing Node.js runtime flags used for Cocoon.
		console.warn(
			"[Cocoon Process Shim] Access to process.execArgv. This may expose Cocoon's Node.js specific launch flags.",
		);

		// Return a copy.
		return [...actualNodeProcessGlobal.execArgv];
	},

	get execPath(): string {
		return actualNodeProcessGlobal.execPath;
	},

	get title(): string {
		// The value of `process.title` (e.g., what appears in `ps` command output) can vary.
		return actualNodeProcessGlobal.title;
	},

	// --- Process methods (delegation or controlled behavior) ---
	cwd(): string {
		// TODO: Evaluate if extensions should see Cocoon's actual Current Working Directory (CWD)
		// or if this should be virtualized/sandboxed (e.g., to a workspace root or a temporary directory).
		// For now, it passes through the actual CWD of the Cocoon process.
		return actualNodeProcessGlobal.cwd();
	},

	kill: (pidToKill: number, signal?: string | number): boolean => {
		console.warn(
			`[Cocoon Process Shim] Extension called require('process').kill(pid: ${pidToKill}, signal: ${signal || "SIGTERM"}). ` +
				`This call delegates to the global 'process.kill'. If pidToKill is Cocoon's own PID, behavior is subject ` +
				`to patching by cocoon-bootstrap.ts (which may prevent self-termination or specific signals).`,
		);

		try {
			// This will invoke the global `process.kill`.
			// If `cocoon-bootstrap.ts` has patched it (it usually doesn't patch `kill` itself, but might patch related signal handlers),

			// that could influence behavior for Cocoon's own PID.
			// For PIDs other than Cocoon's, this behaves like the native `process.kill`.
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

			// Mimic Node.js behavior for `kill(pid, 0)` when process doesn't exist.
			if (
				e.code === "ESRCH" &&
				(signal === 0 ||
					signal === "0" ||
					signal === undefined) /* signal 0 is default test */
			) {
				return false;
			}

			// Rethrow other errors (like EPERM) as the native `kill` would.
			throw e;
		}
	},

	exit: (code?: number): never => {
		// This method on the shim delegates to the global `process.exit`.
		// The global `process.exit` is patched by `cocoon-bootstrap.ts` to consult `allowExitFn`
		// before actually terminating the Cocoon process. If exit is disallowed, an error is thrown.
		console.warn(
			`[Cocoon Process Shim] Extension called require('process').exit(${code ?? ""}). This call delegates to the global 'process.exit', ` +
				`which is subject to Cocoon's host termination policy (controlled via allowExitFn in cocoon-bootstrap.ts).`,
		);

		// Invokes the (potentially patched) global exit function.
		return actualNodeProcessGlobal.exit(code);
	},

	memoryUsage: (): NodeProcessTypes.MemoryUsage =>
		actualNodeProcessGlobal.memoryUsage(),

	hrtime: (time?: [number, number]): [number, number] =>
		actualNodeProcessGlobal.hrtime(time),

	// System uptime, not process uptime.
	uptime: (): number => actualNodeProcessGlobal.uptime(),

	nextTick: (callback: (...args: any[]) => void, ...args: any[]): void =>
		actualNodeProcessGlobal.nextTick(callback, ...args),

	// Explicitly not implementing sensitive methods like:
	// - chdir(directory: string): void;

	// - setuid(id: number | string): void;

	// - setgid(id: number | string): void;

	// - umask(mask?: number): number;

	// Their absence from the `ProcessShim` interface and this implementation effectively restricts them.
};

// Sanity check to ensure EventEmitter methods are correctly available on the shim instance due to the spread.
if (
	typeof processShimInstanceInternal.on !== "function" ||
	typeof processShimInstanceInternal.emit !== "function"
) {
	console.error(
		"[Cocoon Process Shim] CRITICAL FAILURE: EventEmitter methods (`on`, `emit`, etc.) are not correctly applied to the process shim instance! " +
			"Event-related functionality on `require('process')` will not work as expected. This likely indicates an issue with the `...new ProcessShimBase()` spread or class extension.",
	);
}

export default processShimInstanceInternal;
