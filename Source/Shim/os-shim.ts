/*---------------------------------------------------------------------------------------------
 * Cocoon OS Shim (os-shim.ts)
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
 *
 *   `type`, `release`, `totalmem`, `freemem`, `cpus`, `networkInterfaces`, `userInfo`,
 *
 *   `constants`) to the native `node:os` module or `process` object.
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
 *
 *   requiring a corresponding `os_hostname` IPC handler on the Mountain side.
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
 * This interface aims to match relevant and commonly used parts of the Node.js 'os' module API,
 *
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
	 *
	 */
	homedir(): string;

	/**
	 * Returns the operating system's default directory for temporary files as a string.
	 * Checks `TMPDIR`, `TMP`, `TEMP` environment variables, then `nodeOs.tmpdir()`, then platform-specific fallbacks.
	 * @see {@link nodeOs.tmpdir}
	 *
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
	 *
	 */
	userInfo(options?: {
		encoding: BufferEncoding;
	}): NodeOsTypes.UserInfo<string>;

	userInfo(options: { encoding: "buffer" }): NodeOsTypes.UserInfo<Buffer>;

	// TODO: Consider adding other commonly used (and safe to expose directly or via proxy) `os` functions if needed by extensions.
	// Examples:
	// - `os.endianness(): 'BE' | 'LE'`
	// - `os.uptime(): number` (system uptime, not process uptime)
	// - `os.loadavg(): number[]` (1, 5, and 15 minute load averages)
	// - `os.machine(): string` (machine type, e.g. 'x86_64', new in Node v19.7)
	// Potentially more sensitive methods like `getPriority`, `setPriority` would likely be omitted or require proxying with careful permission checks.
}

/**
 * The singleton instance of the Cocoon OS shim, implementing `OsShim`.
 * This instance is provided by `NodeModuleShimFactory` when `require('os')` is intercepted.
 */
const osShimInstance: OsShim = {
	EOL: nodeOs.EOL,

	// `process.platform` and `process.arch` are generally reliable and reflect Cocoon's runtime environment.
	platform: (): NodeJS.Platform => process.platform,

	arch: (): string => process.arch,

	hostname: async (): Promise<string> => {
		try {
			const mountainHostname = await sendToMountainAndWait(
				"os_hostname", // IPC method name for Mountain to handle
				{}, // No parameters usually needed for hostname
				2000, // 2-second timeout for this potentially quick operation
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
				// This case would be unusual for supported Node versions.
				console.warn(
					"[Cocoon OS Shim] nodeOs.hostname() function is not available in this Node.js environment. Using 'localhost' as fallback.",
				);

				return "localhost";
			}
		} catch (nodeError: any) {
			console.error(
				`[Cocoon OS Shim] Fallback call to nodeOs.hostname() also failed. Returning 'localhost' as ultimate fallback. Node Error: ${nodeError.message}`,
			);

			return "localhost"; // Ultimate fallback if all other methods fail.
		}
	},

	homedir: (): string => {
		// Standard heuristic for finding home directory:
		// 1. Check HOME environment variable (common on POSIX systems like Linux, macOS).
		// 2. Check USERPROFILE environment variable (common on Windows).
		// 3. Fallback to Node.js's `os.homedir()` if available.
		// 4. Ultimate fallback to an empty string if all else fails (or "." for current dir if preferred).
		return (
			process.env.HOME ||
			process.env.USERPROFILE ||
			(typeof nodeOs.homedir === "function" ? nodeOs.homedir() : "") || // Check if homedir function exists
			"" // Fallback to empty string if no other method succeeds.
		);
	},

	tmpdir: (): string => {
		// Attempt to use Node's os.tmpdir() first if available.
		try {
			if (typeof nodeOs.tmpdir === "function") {
				const dir = nodeOs.tmpdir();

				if (dir) return dir; // Use if non-empty and function exists.
			}
		} catch (e: any) {
			console.warn(
				`[Cocoon OS Shim] nodeOs.tmpdir() call failed or returned empty, attempting environment variable fallbacks. Error: ${e.message}`,
			);
		}

		// Common environment variables for temporary directory.
		return (
			process.env.TMPDIR ||
			process.env.TMP ||
			process.env.TEMP ||
			(process.platform === "win32" ? "C:\\Windows\\Temp" : "/tmp") // Platform-specific common fallbacks.
		);
	},

	// Direct passthrough of Node's OS constants.
	constants: nodeOs.constants,

	// --- Direct delegations for common, generally safe OS information functions ---
	type: (): string =>
		typeof nodeOs.type === "function"
			? nodeOs.type()
			: String(process.platform), // Fallback using process.platform if os.type not available.
	release: (): string =>
		typeof nodeOs.release === "function" ? nodeOs.release() : "unknown", // Default to 'unknown' if unavailable.
	totalmem: (): number =>
		typeof nodeOs.totalmem === "function" ? nodeOs.totalmem() : 0, // Default to 0 if unavailable.
	freemem: (): number =>
		typeof nodeOs.freemem === "function" ? nodeOs.freemem() : 0, // Default to 0 if unavailable.
	cpus: (): NodeOsTypes.CpuInfo[] =>
		typeof nodeOs.cpus === "function" ? nodeOs.cpus() : [], // Default to empty array.
	networkInterfaces: (): NodeJS.Dict<NodeOsTypes.NetworkInterfaceInfo[]> =>
		typeof nodeOs.networkInterfaces === "function"
			? nodeOs.networkInterfaces()
			: {}, // Default to empty object.

	// userInfo needs to handle overloaded signature based on options.encoding.
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
				"[Cocoon OS Shim] nodeOs.userInfo() function is not available in this Node.js environment. Returning default empty UserInfo.",
			);

			return options?.encoding === "buffer"
				? defaultUserInfoBuffer
				: defaultUserInfoString;
		}

		try {
			// The `options` parameter for `nodeOs.userInfo` is `UserInfoOptions`.
			// If `options.encoding` is "buffer", it expects that specific overload.
			if (options?.encoding === "buffer") {
				return nodeOs.userInfo({ encoding: "buffer" });
			}

			// Otherwise, it's `BufferEncoding` (like 'utf-8') or undefined (defaults to 'utf-8 string result).
			return nodeOs.userInfo(
				options as { encoding: BufferEncoding } | undefined,
			);
		} catch (e: any) {
			// `nodeOs.userInfo()` can throw if user information is unavailable (e.g., in some sandboxed environments or containers).
			console.warn(
				`[Cocoon OS Shim] nodeOs.userInfo() call failed. Error: ${e.message}. Returning default/empty UserInfo.`,
			);

			return options?.encoding === "buffer"
				? defaultUserInfoBuffer
				: defaultUserInfoString;
		}
	},
};

// Export the singleton instance for use by NodeModuleShimFactory.
export default osShimInstance;
