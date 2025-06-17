/*
 * File: Cocoon/Source/Core/NodeModuleShim/Shim/Os.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:38 UTC
 * Dependency: node:os, vs/workbench/services/extensions/common/extensionHostProtocol.js
 */

/**
 * @module Os (NodeModuleShim/Shim)
 * @description Creates a safe shim for the Node.js 'os' module. It provides
 * safe, cached values received from the host during initialization, preventing
 * extensions from accessing potentially sensitive, real-time OS information
 * directly.
 */

import * as NodeOs from "node:os";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

/**
 * Creates the shim object for the `os` module.
 *
 * This function is a factory that takes the `InitData` as input. This is
 * crucial because it allows the shim to be constructed with static,
 * host-approved data, making its methods synchronous and conformant to the
 * real `os` API.
 *
 * @param InitData The initial data payload from the `Mountain` host.
 * @returns A shim object that implements a safe subset of the `os` module's API.
 */
const CreateOsShim = (InitData: IExtensionHostInitData) => {
	// The `isWindows` property does not exist on IEnvironment.
	// We can reliably get this information from the running Node.js process itself.
	const IsWindows = process.platform === "win32";

	// The `userHome` property does not exist on IExtensionHostInitData.
	// `globalStorageHome` is the closest, most reliable source for the user's home directory URI.
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
		tmpdir: () => NodeOs.tmpdir(), // tmpdir is generally safe to expose.
		totalmem: () => NodeOs.totalmem(),
		type: () =>
			IsWindows
				? "Windows_NT"
				: process.platform === "darwin"
					? "Darwin"
					: "Linux",
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
};

export default CreateOsShim;
