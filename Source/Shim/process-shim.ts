/*---------------------------------------------------------------------------------------------
 // Header: Added basic header 
* Cocoon Process Shim (process-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in `process` object.
 * This is intended to be returned by the `NodeModuleShimFactory` when an extension
 * `require('process')`. It controls access to potentially sensitive process operations.
 *
 * Responsibilities:
 * - Exposing safe `process` properties like `pid`, `env`, `platform`, `arch`.
 * - Providing a controlled `kill` method.
 * - Stubbing or restricting other `process` methods/properties as needed for Cocoon's
 *   sandboxing or stability goals (e.g., `exit`, `cwd`, `chdir`).
 * - Mimicking the `EventEmitter` nature of the `process` object (partially).
 *
 * Key Interactions:
 * - Returned by `NodeModuleShimFactory`.
 * - Uses the actual Node.js `process` object of the Cocoon environment for some properties.
 * - The `kill` method may interact with the host OS via the real `process.kill`.
 *--------------------------------------------------------------------------------------------*/

// For EventEmitter base
import { EventEmitter } from "events";
// For type information from @types/node
import type * as NodeProcess from "node:process";

// --- Type Definitions ---

// Define an interface for the parts of NodeJS.Process we are shimming.
// This should align with what extensions commonly expect from `require('process')`.
// TODO: If @types/node is a dev dependency, this interface can extend or utilize types from `NodeJS.Process`.
export interface ProcessShim extends NodeJS.EventEmitter {
	// Properties
	readonly pid?: number;

	readonly env: NodeJS.ProcessEnv;

	readonly platform: NodeJS.Platform;

	readonly arch: string;

	readonly versions: NodeJS.ProcessVersions;

	readonly argv: string[];

	readonly execArgv: string[];

	// Path to Node executable
	readonly execPath: string;

	// Typically 'node' or script name
	readonly title: string;

	// Methods
	kill(pid: number, signal?: string | number): boolean;

	cwd(): string;

	// `process.exit` is patched by cocoon-bootstrap.ts, this shim might offer a safer version or re-expose patched.
	exit(code?: number): never;

	memoryUsage(): NodeJS.MemoryUsage;

	hrtime(time?: [number, number]): [number, number];

	uptime(): number;

	nextTick(callback: Function, ...args: any[]): void;

	// TODO: Add other common process methods/properties if needed by extensions.
	// e.g., chdir(directory: string): void;

	// getuid?(): number; getgid?(): number;

	// geteuid?(): number; getegid?(): number;

	// getgroups?(): number[];

	// umask(mask?: number): number;
}

// Create a base class for the shim to properly inherit EventEmitter behavior
class ProcessShimBase extends EventEmitter {}

// Keep a reference to the real Node.js process object
const actualProcess = process;

const processShimInstanceInternal: ProcessShim = {
	// --- NodeJS.EventEmitter properties/methods ---
	// Delegate to a new EventEmitter instance or the actual process object if desired.
	// For simplicity and isolation, using a new EventEmitter instance.
	// Spread EventEmitter methods
	...new ProcessShimBase(),

	// --- Process properties (mostly direct pass-through from actual Cocoon process) ---
	get pid(): number | undefined {
		return actualProcess.pid;
	},

	get env(): NodeJS.ProcessEnv {
		return actualProcess.env;
	},

	get platform(): NodeJS.Platform {
		return actualProcess.platform;
	},

	get arch(): string {
		return actualProcess.arch;
	},

	get versions(): NodeJS.ProcessVersions {
		return actualProcess.versions;
	},

	get argv(): string[] {
		return actualProcess.argv;

		// Exposing argv might be a security concern
	},

	get execArgv(): string[] {
		return actualProcess.execArgv;

		// Security concern?
	},

	get execPath(): string {
		return actualProcess.execPath;
	},

	get title(): string {
		return actualProcess.title;
	},

	// --- Process methods ---
	kill: (pidToKill: number, signal?: string | number): boolean => {
		// This `kill` is the one extensions will call.
		// It should be cautious. The one in `cocoon-bootstrap.ts` patches the *global* `process.kill`.
		// This shim might offer a more restricted version or just log.
		console.warn(
			`[Cocoon Process Shim] Extension called require('process').kill(${pidToKill}, ${signal || "SIGTERM"}). This is potentially risky.`,
		);

		if (
			pidToKill === actualProcess.pid &&
			(signal === 0 || signal === "0")
		) {
			// console.log("[Cocoon Process Shim] kill(self, 0) - process exists.");

			return true;
		}

		// TODO: Decide on the policy for extensions calling process.kill() on other PIDs.
		// Option A: Disallow completely for external PIDs.
		// if (pidToKill !== actualProcess.pid) {

		//    console.error("[Cocoon Process Shim] Attempt to kill external PID denied by shim policy.");

		// Or throw an error
		//    return false;

		// }

		// Option B: Delegate to the (potentially patched by cocoon-bootstrap) global process.kill
		try {
			// This will call the globally patched process.kill if cocoon-bootstrap ran.
			return actualProcess.kill(
				pidToKill,

				signal as string | number | undefined,
			);
		} catch (e: any) {
			console.warn(
				`[Cocoon Process Shim] actualProcess.kill failed for PID ${pidToKill}:`,

				e.message,
			);

			if (e.code === "ESRCH") return false;

			// Permission errors are usually thrown
			if (e.code === "EPERM") throw e;

			// Default to false for other errors
			return false;
		}
	},

	cwd: (): string => {
		// TODO: Consider if extensions should see Cocoon's CWD or a virtualized one.
		// For now, pass through.
		return actualProcess.cwd();
	},

	exit: (code?: number): never => {
		// This `exit` is what extensions call via `require('process').exit()`.
		// The global `process.exit` is already patched by `cocoon-bootstrap.ts` to prevent actual exit.
		// So, calling `actualProcess.exit()` here will trigger the patched version.
		console.warn(
			`[Cocoon Process Shim] Extension called require('process').exit(${code ?? ""}). This will be handled by the patched global process.exit.`,
		);

		// Will invoke the patched (safe) version
		return actualProcess.exit(code);
	},

	memoryUsage: (): NodeJS.MemoryUsage => actualProcess.memoryUsage(),

	hrtime: (time?: [number, number]): [number, number] =>
		actualProcess.hrtime(time),

	uptime: (): number => actualProcess.uptime(),

	nextTick: (callback: Function, ...args: any[]): void =>
		actualProcess.nextTick(callback, ...args),

	// TODO: Implement or stub other methods from ProcessShim interface as needed.
	// Example:
	// chdir: (directory: string): void => {

	//    console.warn(`[Cocoon Process Shim] Extension called process.chdir("${directory}"). This is a restricted operation.`);

	// actualProcess.chdir(directory); // Or disallow
	//
	//    throw new Error("process.chdir is restricted in this environment.");

	// },
};

// Ensure all EventEmitter methods are correctly on the instance
// The spread `...new ProcessShimBase()` should handle this.
// We can verify a few:
if (
	typeof processShimInstanceInternal.on !== "function" ||
	typeof processShimInstanceInternal.emit !== "function"
) {
	console.error(
		"[Cocoon Process Shim] EventEmitter methods not correctly applied to shim instance!",
	);

	// Fallback or throw, this indicates an issue with the spread or base class.
}

export default processShimInstanceInternal;
