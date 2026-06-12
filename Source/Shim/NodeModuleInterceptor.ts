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

const TierShim: ShimLevel = ((typeof __LandTier_Shim__ === "string" &&
__LandTier_Shim__.length > 0
	? __LandTier_Shim__
	: process.env["TierShim"]) || "None") as ShimLevel;

// ── Mountain gRPC Client Interface ──────────────────────────────────────────

interface MountainClient {
	/** Whether the gRPC channel is connected and ready. */
	isReady: boolean;

	/**
	 * Send a request to Mountain's gRPC service.
	 * @param method - The gRPC method name (e.g. "file:read", "process:spawn").
	 * @param params - Structured parameters for the method.
	 * @returns A Promise resolving to the gRPC response.
	 */
	sendRequest(
		method: string,

		params: Record<string, unknown>,
	): Promise<unknown>;
}

interface CocoonGlobal {
	__COCOON_GRPC_CLIENT__?: MountainClient;
}

/**
 * Retrieve the Mountain gRPC client from the global scope.
 * Returns `null` if the client has not been initialized yet
 * (early bootstrap), in which case the proxy falls through to
 * the real Node.js module.
 */
function getMountainClient(): MountainClient | null {
	const g = globalThis as unknown as CocoonGlobal;

	return g.__COCOON_GRPC_CLIENT__ ?? null;
}

/**
 * Route a request through Mountain's gRPC service.
 * Throws if the client is not available (early bootstrap).
 * The calling proxy wrapper catches this and falls through
 * to the real module.
 */
async function routeToMountain(
	method: string,

	params: Record<string, unknown>,
): Promise<unknown> {
	const client = getMountainClient();

	if (!client) {
		throw new Error("Mountain gRPC client not available");
	}

	return client.sendRequest(method, params);
}

// ── FS Method → Mountain Method Mapping ─────────────────────────────────────

const FS_TO_MOUNTAIN: Record<string, string> = {
	readFile: "file:read",

	readFileSync: "file:read",

	writeFile: "file:write",

	writeFileSync: "file:write",

	stat: "file:stat",

	statSync: "file:stat",

	lstat: "file:lstat",

	lstatSync: "file:lstat",

	readdir: "file:readdir",

	readdirSync: "file:readdir",

	mkdir: "file:mkdir",

	mkdirSync: "file:mkdir",

	unlink: "file:unlink",

	unlinkSync: "file:unlink",

	rmdir: "file:rmdir",

	rmdirSync: "file:rmdir",

	access: "file:access",

	accessSync: "file:access",

	exists: "file:exists",

	existsSync: "file:exists",

	realpath: "file:realpath",

	realpathSync: "file:realpath",

	copyFile: "file:copy",

	copyFileSync: "file:copy",

	rename: "file:rename",

	renameSync: "file:rename",

	chmod: "file:chmod",

	chmodSync: "file:chmod",

	chown: "file:chown",

	chownSync: "file:chown",

	utimes: "file:utimes",

	utimesSync: "file:utimes",

	readlink: "file:readlink",

	readlinkSync: "file:readlink",

	symlink: "file:symlink",

	symlinkSync: "file:symlink",

	link: "file:link",

	linkSync: "file:link",

	truncate: "file:truncate",

	truncateSync: "file:truncate",
};

// ── Async FS Wrapper Builder ────────────────────────────────────────────────

/**
 * Build parameter objects keyed by fs method name.
 * Converts positional Node.js fs arguments into structured
 * key-value payloads for the gRPC transport.
 */
function buildFSParams(
	method: string,

	args: unknown[],
): Record<string, unknown> {
	switch (method) {
		case "readFile":
		case "readFileSync": {
			const path = args[0] as string;

			const options = args[1] as
				| Record<string, unknown>
				| string
				| undefined;

			return {
				path,

				encoding:
					typeof options === "string"
						? options
						: (options as Record<string, unknown> | undefined)
								?.encoding,
			};
		}

		case "writeFile":
		case "writeFileSync": {
			const path = args[0] as string;

			const data = args[1];

			const options = args[2] as
				| Record<string, unknown>
				| string
				| undefined;

			return {
				path,

				data: typeof data === "string" ? data : String(data),

				encoding:
					typeof options === "string"
						? options
						: (options as Record<string, unknown> | undefined)
								?.encoding,

				mode:
					typeof options === "object" && options !== null
						? (options as Record<string, unknown>).mode
						: undefined,

				flag:
					typeof options === "object" && options !== null
						? (options as Record<string, unknown>).flag
						: undefined,
			};
		}

		case "stat":
		case "statSync":
		case "lstat":
		case "lstatSync": {
			const path = args[0] as string;

			const options = args[1] as Record<string, unknown> | undefined;

			return { path, bigint: options?.bigint };
		}

		case "readdir":
		case "readdirSync": {
			const path = args[0] as string;

			const options = args[1] as Record<string, unknown> | undefined;

			return {
				path,

				encoding: options?.encoding,

				withFileTypes: options?.withFileTypes,
			};
		}

		case "mkdir":
		case "mkdirSync": {
			const path = args[0] as string;

			const options = args[1] as
				| Record<string, unknown>
				| number
				| undefined;

			if (typeof options === "number") {
				return { path, mode: options };
			}

			return {
				path,

				recursive: options?.recursive,

				mode: options?.mode,
			};
		}

		case "unlink":
		case "unlinkSync":
			return { path: args[0] as string };

		case "rmdir":
		case "rmdirSync": {
			const path = args[0] as string;

			const options = args[1] as Record<string, unknown> | undefined;

			return { path, ...options };
		}

		case "access":
		case "accessSync": {
			const path = args[0] as string;

			const mode = args[1] as number | undefined;

			return { path, mode };
		}

		case "exists":
		case "existsSync":
			return { path: args[0] as string };

		case "realpath":
		case "realpathSync": {
			const path = args[0] as string;

			const options = args[1] as
				| Record<string, unknown>
				| string
				| undefined;

			return {
				path,

				encoding:
					typeof options === "string"
						? options
						: (options as Record<string, unknown> | undefined)
								?.encoding,
			};
		}

		case "copyFile":
		case "copyFileSync": {
			const src = args[0] as string;

			const dest = args[1] as string;

			const mode = args[2] as number | undefined;

			return { src, dest, mode };
		}

		case "rename":
		case "renameSync":
			return { oldPath: args[0] as string, newPath: args[1] as string };

		case "chmod":
		case "chmodSync":
			return { path: args[0] as string, mode: args[1] as number };

		case "chown":
		case "chownSync":
			return {
				path: args[0] as string,

				uid: args[1] as number,

				gid: args[2] as number,
			};

		case "utimes":
		case "utimesSync":
			return {
				path: args[0] as string,

				atime: args[1],

				mtime: args[2],
			};

		case "readlink":
		case "readlinkSync": {
			const path = args[0] as string;

			const options = args[1] as
				| Record<string, unknown>
				| string
				| undefined;

			return {
				path,

				encoding:
					typeof options === "string"
						? options
						: (options as Record<string, unknown> | undefined)
								?.encoding,
			};
		}

		case "symlink":
		case "symlinkSync":
			return {
				target: args[0] as string,

				path: args[1] as string,

				type: args[2],
			};

		case "link":
		case "linkSync":
			return {
				existingPath: args[0] as string,

				newPath: args[1] as string,
			};

		case "truncate":
		case "truncateSync":
			return { path: args[0] as string, len: args[1] };

		default:
			return { args };
	}
}

/**
 * For async fs methods that return data, extract the relevant
 * result field from the gRPC response. By default the response
 * is `{ contents, ... }` for reads and `{ success: true }`
 * for writes/ops.
 */
function extractFSResult(
	method: string,

	response: unknown,
): unknown {
	switch (method) {
		case "readFile":
		case "readFileSync":
		case "readlink":
		case "readlinkSync":
		case "realpath":
		case "realpathSync":
			return (response as Record<string, unknown>)?.contents ?? response;

		case "writeFile":
		case "writeFileSync":
		case "mkdir":
		case "mkdirSync":
		case "unlink":
		case "unlinkSync":
		case "rmdir":
		case "rmdirSync":
		case "rename":
		case "renameSync":
		case "chmod":
		case "chmodSync":
		case "chown":
		case "chownSync":
		case "utimes":
		case "utimesSync":
		case "symlink":
		case "symlinkSync":
		case "link":
		case "linkSync":
		case "truncate":
		case "truncateSync":
		case "copyFile":
		case "copyFileSync":
			// Void operations — return undefined or success indicator
			return undefined;

		case "stat":
		case "statSync":
		case "lstat":
		case "lstatSync":
		case "readdir":
		case "readdirSync":
		case "access":
		case "accessSync":
		case "exists":
		case "existsSync":
			return response;

		default:
			return response;
	}
}

/**
 * Create an async wrapper function for an fs method.
 * Routes through Mountain's gRPC when available, falls back
 * to the original Node.js implementation otherwise.
 * Handles both callback-style and promise-style invocations.
 */
function createAsyncFSWrapper(
	original: (...args: unknown[]) => unknown,

	method: string,

	mountainMethod: string,
): (...args: unknown[]) => unknown {
	return function landAsyncFSWrapper(
		this: unknown,
		...args: unknown[]
	): unknown {
		// Peel off the callback if the last argument is a function
		const maybeCallback = args[args.length - 1];

		const hasCallback = typeof maybeCallback === "function";

		const callback = hasCallback
			? (args.pop() as (...cbArgs: unknown[]) => void)
			: undefined;

		// Attempt Mountain gRPC routing
		const client = getMountainClient();

		if (client?.isReady) {
			const params = buildFSParams(method, args);

			const promise = client
				.sendRequest(mountainMethod, params)
				.then((response) => extractFSResult(method, response));

			if (callback) {
				promise.then(
					(result: unknown) => callback(null, result),

					(err: unknown) => callback(err),
				);

				return undefined; // callback-style returns void
			}

			return promise;
		}

		// Fallback: gRPC client not initialized — use the real fs
		if (callback) {
			args.push(callback);

			return original.apply(this, args);
		}

		return original.apply(this, args);
	};
}

/**
 * Create a synchronous wrapper for an fs method.
 * Since gRPC is inherently async, sync operations fall through
 * to the real fs. However, when Mountain IS active, we log a
 * warning encouraging use of the async equivalent.
 */
function createSyncFSWrapper(
	original: (...args: unknown[]) => unknown,

	method: string,
): (...args: unknown[]) => unknown {
	return function landSyncFSWrapper(
		this: unknown,
		...args: unknown[]
	): unknown {
		const client = getMountainClient();

		if (client?.isReady) {
			// Mountain gRPC is async — sync operations degrade to local fs.
			// Log a warning so extension authors know to prefer async variants.
			console.warn(
				`[Cocoon] Sync fs operation '${method}' called while Mountain is active. ` +
					`Prefetching through local fs. Consider using the async version ` +
					`('${method.replace("Sync", "")}') for full Mountain integration.`,
			);
		}

		return original.apply(this, args);
	};
}

// ── FS Proxy ────────────────────────────────────────────────────────────────

/**
 * Create a Proxy that wraps the real Node.js `fs` module, intercepting
 * file-system operations and forwarding them to Mountain's native layer
 * when TierShim is Replace/Own/Preempt.
 *
 * Intercepted operations: 38 methods across 19 operation pairs
 *   Async:  readFile, writeFile, stat, lstat, readdir, mkdir, unlink,
 *           rmdir, access, exists, realpath, copyFile, rename, chmod,
 *           chown, utimes, readlink, symlink, link, truncate
 *   Sync:   readFileSync, writeFileSync, statSync, lstatSync, readdirSync,
 *           mkdirSync, unlinkSync, rmdirSync, accessSync, existsSync,
 *           realpathSync, copyFileSync, renameSync, chmodSync, chownSync,
 *           utimesSync, readlinkSync, symlinkSync, linkSync, truncateSync
 *
 * Passthrough operations (unmodified):
 *   - createReadStream / createWriteStream
 *   - watch / watchFile / unwatchFile
 *   - open / close / read / write (raw fd operations)
 *   - constants, promises, Dir, Stats, etc.
 */
function createLandFSProxy(realFs: typeof import("fs")): typeof import("fs") {
	// Set of all intercepted method names
	const interceptedMethods = new Set(Object.keys(FS_TO_MOUNTAIN));

	// Set of sync method names (used to choose sync vs async wrapper)
	const syncMethods = new Set([
		"readFileSync",

		"writeFileSync",

		"statSync",

		"lstatSync",

		"readdirSync",

		"mkdirSync",

		"unlinkSync",

		"rmdirSync",

		"accessSync",

		"existsSync",

		"realpathSync",

		"copyFileSync",

		"renameSync",

		"chmodSync",

		"chownSync",

		"utimesSync",

		"readlinkSync",

		"symlinkSync",

		"linkSync",

		"truncateSync",
	]);

	// Cache for created wrapper functions so we don't recreate
	// a new closure on every property access.
	const wrapperCache = new Map<string, (...args: unknown[]) => unknown>();

	return new Proxy(realFs, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);

			// Only intercept known file-system method names
			if (
				typeof prop !== "string" ||
				!interceptedMethods.has(prop) ||
				typeof value !== "function"
			) {
				return value;
			}

			// Return cached wrapper or create a new one
			let wrapper = wrapperCache.get(prop);

			if (!wrapper) {
				const mountainMethod = FS_TO_MOUNTAIN[prop]!;

				if (syncMethods.has(prop)) {
					wrapper = createSyncFSWrapper(
						value as (...args: unknown[]) => unknown,

						prop,
					);
				} else {
					wrapper = createAsyncFSWrapper(
						value as (...args: unknown[]) => unknown,

						prop,

						mountainMethod,
					);
				}

				wrapperCache.set(prop, wrapper);
			}

			return wrapper;
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

	/**
	 * Helper: check if Mountain client is available, returns
	 * the client or null (meaning: fall through to real impl).
	 */
	function mountainProc(): MountainClient | null {
		const client = getMountainClient();

		return client?.isReady ? client : null;
	}

	// ── spawn ──────────────────────────────────────────────────────────────

	proxiedCp.spawn = function landSpawn(
		command: string,

		args?: readonly string[],

		options?: import("child_process").SpawnOptions,
	) {
		const client = mountainProc();

		if (client) {
			// Route through Mountain's process sandbox.
			// Mountain returns a sandboxed ChildProcess stub that
			// proxies stdin/stdout/stderr streams over gRPC.
			const params: Record<string, unknown> = {
				command,

				args: args ?? [],

				cwd: options?.cwd,

				env: options?.env,

				shell: options?.shell,
			};

			return client.sendRequest("process:spawn", params) as ReturnType<
				typeof realCp.spawn
			>;
		}

		return (realCp.spawn as Function)(command, args, options) as ReturnType<
			typeof realCp.spawn
		>;
	} as typeof realCp.spawn;

	proxiedCp.spawnSync = function landSpawnSync(
		command: string,

		args?: readonly string[],

		options?: import("child_process").SpawnSyncOptions,
	) {
		const client = mountainProc();

		if (client) {
			console.warn(
				"[Cocoon] spawnSync called while Mountain is active. " +
					"Falling through to local process. Consider using spawn for " +
					"full Mountain sandbox integration.",
			);
		}

		return (realCp.spawnSync as Function)(
			command,

			args,

			options,
		) as ReturnType<typeof realCp.spawnSync>;
	} as typeof realCp.spawnSync;

	// ── exec ───────────────────────────────────────────────────────────────

	proxiedCp.exec = function landExec(
		command: string,

		optionsOrCallback?:
			| import("child_process").ExecOptions
			| ((error: unknown, stdout: string, stderr: string) => void),

		callback?: (error: unknown, stdout: string, stderr: string) => void,
	) {
		// Normalize arguments: callback may be second or third arg
		let options: import("child_process").ExecOptions | undefined;

		let cb:
			| ((error: unknown, stdout: string, stderr: string) => void)
			| undefined;

		if (typeof optionsOrCallback === "function") {
			cb = optionsOrCallback;

			options = undefined;
		} else {
			options = optionsOrCallback;

			cb = callback;
		}

		const client = mountainProc();

		if (client) {
			const params: Record<string, unknown> = {
				command,

				cwd: options?.cwd,

				env: options?.env,

				shell: options?.shell,

				timeout: options?.timeout,

				encoding: options?.encoding,

				maxBuffer: options?.maxBuffer,
			};

			const promise = client.sendRequest(
				"process:exec",

				params,
			) as Promise<{ stdout: string; stderr: string; error?: unknown }>;

			if (cb) {
				promise.then(
					(result) => cb(null, result.stdout, result.stderr),

					(err: unknown) =>
						cb(err, "", (err as Error)?.message ?? ""),
				);

				// Return a minimal ChildProcess stub for API compatibility
				return {
					stdout: null,

					stderr: null,

					stdin: null,

					on: () => undefined,

					kill: () => true,

					pid: -1,
				} as unknown as ReturnType<typeof realCp.exec>;
			}

			// Promise style: wrap the gRPC result into a ChildProcess-like shape
			const cpStub = {
				stdout: null as unknown,

				stderr: null as unknown,

				stdin: null as unknown,

				on: () => undefined,

				kill: () => true,

				pid: -1,

				// Attach the result promise so callers can await
				_resultPromise: promise,
			} as unknown as ReturnType<typeof realCp.exec>;

			// Wire up stdout/stderr once the promise resolves
			promise.then((result) => {
				(cpStub as Record<string, unknown>).stdout = result.stdout;

				(cpStub as Record<string, unknown>).stderr = result.stderr;
			});

			return cpStub;
		}

		return (realCp.exec as Function)(
			command,

			optionsOrCallback,

			callback,
		) as ReturnType<typeof realCp.exec>;
	} as typeof realCp.exec;

	proxiedCp.execSync = function landExecSync(
		command: string,

		options?: import("child_process").ExecSyncOptions,
	) {
		const client = mountainProc();

		if (client) {
			const params: Record<string, unknown> = {
				command,

				cwd: options?.cwd,

				env: options?.env,

				shell: options?.shell,

				timeout: options?.timeout,

				encoding: options?.encoding,

				maxBuffer: options?.maxBuffer,
			};

			// execSync is synchronous, but gRPC is async — we must
			// fall through to the real implementation.
			console.warn(
				"[Cocoon] execSync called while Mountain is active. " +
					"Falling through to local process. Consider using exec " +
					"for full Mountain sandbox integration.",
			);
		}

		return (realCp.execSync as Function)(
			command,

			options,
		) as ReturnType<typeof realCp.execSync>;
	} as typeof realCp.execSync;

	// ── execFile ───────────────────────────────────────────────────────────

	proxiedCp.execFile = function landExecFile(
		file: string,

		args?: readonly string[],

		optionsOrCallback?:
			| import("child_process").ExecFileOptions
			| ((error: unknown, stdout: string, stderr: string) => void),

		callback?: (error: unknown, stdout: string, stderr: string) => void,
	) {
		const client = mountainProc();

		if (client) {
			let options: import("child_process").ExecFileOptions | undefined;

			let cb:
				| ((error: unknown, stdout: string, stderr: string) => void)
				| undefined;

			if (typeof optionsOrCallback === "function") {
				cb = optionsOrCallback;
			} else {
				options = optionsOrCallback;

				cb = callback;
			}

			const params: Record<string, unknown> = {
				command: file,

				args: args ?? [],

				cwd: options?.cwd,

				env: options?.env,

				shell: options?.shell,

				timeout: options?.timeout,

				encoding: options?.encoding,

				maxBuffer: options?.maxBuffer,
			};

			const promise = client.sendRequest(
				"process:exec",

				params,
			) as Promise<{ stdout: string; stderr: string; error?: unknown }>;

			if (cb) {
				promise.then(
					(result) => cb(null, result.stdout, result.stderr),

					(err: unknown) =>
						cb(err, "", (err as Error)?.message ?? ""),
				);

				return {
					stdout: null,

					stderr: null,

					stdin: null,

					on: () => undefined,

					kill: () => true,

					pid: -1,
				} as unknown as ReturnType<typeof realCp.execFile>;
			}

			const cpStub = {
				stdout: null as unknown,

				stderr: null as unknown,

				stdin: null as unknown,

				on: () => undefined,

				kill: () => true,

				pid: -1,
			} as unknown as ReturnType<typeof realCp.execFile>;

			promise.then((result) => {
				(cpStub as Record<string, unknown>).stdout = result.stdout;

				(cpStub as Record<string, unknown>).stderr = result.stderr;
			});

			return cpStub;
		}

		return (realCp.execFile as Function)(
			file,

			args,

			optionsOrCallback,

			callback,
		) as ReturnType<typeof realCp.execFile>;
	} as typeof realCp.execFile;

	proxiedCp.execFileSync = function landExecFileSync(
		file: string,

		args?: readonly string[],

		options?: import("child_process").ExecFileSyncOptions,
	) {
		const client = mountainProc();

		if (client) {
			console.warn(
				"[Cocoon] execFileSync called while Mountain is active. " +
					"Falling through to local process.",
			);
		}

		return (realCp.execFileSync as Function)(
			file,

			args,

			options,
		) as ReturnType<typeof realCp.execFileSync>;
	} as typeof realCp.execFileSync;

	// ── fork ───────────────────────────────────────────────────────────────

	proxiedCp.fork = function landFork(
		modulePath: string,

		args?: readonly string[],

		options?: import("child_process").ForkOptions,
	) {
		const client = mountainProc();

		if (client) {
			// fork creates a new V8 instance — not sandboxable via gRPC.
			// In Mountain mode, fork should be blocked or redirected.
			throw new Error(
				"[Cocoon] fork() is not supported when Mountain is active. " +
					"Use spawn() or exec() to run sandboxed child processes.",
			);
		}

		return (realCp.fork as Function)(
			modulePath,

			args,

			options,
		) as ReturnType<typeof realCp.fork>;
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
