/*
 * File: Cocoon/Source/Shim/Os.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-07 05:37:36 UTC
 * Dependency: ../cocoon-ipc, node:os, os
 * Export: OsShim
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon OS Shim
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'os' module. This shim is intended to be
 * supplied by the `NodeModuleShimFactory` when an extension executes `require('os')`.
 *
 * It delegates most functions and constants directly to the native Node.js 'os' module
 * or to the `process` global where appropriate (e.g., for `platform`, `arch`).
 * However, certain information that might be sensitive or specific to the Cocoon host
 * environment rather than the user's conceptual environment (like `hostname`) can be
 * proxied to the Mountain host process. This ensures extensions receive a consistent
 * or controlled view of relevant OS properties.
 *
 * Responsibilities:
 * - Mimicking the interface of the Node.js 'os' module for commonly used and generally
 *   safe functions and properties.
 * - Directly delegating most OS information functions (e.g., `EOL`, `arch`, `platform`,
 *   `type`, `release`, `totalmem`, `freemem`, `cpus`, `networkInterfaces`, `userInfo`,
 *   `constants`, `endianness`, `uptime`, `loadavg`, `machine`, `devNull`,
 *   `availableParallelism`, `version`) to the native `node:os` module or `process` object.
 * - Proxying `hostname()` to Mountain via an IPC call (`os_hostname`), with robust
 *   fallbacks to `nodeOs.hostname()` and then a default value if the IPC or native
 *   call fails.
 * - Providing reliable implementations for `homedir()` and `tmpdir()`, checking
 *   standard environment variables first, then falling back to `nodeOs` calls, and
 *   finally to platform-specific defaults.
 * - Correctly handling the overloaded signature of `os.userInfo()`.
 *
 * Key Interactions:
 * - An instance of this shim is returned by `NodeModuleShimFactory` when an extension
 *   issues `require('os')`.
 * - It directly utilizes the `node:os` module and the global `process` object from the
 *   Node.js runtime environment in which Cocoon operates.
 * - It uses `sendToMountainAndWait` from `../cocoon-ipc.ts` for the proxied `hostname()` call,
 *   requiring a corresponding `os_hostname` IPC handler on the Mountain side.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import * as nodeOs from "node:os"; // For direct delegation and constants
import type * as NodeOsTypes from "node:os"; // For type information

import { sendToMountainAndWait } from "../cocoon-ipc";

// Helper to determine if running on Windows, for devNull fallback
const isWindows = process.platform === "win32";

// --- Type Definitions ---
/**
 * Defines the public interface of the Cocoon OS shim.
 * This interface aims to match relevant and commonly used parts of the Node.js 'os' module API,
 * providing a controlled view of the operating system environment.
 */
export interface OsShim {
	/** The operating system-specific end-of-line marker (e.g., `\r\n` on Windows, `\n` on POSIX). @see {@link nodeOs.EOL} */
	EOL: string;
	/** Returns the operating system CPU architecture for which the Node.js binary (Cocoon) was compiled (e.g., 'x64', 'arm64'). Delegates to `process.arch`. @see {@link process.arch} */
	arch(): string;
	/** Returns the operating system platform (e.g., 'darwin', 'freebsd', 'linux', 'openbsd', 'win32'). Delegates to `process.platform`. @see {@link process.platform} */
	platform(): NodeJS.Platform;
	/**
	 * Returns the hostname of the operating system.
	 * This operation is proxied to Mountain to ensure a consistent or controlled hostname is reported.
	 * It falls back to `nodeOs.hostname()` and then to "localhost" if proxying fails.
	 * @returns A promise that resolves to the hostname string.
	 */
	hostname(): Promise<string>;
	/**
	 * Returns the string path of the current user's home directory.
	 * Checks `HOME`, `USERPROFILE` environment variables, then `nodeOs.homedir()`, then fallbacks.
	 * @see {@link nodeOs.homedir}
	 */
	homedir(): string;
	/**
	 * Returns the operating system's default directory for temporary files as a string.
	 * Checks `TMPDIR`, `TMP`, `TEMP` environment variables, then `nodeOs.tmpdir()`, then platform-specific fallbacks.
	 * @see {@link nodeOs.tmpdir}
	 */
	tmpdir(): string;
	/** Contains commonly used operating system-specific constants (e.g., signal numbers, error codes from libuv). @see {@link nodeOs.constants} */
	constants: typeof nodeOs.constants;
	/** Returns the operating system name as returned by `uname` (e.g., 'Linux', 'Darwin', 'Windows_NT'). @see {@link nodeOs.type} */
	type(): string;
	/** Returns the operating system release identifier. @see {@link nodeOs.release} */
	release(): string;
	/** Returns the total amount of system memory in bytes as an integer. @see {@link nodeOs.totalmem} */
	totalmem(): number;
	/** Returns the amount of free system memory in bytes as an integer. @see {@link nodeOs.freemem} */
	freemem(): number;
	/** Returns an array of objects containing information about each logical CPU core. @see {@link nodeOs.cpus} */
	cpus(): NodeOsTypes.CpuInfo[];
	/** Returns an object containing network interfaces that have been assigned a network address. @see {@link nodeOs.networkInterfaces} */
	networkInterfaces(): NodeJS.Dict<NodeOsTypes.NetworkInterfaceInfo[]>;
	/**
	 * Returns information about the currently effective user.
	 * @param options Optional: `{ encoding?: BufferEncoding | "buffer" }`. Defaults to 'utf-8'.
	 * @returns UserInfo object with string properties, or Buffer properties if `options.encoding` is 'buffer'.
	 * @see {@link nodeOs.userInfo}
	 */
	userInfo(options?: {
		encoding: BufferEncoding;
	}): NodeOsTypes.UserInfo<string>;
	userInfo(options: { encoding: "buffer" }): NodeOsTypes.UserInfo<Buffer>;
	/** Returns the endianness of the CPU for which the Node.js binary was compiled ('BE' or 'LE'). @see {@link nodeOs.endianness} */
	endianness(): "BE" | "LE";
	/** Returns the system uptime in number of seconds. @see {@link nodeOs.uptime} */
	uptime(): number;
	/** Returns an array containing the 1, 5, and 15 minute load averages. @see {@link nodeOs.loadavg} */
	loadavg(): number[];
	/** Returns the machine type as a string, like 'x86_64' or 'arm64'. @see {@link nodeOs.machine} (Node v19.7+) */
	machine(): string;
	/** The platform-specific path of the null device. @see {@link nodeOs.devNull} (Node v16.18+) */
	readonly devNull: string;
	/** Returns the number of available logical CPU cores. @see {@link nodeOs.availableParallelism} (Node v19.8+) */
	availableParallelism?(): number;
	/** Returns a string identifying the operating system version. @see {@link nodeOs.version} (Node v19.1.0+) */
	version?(): string;
}

/**
 * The singleton instance of the Cocoon OS shim, implementing `OsShim`.
 */
const osShimInstance: OsShim = {
	EOL: nodeOs.EOL,
	platform: (): NodeJS.Platform => process.platform, // Delegates to the global process object
	arch: (): string => process.arch, // Delegates to the global process object

	hostname: async (): Promise<string> => {
		try {
			const mountainHostname = await sendToMountainAndWait(
				"os_hostname", // IPC method name for Mountain to handle
				{}, // No parameters needed for hostname
				2000, // 2-second timeout
			);
			if (
				typeof mountainHostname === "string" &&
				mountainHostname.trim().length > 0
			) {
				return mountainHostname.trim();
			}
			console.warn(
				"[Cocoon OS Shim] IPC call 'os_hostname' to Mountain returned invalid data (not a non-empty string). Falling back to nodeOs.hostname(). Received:",
				mountainHostname,
			);
		} catch (ipcError: any) {
			console.warn(
				`[Cocoon OS Shim] Failed to get hostname from Mountain via IPC (method 'os_hostname'), falling back to nodeOs.hostname(). IPC Error: ${ipcError.message}`,
			);
		}

		// Fallback 1: Use Node.js's os.hostname() from Cocoon's environment.
		try {
			if (typeof nodeOs.hostname === "function") {
				return nodeOs.hostname();
			} else {
				console.warn(
					"[Cocoon OS Shim] nodeOs.hostname() function is not available in this Node.js environment. Using 'localhost'.",
				);
				return "localhost"; // Further fallback if os.hostname itself is missing
			}
		} catch (nodeError: any) {
			console.error(
				`[Cocoon OS Shim] Fallback call to nodeOs.hostname() also failed. Returning 'localhost' as ultimate fallback. Node Error: ${nodeError.message}`,
			);
			return "localhost"; // Ultimate fallback
		}
	},

	homedir: (): string => {
		// Standard heuristic for finding home directory:
		return (
			process.env.HOME ||
			process.env.USERPROFILE ||
			(typeof nodeOs.homedir === "function" ? nodeOs.homedir() : "") ||
			"" // Fallback to empty string if no other method succeeds
		);
	},

	tmpdir: (): string => {
		try {
			if (typeof nodeOs.tmpdir === "function") {
				const dir = nodeOs.tmpdir();
				if (dir) return dir; // Use if non-empty
			}
		} catch (e: any) {
			console.warn(
				`[Cocoon OS Shim] nodeOs.tmpdir() call failed or returned empty, attempting fallbacks. Error: ${e.message}`,
			);
		}
		// Common environment variables for temp directory.
		return (
			process.env.TMPDIR ||
			process.env.TMP ||
			process.env.TEMP ||
			(isWindows ? "C:\\Windows\\Temp" : "/tmp") // Platform-specific common fallbacks
		);
	},

	constants: nodeOs.constants, // Direct passthrough of Node's OS constants

	// Direct delegations for common, generally safe OS information functions:
	type: (): string =>
		typeof nodeOs.type === "function"
			? nodeOs.type()
			: String(process.platform),
	release: (): string =>
		typeof nodeOs.release === "function" ? nodeOs.release() : "unknown",
	totalmem: (): number =>
		typeof nodeOs.totalmem === "function" ? nodeOs.totalmem() : 0,
	freemem: (): number =>
		typeof nodeOs.freemem === "function" ? nodeOs.freemem() : 0,
	cpus: (): NodeOsTypes.CpuInfo[] =>
		typeof nodeOs.cpus === "function" ? nodeOs.cpus() : [],
	networkInterfaces: (): NodeJS.Dict<NodeOsTypes.NetworkInterfaceInfo[]> =>
		typeof nodeOs.networkInterfaces === "function"
			? nodeOs.networkInterfaces()
			: {},

	userInfo: (options?: {
		encoding?: BufferEncoding | "buffer";
	}): NodeOsTypes.UserInfo<string> | NodeOsTypes.UserInfo<Buffer> => {
		const defaultUserInfoString: NodeOsTypes.UserInfo<string> = {
			uid: -1,
			gid: -1,
			username: "cocoon_user",
			homedir: osShimInstance.homedir() || "/tmp",
			shell: null,
		};
		const defaultUserInfoBuffer: NodeOsTypes.UserInfo<Buffer> = {
			uid: -1,
			gid: -1,
			username: Buffer.from("cocoon_user"),
			homedir: Buffer.from(osShimInstance.homedir() || "/tmp"),
			shell: null,
		};

		if (typeof nodeOs.userInfo !== "function") {
			console.warn(
				"[Cocoon OS Shim] nodeOs.userInfo() function is not available. Returning default UserInfo.",
			);
			return options?.encoding === "buffer"
				? defaultUserInfoBuffer
				: defaultUserInfoString;
		}
		try {
			return options?.encoding === "buffer"
				? nodeOs.userInfo({ encoding: "buffer" })
				: nodeOs.userInfo(
						options as { encoding: BufferEncoding } | undefined,
					);
		} catch (e: any) {
			console.warn(
				`[Cocoon OS Shim] nodeOs.userInfo() call failed. Error: ${e.message}. Returning default UserInfo.`,
			);
			return options?.encoding === "buffer"
				? defaultUserInfoBuffer
				: defaultUserInfoString;
		}
	},

	endianness: (): "BE" | "LE" =>
		typeof nodeOs.endianness === "function" ? nodeOs.endianness() : "LE", // Default to LE if unavailable
	uptime: (): number =>
		typeof nodeOs.uptime === "function" ? nodeOs.uptime() : 0, // System uptime
	loadavg: (): number[] =>
		typeof nodeOs.loadavg === "function" ? nodeOs.loadavg() : [0, 0, 0],
	machine: (): string =>
		typeof nodeOs.machine === "function" ? nodeOs.machine() : "unknown", // Node v19.7+

	get devNull(): string {
		// Use getter for readonly property
		// nodeOs.devNull is available from Node v16.18.0
		// Fallback for older Node versions or if nodeOs.devNull is unexpectedly undefined
		return typeof nodeOs.devNull === "string" && nodeOs.devNull
			? nodeOs.devNull
			: isWindows
				? "\\\\.\\nul"
				: "/dev/null";
	},

	// availableParallelism is Node v19.8+
	availableParallelism:
		typeof nodeOs.availableParallelism === "function"
			? nodeOs.availableParallelism
			: (): number => 1, // Fallback to 1 if not available

	// version is Node v19.1.0+ (OS version string)
	version:
		typeof nodeOs.version === "function"
			? nodeOs.version
			: (): string => "unknown", // Fallback if not available
};

// Export the singleton instance for use by NodeModuleShimFactory.
export default osShimInstance;
