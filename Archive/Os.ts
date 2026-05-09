/**
 * @module Os
 * @description Creates a safe shim for the Node.js 'os' module. This shim
 * provides static, host-approved data received during initialization, preventing
 * extensions from directly accessing potentially sensitive, real-time OS information.
 */

import * as NodeOs from "node:os";

import type { IExtensionHostInitData } from "@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostProtocol.js";

/**
 * @description A factory function that creates the shim object for the `os` module.
 * It uses the static `InitData` to construct its methods, ensuring conformance
 * with the real `os` API while maintaining a secure sandbox.
 * @param InitData The initial data payload from the `Mountain` host.
 * @returns A shim object that implements a safe subset of the `os` module's API.
 */
export const CreateOsShim = (InitData: IExtensionHostInitData) => {
	const IsWindows = process.platform === "win32";

	const UserHome = InitData.environment.globalStorageHome;

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

		hostname: () => InitData.environment.appHost || "localhost",

		loadavg: () => NodeOs.loadavg(),

		networkInterfaces: () => NodeOs.networkInterfaces(),

		release: () => NodeOs.release(),

		tmpdir: () => NodeOs.tmpdir(),

		totalmem: () => NodeOs.totalmem(),

		type: () =>
			IsWindows
				? "Windows_NT"
				: process.platform === "darwin"
					? "Darwin"
					: "Linux",

		userInfo: (_options?: { encoding: string }) => {
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
};
