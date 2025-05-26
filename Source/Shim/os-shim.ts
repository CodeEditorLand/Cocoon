/*---------------------------------------------------------------------------------------------
 * Cocoon OS Shim (os-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'os' module. This shim is intended to be
 * supplied by the `NodeModuleShimFactory` when an extension executes `require('os')`.
 *
 * It delegates most functions and constants directly to the native Node.js 'os' module.
 * However, certain sensitive or environment-specific properties, like `hostname`,
 * 
 * 
 * are proxied to the Mountain host process to ensure extensions receive a consistent
 * or controlled view of the OS environment, rather than Cocoon's direct OS view.
 *
 * Responsibilities:
 * - Mimicking the interface of the Node.js 'os' module for commonly used functions.
 * - Directly delegating most OS information functions (e.g., `platform`, `arch`, `EOL`,
 * 
 * 
 *   `type`, `release`, `totalmem`, `freemem`, `cpus`, `networkInterfaces`, `userInfo`, `constants`)
 *   to the `node:os` module or `process` object.
 * - Proxying `hostname()` to Mountain via IPC, with fallbacks.
 * - Providing robust implementations for `homedir()` and `tmpdir()` with fallbacks.
 *
 * Key Interactions:
 * - Returned by `NodeModuleShimFactory` when `require('os')` is intercepted.
 * - Directly uses the `node:os` module and `process` object from the Node.js environment.
 * - Uses `sendToMountainAndWait` from `cocoon-ipc.ts` for the proxied `hostname()` call.
 *

 *--------------------------------------------------------------------------------------------*/

// For direct delegation and constants
import * as nodeOs from "node:os";
// For type information from @types/node, assuming it's a dev dependency for accurate types.
import type * as NodeOsTypes from "node:os";

// For proxied functions
import { sendToMountainAndWait } from "../cocoon-ipc";

// --- Type Definitions ---

/**
 * Defines the public interface of the Cocoon OS shim.
 * This interface aims to match relevant parts of the Node.js 'os' module API.
 */
export interface OsShim {
	/** The operating system-specific end-of-line marker. */
	EOL: string;

	/** Returns the operating system CPU architecture for which the Node.js binary was compiled. */
	arch(): string;

	/** Returns the operating system platform. */
	platform(): NodeJS.Platform;

	/** Returns the hostname of the operating system, potentially proxied from Mountain. */
	hostname(): Promise<string>;

	/** Returns the string path of the current user's home directory. */
	homedir(): string;

	/** Returns the operating system's default directory for temporary files as a string. */
	tmpdir(): string;

	/** Contains commonly used operating system-specific constants. */
	constants: typeof nodeOs.constants;

	/** Returns the operating system name as returned by `uname`. */
	type(): string;

	/** Returns the operating system release. */
	release(): string;

	/** Returns the total amount of system memory in bytes as an integer. */
	totalmem(): number;

	/** Returns the amount of free system memory in bytes as an integer. */
	freemem(): number;

	/** Returns an array of objects containing information about each logical CPU core. */
	cpus(): NodeOsTypes.CpuInfo[];

	/** Returns an object containing network interfaces that have been assigned a network address. */
	networkInterfaces(): NodeJS.Dict<NodeOsTypes.NetworkInterfaceInfo[]>;

	/**
	 * Returns information about the currently effective user.
	 * On POSIX platforms, this is typically a subset of the password file.
	 * On Windows, the `uid` and `gid` fields are -1, and `shell` is null.
	 */
	userInfo(options?: {
		encoding: BufferEncoding;
	}): NodeOsTypes.UserInfo<string>;

	userInfo(options: { encoding: "buffer" }): NodeOsTypes.UserInfo<Buffer>;

	// TODO: Add other os functions as needed by extensions, deciding for each:
	// 1. Delegate to `nodeOs.<function>` (if safe and provides correct info for Cocoon's context).
	// 2. Proxy to Mountain via `sendToMountainAndWait("os_<functionName>", params)`.
	// 3. Stub with a fixed value or throw an error if not supported.
	// e.g., uptime(), loadavg(), getPriority(), setPriority(), endianness()
}

/**
 * The actual instance of the OS shim.
 */
const osShimInstance: OsShim = {
	EOL: nodeOs.EOL,

	// `process.platform` and `process.arch` are generally reliable for the Cocoon environment itself.
	platform: (): NodeJS.Platform => process.platform,

	arch: (): string => process.arch,

	hostname: async (): Promise<string> => {
		try {
			const mountainHostname = await sendToMountainAndWait(
				// IPC method name
				"os_hostname",

				// No parameters needed for hostname
				{},

				// 2-second timeout
				2000,
			);

			if (
				typeof mountainHostname === "string" &&
				mountainHostname.length > 0
			) {
				return mountainHostname;
			}

			console.warn(
				"[Cocoon OS Shim] os_hostname from Mountain returned invalid data, falling back to nodeOs.hostname(). Response:",

				mountainHostname,
			);
		} catch (error: any) {
			console.warn(
				"[Cocoon OS Shim] Failed to get hostname from Mountain via IPC, falling back to nodeOs.hostname(). Error:",

				error.message,
			);
		}

		// Fallback to Node's os.hostname() if IPC fails or returns invalid data.
		try {
			return nodeOs.hostname();
		} catch (nodeError: any) {
			console.error(
				"[Cocoon OS Shim] Fallback nodeOs.hostname() also failed. Returning 'localhost' as ultimate fallback. Error:",

				nodeError.message,
			);

			// Ultimate fallback
			return "localhost";
		}
	},

	homedir: (): string => {
		// Standard heuristic for finding home directory:
		// 1. Check HOME environment variable (common on POSIX).
		// 2. Check USERPROFILE environment variable (common on Windows).
		// 3. Fallback to Node.js's os.homedir().
		// 4. Ultimate fallback to an empty string if all else fails.
		return (
			process.env.HOME ||
			process.env.USERPROFILE ||
			// Check if homedir function exists
			(typeof nodeOs.homedir === "function" ? nodeOs.homedir() : "") ||
			""
		);
	},

	tmpdir: (): string => {
		// Node's os.tmpdir() usually provides a suitable temporary directory.
		// Add fallbacks for robustness.
		try {
			let dir =
				typeof nodeOs.tmpdir === "function" ? nodeOs.tmpdir() : "";

			if (dir) return dir;
		} catch (e: any) {
			console.warn(
				`[Cocoon OS Shim] nodeOs.tmpdir() failed, attempting fallbacks. Error: ${e.message}`,
			);
		}

		// Common environment variables for temp directory.
		return (
			process.env.TMPDIR ||
			process.env.TMP ||
			process.env.TEMP ||
			// Platform-specific common fallbacks
			(process.platform === "win32" ? "C:\\Windows\\Temp" : "/tmp")
		);
	},

	// Direct passthrough of Node's OS constants
	constants: nodeOs.constants,

	// --- Direct delegations for common, generally safe OS functions ---
	// Fallback for type
	type: (): string =>
		typeof nodeOs.type === "function" ? nodeOs.type() : process.platform,

	release: (): string =>
		typeof nodeOs.release === "function" ? nodeOs.release() : "",

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

	// userInfo needs to handle overloaded signature based on options.encoding
	userInfo: (options?: {
		encoding?: BufferEncoding | "buffer";
	}): NodeOsTypes.UserInfo<string> | NodeOsTypes.UserInfo<Buffer> => {
		try {
			if (typeof nodeOs.userInfo !== "function") {
				throw new Error(
					"nodeOs.userInfo is not available in this Node.js version/environment.",
				);
			}

			if (options?.encoding === "buffer") {
				return nodeOs.userInfo({ encoding: "buffer" });
			}

			// The type `NodeOsTypes.UserInfoOptions` covers `{ encoding: BufferEncoding }`.
			// If options is undefined, it defaults to UTF-8 string result.
			return nodeOs.userInfo(
				options as { encoding: BufferEncoding } | undefined,
			);
		} catch (e: any) {
			// userInfo can throw if user info is unavailable (e.g., in some sandboxed environments)
			console.warn(
				`[Cocoon OS Shim] nodeOs.userInfo() failed. Error: ${e.message}. Returning default/empty UserInfo.`,
			);

			// Return a default/empty UserInfo object to prevent crashes,

			// matching Node's behavior of returning -1/null for some fields on Windows.
			const emptyInfoString: NodeOsTypes.UserInfo<string> = {
				uid: -1,

				gid: -1,

				username: "",

				homedir: "",

				shell: null,
			};

			const emptyInfoBuffer: NodeOsTypes.UserInfo<Buffer> = {
				uid: -1,

				gid: -1,

				username: Buffer.from(""),

				homedir: Buffer.from(""),

				shell: null,
			};

			return options?.encoding === "buffer"
				? emptyInfoBuffer
				: emptyInfoString;
		}
	},
};

// Default export for easy import by NodeModuleShimFactory.
export default osShimInstance;
