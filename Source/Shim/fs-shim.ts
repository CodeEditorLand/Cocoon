/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js 'fs' Module Shim (fs-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'fs' module, with a primary focus on implementing
 * the asynchronous `fs.promises` API. This shim is utilized when extensions or VS Code
 * platform code directly execute `require('fs')`.
 *
 * Filesystem operations are proxied to the Mountain host process via `fs_*` IPC calls.
 * This is distinct from `fs-api-shim.ts`, which implements the `vscode.workspace.fs` API
 * and typically interacts with `workspacefs_*` IPC methods (often via effects in Mountain's
 * environment layer for a more structured, URI-based filesystem access). This `fs-shim.ts`
 * targets direct Node.js `fs` module usage, which is path-based.
 *
 * Responsibilities:
 * - Mimicking the structure of the Node.js `fs` module, especially `fs.promises`.
 * - Implementing `fs.promises` methods by making asynchronous IPC calls to Mountain's
 *   `fs_*` handlers (e.g., `fs_stat`, `fs_readFile`).
 * - Handling data encoding (e.g., to base64 for `writeFile`) and decoding (e.g., from
 *   base64 for `readFile`) for IPC transport.
 * - Mapping error responses received from Mountain into Node.js-style filesystem errors
 *   (e.g., `ENOENT`, `EACCES`).
 * - Strongly discouraging the use of synchronous `fs` methods by providing stubs that
 *   throw errors, guiding users towards the asynchronous `fs.promises` API.
 * - Providing Node.js `fs.constants`.
 *
 * Key Interactions:
 * - Exported as an instance and provided by `FsModuleShimFactory` when `require('fs')`
 *   is intercepted.
 * - Uses `sendToMountainAndWait` from `cocoon-ipc.ts` for all proxied filesystem operations.
 * - Relies on corresponding `fs_*` handlers being implemented in Mountain (e.g., within
 *   `handlers/native_fs.rs`, although that was marked deprecated in some contexts; this
 *   shim assumes such handlers are active or replaced by equivalents).
 *

 *--------------------------------------------------------------------------------------------*/

// Node.js Buffer for encoding/decoding
// Explicitly import from node:buffer
import { Buffer } from "node:buffer";
// For constants and type reference
import * as nodeFs from "node:fs";
// For type information from @types/node, assuming it's a dev dependency.
import type * as NodeFsTypes from "node:fs";

import { sendToMountainAndWait } from "../cocoon-ipc";

console.log(
	"[Cocoon FS Shim] Initializing Node 'fs' module shim (for require('fs')).",
);

// --- Type Definitions ---
// These should align with @types/node fs.promises and fs module structure.

type PathLike = NodeFsTypes.PathLike;

// Directly use Node's Stats type.
type StatsShim = NodeFsTypes.Stats;

type ReadFileOptionsShim = Parameters<typeof nodeFs.promises.readFile>[1];

type WriteFileOptionsShim = Parameters<typeof nodeFs.promises.writeFile>[2];

type MkdirOptionsShim = Parameters<typeof nodeFs.promises.mkdir>[1];

type RmdirOptionsShim = Parameters<typeof nodeFs.promises.rmdir>[1];

type ReaddirOptionsShim = Parameters<typeof nodeFs.promises.readdir>[1];

// Directly use Node's Dirent type.
type DirentShim = NodeFsTypes.Dirent;

/**
 * Defines the interface for the `fs.promises` API part of the shim.
 * Methods match `typeof nodeFs.promises`.
 */
export interface FsPromisesApiShim {
	access: (path: PathLike, mode?: number) => Promise<void>;

	stat: (
		path: PathLike,

		opts?: NodeFsTypes.StatOptions,
	) => Promise<StatsShim>;

	// Added lstat
	lstat?: (
		path: PathLike,

		opts?: NodeFsTypes.StatOptions,
	) => Promise<StatsShim>;

	realpath: (
		path: PathLike,

		options?: NodeFsTypes.ObjectEncodingOptions | BufferEncoding,
	) => Promise<string>;

	readFile: (
		path: PathLike | NodeFsTypes.promises.FileHandle,

		options?: ReadFileOptionsShim,
	) => Promise<string | Buffer>;

	writeFile: (
		path: PathLike | NodeFsTypes.promises.FileHandle,

		data: string | Uint8Array,

		options?: WriteFileOptionsShim,
	) => Promise<void>;

	mkdir: (
		path: PathLike,

		options?: MkdirOptionsShim,
	) => Promise<string | undefined>;

	unlink: (path: PathLike) => Promise<void>;

	// `rm` is newer replacement for rmdir/unlink
	rm:
		| ((path: PathLike, options?: NodeFsTypes.RmOptions) => Promise<void>)
		| undefined;

	rmdir: (path: PathLike, options?: RmdirOptionsShim) => Promise<void>;

	readdir: (
		path: PathLike,

		options?: ReaddirOptionsShim,
	) => Promise<string[] | Buffer[] | DirentShim[]>;

	rename: (oldPath: PathLike, newPath: PathLike) => Promise<void>;

	copyFile?: (src: PathLike, dest: PathLike, mode?: number) => Promise<void>;

	// TODO: Add other commonly used fs.promises methods: chmod, chown, readlink, etc.
}

/**
 * Defines the overall structure of the 'fs' shim module provided to extensions.
 * Includes the `promises` API and stubs for synchronous methods.
 */
export interface FsShimStructure {
	promises: FsPromisesApiShim;

	constants: typeof nodeFs.constants;

	// Synchronous stubs - these should strongly discourage usage.
	existsSync: (path: PathLike) => boolean;

	// Or throw
	statSync: (
		path: PathLike,

		options?: NodeFsTypes.StatSyncOptions,
	) => StatsShim | undefined;

	// Or throw
	lstatSync?: (
		path: PathLike,

		options?: NodeFsTypes.StatSyncOptions,
	) => StatsShim | undefined;

	realpathSync: (
		path: PathLike,

		options?: NodeFsTypes.realpathSyncOptions | BufferEncoding,
	) => string;

	readFileSync: (
		path: PathLike | number,

		options?: ReadFileOptionsShim,
	) => string | Buffer;

	writeFileSync: (
		path: PathLike | number,

		data: string | Uint8Array,

		options?: WriteFileOptionsShim,
	) => void;

	mkdirSync: (
		path: PathLike,

		options?: MkdirOptionsShim,
	) => string | undefined;

	unlinkSync: (path: PathLike) => void;

	// Or throw
	rmSync?: (path: PathLike, options?: NodeFsTypes.RmOptions) => void;

	rmdirSync: (path: PathLike, options?: RmdirOptionsShim) => void;

	readdirSync: (
		path: PathLike,

		options?: ReaddirOptionsShim,
	) => string[] | Buffer[] | DirentShim[];

	renameSync: (oldPath: PathLike, newPath: PathLike) => void;

	// Or throw
	accessSync?: (path: PathLike, mode?: number) => void;

	// Stream and Watcher stubs - these are complex to shim and typically throw.
	createReadStream: (
		path: PathLike,

		options?: NodeFsTypes.ReadStreamOptions | string,
	) => NodeFsTypes.ReadStream;

	createWriteStream: (
		path: PathLike,

		options?: NodeFsTypes.WriteStreamOptions | string,
	) => NodeFsTypes.WriteStream;

	watch: (
		filename: PathLike,

		options?: NodeFsTypes.WatchOptions | string | null,

		listener?: (
			eventType: string,

			filename: string | Buffer | null,
		) => void,
	) => NodeFsTypes.FSWatcher;
}

/**
 * Helper function to make an asynchronous IPC request for a filesystem operation.
 * It also attempts to map common error messages/codes from the IPC response
 * to standard Node.js filesystem error codes.
 *
 * @param ipcMethod The IPC method name (e.g., "fs_stat", "fs_readFile").
 * @param ipcParams The parameters to send with the IPC request.
 * @returns A promise that resolves with the response from Mountain.
 * @throws An `Error` (potentially with a `code` property like `ENOENT`) if the operation fails.
 */
async function requestFsOpAsync(
	ipcMethod: string,

	ipcParams: any,
): Promise<any> {
	// console.debug(`[Node FS Shim -> Mtn] IPC Req: '${ipcMethod}', Params: ${JSON.stringify(ipcParams).substring(0, 100)}`);

	try {
		// 20s timeout for FS ops
		const response = await sendToMountainAndWait(
			ipcMethod,

			ipcParams,

			20000,
		);

		return response;
	} catch (e: any) {
		// Attempt to normalize the error from IPC to a NodeJS.ErrnoException
		const err = new Error(
			e.message || `IPC Error during fs operation: ${ipcMethod}`,
		) as NodeJS.ErrnoException;

		// Preserve original error name if available
		if (e.name) err.name = e.name;

		// Preserve original stack
		if (e.stack) err.stack = e.stack;

		// Map common error messages/codes from Mountain to Node.js fs error codes
		const msgLower = String(e.message).toLowerCase();

		const codeLower = String(e.code).toLowerCase();

		if (
			msgLower.includes("not found") ||
			msgLower.includes("enoent") ||
			codeLower === "enoent"
		)
			err.code = "ENOENT";
		else if (
			msgLower.includes("permission denied") ||
			msgLower.includes("eacces") ||
			codeLower === "eacces"
		)
			err.code = "EACCES";
		else if (
			msgLower.includes("already exists") ||
			msgLower.includes("eexist") ||
			codeLower === "eexist"
		)
			err.code = "EEXIST";
		else if (
			msgLower.includes("is a directory") ||
			msgLower.includes("eisdir") ||
			codeLower === "eisdir"
		)
			err.code = "EISDIR";
		else if (
			msgLower.includes("not a directory") ||
			msgLower.includes("enotdir") ||
			codeLower === "enotdir"
		)
			err.code = "ENOTDIR";
		else if (
			msgLower.includes("not empty") ||
			msgLower.includes("enotempty") ||
			codeLower === "enotempty"
		)
			err.code = "ENOTEMPTY";
		else if (
			msgLower.includes("timed out") ||
			msgLower.includes("timeout") ||
			codeLower === "etimedout"
		)
			err.code = "ETIMEDOUT";
		// Preserve original code if specific
		else if (e.code) err.code = String(e.code);
		// Generic I/O error
		else err.code = "EIO";

		// console.warn(`[Node FS Shim <- Mtn] Mapped IPC Error for '${ipcMethod}': Code='${err.code}', Message='${err.message}'`);

		throw err;
	}
}

const fsPromisesImpl: FsPromisesApiShim = {
	access: async (path: PathLike, mode?: number): Promise<void> => {
		await requestFsOpAsync("fs_access", {
			path: String(path),

			mode: mode ?? nodeFs.constants.F_OK,
		});
	},

	stat: async (
		path: PathLike,

		opts?: NodeFsTypes.StatOptions,
	): Promise<StatsShim> => {
		const result = (await requestFsOpAsync("fs_stat", {
			path: String(path),

			bigint: opts?.bigint,
		})) as any;

		if (result && typeof result === "object") {
			// Convert raw stat data from Mountain (assumed structure) to a NodeFsTypes.Stats object.
			// This requires Mountain to send fields that can be mapped to Node's Stats.
			// Example assuming Mountain sends: { dev, ino, mode, nlink, uid, gid, rdev, size, blksize, blocks, atimeMs, mtimeMs, ctimeMs, birthtimeMs, isFile, isDirectory, isSymbolicLink, ... }

			// Create a real Stats object if possible, or duck-type
			const stats = new nodeFs.Stats();

			// Assign known properties
			Object.assign(stats, {
				dev: BigInt(result.dev ?? 0),

				ino: BigInt(result.ino ?? 0),

				mode: BigInt(result.mode ?? 0),

				nlink: BigInt(result.nlink ?? 1),

				uid: BigInt(result.uid ?? 0),

				gid: BigInt(result.gid ?? 0),

				rdev: BigInt(result.rdev ?? 0),

				size: BigInt(result.size ?? 0),

				blksize: BigInt(result.blksize ?? 4096),

				blocks: BigInt(
					result.blocks ??
						Math.ceil((Number(result.size) || 0) / 4096),
				),

				atimeMs: BigInt(result.atimeMs ?? Date.now()),

				mtimeMs: BigInt(result.mtimeMs ?? Date.now()),

				ctimeMs: BigInt(result.ctimeMs ?? Date.now()),

				birthtimeMs: BigInt(result.birthtimeMs ?? Date.now()),

				atimeNs: BigInt(
					result.atimeNs ??
						(result.atimeMs ?? Date.now()) * 1_000_000,
				),

				mtimeNs: BigInt(
					result.mtimeNs ??
						(result.mtimeMs ?? Date.now()) * 1_000_000,
				),

				ctimeNs: BigInt(
					result.ctimeNs ??
						(result.ctimeMs ?? Date.now()) * 1_000_000,
				),

				birthtimeNs: BigInt(
					result.birthtimeNs ??
						(result.birthtimeMs ?? Date.now()) * 1_000_000,
				),
			});

			// Ensure date properties are set

			stats.atime = new Date(Number(stats.atimeMs));

			stats.mtime = new Date(Number(stats.mtimeMs));

			stats.ctime = new Date(Number(stats.ctimeMs));

			stats.birthtime = new Date(Number(stats.birthtimeMs));

			// Methods like isFile() are on the prototype of nodeFs.Stats.

			// If Mountain sends pre-calculated booleans for these, they can be assigned.

			// Otherwise, they are derived from `mode`.

			// if (typeof result.isFile === 'boolean') (stats as any)._isFile = result.isFile;

			// ...

			// Cast as the fully typed StatsShim
			return stats as StatsShim;
		}

		throw new Error("Invalid stat result received from host (fs_stat)");
	},

	lstat: async (
		path: PathLike,

		opts?: NodeFsTypes.StatOptions,
	): Promise<StatsShim> => {
		// Similar to stat, but Mountain's fs_lstat should handle symlinks correctly.

		const result = (await requestFsOpAsync("fs_lstat", {
			path: String(path),

			bigint: opts?.bigint,
		})) as any;

		// ... (conversion logic similar to stat) ...

		if (result && typeof result === "object") {
			const stats = new nodeFs.Stats();

			Object.assign(stats, {
				/* ... map fields ... */
			});

			return stats as StatsShim;
		}

		throw new Error("Invalid lstat result received from host (fs_lstat)");
	},

	realpath: async (
		path: PathLike,

		_options?: NodeFsTypes.ObjectEncodingOptions | BufferEncoding,
	): Promise<string> => {
		// Node's realpath options primarily affect encoding of the result, default is 'utf8'.
		// IPC typically returns string directly.
		return await requestFsOpAsync("fs_realpath", { path: String(path) });
	},

	readFile: async (
		pathHandle: PathLike | NodeFsTypes.promises.FileHandle,

		options?: ReadFileOptionsShim,
	): Promise<string | Buffer> => {
		if (
			typeof pathHandle !== "string" &&
			!Buffer.isBuffer(pathHandle) &&
			!(pathHandle instanceof URL)
		) {
			throw Object.assign(
				new Error(
					"readFile with FileHandle input not supported in this shim.",
				),

				{ code: "ERR_INVALID_ARG_TYPE" },
			);
		}

		// null for Buffer
		const encoding =
			(typeof options === "string" ? options : options?.encoding) || null;

		const flag =
			typeof options === "object" && options !== null
				? options.flag
				: undefined;

		const resultBase64 = (await requestFsOpAsync("fs_readFile", {
			path: String(pathHandle),

			options: { flag },
		})) as string;

		if (typeof resultBase64 !== "string")
			throw new Error(
				"Invalid readFile result (expected base64 string from fs_readFile)",
			);

		const buffer = Buffer.from(resultBase64, "base64");

		return encoding && encoding !== "buffer"
			? buffer.toString(encoding as BufferEncoding)
			: buffer;
	},

	writeFile: async (
		pathHandle: PathLike | NodeFsTypes.promises.FileHandle,

		data: string | Uint8Array,

		options?: WriteFileOptionsShim,
	): Promise<void> => {
		if (
			typeof pathHandle !== "string" &&
			!Buffer.isBuffer(pathHandle) &&
			!(pathHandle instanceof URL)
		) {
			throw Object.assign(
				new Error(
					"writeFile with FileHandle input not supported in this shim.",
				),

				{ code: "ERR_INVALID_ARG_TYPE" },
			);
		}

		const encodingFromFileOptions =
			(typeof options === "string" ? options : options?.encoding) ||
			"utf8";

		const dataBase64 = Buffer.from(
			data,

			typeof data === "string"
				? (encodingFromFileOptions as BufferEncoding)
				: undefined,
		).toString("base64");

		const ipcOptions: { mode?: NodeFsTypes.Mode; flag?: string } = {};

		if (typeof options === "object" && options !== null) {
			if (options.mode !== undefined) ipcOptions.mode = options.mode;

			if (options.flag !== undefined) ipcOptions.flag = options.flag;

			// TODO: AbortSignal (options.signal) is complex to proxy. Warn if present.
			if ((options as any).signal)
				console.warn(
					"[Node FS Shim] writeFile: AbortSignal option is not supported by this shim.",
				);
		}

		await requestFsOpAsync("fs_writeFile", {
			path: String(pathHandle),

			data: dataBase64,

			options: ipcOptions,
		});
	},

	mkdir: async (
		path: PathLike,

		options?: MkdirOptionsShim,
	): Promise<string | undefined> => {
		const ipcOptions: NodeFsTypes.MakeDirectoryOptions =
			typeof options === "number" ? { mode: options } : options || {};

		// Mountain's fs_mkdir should handle the recursive logic.
		const result = await requestFsOpAsync("fs_mkdir", {
			path: String(path),

			options: ipcOptions,
		});

		// Node's fs.promises.mkdir returns:

		// - path if options.recursive is true and path was created (or first path created)

		// - undefined if options.recursive is true and path already existed

		// - undefined if options.recursive is false (or not set) and path was created

		// - Throws if options.recursive is false and path already exists (EEXIST)

		// This shim relies on Mountain to return the path or specific signal.

		// If Mountain returns the path string when created recursively:

		if (ipcOptions.recursive && typeof result === "string") return result;

		// Default for non-recursive success or recursive existing path
		return undefined;
	},

	unlink: async (path: PathLike): Promise<void> => {
		await requestFsOpAsync("fs_unlink", { path: String(path) });
	},

	rm: nodeFs.promises.rm
		? async (
				path: PathLike,

				options?: NodeFsTypes.RmOptions,
			): Promise<void> => {
				// If nodeFs.promises.rm exists, assume Mountain has a corresponding fs_rm handler

				console.warn(
					"[Node FS Shim] fs.promises.rm is being used. Ensure Mountain has a corresponding 'fs_rm' handler.",
				);

				await requestFsOpAsync("fs_rm", {
					path: String(path),

					options,
				});

				// rm is undefined if not in current Node version
			}
		: undefined,

	rmdir: async (
		path: PathLike,

		options?: RmdirOptionsShim,
	): Promise<void> => {
		await requestFsOpAsync("fs_rmdir", { path: String(path), options });
	},

	readdir: async (
		path: PathLike,

		options?: ReaddirOptionsShim,
	): Promise<string[] | Buffer[] | DirentShim[]> => {
		const ipcReadOptions: {
			encoding?: BufferEncoding | "buffer";

			withFileTypes?: boolean;

			recursive?: boolean;
		} = {};

		let returnAsBuffer = false;

		let withFileTypes = false;

		if (typeof options === "string") {
			ipcReadOptions.encoding = options as BufferEncoding;

			if (options === "buffer") returnAsBuffer = true;
		} else if (options && typeof options === "object") {
			ipcReadOptions.encoding = options.encoding as
				| BufferEncoding
				| "buffer"
				| undefined;

			if (options.encoding === "buffer") returnAsBuffer = true;

			withFileTypes = !!options.withFileTypes;

			ipcReadOptions.withFileTypes = withFileTypes;

			// For newer Node versions
			ipcReadOptions.recursive = (options as any).recursive;
		}

		const result = (await requestFsOpAsync("fs_readdir", {
			path: String(path),

			options: ipcReadOptions,
		})) as any[];

		if (!Array.isArray(result))
			throw new Error("readdir IPC response was not an array.");

		if (withFileTypes) {
			return result.map(
				(item: { name: string; type: number }): DirentShim => {
					if (
						typeof item !== "object" ||
						item === null ||
						typeof item.name !== "string" ||
						typeof item.type !== "number"
					) {
						console.warn(
							"[Node FS Shim] Invalid Dirent structure from Mountain for readdir withFileTypes:",

							item,
						);

						// Create a real Dirent
						const dirent = new nodeFs.Dirent();

						(dirent as any).name = String(
							item?.name || "unknown_dirent",
						);

						// Set type to unknown or default

						return dirent;
					}

					// Create a real Dirent
					const dirent = new nodeFs.Dirent();

					// Assign name
					(dirent as any).name = item.name;

					// Assign type (Node's d_type constants)
					(dirent as any).type = item.type;

					return dirent;
				},
			);
		} else if (returnAsBuffer) {
			return result.map((name) => Buffer.from(String(name)));
		}

		// Default is string[]
		return result.map((name) => String(name));
	},

	rename: async (oldPath: PathLike, newPath: PathLike): Promise<void> => {
		await requestFsOpAsync("fs_rename", {
			oldPath: String(oldPath),

			newPath: String(newPath),
		});
	},

	copyFile: nodeFs.promises.copyFile
		? async (
				src: PathLike,

				dest: PathLike,

				mode?: number,
			): Promise<void> => {
				console.warn(
					"[Node FS Shim] fs.promises.copyFile is being used. Ensure Mountain has a corresponding 'fs_copyFile' handler.",
				);

				await requestFsOpAsync("fs_copyFile", {
					src: String(src),

					dest: String(dest),

					mode,
				});
			}
		: undefined,
};

const fsShimModuleInstance: FsShimStructure = {
	promises: fsPromisesImpl,

	constants: nodeFs.constants,

	// --- Synchronous API Stubs (Discouraged: Throw errors) ---
	existsSync: (path) => {
		const msg =
			"fs.existsSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.access or fs.promises.stat.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	statSync: (path, opts) => {
		const msg =
			"fs.statSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.stat.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	lstatSync: (path, opts) => {
		const msg =
			"fs.lstatSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.lstat.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	realpathSync: (path, opts) => {
		const msg =
			"fs.realpathSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.realpath.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	readFileSync: (path, opts) => {
		const msg =
			"fs.readFileSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.readFile.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	writeFileSync: (path, data, opts) => {
		const msg =
			"fs.writeFileSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.writeFile.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	mkdirSync: (path, opts) => {
		const msg =
			"fs.mkdirSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.mkdir.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	unlinkSync: (path) => {
		const msg =
			"fs.unlinkSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.unlink.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	rmSync: nodeFs.rmSync
		? (path, opts) => {
				const msg =
					"fs.rmSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.rm.";

				console.warn(
					`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
				);

				throw new Error(msg);
			}
		: undefined,

	rmdirSync: (path, opts) => {
		const msg =
			"fs.rmdirSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.rmdir or fs.promises.rm.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	readdirSync: (path, opts) => {
		const msg =
			"fs.readdirSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.readdir.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
		);

		throw new Error(msg);
	},

	renameSync: (oldP, newP) => {
		const msg =
			"fs.renameSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.rename.";

		console.warn(
			`[Node FS Shim] Attempted to call ${msg} for path: ${oldP}`,
		);

		throw new Error(msg);
	},

	accessSync: nodeFs.accessSync
		? (path, mode) => {
				const msg =
					"fs.accessSync is synchronous and not supported in Cocoon's proxied fs shim; use fs.promises.access.";

				console.warn(
					`[Node FS Shim] Attempted to call ${msg} for path: ${path}`,
				);

				throw new Error(msg);
			}
		: undefined,

	// Stream and Watcher stubs - these are complex to shim over IPC and typically throw.
	createReadStream: (_p, _o) => {
		throw new Error(
			"fs.createReadStream not supported in Cocoon's proxied fs shim.",
		);
	},

	createWriteStream: (_p, _o) => {
		throw new Error(
			"fs.createWriteStream not supported in Cocoon's proxied fs shim.",
		);
	},

	watch: (_f, _o, _l) => {
		throw new Error("fs.watch not supported in Cocoon's proxied fs shim.");
	},
};

export default fsShimModuleInstance;
