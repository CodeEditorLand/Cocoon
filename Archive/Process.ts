/**
 * @module Process
 * @description Provides a controlled shim for the Node.js `process` global object.
 * This shim selectively exposes safe properties and methods from the real `process`
 * object, returning copies of sensitive data like `env` to prevent modification
 * and filtering out internal environment variables.
 */

import { EventEmitter } from "node:events";

class ProcessShimBase extends EventEmitter {}

const ActualNodeProcess = process;

/**
 * @description Creates a sanitized copy of the process environment variables, filtering
 * out any variables prefixed with 'VSCODE_', 'MOUNTAIN_', or 'COCOON_' to prevent
 * leaking sensitive host information to extensions.
 * @returns A frozen object containing only safe environment variables.
 */
const CreateSanitizedEnvironment = (): {
	[key: string]: string | undefined;
} => {
	const SanitizedEnvironment: { [key: string]: string | undefined } = {};

	for (const key in ActualNodeProcess.env) {
		if (Object.prototype.hasOwnProperty.call(ActualNodeProcess.env, key)) {
			if (
				!key.startsWith("VSCODE_") &&
				!key.startsWith("MOUNTAIN_") &&
				!key.startsWith("COCOON_")
			) {
				SanitizedEnvironment[key] = ActualNodeProcess.env[key];
			}
		}
	}

	return Object.freeze(SanitizedEnvironment);
};

/**
 * @description The shim object for the `process` module. Dangerous methods like `exit`
 * are exposed initially but are intended to be patched later by the `PatchProcess` module.
 */
export const ProcessShim = {
	...new ProcessShimBase(),

	// --- Read-only Properties (safe to expose directly) ---
	get platform(): NodeJS.Platform {
		return ActualNodeProcess.platform;
	},

	get arch(): string {
		return ActualNodeProcess.arch;
	},

	get versions(): NodeJS.ProcessVersions {
		return { ...ActualNodeProcess.versions };
	},

	get pid(): number {
		return ActualNodeProcess.pid;
	},

	get ppid(): number {
		return ActualNodeProcess.ppid;
	},

	get execPath(): string {
		return ActualNodeProcess.execPath;
	},

	get title(): string {
		return "Cocoon Extension Host";
	},

	// --- Properties with Sanitization (return a safe copy) ---
	get env(): { [key: string]: string | undefined } {
		return CreateSanitizedEnvironment();
	},

	get argv(): string[] {
		return [...ActualNodeProcess.argv];
	},

	get execArgv(): string[] {
		return [...ActualNodeProcess.execArgv];
	},

	// --- Safe Methods (delegated directly) ---
	cwd: () => ActualNodeProcess.cwd(),

	memoryUsage: () => ActualNodeProcess.memoryUsage(),

	hrtime: (time?: [number, number]) => ActualNodeProcess.hrtime(time),

	uptime: () => ActualNodeProcess.uptime(),

	nextTick: (callback: (...args: any[]) => void, ...args: any[]) =>
		ActualNodeProcess.nextTick(callback, ...args),

	// --- Dangerous Methods (to be patched later) ---
	exit: (code?: number): never => ActualNodeProcess.exit(code),

	kill: (pid: number, signal?: string | number) =>
		ActualNodeProcess.kill(pid, signal),

	// --- Unsafe Methods (stubbed to prevent usage) ---
	chdir: (_directory: string) => {
		throw new Error("`process.chdir()` is not allowed in extensions.");
	},

	setuid: (_id: number | string) => {
		throw new Error("`process.setuid()` is not allowed in extensions.");
	},

	setgid: (_id: number | string) => {
		throw new Error("`process.setgid()` is not allowed in extensions.");
	},
};
