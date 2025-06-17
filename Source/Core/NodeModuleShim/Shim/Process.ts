/*
 * File: Cocoon/Source/Core/NodeModuleShim/Shim/Process.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: node:events
 */

/**
 * @module Process (NodeModuleShim/Shim)
 * @description A controlled shim for the Node.js `process` global object.
 *
 * This shim selectively exposes safe properties and methods from the real `process`
 * object. It returns copies of sensitive data like `env` to prevent modification
 * and filters out internal environment variables.
 *
 * Note: Dangerous methods like `exit` are initially exposed but are intended to be
 * patched later by the `PatchProcess` module at startup.
 */

import { EventEmitter } from "node:events";

class ProcessShimBase extends EventEmitter {}
const ActualNodeProcess = process;

/**
 * Creates a sanitized copy of the process environment variables.
 * It filters out any variables prefixed with 'VSCODE_' or other internal markers
 * to prevent leaking sensitive host information to extensions.
 */
const CreateSanitizedEnvironment = (): {
	[key: string]: string | undefined;
} => {
	const SanitizedEnvironment: { [key: string]: string | undefined } = {};
	for (const key in ActualNodeProcess.env) {
		if (Object.prototype.hasOwnProperty.call(ActualNodeProcess.env, key)) {
			// Filter out internal variables
			if (
				!key.startsWith("VSCODE_") &&
				!key.startsWith("MOUNTAIN_") &&
				!key.startsWith("COCOON_")
			) {
				SanitizedEnvironment[key] = ActualNodeProcess.env[key];
			}
		}
	}
	return Object.freeze(SanitizedEnvironment); // Freeze the final object
};

/**
 * The shim object for the `process` module.
 */
const ProcessShim = {
	...new ProcessShimBase(),

	// --- Read-only Properties (safe to expose directly) ---
	get platform(): NodeJS.Platform {
		return ActualNodeProcess.platform;
	},
	get arch(): string {
		return ActualNodeProcess.arch;
	},
	get versions(): NodeJS.ProcessVersions {
		return { ...ActualNodeProcess.versions }; // Return a copy
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
		return "Cocoon Extension Host"; // Hard-code the title
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

	// --- Dangerous Methods ---
	// These are exposed initially but are expected to be patched by the `PatchProcess` module.
	// This allows us to control them without breaking extensions that expect them to exist.
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

export default ProcessShim;
