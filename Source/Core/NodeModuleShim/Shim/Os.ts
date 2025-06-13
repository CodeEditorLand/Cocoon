/**
 * @module Os (NodeModuleShim/Shim)
 * @description Creates a safe shim for the Node.js 'os' module. It provides
 * safe, cached values received from the host during initialization, preventing
 * extensions from accessing potentially sensitive, real-time OS information
 * directly.
 */

import * as NodeOs from "node:os";

import type { InitData } from "../../../Service/InitData.js";

/**
 * Creates the shim object for the `os` module.
 *
 * This function is a factory that takes the `InitData` as input. This is
 * crucial because it allows the shim to be constructed with static,
 * host-approved data, making its methods synchronous and conformant to the
 * real `os` API.
 *
 * @param InitDataService The initial data payload from the `Mountain` host.
 * @returns A shim object that implements a safe subset of the `os` module's API.
 */
export function CreateOsShim(InitDataService: InitData.Interface) {
	const IsWindows = InitDataService.environment.isWindows;
	const UserHome = InitDataService.environment.userHome as any; // Cast from internal URI type

	const OsShim = {
		EOL: IsWindows ? "\r\n" : "\n",
		arch: () => process.arch,
		platform: () => process.platform,
		constants: NodeOs.constants,
		cpus: () => NodeOs.cpus(),
		freemem: () => NodeOs.freemem(),
		homedir: () =>
			UserHome.fsPath ||
			process.env["HOME"] ||
			process.env["USERPROFILE"] ||
			"",
		hostname: () => InitDataService.environment.hostname || "localhost",
		loadavg: () => NodeOs.loadavg(),
		networkInterfaces: () => NodeOs.networkInterfaces(),
		release: () => NodeOs.release(),
		tmpdir: () => NodeOs.tmpdir(), // tmpdir is generally safe to expose.
		totalmem: () => NodeOs.totalmem(),
		type: () => NodeOs.type(),
		userInfo: (_options?: { encoding: string }) => {
			// Return a mocked/sanitized version to avoid exposing real user info.
			const Username =
				UserHome.fsPath.split(/\/|\\/).pop() || "cocoon-user";
			return {
				uid: -1,
				gid: -1,
				username: Username,
				homedir: UserHome.fsPath,
				shell: null,
			};
		},
		uptime: () => NodeOs.uptime(),
	};

	return Object.freeze(OsShim);
}
