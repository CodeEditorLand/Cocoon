// @ts-nocheck
/**
 * @module Cocoon/Shim/NodeModuleInterceptor
 * @description
 * Intercepts Node.js `Module._load` in Cocoon's runtime to redirect
 * `fs` and `child_process` modules through Mountain's native layer.
 *
 * Gated behind the TierShim environment variable. When TierShim is
 * "None" (the default), this interceptor is a no-op — esbuild
 * tree-shakes the entire module at build time.
 *
 * Activation levels:
 *   None     — No interception (passthrough)
 *   Proxy    — Audit-only (no redirect, but hooks are installed for observation)
 *   Replace  — Redirect fs/child_process to Mountain
 *   Own      — Full Land ownership of fs/child_process
 *   Preempt  — Land preempts all module loads
 *
 * Architecture:
 *   - `fs` → createLandFSProxy: wraps real fs with a Proxy that
 *     forwards read/write/stat to Mountain's native FS layer.
 *   - `child_process` → createLandSpawnProxy: wraps spawn/exec/fork
 *     to route through Mountain's process sandbox.
 */

import type { ShimLevel } from "../../Wind/Source/Shim/Type.js";

/**
 * Resolve the current TierShim level at runtime.
 * In production builds, esbuild substitutes `__LandTier_Shim__`
 * via the define map. In dev, falls back to process.env.
 */
declare const __LandTier_Shim__: string;

const TierShim: ShimLevel = (
	(typeof __LandTier_Shim__ === "string" && __LandTier_Shim__.length > 0
		? __LandTier_Shim__
		: process.env["TierShim"]) || "None"
) as ShimLevel;

// ── FS Proxy ────────────────────────────────────────────────────────────────

/**
 * Create a Proxy that wraps the real Node.js `fs` module, intercepting
 * file-system operations and forwarding them to Mountain's native layer
 * when TierShim is Replace/Own/Preempt.
 *
 * Intercepted operations:
 *   - readFile / readFileSync
 *   - writeFile / writeFileSync
 *   - stat / statSync / lstat / lstatSync
 *   - readdir / readdirSync
 *   - mkdir / mkdirSync
 *   - unlink / unlinkSync
 *   - rmdir / rmdirSync
 *   - access / accessSync
 *   - exists / existsSync
 *   - realpath / realpathSync
 *
 * Passthrough operations (unmodified):
 *   - createReadStream / createWriteStream
 *   - watch / watchFile / unwatchFile
 *   - open / close / read / write (raw fd operations)
 *   - constants, promises, etc.
 */
function createLandFSProxy(realFs: typeof import("fs")): typeof import("fs") {
	// Stub: full Mountain integration requires gRPC channel initialization.
	// This proxy records intercepted calls and forwards them to the real FS
	// as a baseline. The Mountain path is activated once the gRPC channel
	// is available during bootstrap.
	const interceptedMethods = new Set([
		"readFile",
		"readFileSync",
		"writeFile",
		"writeFileSync",
		"stat",
		"statSync",
		"lstat",
		"lstatSync",
		"readdir",
		"readdirSync",
		"mkdir",
		"mkdirSync",
		"unlink",
		"unlinkSync",
		"rmdir",
		"rmdirSync",
		"access",
		"accessSync",
		"exists",
		"existsSync",
		"realpath",
		"realpathSync",
		"copyFile",
		"copyFileSync",
		"rename",
		"renameSync",
		"chmod",
		"chmodSync",
		"chown",
		"chownSync",
		"utimes",
		"utimesSync",
		"readlink",
		"readlinkSync",
		"symlink",
		"symlinkSync",
		"link",
		"linkSync",
		"truncate",
		"truncateSync",
	]);

	return new Proxy(realFs, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);

			// Only intercept known file-system methods
			if (
				typeof prop !== "string" ||
				!interceptedMethods.has(prop) ||
				typeof value !== "function"
			) {
				return value;
			}

			// Return a wrapped function that can route through Mountain
			return function landFSWrapper(this: unknown, ...args: unknown[]) {
				// TODO: Route through Mountain's gRPC FS service once
				// bootstrap has initialized the gRPC channel. For now,
				// pass through to the real FS implementation.
				//
				// Future path:
				//   const mountainFS = getMountainFSClient();
				//   if (mountainFS?.isReady) {
				//     return mountainFS[prop](...args);
				//   }
				return value.apply(this, args);
			};
		},
	}) as typeof import("fs");
}

// ── Spawn Proxy ─────────────────────────────────────────────────────────────

/**
 * Create a proxy wrapper around the `child_process` module, intercepting
 * process-spawn operations and routing them through Mountain's sandbox
 * when TierShim is Replace/Own/Preempt.
 *
 * Intercepted methods:
 *   - spawn / spawnSync
 *   - exec / execSync / execFile / execFileSync
 *   - fork
 *
 * Behavior per TierShim level:
 *   Replace — spawn/exec go through Mountain; fork is blocked
 *   Own      — All process creation goes through Mountain
 *   Preempt  — Same as Own, with additional restrictions
 */
function createLandSpawnProxy(
	realCp: typeof import("child_process"),
): typeof import("child_process") {
	const proxiedCp = Object.create(realCp) as typeof import("child_process");

	// Override spawn
	proxiedCp.spawn = function landSpawn(
		command: string,
		args?: readonly string[],
		options?: import("child_process").SpawnOptions,
	) {
		// TODO: Route through Mountain's process sandbox once available.
		// Future path:
		//   const mountainProc = getMountainProcessClient();
		//   if (mountainProc?.isReady) {
		//     return mountainProc.spawn(command, args, options);
		//   }
		return (realCp.spawn as Function)(command, args, options);
	} as typeof realCp.spawn;

	proxiedCp.spawnSync = function landSpawnSync(
		command: string,
		args?: readonly string[],
		options?: import("child_process").SpawnSyncOptions,
	) {
		return (realCp.spawnSync as Function)(command, args, options);
	} as typeof realCp.spawnSync;

	proxiedCp.exec = function landExec(
		command: string,
		optionsOrCallback?:
			| import("child_process").ExecOptions
			| ((error: unknown, stdout: string, stderr: string) => void),
		callback?: (error: unknown, stdout: string, stderr: string) => void,
	) {
		return (realCp.exec as Function)(command, optionsOrCallback, callback);
	} as typeof realCp.exec;

	proxiedCp.execSync = function landExecSync(
		command: string,
		options?: import("child_process").ExecSyncOptions,
	) {
		return (realCp.execSync as Function)(command, options);
	} as typeof realCp.execSync;

	proxiedCp.execFile = function landExecFile(
		file: string,
		args?: readonly string[],
		optionsOrCallback?:
			| import("child_process").ExecFileOptions
			| ((error: unknown, stdout: string, stderr: string) => void),
		callback?: (error: unknown, stdout: string, stderr: string) => void,
	) {
		return (realCp.execFile as Function)(
			file,
			args,
			optionsOrCallback,
			callback,
		);
	} as typeof realCp.execFile;

	proxiedCp.execFileSync = function landExecFileSync(
		file: string,
		args?: readonly string[],
		options?: import("child_process").ExecFileSyncOptions,
	) {
		return (realCp.execFileSync as Function)(file, args, options);
	} as typeof realCp.execFileSync;

	proxiedCp.fork = function landFork(
		modulePath: string,
		args?: readonly string[],
		options?: import("child_process").ForkOptions,
	) {
		// TODO: Block or redirect fork based on TierShim level
		return (realCp.fork as Function)(modulePath, args, options);
	} as typeof realCp.fork;

	return proxiedCp;
}

// ── Main Installation ───────────────────────────────────────────────────────

/**
 * Install the Node.js Module._load interceptor.
 *
 * Patches `Module._load` so that `require("fs")` and
 * `require("child_process")` return Land proxies instead of the
 * raw Node.js built-ins. The proxies forward operations to Mountain's
 * native layer when TierShim is active.
 *
 * Must be called BEFORE any extension code loads `fs` or
 * `child_process`. Install at the top of Cocoon's bootstrap Main.ts.
 *
 * @returns void
 */
export default function installNodeModuleInterceptor(): void {
	// Fast path: shim disabled
	if (TierShim === "None") {
		return;
	}

	// Module._load interception
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const Module = require("module") as {
		_load: (request: string, parent: unknown, isMain: boolean) => unknown;
	};

	const originalLoad = Module._load;

	Module._load = function landModuleLoad(
		request: string,
		parent: unknown,
		isMain: boolean,
	): unknown {
		// Redirect fs module to Land's proxy
		if (request === "fs" || request === "node:fs") {
			const realFs = originalLoad.call(
				this,
				request,
				parent,
				isMain,
			) as typeof import("fs");
			return createLandFSProxy(realFs);
		}

		// Redirect child_process to Land's proxy
		if (request === "child_process" || request === "node:child_process") {
			const realCp = originalLoad.call(
				this,
				request,
				parent,
				isMain,
			) as typeof import("child_process");
			return createLandSpawnProxy(realCp);
		}

		// Passthrough: all other modules load normally
		return originalLoad.call(this, request, parent, isMain);
	};
}
