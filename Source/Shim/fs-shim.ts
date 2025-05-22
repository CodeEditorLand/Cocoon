// Node.js Buffer
import { Buffer } from "buffer";
// For constants and type reference
import * as nodeFs from "node:fs";
// For type information from @types/node
import type * as NodeFsTypes from "node:fs";

import { sendToMountainAndWait } from "../cocoon-ipc";

/*---------------------------------------------------------------------------------------------
 * Cocoon Node 'fs' Shim (shims/fs-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'fs' module, primarily focusing on the
 * asynchronous `fs.promises` API. This is used when extensions directly `require('fs')`.
 * Operations are proxied to Mountain via `fs_*` IPC calls.
 *
 * Note: For `vscode.workspace.fs` API usage by extensions, `fs-api-shim.ts` is used,
 *
 * which calls `workspacefs_*` IPC methods that are typically implemented via effects
 * in Mountain's `environment.rs`. This `fs-shim.ts` targets direct Node `fs` usage.
 *
 * Responsibilities:
 * - Mimicking the Node.js `fs` module structure (especially `fs.promises`).
 * - Implementing `fs.promises` methods by proxying to Mountain's `fs_*` handlers.
 * - Handling data encoding/decoding for IPC.
 * - Mapping error responses from Mountain to Node.js-style errors.
 * - Discouraging synchronous `fs` methods.
 *
 * Key Interactions:
 * - Returned by `FsModuleShimFactory`.
 * - Uses `sendToMountainAndWait` from `cocoon-ipc.ts`.
 * - Mountain's `handlers/native_fs.rs` would implement the `fs_*` handlers (though
 *   marked deprecated, this shim would rely on them if active).
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon FS Shim] Initializing Node 'fs' module shim...");

// --- Type Definitions ---
// These should align with @types/node fs.promises and fs module structure.
// Using `NodeFsTypes` for better alignment.

// PathLike type from Node.js
type PathLike = NodeFsTypes.PathLike;

// For fs.promises.stat and fs.statSync
// TODO: If @types/node is a dev dependency, use `NodeFsTypes.Stats` directly.
// The previous `FsStatsShim` tried to define it; using NodeFsTypes.Stats is better.
// Or `extends NodeFsTypes.Stats` if adding custom fields
type StatsShim = NodeFsTypes.Stats;

// Options for fs.promises.readFile / fs.readFileSync
type ReadFileOptionsShim = Parameters<typeof nodeFs.promises.readFile>[1];

// Options for fs.promises.writeFile / fs.writeFileSync
type WriteFileOptionsShim = Parameters<typeof nodeFs.promises.writeFile>[2];

// Options for fs.promises.mkdir / fs.mkdirSync
type MkdirOptionsShim = Parameters<typeof nodeFs.promises.mkdir>[1];

// Options for fs.promises.rmdir / fs.rmdirSync
type RmdirOptionsShim = Parameters<typeof nodeFs.promises.rmdir>[1];

// Options for fs.promises.readdir / fs.readdirSync
type ReaddirOptionsShim = Parameters<typeof nodeFs.promises.readdir>[1];

// For fs.promises.readdir with withFileTypes:true / fs.readdirSync with withFileTypes:true
// TODO: If @types/node is a dev dependency, use `NodeFsTypes.Dirent` directly.
type DirentShim = NodeFsTypes.Dirent;

// fs.promises API part of the shim
// TODO: This interface should comprehensively match `typeof nodeFs.promises` for the implemented methods.
export interface FsPromisesApiShim {
	access: (path: PathLike, mode?: number) => Promise<void>;

	stat: (
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

	rmdir: (path: PathLike, options?: RmdirOptionsShim) => Promise<void>;

	readdir: (
		path: PathLike,

		options?: ReaddirOptionsShim,
	) => Promise<string[] | Buffer[] | DirentShim[]>;

	rename: (oldPath: PathLike, newPath: PathLike) => Promise<void>;

	// TODO: Add other commonly used fs.promises methods: lstat, copyFile, chmod, chown, readlink, etc.
	// Ensure their signatures match @types/node.
}

// Overall structure of the fs shim module
// TODO: This interface should comprehensively match `typeof nodeFs` for the implemented parts.
export interface FsShimStructure {
	promises: FsPromisesApiShim;

	constants: typeof nodeFs.constants;

	// Synchronous stubs
	existsSync: (path: PathLike) => boolean;

	statSync: (
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

	rmdirSync: (path: PathLike, options?: RmdirOptionsShim) => void;

	readdirSync: (
		path: PathLike,

		options?: ReaddirOptionsShim,
	) => string[] | Buffer[] | DirentShim[];

	renameSync: (oldPath: PathLike, newPath: PathLike) => void;

	accessSync?: (path: PathLike, mode?: number) => void;

	// Stream and Watcher stubs (complex to shim, throw for now)
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

	// TODO: Add other fs module exports if needed (watchFile, unwatchFile, etc.)
}

async function requestFsOpAsync(
	ipcMethod: string,

	ipcParams: any,
): Promise<any> {
	// console.log(`[Node FS Shim -> Mtn] IPC Req: '${ipcMethod}', Params: ${JSON.stringify(ipcParams).substring(0,100)}`);

	try {
		// Using a longer timeout for FS operations that might involve network or slower disks.
		const response = await sendToMountainAndWait(
			ipcMethod,

			ipcParams,

			20000,
		);

		return response;
	} catch (e: any) {
		const err = new Error(
			e.message || `IPC Error during fs operation: ${ipcMethod}`,
		) as NodeJS.ErrnoException;

		const msgLower = String(e.message).toLowerCase();

		if (msgLower.includes("notfound") || msgLower.includes("enoent"))
			err.code = "ENOENT";
		else if (
			msgLower.includes("permissiondenied") ||
			msgLower.includes("eacces") ||
			msgLower.includes("eperm")
		)
			err.code = "EACCES";
		else if (
			msgLower.includes("alreadyexists") ||
			msgLower.includes("eexist")
		)
			err.code = "EEXIST";
		else if (
			msgLower.includes("isdirectory") ||
			msgLower.includes("eisdir")
		)
			err.code = "EISDIR";
		else if (
			msgLower.includes("notdirectory") ||
			msgLower.includes("enotdir")
		)
			err.code = "ENOTDIR";
		else if (
			msgLower.includes("notempty") ||
			msgLower.includes("enotempty")
		)
			err.code = "ENOTEMPTY";
		else if (msgLower.includes("timed") && msgLower.includes("out"))
			err.code = "ETIMEDOUT";
		else if (!err.code) err.code = "EIO";

		// console.error(`[Node FS Shim <- Mtn] Mapped IPC Error for '${ipcMethod}':`, err.code, err.message);

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
		// TODO: If Mountain's `fs_stat` supports bigint option, pass it.
		const result = (await requestFsOpAsync("fs_stat", {
			path: String(path) /*, opts */,

			// Raw result from Mountain
		})) as any;

		if (result && typeof result === "object") {
			// VS Code's ExtHostWorkspace.ts returns a FileStat-like object for its own stat,

			// which includes `type` (FileType enum), `ctime`, `mtime`, `size`.
			// Node.js `fs.Stats` has methods like isFile(), isDirectory() and properties like birthtimeMs.
			// Mountain's `handlers/native_fs.rs::handle_fs_stat` was designed to return:
			// `{ type: fileTypeNumeric, ctime: Date, mtime: Date, birthtime: Date, atime: Date, size: number }`
			// where fileTypeNumeric maps to VSCode FileType.
			// This needs to be mapped to a NodeFsTypes.Stats object.
			// This is complex because NodeFsTypes.Stats is a class instance with methods.
			// For a shim, returning a plain object that Duck-Types to Stats is common,

			// but methods won't be real class methods.
			// A more faithful shim might try to construct a mock Stats object.
			const now = Date.now();

			const modeFromType = (type: number | undefined): number => {
				// Map vscode.FileType back to Node.js S_IFMT type bits (approximate)
				if (type === 1 /* File */) return nodeFs.constants.S_IFREG;

				if (type === 2 /* Directory */) return nodeFs.constants.S_IFDIR;

				if (type === 64 /* SymbolicLink */)
					return nodeFs.constants.S_IFLNK;

				// Unknown
				return 0;
			};

			const mode = result.mode ?? modeFromType(result.type);

			const statsObject: Partial<StatsShim> & Record<string, any> = {
				dev: result.dev ?? 0,

				ino: result.ino ?? 0,

				mode: mode,

				nlink: result.nlink ?? 1,

				uid: result.uid ?? 0,

				gid: result.gid ?? 0,

				rdev: result.rdev ?? 0,

				size: typeof result.size === "number" ? result.size : 0,

				blksize: result.blksize ?? 4096,

				blocks: result.blocks ?? Math.ceil((result.size ?? 0) / 4096),

				atimeMs: result.atime
					? new Date(result.atime).getTime()
					: (result.atimeMs ?? now),

				mtimeMs: result.mtime
					? new Date(result.mtime).getTime()
					: (result.mtimeMs ?? now),

				ctimeMs: result.ctime
					? new Date(result.ctime).getTime()
					: (result.ctimeMs ?? now),

				birthtimeMs: result.birthtime
					? new Date(result.birthtime).getTime()
					: (result.birthtimeMs ?? now),
			};

			statsObject.atime = new Date(statsObject.atimeMs!);

			statsObject.mtime = new Date(statsObject.mtimeMs!);

			statsObject.ctime = new Date(statsObject.ctimeMs!);

			statsObject.birthtime = new Date(statsObject.birthtimeMs!);

			statsObject.isFile = () =>
				(mode & nodeFs.constants.S_IFMT) === nodeFs.constants.S_IFREG;

			statsObject.isDirectory = () =>
				(mode & nodeFs.constants.S_IFMT) === nodeFs.constants.S_IFDIR;

			statsObject.isSymbolicLink = () =>
				(mode & nodeFs.constants.S_IFMT) === nodeFs.constants.S_IFLNK;

			statsObject.isBlockDevice = () =>
				(mode & nodeFs.constants.S_IFMT) === nodeFs.constants.S_IFBLK;

			statsObject.isCharacterDevice = () =>
				(mode & nodeFs.constants.S_IFMT) === nodeFs.constants.S_IFCHR;

			statsObject.isFIFO = () =>
				(mode & nodeFs.constants.S_IFMT) === nodeFs.constants.S_IFIFO;

			statsObject.isSocket = () =>
				(mode & nodeFs.constants.S_IFMT) === nodeFs.constants.S_IFSOCK;

			return statsObject as StatsShim;
		}

		throw new Error("Invalid stat result received from host (fs_stat)");
	},

	realpath: async (
		path: PathLike,

		options?: NodeFsTypes.realpathSyncOptions | BufferEncoding,
	): Promise<string> => {
		// `options` for realpath is usually just encoding, defaults to 'utf8'.
		// The native_fs handler only took path.
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
			throw new Error(
				"readFile with FileHandle input not supported in this shim.",
			);
		}

		const encoding =
			// null means Buffer
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
			? buffer.toString(encoding)
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
			throw new Error(
				"writeFile with FileHandle input not supported in this shim.",
			);
		}

		let dataBase64: string;

		const encodingFromFileOptions =
			(typeof options === "string" ? options : options?.encoding) ||
			"utf8";

		dataBase64 = Buffer.from(
			data,

			typeof data === "string" ? encodingFromFileOptions : undefined,
		).toString("base64");

		const ipcOptions: { mode?: NodeFsTypes.Mode; flag?: string } = {};

		if (typeof options === "object" && options !== null) {
			if (options.mode !== undefined) ipcOptions.mode = options.mode;

			if (options.flag !== undefined) ipcOptions.flag = options.flag;

			// TODO: AbortSignal (options.signal) is complex to proxy.
		}

		await requestFsOpAsync("fs_writeFile", {
			path: String(pathHandle),

			data: dataBase64,

			options: ipcOptions,
		});
	},

	mkdir: async (
		path: PathLike,

		options?: NodeFsTypes.Mode | MkdirOptionsShim,
	): Promise<string | undefined> => {
		const ipcOptions: MkdirOptionsShim =
			typeof options === "number" ? { mode: options } : options || {};

		await requestFsOpAsync("fs_mkdir", {
			path: String(path),

			options: ipcOptions,
		});

		// Node's fs.promises.mkdir returns the first directory path created if recursive is true and path was created.
		// If path already exists and recursive, returns undefined. If not recursive and path exists, throws.
		// This shim simplifies: returns path if recursive, else undefined.
		// TODO: For full fidelity, Mountain's fs_mkdir should return the path or signal if it already existed.
		return ipcOptions.recursive ? String(path) : undefined;
	},

	unlink: async (path: PathLike): Promise<void> => {
		await requestFsOpAsync("fs_unlink", { path: String(path) });
	},

	rmdir: async (
		path: PathLike,

		options?: RmdirOptionsShim,
	): Promise<void> => {
		// TODO: Mountain's `fs_rmdir` handler needs to exist and support RmdirOptions.
		await requestFsOpAsync("fs_rmdir", { path: String(path), options });
	},

	readdir: async (
		path: PathLike,

		options?: ReaddirOptionsShim,
	): Promise<string[] | Buffer[] | DirentShim[]> => {
		let ipcReadOptions: {
			withFileTypes?: boolean;

			recursive?: boolean;

			encoding?: BufferEncoding | "buffer";
		} = {};

		let returnAsBuffer = false;

		if (typeof options === "string") {
			// options is encoding
			ipcReadOptions.encoding = options;

			if (options === "buffer") returnAsBuffer = true;
		} else if (options && typeof options === "object") {
			ipcReadOptions.withFileTypes =
				// Cast for withFileTypes
				(
					options as NodeFsTypes.ObjectEncodingOptions & {
						withFileTypes: true;
					}
				).withFileTypes;

			// `recursive` is on DirentQueryOptions in newer node
			ipcReadOptions.recursive = (options as any).recursive;

			if (options.encoding) {
				ipcReadOptions.encoding = options.encoding;

				if (options.encoding === "buffer") returnAsBuffer = true;
			}
		}

		const result = (await requestFsOpAsync("fs_readdir", {
			path: String(path),

			options: ipcReadOptions,
		})) as any[];

		if (!Array.isArray(result))
			throw new Error("readdir IPC response was not an array.");

		if (ipcReadOptions.withFileTypes) {
			return result.map(
				(item: { name: string; type: number }): DirentShim => {
					// Mountain sends {name, type (Node's d_type)}

					if (
						typeof item !== "object" ||
						item === null ||
						typeof item.name !== "string" ||
						typeof item.type !== "number"
					) {
						console.warn(
							"[Node FS Shim] Invalid Dirent structure from Mountain for readdir:",

							item,
						);

						return {
							name: String(item?.name || "unknown"),

							isDirectory: () => false,

							isFile: () =>
								false /*... other methods return false */,
						} as DirentShim;
					}

					// Create a Dirent-like object. For full fidelity, this would be an instance of NodeFsTypes.Dirent.
					// This requires `nodeFs.Dirent` class to be available or a good mock.
					// For now, a plain object with methods.
					const type = item.type;

					return {
						name: item.name,

						isFile: () => type === nodeFs.constants.UV_DIRENT_FILE,

						isDirectory: () =>
							type === nodeFs.constants.UV_DIRENT_DIR,

						isSymbolicLink: () =>
							type === nodeFs.constants.UV_DIRENT_LNK,

						isBlockDevice: () =>
							type === nodeFs.constants.UV_DIRENT_BLOCK,

						isCharacterDevice: () =>
							type === nodeFs.constants.UV_DIRENT_CHAR,

						isFIFO: () => type === nodeFs.constants.UV_DIRENT_FIFO,

						isSocket: () =>
							type === nodeFs.constants.UV_DIRENT_SOCKET,

						// Cast to DirentShim, acknowledging it's not a true class instance.
					} as DirentShim;
				},
			);
		} else if (returnAsBuffer) {
			// Assuming names are strings if not Dirent
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
};

const fsShimModuleInstance: FsShimStructure = {
	promises: fsPromisesImpl,

	constants: nodeFs.constants,

	// --- Synchronous API Stubs (Discouraged) ---
	// TODO: For any sync methods that *must* be supported, they would require a synchronous IPC mechanism
	// to Mountain, which is generally not feasible or advisable. Alternatively, Mountain could provide
	// initial filesystem snapshots or data that these sync methods could query locally.
	// For now, they all throw, guiding users to the async API.
	existsSync: (path) => {
		console.warn(
			"fs.existsSync is not reliably shimmed; use fs.promises.access or fs.promises.stat.",
		);

		throw new Error("fs.existsSync sync call not supported in Cocoon shim");
	},

	statSync: (path, opts) => {
		console.warn(
			"fs.statSync is not reliably shimmed; use fs.promises.stat.",
		);

		throw new Error("fs.statSync sync call not supported in Cocoon shim");
	},

	realpathSync: (path, opts) => {
		console.warn(
			"fs.realpathSync is not reliably shimmed; use fs.promises.realpath.",
		);

		throw new Error(
			"fs.realpathSync sync call not supported in Cocoon shim",
		);
	},

	readFileSync: (path, opts) => {
		console.warn(
			"fs.readFileSync is not reliably shimmed; use fs.promises.readFile.",
		);

		throw new Error(
			"fs.readFileSync sync call not supported in Cocoon shim",
		);
	},

	writeFileSync: (path, data, opts) => {
		console.warn(
			"fs.writeFileSync is not reliably shimmed; use fs.promises.writeFile.",
		);

		throw new Error(
			"fs.writeFileSync sync call not supported in Cocoon shim",
		);
	},

	mkdirSync: (path, opts) => {
		console.warn(
			"fs.mkdirSync is not reliably shimmed; use fs.promises.mkdir.",
		);

		throw new Error("fs.mkdirSync sync call not supported in Cocoon shim");
	},

	unlinkSync: (path) => {
		console.warn(
			"fs.unlinkSync is not reliably shimmed; use fs.promises.unlink.",
		);

		throw new Error("fs.unlinkSync sync call not supported in Cocoon shim");
	},

	rmdirSync: (path, opts) => {
		console.warn(
			"fs.rmdirSync is not reliably shimmed; use fs.promises.rmdir.",
		);

		throw new Error("fs.rmdirSync sync call not supported in Cocoon shim");
	},

	readdirSync: (path, opts) => {
		console.warn(
			"fs.readdirSync is not reliably shimmed; use fs.promises.readdir.",
		);

		throw new Error(
			"fs.readdirSync sync call not supported in Cocoon shim",
		);
	},

	renameSync: (oldP, newP) => {
		console.warn(
			"fs.renameSync is not reliably shimmed; use fs.promises.rename.",
		);

		throw new Error("fs.renameSync sync call not supported in Cocoon shim");
	},

	accessSync: (path, mode) => {
		console.warn(
			"fs.accessSync is not reliably shimmed; use fs.promises.access.",
		);

		throw new Error("fs.accessSync sync call not supported in Cocoon shim");
	},

	// Stream and Watcher stubs (complex to shim over IPC)
	createReadStream: (_p, _o) => {
		throw new Error("fs.createReadStream not supported in Cocoon shim");
	},

	createWriteStream: (_p, _o) => {
		throw new Error("fs.createWriteStream not supported in Cocoon shim");
	},

	watch: (_f, _o, _l) => {
		throw new Error("fs.watch not supported in Cocoon shim");
	},

	// TODO: Consider if basic watch functionality could be proxied if essential for some extensions.
};

export default fsShimModuleInstance;
