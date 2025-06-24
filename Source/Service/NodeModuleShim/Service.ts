/*
 * File: Cocoon/Source/Service/NodeModuleShim/Service.ts
 * Role: Defines the NodeModuleShim service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Intercept requests for built-in Node.js modules, blocking some and providing safe shims for others.
 */

import { Effect, Exit } from "effect";
import * as NodeCrypto from "node:crypto";
import * as NodeOs from "node:os";
import { EventEmitter } from "node:events";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";
import type { Uri } from "vscode";

import { InitData } from "../../Service/InitData/Service.js";
import { Logger } from "../../Service/Log/Service.js";
import { ModuleBlockedError } from "./Error/ModuleBlockedError.js";
import { ModuleNotShimmedError } from "./Error/ModuleNotShimmedError.js";

// --- Internal Shim Logic ---

const CreateCryptoShim = () => {
	const CreateStub = (Name: string) => () => {
		throw new Error(
			`[Cocoon Crypto Shim] STUB: 'crypto.${Name}' is not implemented or is disallowed.`,
		);
	};
	return {
		createHash: NodeCrypto.createHash,
		createHmac: NodeCrypto.createHmac,
		randomBytes: NodeCrypto.randomBytes,
		getRandomValues: NodeCrypto.getRandomValues,
		randomUUID: NodeCrypto.randomUUID,
		randomFill: NodeCrypto.randomFill,
		randomFillSync: NodeCrypto.randomFillSync,
		pbkdf2: NodeCrypto.pbkdf2,
		pbkdf2Sync: NodeCrypto.pbkdf2Sync,
		timingSafeEqual: NodeCrypto.timingSafeEqual,
		getHashes: NodeCrypto.getHashes,
		getCiphers: NodeCrypto.getCiphers,
		constants: NodeCrypto.constants,
		generatePrime:
			typeof NodeCrypto.generatePrime === "function"
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

const CreateOsShim = (InitData: IExtensionHostInitData) => {
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

const CreateProcessShim = () => {
	class ProcessShimBase extends EventEmitter {}
	const ActualNodeProcess = process;
	const CreateSanitizedEnvironment = (): {
		[key: string]: string | undefined;
	} => {
		const SanitizedEnvironment: { [key: string]: string | undefined } = {};
		for (const key in ActualNodeProcess.env) {
			if (
				Object.prototype.hasOwnProperty.call(ActualNodeProcess.env, key)
			) {
				if (
					!key.startsWith("VSCODE_") &&
					!key.startsWith("MOUNTAIN_") &&
					!key.startsWith("COCOON_")
				) {
					SanitizedEnvironment[key] = ActualNodeProcess.env[key];
				}
			}
		}
		return Object.freeze(SanitizedEnvironment);
	};
	return {
		...new ProcessShimBase(),
		get platform(): NodeJS.Platform {
			return ActualNodeProcess.platform;
		},
		get arch(): string {
			return ActualNodeProcess.arch;
		},
		get versions(): NodeJS.ProcessVersions {
			return { ...ActualNodeProcess.versions };
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
			return "Cocoon Extension Host";
		},
		get env(): { [key: string]: string | undefined } {
			return CreateSanitizedEnvironment();
		},
		get argv(): string[] {
			return [...ActualNodeProcess.argv];
		},
		get execArgv(): string[] {
			return [...ActualNodeProcess.execArgv];
		},
		cwd: () => ActualNodeProcess.cwd(),
		memoryUsage: () => ActualNodeProcess.memoryUsage(),
		hrtime: (time?: [number, number]) => ActualNodeProcess.hrtime(time),
		uptime: () => ActualNodeProcess.uptime(),
		nextTick: (callback: (...args: any[]) => void, ...args: any[]) =>
			ActualNodeProcess.nextTick(callback, ...args),
		exit: (code?: number): never => ActualNodeProcess.exit(code),
		kill: (pid: number, signal?: string | number) =>
			ActualNodeProcess.kill(pid, signal),
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
};

export class NodeModuleShim extends Effect.Service<NodeModuleShim>()(
	"Service/NodeModuleShim",
	{
		effect: Effect.gen(function* (Generator) {
			const LogService = yield* Generator(Logger);
			const InitDataService = yield* Generator(InitData);

			const OsShim = CreateOsShim(InitDataService);
			const CryptoShim = CreateCryptoShim();
			const ProcessShim = CreateProcessShim();

			const BlockedModules = new Set<string>([
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

			const ServiceImplementation = {
				Load(
					Request: string,
					ParentURI?: Uri,
				): Exit.Exit<any, ModuleBlockedError | ModuleNotShimmedError> {
					const RequesterPath = ParentURI?.fsPath || "unknown module";
					Effect.runFork(
						LogService.Trace(
							`Intercepted require('${Request}') from '${RequesterPath}'.`,
						),
					);

					if (BlockedModules.has(Request)) {
						return Exit.fail(
							new ModuleBlockedError({ ModuleName: Request }),
						);
					}
					const Shim = Shims.get(Request);
					if (Shim) {
						return Exit.succeed(Shim);
					}
					return Exit.fail(
						new ModuleNotShimmedError({ ModuleName: Request }),
					);
				},
			};

			return ServiceImplementation;
		}),
	},
) {}
