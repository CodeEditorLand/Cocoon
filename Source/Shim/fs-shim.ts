/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js 'fs' Module Shim (fs-shim.ts) - For `require('fs')`
 * --------------------------------------------------------------------------------------------
 * ##########################################################################################
 * # CRITICAL WARNING: DEPENDENCY ON DEPRECATED MOUNTAIN BACKEND                            #
 * ##########################################################################################
 * This shim is designed to provide a proxied implementation for Node.js's built-in
 * 'fs' module, primarily by making IPC calls (e.g., "fs_stat", "fs_readFile") to
 * corresponding handlers expected on the Mountain host process (originally in
 * `handlers/native_fs.rs`).
 *
 * HOWEVER, THE INTENDED MOUNTAIN BACKEND (`handlers/native_fs.rs`) FOR THESE `fs_*`
 * IPC CALLS IS CURRENTLY MARKED AS **DEPRECATED AND NON-FUNCTIONAL**. Its stubbed
 * functions return errors, indicating that extensions should use the
 * `vscode.workspace.fs` API instead (which is handled by `fs-api-shim.ts` on Cocoon's
 * side and Mountain's `handlers/workspace_fs_api.rs`).
 *
 * CONSEQUENTLY, THIS `fs-shim.ts` WILL **NOT FUNCTION CORRECTLY** WITH THE CURRENT
 * MOUNTAIN ARCHITECTURE. Calls made through it are expected to fail because their
 * backend handlers in Mountain are deprecated.
 *
 * A STRATEGIC DECISION IS REQUIRED:
 * 1. **RECOMMENDED: Remove this `fs-shim.ts` and `FsModuleShimFactory.ts`**.
 *    Modify `NodeModuleShimFactory.ts` to make `require('fs')` throw an error that
 *    clearly directs extensions to use `vscode.workspace.fs`. This aligns with modern
 *    VS Code practices (which discourage direct `require('fs')` by extensions) and
 *    enhances security and abstraction by routing FS operations through the
 *    `vscode.workspace.fs` API.
 * 2. **ALTERNATIVE: Revive and Fully Implement `fs_*` Handlers in Mountain.**
 *    This would involve removing the deprecation from `handlers/native_fs.rs` (or
 *    creating a new, fully functional equivalent) and implementing all backend logic
 *    with robust security measures (path canonicalization, workspace confinement checks)
 *    and correct DTOs for all `fs` operations. This is a significant undertaking and
 *    generally less preferable than guiding extensions to the structured `vscode.workspace.fs` API.
 *
 * This file is documented below based on its original intended functionality, * assuming its backend IPC handlers were operational, but with added warnings
 * reflecting the current deprecated state of its backend.
 *
 * Original Intended Responsibilities (if backend were functional):
 * - Mimicking the `fs.promises` API by making asynchronous IPC calls to Mountain.
 * - Handling data encoding (e.g., to base64 for `writeFile`) and decoding (e.g., from
 *   base64 for `readFile`) for IPC transport.
 * - Mapping error responses received from Mountain into Node.js-style filesystem errors
 *   (e.g., `ENOENT`, `EACCES`).
 * - Strongly discouraging the use of synchronous `fs` methods by providing stubs that
 *   throw errors.
 * - Providing Node.js `fs.constants`.
 *
 *--------------------------------------------------------------------------------------------*/

// Explicit import for Buffer operations
import { Buffer } from "node:buffer";
// For fs.constants and creating new nodeFs.Stats/Dirent instances
import * as nodeFs from "node:fs";
// For comprehensive type information from @types/node
import type * as NodeFsTypes from "node:fs";

import { sendToMountainAndWait } from "../cocoon-ipc";

console.warn(
	"[Cocoon FS Shim] Initializing Node 'fs' module shim (for `require('fs')`). " +
		"WARNING: Its corresponding backend handlers in Mountain (previously `handlers/native_fs.rs`) are DEPRECATED and likely NON-FUNCTIONAL. " +
		"This shim will therefore NOT work as expected. Extensions should use `vscode.workspace.fs` for filesystem operations.",
);

// --- Type Definitions ---
type PathLike = NodeFsTypes.PathLike;

// Using Node's own Stats type
type StatsShim = NodeFsTypes.Stats;

type ReadFileOptionsShim = Parameters<typeof nodeFs.promises.readFile>[1];

type WriteFileOptionsShim = Parameters<typeof nodeFs.promises.writeFile>[2];

type MkdirOptionsShim = Parameters<typeof nodeFs.promises.mkdir>[1];

type RmdirOptionsShim = Parameters<typeof nodeFs.promises.rmdir>[1];

type ReaddirOptionsShim = Parameters<typeof nodeFs.promises.readdir>[1];

// Using Node's own Dirent type
type DirentShim = NodeFsTypes.Dirent;

/** Defines the interface for the `fs.promises` API part of the shim. */
export interface FsPromisesApiShim {
	access: (path: PathLike, mode?: number) => Promise<void>;

	stat: (
		path: PathLike,

		opts?: NodeFsTypes.StatOptions,
	) => Promise<StatsShim>;

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

	// `rm` is newer, may not be in all Node versions
	rm?: (path: PathLike, options?: NodeFsTypes.RmOptions) => Promise<void>;

	rmdir: (path: PathLike, options?: RmdirOptionsShim) => Promise<void>;

	readdir: (
		path: PathLike,

		options?: ReaddirOptionsShim,
	) => Promise<string[] | Buffer[] | DirentShim[]>;

	rename: (oldPath: PathLike, newPath: PathLike) => Promise<void>;

	// `copyFile` may not be in all Node versions
	copyFile?: (src: PathLike, dest: PathLike, mode?: number) => Promise<void>;

	// TODO: Add other fs.promises methods as needed, BUT ONLY IF the Mountain backend is revived and supports them.
}

/** Defines the overall structure of the 'fs' shim module provided when `require('fs')` is called. */
export interface FsShimStructure {
	promises: FsPromisesApiShim;

	constants: typeof nodeFs.constants;

	// Synchronous API stubs - these strongly discourage usage and will throw errors.
	existsSync: (path: PathLike) => boolean;

	statSync: (
		path: PathLike,

		options?: NodeFsTypes.StatSyncOptions,
	) => StatsShim | undefined;

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

	rmSync?: (path: PathLike, options?: NodeFsTypes.RmOptions) => void;

	rmdirSync: (path: PathLike, options?: RmdirOptionsShim) => void;

	readdirSync: (
		path: PathLike,

		options?: ReaddirOptionsShim,
	) => string[] | Buffer[] | DirentShim[];

	renameSync: (oldPath: PathLike, newPath: PathLike) => void;

	accessSync?: (path: PathLike, mode?: number) => void;

	// Stream and Watcher stubs - these are complex to shim and will throw.
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
 * Internal helper to make an asynchronous IPC request for a filesystem operation to Mountain.
 * It also attempts to map common error messages/codes from the IPC response
 * to standard Node.js filesystem error codes.
 *
 * WARNING: This function will likely encounter errors if Mountain's `native_fs.rs`
 *          handlers (e.g., `fs_stat`, `fs_readFile`) are deprecated or non-functional.
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

	console.warn(
		`[Node FS Shim] Attempting IPC call to Mountain for '${ipcMethod}'. This relies on backend handlers in 'native_fs.rs' which are DEPRECATED and likely to fail.`,
	);

	try {
		// Use a reasonable timeout for FS operations, e.g., 20 seconds.
		return await sendToMountainAndWait(ipcMethod, ipcParams, 20000);
	} catch (e: any) {
		// Attempt to normalize the error from IPC to a NodeJS.ErrnoException
		const err = new Error(
			e.message ||
				`IPC Error during fs operation: ${ipcMethod}. Backend handler in Mountain for this ('${ipcMethod}' in native_fs.rs) is likely deprecated and non-functional.`,
		) as NodeJS.ErrnoException;

		// Preserve original error name if available
		if (e.name) err.name = e.name;

		// Preserve original stack
		if (e.stack) err.stack = e.stack;

		// Map common error messages/codes from Mountain to Node.js fs error codes
		const msgLower = String(e.message).toLowerCase();

		// Check e.code if Mountain sends it
		const codeLower = String(e.code).toLowerCase();

		if (
			msgLower.includes("not found") ||
			msgLower.includes("no such file") ||
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
		else if (e.code)
			// Preserve original code if specific and not mapped
			err.code = String(e.code);
		// Generic I/O error if no other code fits
		else err.code = "EIO";

		console.error(
			`[Node FS Shim <- Mtn] Mapped IPC Error for '${ipcMethod}': Code='${err.code}', Message='${err.message}'`,
		);

		throw err;
	}
}

const fsPromisesImpl: FsPromisesApiShim = {
	access: async (path: PathLike, mode?: number): Promise<void> => {
		console.warn(
			`[Node FS Shim] promises.access: Calling DEPRECATED Mountain backend for path '${String(path)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		await requestFsOpAsync("fs_access", {
			path: String(path),

			mode: mode ?? nodeFs.constants.F_OK,
		});
	},

	stat: async (
		path: PathLike,

		opts?: NodeFsTypes.StatOptions,
	): Promise<StatsShim> => {
		console.warn(
			`[Node FS Shim] promises.stat: Calling DEPRECATED Mountain backend for path '${String(path)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		const result = (await requestFsOpAsync("fs_stat", {
			path: String(path),

			bigint: opts?.bigint,
		})) as any;

		if (result && typeof result === "object") {
			// Mountain must return all fields necessary to reconstruct a Stats object.
			// This includes dev, ino, mode, nlink, uid, gid, rdev, size, blksize, blocks,

			// and timestamp properties (atimeMs, mtimeMs, ctimeMs, birthtimeMs).
			// The isFile(), isDirectory() etc. methods are derived from `mode` on the Stats object.
			// Create a new Stats object
			const stats = new nodeFs.Stats();

			// Assign properties from the result DTO. Ensure BigInt for numeric stat fields if bigint option is used.
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

					// Calculate blocks if not provided
				),

				atimeMs: BigInt(result.atimeMs ?? Date.now()),

				mtimeMs: BigInt(result.mtimeMs ?? Date.now()),

				ctimeMs: BigInt(result.ctimeMs ?? Date.now()),

				birthtimeMs: BigInt(result.birthtimeMs ?? Date.now()),

				atimeNs: BigInt(
					result.atimeNs ??
						(result.atimeMs ?? Date.now()) * 1_000_000,

					// Convert ms to ns if ns not provided
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

			// Ensure Date properties are also set from their Ms counterparts
			stats.atime = new Date(Number(stats.atimeMs));

			stats.mtime = new Date(Number(stats.mtimeMs));

			stats.ctime = new Date(Number(stats.ctimeMs));

			stats.birthtime = new Date(Number(stats.birthtimeMs));

			return stats as StatsShim;
		}

		throw new Error(
			`Invalid stat result received from host for 'fs_stat' on path '${String(path)}'. Backend is likely deprecated.`,
		);
	},

	lstat: async (
		path: PathLike,

		opts?: NodeFsTypes.StatOptions,
	): Promise<StatsShim> => {
		console.warn(
			`[Node FS Shim] promises.lstat: Calling DEPRECATED Mountain backend for path '${String(path)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		const result = (await requestFsOpAsync("fs_lstat", {
			path: String(path),

			bigint: opts?.bigint,
		})) as any;

		if (result && typeof result === "object") {
			// Create a new Stats object
			const stats = new nodeFs.Stats();

			Object.assign(stats, {
				/* ... map all fields as in stat() ... */
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

			stats.atime = new Date(Number(stats.atimeMs));

			stats.mtime = new Date(Number(stats.mtimeMs));

			stats.ctime = new Date(Number(stats.ctimeMs));

			stats.birthtime = new Date(Number(stats.birthtimeMs));

			return stats as StatsShim;
		}

		throw new Error(
			`Invalid lstat result received from host for 'fs_lstat' on path '${String(path)}'. Backend is likely deprecated.`,
		);
	},

	realpath: async (
		path: PathLike,

		_options?: NodeFsTypes.ObjectEncodingOptions | BufferEncoding,
	): Promise<string> => {
		console.warn(
			`[Node FS Shim] promises.realpath: Calling DEPRECATED Mountain backend for path '${String(path)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		return await requestFsOpAsync("fs_realpath", { path: String(path) });
	},

	readFile: async (
		pathHandle: PathLike | NodeFsTypes.promises.FileHandle,

		options?: ReadFileOptionsShim,
	): Promise<string | Buffer> => {
		console.warn(
			`[Node FS Shim] promises.readFile: Calling DEPRECATED Mountain backend for path/handle '${String(pathHandle)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		if (
			typeof pathHandle !== "string" &&
			!Buffer.isBuffer(pathHandle) &&
			!(pathHandle instanceof URL)
		) {
			// FileHandle operations are not straightforward to proxy via simple IPC.
			throw Object.assign(
				new Error(
					"fs.promises.readFile with FileHandle input is not supported by this shim.",
				),

				{ code: "ERR_INVALID_ARG_TYPE" },
			);
		}

		const encoding =
			// null means return Buffer
			(typeof options === "string" ? options : options?.encoding) || null;

		const flag =
			typeof options === "object" && options !== null
				? options.flag
				: // Pass flag if provided
					undefined;

		const resultBase64 = (await requestFsOpAsync("fs_readFile", {
			path: String(pathHandle),

			options: { flag },
		})) as string;

		if (typeof resultBase64 !== "string") {
			throw new Error(
				`Invalid readFile result (expected base64 string) for '${String(pathHandle)}'. Backend is likely deprecated.`,
			);
		}

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
		console.warn(
			`[Node FS Shim] promises.writeFile: Calling DEPRECATED Mountain backend for path/handle '${String(pathHandle)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		if (
			typeof pathHandle !== "string" &&
			!Buffer.isBuffer(pathHandle) &&
			!(pathHandle instanceof URL)
		) {
			throw Object.assign(
				new Error(
					"fs.promises.writeFile with FileHandle input is not supported by this shim.",
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

			// AbortSignal (options.signal) is complex to proxy over simple IPC. Log if present.
			if ((options as any).signal) {
				console.warn(
					"[Node FS Shim] writeFile: AbortSignal option is provided but not supported by this shim's IPC mechanism.",
				);
			}
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
		console.warn(
			`[Node FS Shim] promises.mkdir: Calling DEPRECATED Mountain backend for path '${String(path)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		const ipcOptions: NodeFsTypes.MakeDirectoryOptions =
			typeof options === "number" ? { mode: options } : options || {};

		const result = await requestFsOpAsync("fs_mkdir", {
			path: String(path),

			options: ipcOptions,
		});

		// Node's fs.promises.mkdir returns:
		// - `path` (string) if `options.recursive` is true and the first directory was created.
		// - `undefined` if `options.recursive` is true and the path already existed.
		// - `undefined` if `options.recursive` is false (or not set) and the path was created.
		// This shim relies on Mountain to return the path string if it was created recursively and was the first.
		if (ipcOptions.recursive && typeof result === "string") return result;

		// Default for non-recursive success or recursive existing path
		return undefined;
	},

	unlink: async (path: PathLike): Promise<void> => {
		console.warn(
			`[Node FS Shim] promises.unlink: Calling DEPRECATED Mountain backend for path '${String(path)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		await requestFsOpAsync("fs_unlink", { path: String(path) });
	},

	rm: nodeFs.promises.rm
		? async (
				path: PathLike,

				options?: NodeFsTypes.RmOptions,
			): Promise<void> => {
				// `rm` is a newer API (Node 14.14.0+) that can remove files and directories (recursively).
				console.warn(
					`[Node FS Shim] promises.rm: Calling DEPRECATED Mountain backend for path '${String(path)}'. Ensure Mountain has a corresponding 'fs_rm' handler if this shim were functional.`,
				);

				await requestFsOpAsync("fs_rm", {
					path: String(path),

					options,
				});
			}
		: // `rm` is undefined if not available in the running Node.js version.
			undefined,

	rmdir: async (
		path: PathLike,

		options?: RmdirOptionsShim,
	): Promise<void> => {
		console.warn(
			`[Node FS Shim] promises.rmdir: Calling DEPRECATED Mountain backend for path '${String(path)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		await requestFsOpAsync("fs_rmdir", { path: String(path), options });
	},

	readdir: async (
		path: PathLike,

		options?: ReaddirOptionsShim,
	): Promise<string[] | Buffer[] | DirentShim[]> => {
		console.warn(
			`[Node FS Shim] promises.readdir: Calling DEPRECATED Mountain backend for path '${String(path)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

		const ipcReadOptions: {
			encoding?: BufferEncoding | "buffer";

			withFileTypes?: boolean;

			recursive?: boolean;
		} = {};

		let returnAsBuffer = false;

		let withFileTypes = false;

		if (typeof options === "string") {
			// `options` is encoding string
			ipcReadOptions.encoding = options as BufferEncoding;

			if (options === "buffer") returnAsBuffer = true;
		} else if (options && typeof options === "object") {
			// `options` is an object
			ipcReadOptions.encoding = options.encoding as
				| BufferEncoding
				| "buffer"
				| undefined;

			if (options.encoding === "buffer") returnAsBuffer = true;

			withFileTypes = !!options.withFileTypes;

			ipcReadOptions.withFileTypes = withFileTypes;

			// For newer Node versions that support recursive readdir
			ipcReadOptions.recursive = (options as any).recursive;
		}

		const result = (await requestFsOpAsync("fs_readdir", {
			path: String(path),

			options: ipcReadOptions,
		})) as any[];

		if (!Array.isArray(result)) {
			throw new Error(
				`readdir IPC response for '${String(path)}' was not an array. Backend is likely deprecated.`,
			);
		}

		if (withFileTypes) {
			return result.map(
				(
					itemDto: {
						name: string;

						type: number;
					} /* DTO for Dirent from Mountain */,
				): DirentShim => {
					// Mountain must send `name` (string) and `type` (number corresponding to Node's d_type constants like UV_DIRENT_FILE, UV_DIRENT_DIR).
					if (
						typeof itemDto?.name !== "string" ||
						typeof itemDto?.type !== "number"
					) {
						console.warn(
							"[Node FS Shim] Invalid Dirent DTO received from Mountain for readdir (withFileTypes:true):",

							itemDto,

							". Backend is likely deprecated.",
						);

						// Create a real Dirent instance
						const d = new nodeFs.Dirent();

						(d as any).name = String(
							itemDto?.name ||
								"unknown_dirent_from_deprecated_backend",
						);

						// Or some default if type is bad
						// (d as any).type = nodeFs.constants.UV_DIRENT_UNKNOWN;

						return d;
					}

					const dirent = new nodeFs.Dirent();

					// Node's Dirent objects are class instances, direct field assignment might not set internal state.
					(dirent as any).name = itemDto.name;

					// This internal `type` field is what `isFile()`, `isDirectory()` etc. use.
					(dirent as any).type = itemDto.type;

					return dirent;
				},
			);
		} else if (returnAsBuffer) {
			// Ensure names are strings before Buffer.from
			return result.map((name) => Buffer.from(String(name)));
		}

		// Default return is string[]
		return result.map((name) => String(name));
	},

	rename: async (oldPath: PathLike, newPath: PathLike): Promise<void> => {
		console.warn(
			`[Node FS Shim] promises.rename: Calling DEPRECATED Mountain backend for '${String(oldPath)}' -> '${String(newPath)}'. This will likely fail. Use vscode.workspace.fs instead.`,
		);

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
					`[Node FS Shim] promises.copyFile: Calling DEPRECATED Mountain backend for '${String(src)}' -> '${String(dest)}'. Ensure Mountain has 'fs_copyFile' handler if this shim were functional.`,
				);

				await requestFsOpAsync("fs_copyFile", {
					src: String(src),

					dest: String(dest),

					mode,
				});
			}
		: // `copyFile` is undefined if not available in the running Node.js version.
			undefined,
};

const fsShimModuleInstance: FsShimStructure = {
	promises: fsPromisesImpl,

	// Safe to pass through Node's own constants.
	constants: nodeFs.constants,

	// --- Synchronous API Stubs ---
	// All synchronous methods throw errors, strongly discouraging their use and highlighting the deprecated backend.
	// The error messages now consistently point to the deprecated backend and suggest vscode.workspace.fs.
	existsSync: (path) => {
		const msg =
			"fs.existsSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	statSync: (path) => {
		const msg =
			"fs.statSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	lstatSync: (path) => {
		const msg =
			"fs.lstatSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	realpathSync: (path) => {
		const msg =
			"fs.realpathSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	readFileSync: (path) => {
		const msg =
			"fs.readFileSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	writeFileSync: (path) => {
		const msg =
			"fs.writeFileSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	mkdirSync: (path) => {
		const msg =
			"fs.mkdirSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	unlinkSync: (path) => {
		const msg =
			"fs.unlinkSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	rmSync: nodeFs.rmSync
		? (path) => {
				const msg =
					"fs.rmSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

				console.error(
					`[Node FS Shim] Call to ${msg} Path: ${String(path)}`,
				);

				throw new Error(msg);
			}
		: undefined,

	rmdirSync: (path) => {
		const msg =
			"fs.rmdirSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	readdirSync: (path) => {
		const msg =
			"fs.readdirSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(path)}`);

		throw new Error(msg);
	},

	renameSync: (oldP) => {
		const msg =
			"fs.renameSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

		console.error(`[Node FS Shim] Call to ${msg} Path: ${String(oldP)}`);

		throw new Error(msg);
	},

	accessSync: nodeFs.accessSync
		? (path) => {
				const msg =
					"fs.accessSync is synchronous and its backend is DEPRECATED; prefer asynchronous `vscode.workspace.fs` operations or ensure Mountain's native_fs.rs is functional and un-deprecated.";

				console.error(
					`[Node FS Shim] Call to ${msg} Path: ${String(path)}`,
				);

				throw new Error(msg);
			}
		: undefined,

	// Stream and Watcher stubs also throw, as they are complex to shim via async IPC and rely on a functional backend.
	createReadStream: () => {
		throw new Error(
			"fs.createReadStream not supported in Cocoon's proxied fs shim (due to deprecated backend). Use vscode.workspace.fs for stream-like operations if available, or read file content in chunks.",
		);
	},

	createWriteStream: () => {
		throw new Error(
			"fs.createWriteStream not supported in Cocoon's proxied fs shim (due to deprecated backend). Use vscode.workspace.fs for writing files.",
		);
	},

	watch: () => {
		throw new Error(
			"fs.watch not supported in Cocoon's proxied fs shim (due to deprecated backend). Use vscode.workspace.createFileSystemWatcher instead.",
		);
	},
};

export default fsShimModuleInstance;
