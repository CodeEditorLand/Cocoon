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
 *   `constants`, `endianness`, `uptime`, `loadavg`, `machine`, `devNull`, `availableParallelism`, `version`)
 *   to the native `node:os` module or `process` object.
 * - Proxying `hostname()` to Mountain via an IPC call (`os_hostname`), with robust
 *   fallbacks to `nodeOs.hostname()` and then a default value if the IPC or native
 *   call fails.
 * - Providing reliable implementations for `homedir()` and `tmpdir()`, checking
 *   standard environment variables first, then falling back to `nodeOs` calls, and
 *   finally to platform-specific defaults.
 * - Correctly handling the overloaded signature of `os.userInfo()`.
 *
 * Key Interactions:
 * - An instance of this shim is returned by `NodeModuleShimFactory`.
 * - It directly utilizes `node:os` and the global `process` object.
 * - Uses `sendToMountainAndWait` from `cocoon-ipc.ts` for `hostname()`,
 *   requiring an `os_hostname` IPC handler on Mountain.
 *
 *--------------------------------------------------------------------------------------------*/

import * as nodeOs from "node:os"; // For direct delegation and constants
import type * as NodeOsTypes from "node:os"; // For type information

import { sendToMountainAndWait } from "../cocoon-ipc";

// --- Type Definitions ---
/** Defines the public interface of the Cocoon OS shim. */
export interface OsShim {
	EOL: string;
	arch(): string;
	platform(): NodeJS.Platform;
	hostname(): Promise<string>;
	homedir(): string;
	tmpdir(): string;
	constants: typeof nodeOs.constants;
	type(): string;
	release(): string;
	totalmem(): number;
	freemem(): number;
	cpus(): NodeOsTypes.CpuInfo[];
	networkInterfaces(): NodeJS.Dict<NodeOsTypes.NetworkInterfaceInfo[]>;
	userInfo(options?: {
		encoding: BufferEncoding;
	}): NodeOsTypes.UserInfo<string>;
	userInfo(options: { encoding: "buffer" }): NodeOsTypes.UserInfo<Buffer>;
	endianness(): "BE" | "LE";
	uptime(): number; // System uptime
	loadavg(): number[];
	machine(): string; // Machine type e.g. 'x86_64'
	readonly devNull: string; // Path to null device
	availableParallelism?(): number; // Node v19.8+
	version?(): string; // Node v19.1.0+ (OS version string)
}

const osShimInstance: OsShim = {
	EOL: nodeOs.EOL,
	platform: (): NodeJS.Platform => process.platform,
	arch: (): string => process.arch,

	hostname: async (): Promise<string> => {
		try {
			const mountainHostname = await sendToMountainAndWait(
				"os_hostname",
				{},
				2000,
			);
			if (
				typeof mountainHostname === "string" &&
				mountainHostname.trim().length > 0
			) {
				return mountainHostname.trim();
			}
			console.warn(
				"[Cocoon OS Shim] IPC 'os_hostname' returned invalid data. Falling back.",
				"Received:",
				mountainHostname,
			);
		} catch (ipcError: any) {
			console.warn(
				`[Cocoon OS Shim] IPC 'os_hostname' failed, falling back. Error: ${ipcError.message}`,
			);
		}
		try {
			if (typeof nodeOs.hostname === "function") return nodeOs.hostname();
			console.warn(
				"[Cocoon OS Shim] nodeOs.hostname() unavailable. Using 'localhost'.",
			);
			return "localhost";
		} catch (nodeError: any) {
			console.error(
				`[Cocoon OS Shim] nodeOs.hostname() failed. Using 'localhost'. Error: ${nodeError.message}`,
			);
			return "localhost";
		}
	},

	homedir: (): string => {
		return (
			process.env.HOME ||
			process.env.USERPROFILE ||
			(typeof nodeOs.homedir === "function" ? nodeOs.homedir() : "") ||
			""
		);
	},

	tmpdir: (): string => {
		try {
			if (typeof nodeOs.tmpdir === "function") {
				const dir = nodeOs.tmpdir();
				if (dir) return dir;
			}
		} catch (e: any) {
			console.warn(
				`[Cocoon OS Shim] nodeOs.tmpdir() failed: ${e.message}. Falling back to env vars.`,
			);
		}
		return (
			process.env.TMPDIR ||
			process.env.TMP ||
			process.env.TEMP ||
			(process.platform === "win32" ? "C:\\Windows\\Temp" : "/tmp")
		);
	},

	constants: nodeOs.constants,
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
				"[Cocoon OS Shim] nodeOs.userInfo() unavailable. Returning default.",
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
				`[Cocoon OS Shim] nodeOs.userInfo() failed: ${e.message}. Returning default.`,
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
		return isWindows ? "\\\\.\\nul" : "/dev/null"; // nodeOs.devNull is Node v16.18+
	},
	availableParallelism:
		typeof nodeOs.availableParallelism === "function"
			? nodeOs.availableParallelism
			: (): number => 1, // Node v19.8+
	version:
		typeof nodeOs.version === "function"
			? nodeOs.version
			: (): string => "unknown", // Node v19.1.0+ (OS version string)
};

export default osShimInstance;
