/**
 * @module Definition (NodeModuleShim)
 * @description The live implementation of the `NodeModuleShim` service, which
 * provides sandboxed shims for built-in Node.js modules.
 */

import * as NodeCrypto from "node:crypto";
import { EventEmitter } from "node:events";
import * as NodeOs from "node:os";
import { Effect } from "effect";
import type { Uri } from "vscode";

import InitDataService from "../../Service/InitData/Service.js";
import LogService from "../../Service/Log/Service.js";
import { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";
import type Service from "./Service.js";

// --- Shim Implementations ---

/**
 * Creates a sanitized copy of the process environment variables.
 * It filters out any variables prefixed with 'VSCODE_' or other internal markers
 * to prevent leaking sensitive host information to extensions.
 */
const CreateSanitizedEnvironment = (): {
	[Key: string]: string | undefined;
} => {
	const SanitizedEnvironment: { [Key: string]: string | undefined } = {};
	for (const Key in process.env) {
		if (Object.prototype.hasOwnProperty.call(process.env, Key)) {
			if (
				!Key.startsWith("VSCODE_") &&
				!Key.startsWith("MOUNTAIN_") &&
				!Key.startsWith("COCOON_")
			) {
				SanitizedEnvironment[Key] = process.env[Key];
			}
		}
	}
	return Object.freeze(SanitizedEnvironment);
};

const ProcessShim = {
	...new (class extends EventEmitter {})(),
	get platform(): NodeJS.Platform {
		return process.platform;
	},
	get arch(): string {
		return process.arch;
	},
	get versions(): NodeJS.ProcessVersions {
		return { ...process.versions };
	},
	get pid(): number {
		return process.pid;
	},
	get ppid(): number {
		return process.ppid;
	},
	get execPath(): string {
		return process.execPath;
	},
	get title(): string {
		return "Cocoon Extension Host";
	},
	get env() {
		return CreateSanitizedEnvironment();
	},
	get argv(): string[] {
		return [...process.argv];
	},
	get execArgv(): string[] {
		return [...process.execArgv];
	},
	cwd: () => process.cwd(),
	memoryUsage: () => process.memoryUsage(),
	hrtime: (time?: [number, number]) => process.hrtime(time),
	uptime: () => process.uptime(),
	nextTick: (callback: (...args: any[]) => void, ...args: any[]) =>
		process.nextTick(callback, ...args),
	exit: (code?: number): never => process.exit(code),
	kill: (pid: number, signal?: string | number) => process.kill(pid, signal),
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

const CreateOsShim = (InitData: InitDataService) => {
	const IsWindows = InitData.environment.isWindows;
	const UserHome = InitData.environment.userHome as any;
	return Object.freeze({
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
		hostname: () => InitData.environment.hostname || "localhost",
		loadavg: () => NodeOs.loadavg(),
		networkInterfaces: () => NodeOs.networkInterfaces(),
		release: () => NodeOs.release(),
		tmpdir: () => NodeOs.tmpdir(),
		totalmem: () => NodeOs.totalmem(),
		type: () => NodeOs.type(),
		userInfo: (_options?: { encoding: string }) => ({
			uid: -1,
			gid: -1,
			username: UserHome.fsPath.split(/\/|\\/).pop() || "cocoon-user",
			homedir: UserHome.fsPath,
			shell: null,
		}),
		uptime: () => NodeOs.uptime(),
	});
};

const CreateCryptoShim = () => {
	const CreateStub = (Name: string) => () => {
		throw new Error(
			`[Cocoon Crypto Shim] 'crypto.${Name}' is not implemented or is disallowed.`,
		);
	};
	return {
		...NodeCrypto,
		generatePrime: NodeCrypto.generatePrime
			? CreateStub("generatePrime")
			: undefined,
		generateKeyPair: CreateStub("generateKeyPair"),
		generateKeyPairSync: CreateStub("generateKeyPairSync"),
		createCipheriv: CreateStub("createCipheriv"),
		createDecipheriv: CreateStub("createDecipheriv"),
		createSign: CreateStub("createSign"),
		createVerify: CreateStub("createVerify"),
	};
};

/**
 * An `Effect` that constructs the `NodeModuleShim` service implementation.
 */
export default Effect.gen(function* () {
	const Log = yield* LogService;
	const InitData = yield* InitDataService;

	const OsShim = CreateOsShim(InitData);
	const CryptoShim = CreateCryptoShim();

	const BlockedModules = new Set([
		"fs",
		"node:fs",
		"fs/promises",
		"node:fs/promises",
		"path",
		"node:path",
		"child_process",
		"node:child_process",
		"worker_threads",
		"node:worker_threads",
		"cluster",
		"node:cluster",
		"vm",
		"node:vm",
	]);

	const Shims = new Map<string, any>([
		["os", OsShim],
		["node:os", OsShim],
		["crypto", CryptoShim],
		["node:crypto", CryptoShim],
		["process", ProcessShim],
		["node:process", ProcessShim],
	]);

	const Load = (Request: string, ParentURI?: Uri) =>
		Effect.gen(function* () {
			const RequesterPath = ParentURI?.fsPath || "unknown module";
			yield* Log.Trace(
				`Intercepted require('${Request}') from '${RequesterPath}'.`,
			);

			if (BlockedModules.has(Request)) {
				return yield* new ModuleBlockedError({ ModuleName: Request });
			}

			const Shim = Shims.get(Request);
			if (Shim) {
				return Shim;
			}

			return yield* new ModuleNotShimmedError({ ModuleName: Request });
		});

	const NodeModuleShimImplementation: Service = { Load };
	return NodeModuleShimImplementation;
});
