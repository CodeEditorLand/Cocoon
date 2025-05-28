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
 * - Implementing a `kill(pid, signal)` method that delegates to the global `process.kill`.
 *   (Note: `cocoon-bootstrap.ts` patches signal handlers for Cocoon's own process).
 * - Implementing an `exit(code)` method that delegates to the global `process.exit`,
 *
 *   which is patched by `cocoon-bootstrap.ts` to make termination conditional based on
 *   host policy (Mountain's decision via `allowExitFn`).
 * - Exposing utility methods like `cwd()`, `memoryUsage()`, `hrtime()`, `uptime()`,
 *
 *   and `nextTick()` through direct delegation to the actual `process` object.
 * - Deriving from `EventEmitter` to allow `on()`, `emit()` on the shim instance.
 *   **Important:** This does NOT automatically proxy or re-emit lifecycle or signal
 *   events from the actual `process` global. Global `uncaughtException` and
 *   `unhandledRejection` are handled by Cocoon's central `ErrorHandler`.
 * - Intentionally omitting or restricting access to highly sensitive methods like
 *   `chdir()`, direct UID/GID manipulation functions (`setuid`, `setgid`), or `umask`.
 *
 * Key Interactions:
 * - An instance of this shim is returned by `NodeModuleShimFactory`.
 * - It relies on the actual Node.js `process` object available in the Cocoon runtime.
 * - Its `exit()` method interacts with `cocoon-bootstrap.ts`'s patched `process.exit`.
 *
 * TODO (Architectural):
 * - Consider virtualizing `cwd()` to an extension-specific or workspace root if stricter
 *   sandboxing is required. Current behavior returns Cocoon's actual CWD.
 * - Consider providing a filtered view of `process.env` for enhanced security, rather than
 *   a full shallow copy.
 *
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events"; // For EventEmitter base class
import type * as NodeProcessTypes from "node:process"; // For type information

// --- Type Definitions ---
/**
 * Defines the public interface of the Cocoon process shim.
 * It extends `NodeJS.EventEmitter` to allow extensions to use event methods
 * like `on()`, `emit()`, etc., on the shim instance itself.
 * **Note:** Listeners attached via `require('process').on(...)` will listen to events
 * emitted *on this shim instance*, not directly to events on the global `process` object
 * (e.g., 'exit', 'SIGINT'). Global error events like 'uncaughtException' are handled
 * centrally by Cocoon's `ErrorHandler`.
 */
export interface ProcessShim extends NodeJS.EventEmitter {
	readonly pid?: number;
	readonly env: NodeJS.ProcessEnv;
	readonly platform: NodeJS.Platform;
	readonly arch: string;
	readonly versions: NodeJS.ProcessVersions;
	readonly argv: string[];
	readonly execArgv: string[];
	readonly execPath: string;
	readonly title: string;
	cwd(): string;
	kill(pid: number, signal?: string | number): boolean;
	exit(code?: number): never;
	memoryUsage(): NodeProcessTypes.MemoryUsage;
	hrtime(time?: [number, number]): [number, number];
	uptime(): number; // System uptime, not process
	nextTick(callback: (...args: any[]) => void, ...args: any[]): void;
}

class ProcessShimBase extends EventEmitter {} // Base for instanceof checks and clean prototype
const actualNodeProcessGlobal: NodeJS.Process = process;

const processShimInstanceInternal: ProcessShim = {
	...new ProcessShimBase(), // Spread EventEmitter methods

	get pid(): number | undefined {
		return actualNodeProcessGlobal.pid;
	},
	get env(): NodeJS.ProcessEnv {
		return { ...actualNodeProcessGlobal.env };
	}, // Shallow copy
	get platform(): NodeJS.Platform {
		return actualNodeProcessGlobal.platform;
	},
	get arch(): string {
		return actualNodeProcessGlobal.arch;
	},
	get versions(): NodeJS.ProcessVersions {
		return { ...actualNodeProcessGlobal.versions };
	}, // Shallow copy
	get argv(): string[] {
		console.warn(
			"[Cocoon Process Shim] Access to process.argv. May expose Cocoon's launch arguments.",
		);
		return [...actualNodeProcessGlobal.argv]; // Copy
	},
	get execArgv(): string[] {
		console.warn(
			"[Cocoon Process Shim] Access to process.execArgv. May expose Cocoon's Node.js launch flags.",
		);
		return [...actualNodeProcessGlobal.execArgv]; // Copy
	},
	get execPath(): string {
		return actualNodeProcessGlobal.execPath;
	},
	get title(): string {
		return actualNodeProcessGlobal.title;
	},

	cwd(): string {
		// TODO (Architectural): Consider virtualizing cwd() if stricter sandboxing needed.
		return actualNodeProcessGlobal.cwd();
	},
	kill: (pidToKill: number, signal?: string | number): boolean => {
		console.warn(
			`[Cocoon Process Shim] require('process').kill(pid: ${pidToKill}, signal: ${signal || "SIGTERM"}) called. Delegates to global 'process.kill'. Behavior for Cocoon's PID subject to bootstrap patching.`,
		);
		try {
			return actualNodeProcessGlobal.kill(
				pidToKill,
				signal as string | number | undefined,
			);
		} catch (e: any) {
			console.warn(
				`[Cocoon Process Shim] actualNodeProcessGlobal.kill for PID ${pidToKill} failed: ${e.message}${e.code ? ` (Code: ${e.code})` : ""}`,
			);
			if (
				e.code === "ESRCH" &&
				(signal === 0 || signal === "0" || signal === undefined)
			) {
				return false;
			}
			throw e;
		}
	},
	exit: (code?: number): never => {
		console.warn(
			`[Cocoon Process Shim] require('process').exit(${code ?? ""}) called. Delegates to global 'process.exit', subject to Cocoon's host termination policy.`,
		);
		return actualNodeProcessGlobal.exit(code); // Patched by cocoon-bootstrap.ts
	},
	memoryUsage: (): NodeProcessTypes.MemoryUsage =>
		actualNodeProcessGlobal.memoryUsage(),
	hrtime: (time?: [number, number]): [number, number] =>
		actualNodeProcessGlobal.hrtime(time),
	uptime: (): number => actualNodeProcessGlobal.uptime(), // System uptime
	nextTick: (callback: (...args: any[]) => void, ...args: any[]): void =>
		actualNodeProcessGlobal.nextTick(callback, ...args),
};

if (
	typeof processShimInstanceInternal.on !== "function" ||
	typeof processShimInstanceInternal.emit !== "function"
) {
	console.error(
		"[Cocoon Process Shim] CRITICAL FAILURE: EventEmitter methods not correctly applied to process shim instance!",
	);
}

export default processShimInstanceInternal;
