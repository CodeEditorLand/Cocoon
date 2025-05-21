/*---------------------------------------------------------------------------------------------
 * Cocoon OS Shim (os-shim.ts) // Header: Added basic header
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'os' module.
 * It delegates to the native Node.js 'os' module for constants and many functions,
 * but can proxy specific functions (like `hostname`) to Mountain if the Cocoon
 * environment's direct view of the OS is not what should be exposed to extensions.
 *
 * Key Interactions:
 * - Returned by `NodeModuleShimFactory` when `require('os')` is intercepted.
 * - Uses `node:os` for most direct delegations.
 * - Can use `sendToMountainAndWait` from `cocoon-ipc.ts` for proxied operations.
 *--------------------------------------------------------------------------------------------*/

import * as nodeOs from "node:os"; // For direct delegation and constants

import type * as NodeOsTypes from "node:os"; // For type information from @types/node

import { sendToMountainAndWait } from "../cocoon-ipc"; // For proxied functions

// --- Type Definitions ---

// Define the shape of the os shim, aligning with relevant parts of Node.js `os` module.
// TODO: If @types/node is a dev dependency, this interface can extend or utilize types from `NodeJS. också`.
export interface OsShim {
	EOL: string;
	platform(): NodeJS.Platform;
	arch(): string;
	hostname(): Promise<string>; // Proxied, hence async
	homedir(): string;
	tmpdir(): string;
	constants: typeof nodeOs.constants; // Use the type of Node's constants directly
	// Common os functions that extensions might use:
	type(): string; // e.g., 'Linux', 'Darwin', 'Windows_NT'
	release(): string;
	totalmem(): number;
	freemem(): number;
	cpus(): NodeOsTypes.CpuInfo[]; // Use imported CpuInfo type
	networkInterfaces(): NodeJS.Dict<NodeOsTypes.NetworkInterfaceInfo[]>;
	userInfo(options?: {
		encoding: BufferEncoding;
	}): NodeOsTypes.UserInfo<string>;
	userInfo(options: { encoding: "buffer" }): NodeOsTypes.UserInfo<Buffer>;
	// TODO: Add other os functions as needed, deciding to delegate or proxy each one.
	// e.g., uptime(), loadavg(), getPriority(), setPriority()
}

const osShimInstance: OsShim = {
	EOL: nodeOs.EOL,
	platform: (): NodeJS.Platform => process.platform, // `process` is generally reliable for platform/arch
	arch: (): string => process.arch,

	hostname: async (): Promise<string> => {
		try {
			// TODO: Consider if a shorter timeout is appropriate for hostname.
			const mountainHostname = await sendToMountainAndWait(
				"os_hostname",
				{},
				2000,
			); // 2s timeout
			if (
				typeof mountainHostname === "string" &&
				mountainHostname.length > 0
			) {
				return mountainHostname;
			}
			console.warn(
				"[Cocoon OS Shim] os_hostname from Mountain returned invalid data, falling back.",
				mountainHostname,
			);
		} catch (error: any) {
			console.warn(
				"[Cocoon OS Shim] Failed to get hostname from Mountain, falling back to Node's os.hostname(). Error:",
				error.message,
			);
		}
		// Fallback to Node's os.hostname() if IPC fails or returns invalid data.
		try {
			return nodeOs.hostname();
		} catch (nodeError: any) {
			console.error(
				"[Cocoon OS Shim] Fallback nodeOs.hostname() also failed. Returning 'localhost'. Error:",
				nodeError.message,
			);
			return "localhost"; // Ultimate fallback
		}
	},

	homedir: (): string => {
		// Prioritize environment variables, then Node's os.homedir(), then a fallback.
		return (
			process.env.HOME ||
			process.env.USERPROFILE ||
			nodeOs.homedir() ||
			""
		);
	},

	tmpdir: (): string => {
		// Node's os.tmpdir() is generally suitable.
		// TODO: Consider if Mountain should provide this if Cocoon runs in a very restricted environment.
		try {
			return nodeOs.tmpdir();
		} catch (e: any) {
			// This might happen if the underlying OS call fails, e.g. due to permissions or strange env.
			console.warn(
				"[Cocoon OS Shim] nodeOs.tmpdir() failed, returning fallback '/tmp'. Error:",
				e.message,
			);
			// Using '/tmp' or `os.homedir() + '/tmp'` could be alternatives.
			// For Windows, %TEMP% or %TMP% (usually C:\Users\<user>\AppData\Local\Temp) is used.
			// process.env.TMPDIR || process.env.TMP || process.env.TEMP is another common pattern.
			return (
				process.env.TMPDIR ||
				process.env.TEMP ||
				(process.platform === "win32" ? "C:\\Windows\\Temp" : "/tmp")
			);
		}
	},

	constants: nodeOs.constants, // Direct passthrough of Node's OS constants

	// --- Direct delegations for common, safe OS functions ---
	type: (): string => nodeOs.type(),
	release: (): string => nodeOs.release(),
	totalmem: (): number => nodeOs.totalmem(),
	freemem: (): number => nodeOs.freemem(),
	cpus: (): NodeOsTypes.CpuInfo[] => nodeOs.cpus(),
	networkInterfaces: (): NodeJS.Dict<NodeOsTypes.NetworkInterfaceInfo[]> =>
		nodeOs.networkInterfaces(),

	// userInfo needs to handle overloaded signature based on options.encoding
	userInfo: (options?: {
		encoding?: BufferEncoding | "buffer";
	}): NodeOsTypes.UserInfo<string> | NodeOsTypes.UserInfo<Buffer> => {
		// Ensure options is passed correctly to the native function
		// The type `NodeOsTypes.UserInfoOptions` covers both { encoding: BufferEncoding } and { encoding: 'buffer' }
		try {
			if (options?.encoding === "buffer") {
				return nodeOs.userInfo({ encoding: "buffer" });
			}
			return nodeOs.userInfo(
				options as { encoding: BufferEncoding } | undefined,
			); // Cast to specific overload
		} catch (e: any) {
			// userInfo can throw if user info is unavailable
			console.warn(
				`[Cocoon OS Shim] nodeOs.userInfo() failed. Error: ${e.message}`,
			);
			// Return a default/empty UserInfo object or rethrow, depending on desired strictness.
			// For now, let's rethrow as Node.js would.
			throw e;
		}
	},

	// TODO: Add other os functions as required, deciding for each:
	// 1. Delegate to `nodeOs.<function>` (if safe and provides correct info for Cocoon's context).
	// 2. Proxy to Mountain via `sendToMountainAndWait("os_<functionName>", params)`.
	// 3. Stub with a fixed value or throw an error if not supported.
	// Examples:
	// uptime: (): number => nodeOs.uptime(),
	// loadavg: (): number[] => nodeOs.loadavg(),
};

export default osShimInstance;
