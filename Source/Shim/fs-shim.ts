// Node.js Buffer
import { Buffer } from "buffer";
// For fs.constants (actual Node.js constants)
import * as nodeFsConstants from "node:fs";
// For type information from @types/node
import type * as NodeFs from "node:fs";

import { sendToMountainAndWait } from "../cocoon-ipc";

/*---------------------------------------------------------------------------------------------
 * Cocoon Node 'fs' Shim (shims/fs-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shimmed implementation of the Node.js built-in 'fs' module, primarily
 * focusing on the asynchronous `fs.promises` API. This intercepts direct calls to
 * Node's filesystem functions made by extensions bypassing the `vscode.workspace.fs` API.
 *
 * Responsibilities:
 * - Exporting an object mimicking the structure of the native 'fs' module (esp. `fs.promises`).
 * - Implementing `fs.promises` methods (`stat`, `readFile`, `writeFile`, `mkdir`, `unlink`, etc.),
 *
 *   proxying operations to Mountain via dedicated `fs_*` IPC calls.
 * - Handling data encoding/decoding (Buffers, strings with encoding) for IPC.
 * - Converting error responses from Mountain into Node.js-style errors (with codes).
 * - Discouraging synchronous methods by providing stubs that throw errors.
 *
 * Key Interactions:
 * - Returned by `FsModuleShimFactory` when `require('fs')` is intercepted.
 * - Uses `sendToMountainAndWait` from `cocoon-ipc.ts`.
 * - Interacts with Node.js `Buffer`.
 * - Aims to mimic Node.js `fs.promises` API behavior and error types.
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon FS Shim] Initializing Node 'fs' shim...");

// --- Type definitions ---

// Node.js fs.Stats object shape (aligns with NodeFs.Stats)
// TODO: If @types/node is available, `NodeFs.Stats` could be used directly or extended.
interface FsStatsShim extends NodeFs.Stats {
	// Ensure all methods and properties from NodeFs.Stats are covered if not directly using it.
	// The current implementation in fsPromisesShim.stat dynamically adds methods.
	// For stronger typing, these could be declared here if not using NodeFs.Stats.
}

// Options for readFile (aligns with NodeFs.promises.readFile options)
type ReadFileOptionsShim =
	| { encoding?: BufferEncoding | null; flag?: string }
	| BufferEncoding
	| undefined
	| null;

// Options for writeFile (aligns with NodeFs.promises.writeFile options)
type WriteFileOptionsShim =
	| {
			encoding?: BufferEncoding | null;

			mode?: NodeFs.Mode;

			flag?: string;

			signal?: AbortSignal;
	  }
	| BufferEncoding
	| undefined
	| null;

// Options for mkdir (aligns with NodeFs.promises.mkdir options)
// MakeDirectoryOptions has recursive, mode
interface MkdirOptionsShim extends NodeFs.MakeDirectoryOptions {}

// Options for rmdir (aligns with NodeFs.promises.rmdir options)
interface RmdirOptionsShim extends NodeFs.RmDirOptions {}

// Options for readdir (aligns with NodeFs.promises.readdir options)
type ReaddirOptionsShim =
	| {
			encoding?: BufferEncoding | null;

			withFileTypes?: false;

			recursive?: boolean;
	  }
	| BufferEncoding
	| undefined
	| null;

type ReaddirWithFileTypesOptionsShim = {
	encoding?: BufferEncoding | null;

	withFileTypes: true;

	recursive?: boolean;
};

// Node.js fs.Dirent object shape (aligns with NodeFs.Dirent)
// TODO: If @types/node is available, `NodeFs.Dirent` could be used directly.
interface FsDirentShim extends NodeFs.Dirent {
	// Already in NodeFs.Dirent
	// name: string;
	// Already in NodeFs.Dirent
	// isFile(): boolean;
	// ... and other methods
}

// PathLike type from Node.js
type PathLikeShim = NodeFs.PathLike;

// Shape of the fs.promises API we are shimming
// TODO: Align this more closely with `NodeJS.promises.ಫ್ಸ್` if `@types/node` is a dev dependency.
interface FsPromisesApiShim {
	stat: (
		path: PathLikeShim,

		opts?: NodeFs.StatOptions,

		// NodeFs.StatOptions for bigint etc.
	) => Promise<FsStatsShim>;

	realpath: (
		path: PathLikeShim,

		options?: NodeFs.ObjectEncodingOptions | BufferEncoding,
	) => Promise<string>;

	readFile: (
		path: PathLikeShim | NodeFs.promises.FileHandle,

		options?: ReadFileOptionsShim,
	) => Promise<string | Buffer>;

	writeFile: (
		path: PathLikeShim | NodeFs.promises.FileHandle,

		data: string | Uint8Array,

		options?: WriteFileOptionsShim,
	) => Promise<void>;

	mkdir: (
		path: PathLikeShim,

		options?: NodeFs.Mode | MkdirOptionsShim,
	) => Promise<string | undefined>;

	unlink: (path: PathLikeShim) => Promise<void>;

	rmdir: (path: PathLikeShim, options?: RmdirOptionsShim) => Promise<void>;

	readdir: (
		path: PathLikeShim,

		options?:
			| ReaddirOptionsShim
			| ReaddirWithFileTypesOptionsShim
			| BufferEncoding
			| null,

		// Based on options
	) => Promise<string[] | Buffer[] | FsDirentShim[]>;

	rename: (oldPath: PathLikeShim, newPath: PathLikeShim) => Promise<void>;

	// Common and useful
	access?: (path: PathLikeShim, mode?: number) => Promise<void>;

	// TODO: Add other methods: lstat, copyFile, chmod, chown, readlink, etc.
}

// Overall structure of the fs shim
// TODO: Align this more closely with `typeof NodeFs` if `@types/node` is a dev dependency.
interface FsShimStructure {
	promises: FsPromisesApiShim;

	existsSync: (path: PathLikeShim) => boolean;

	statSync: (
		path: PathLikeShim,

		options?: NodeFs.StatSyncOptions,

		// Can throw or return undefined based on options
	) => FsStatsShim | undefined;

	realpathSync: (
		path: PathLikeShim,

		options?: NodeFs.realpathSyncOptions | BufferEncoding,
	) => string;

	readFileSync: (
		path: PathLikeShim | number,

		options?: ReadFileOptionsShim,
	) => string | Buffer;

	writeFileSync: (
		path: PathLikeShim | number,

		data: string | Uint8Array,

		options?: WriteFileOptionsShim,
	) => void;

	mkdirSync: (
		path: PathLikeShim,

		options?: NodeFs.Mode | MkdirOptionsShim,
	) => string | undefined;

	unlinkSync: (path: PathLikeShim) => void;

	rmdirSync: (path: PathLikeShim, options?: RmdirOptionsShim) => void;

	readdirSync: (
		path: PathLikeShim,

		options?:
			| ReaddirOptionsShim
			| ReaddirWithFileTypesOptionsShim
			| BufferEncoding
			| null,
	) => string[] | Buffer[] | FsDirentShim[];

	renameSync: (oldPath: PathLikeShim, newPath: PathLikeShim) => void;

	// Use actual Node.js constants type
	constants: typeof nodeFsConstants.constants;

	createReadStream: (
		path: PathLikeShim,

		options?: NodeFs.ReadStreamOptions | string,
	) => NodeFs.ReadStream;

	createWriteStream: (
		path: PathLikeShim,

		options?: NodeFs.WriteStreamOptions | string,
	) => NodeFs.WriteStream;

	watch: (
		filename: PathLikeShim,

		options?: NodeFs.WatchOptions | string | null,

		listener?: (
			eventType: string,

			filename: string | Buffer | null,
		) => void,
	) => NodeFs.FSWatcher;

	watchFile: (
		filename: PathLikeShim,

		optionsOrListener?:
			| NodeFs.WatchFileOptions
			| ((curr: NodeFs.Stats, prev: NodeFs.Stats) => void),

		listener?: (curr: NodeFs.Stats, prev: NodeFs.Stats) => void,
	) => void;

	unwatchFile: (
		filename: PathLikeShim,

		listener?: (curr: NodeFs.Stats, prev: NodeFs.Stats) => void,
	) => void;

	accessSync?: (path: PathLikeShim, mode?: number) => void;

	// TODO: Add other sync methods: lstatSync, copyFileSync, etc.
}

async function requestFsFromMountainAsync(
	method: string,

	params: any,
): Promise<any> {
	console.log(
		`[Cocoon FS Shim] Requesting '${method}' with params:`,

		JSON.stringify(params).substring(0, 100),

		// Limit log
	);

	try {
		// Increased timeout for FS ops
		const response = await sendToMountainAndWait(method, params, 15000);

		// console.log(`[Cocoon FS Shim] Success response received for '${method}'.`);

		return response;
	} catch (e: any) {
		// console.error(`[Cocoon FS Shim] Error during IPC call for '${method}':`, e);

		// Let BaseCocoonShim.refineError handle this if it's used elsewhere, or keep local mapping.
		// For this direct IPC call, local mapping is fine.
		const err = new Error(
			e.message || `IPC Error during fs operation: ${method}`,
		) as NodeJS.ErrnoException;

		const msg = String(e.message).toLowerCase();

		if (msg.includes("notfound") || msg.includes("enoent"))
			err.code = "ENOENT";
		else if (
			msg.includes("permissiondenied") ||
			msg.includes("eacces") ||
			msg.includes("eperm")
		)
			err.code = "EACCES";
		else if (msg.includes("alreadyexists") || msg.includes("eexist"))
			err.code = "EEXIST";
		else if (msg.includes("isdirectory") || msg.includes("eisdir"))
			err.code = "EISDIR";
		else if (msg.includes("notdirectory") || msg.includes("enotdir"))
			err.code = "ENOTDIR";
		else if (msg.includes("notempty") || msg.includes("enotempty"))
			err.code = "ENOTEMPTY";
		else if (msg.includes("timed") && msg.includes("out"))
			err.code = "ETIMEDOUT";
		// Generic I/O error if no specific code matches
		else if (!err.code) err.code = "EIO";

		console.error(
			`[Cocoon FS Shim] Mapped error for '${method}':`,

			err.code,

			err.message,
		);

		throw err;
	}
}

const fsPromisesShimImpl: FsPromisesApiShim = {
	stat: async (
		path: PathLikeShim,

		opts?: NodeFs.StatOptions,
	): Promise<FsStatsShim> => {
		// TODO: Handle opts like bigint if Mountain supports returning different stat structures.
		const result = (await requestFsFromMountainAsync("fs_stat", {
			path: String(path),
		})) as Partial<FsStatsShim> & { type?: number; mode?: number };

		if (result && typeof result === "object") {
			const now = Date.now();

			// Mode bits for isFile, isDirectory etc.
			const mode = result.mode || 0;

			// This assumes Mountain sends Node.js compatible mode bits or a 'type' that can be mapped.
			// Original shim used a custom 'type' field. If Mountain sends 'type', map it to mode bits.
			// For now, assuming result.isFile(), result.isDirectory() etc. are directly provided or derived from 'type'.
			let isFile = false,
				isDirectory = false,
				isSymbolicLink = false;

			// If Mountain sends Node.js mode bits:
			// isFile = (mode & nodeFsConstants.constants.S_IFMT) === nodeFsConstants.constants.S_IFREG;

			// isDirectory = (mode & nodeFsConstants.constants.S_IFMT) === nodeFsConstants.constants.S_IFDIR;

			// isSymbolicLink = (mode & nodeFsConstants.constants.S_IFMT) === nodeFsConstants.constants.S_IFLNK;

			// If Mountain sends a 'type' field (like vscode.FileType):
			if (result.type !== undefined) {
				// Assuming FileType.File = 1
				isFile = (result.type & 1) !== 0;

				// Assuming FileType.Directory = 2
				isDirectory = (result.type & 2) !== 0;

				// Assuming FileType.SymbolicLink = 64
				isSymbolicLink = (result.type & 64) !== 0;
			}

			return {
				// Fill with defaults or actual values
				dev: result.dev ?? 0,

				ino: result.ino ?? 0,

				mode: mode,

				nlink: result.nlink ?? 1,

				uid: result.uid ?? 0,

				gid: result.gid ?? 0,

				rdev: result.rdev ?? 0,

				size: typeof result.size === "number" ? result.size : 0,

				blksize: result.blksize ?? 4096,

				blocks:
					result.blocks ??
					Math.ceil((result.size ?? 0) / (result.blksize ?? 4096)),

				atimeMs: result.atimeMs ?? now,

				mtimeMs: result.mtimeMs ?? now,

				ctimeMs: result.ctimeMs ?? now,

				birthtimeMs: result.birthtimeMs ?? now,

				atime: new Date(result.atimeMs ?? now),

				mtime: new Date(result.mtimeMs ?? now),

				ctime: new Date(result.ctimeMs ?? now),

				birthtime: new Date(result.birthtimeMs ?? now),

				isFile: () => isFile,

				isDirectory: () => isDirectory,

				isSymbolicLink: () => isSymbolicLink,

				isBlockDevice: () => false,

				isCharacterDevice: () => false,

				isFIFO: () => false,

				isSocket: () => false,

				// TODO: If opts.bigint is true, return BigIntStats. Requires Mountain to send bigint values.
				// Cast as we are constructing it to match.
			} as FsStatsShim;
		}

		throw new Error("Invalid stat result received from host (fs_stat)");
	},

	realpath: async (
		path: PathLikeShim,

		options?: NodeFs.realpathSyncOptions | BufferEncoding,
	): Promise<string> => {
		// TODO: Handle options (encoding) if necessary, though realpath typically returns string path.
		return await requestFsFromMountainAsync("fs_realpath", {
			path: String(path),
		});
	},

	readFile: async (
		path: PathLikeShim | NodeFs.promises.FileHandle,

		options?: ReadFileOptionsShim,
	): Promise<string | Buffer> => {
		// TODO: Handle FileHandle input if Mountain supports it (requires open/close and fd passing). For now, assume path.
		if (
			typeof path !== "string" &&
			!(path instanceof URL) &&
			!Buffer.isBuffer(path)
		) {
			throw new Error("readFile with FileHandle not supported in shim");
		}

		const encoding =
			(typeof options === "string" ? options : options?.encoding) || null;

		const resultBase64 = (await requestFsFromMountainAsync("fs_readFile", {
			path: String(path),
		})) as string;

		if (typeof resultBase64 !== "string")
			throw new Error("Invalid readFile result (expected base64 string)");

		const buffer = Buffer.from(resultBase64, "base64");

		return encoding && encoding !== "buffer"
			? buffer.toString(encoding)
			: buffer;
	},

	writeFile: async (
		path: PathLikeShim | NodeFs.promises.FileHandle,

		data: string | Uint8Array,

		options?: WriteFileOptionsShim,
	): Promise<void> => {
		if (
			typeof path !== "string" &&
			!(path instanceof URL) &&
			!Buffer.isBuffer(path)
		) {
			throw new Error("writeFile with FileHandle not supported in shim");
		}

		let dataBase64: string;

		const encoding =
			(typeof options === "string" ? options : options?.encoding) ||
			"utf8";

		dataBase64 = Buffer.from(
			data,

			typeof data === "string" ? encoding : undefined,
		).toString("base64");

		const ipcOptions: { mode?: NodeFs.Mode; flag?: string } = {};

		if (typeof options === "object" && options !== null) {
			if (options.mode !== undefined) ipcOptions.mode = options.mode;

			if (options.flag !== undefined) ipcOptions.flag = options.flag;

			// TODO: Handle AbortSignal if Mountain supports cancellation for writeFile.
		}

		await requestFsFromMountainAsync("fs_writeFile", {
			path: String(path),

			data: dataBase64,

			options: ipcOptions,
		});
	},

	mkdir: async (
		path: PathLikeShim,

		options?: NodeFs.Mode | MkdirOptionsShim,
	): Promise<string | undefined> => {
		const ipcOptions: MkdirOptionsShim =
			typeof options === "number" ? { mode: options } : options || {};

		await requestFsFromMountainAsync("fs_mkdir", {
			path: String(path),

			options: ipcOptions,

			// Send full options
		});

		// Node's fs.promises.mkdir returns the first directory path created when recursive is true, otherwise undefined.
		// For simplicity, if recursive, returning the input path, assuming it was created.
		// TODO: Mountain could return the actual first path created if its logic is more nuanced.
		return ipcOptions.recursive ? String(path) : undefined;
	},

	unlink: async (path: PathLikeShim): Promise<void> => {
		await requestFsFromMountainAsync("fs_unlink", { path: String(path) });
	},

	rmdir: async (
		path: PathLikeShim,

		options?: RmdirOptionsShim,
	): Promise<void> => {
		await requestFsFromMountainAsync("fs_rmdir", {
			path: String(path),

			options,
		});
	},

	readdir: async (
		path: PathLikeShim,

		options?:
			| ReaddirOptionsShim
			| ReaddirWithFileTypesOptionsShim
			| BufferEncoding
			| null,
	): Promise<string[] | Buffer[] | FsDirentShim[]> => {
		let ipcReadOptions: {
			withFileTypes?: boolean;

			recursive?: boolean;

			encoding?: BufferEncoding;
		} = {};

		let returnAsBuffer = false;

		if (typeof options === "string") {
			// options is encoding
			ipcReadOptions.encoding = options;

			if (options === "buffer") returnAsBuffer = true;
		} else if (options && typeof options === "object") {
			ipcReadOptions.withFileTypes = (
				options as ReaddirWithFileTypesOptionsShim
			).withFileTypes;

			ipcReadOptions.recursive = options.recursive;

			if (options.encoding) {
				ipcReadOptions.encoding = options.encoding;

				if (options.encoding === "buffer") returnAsBuffer = true;
			}
		}

		const result = await requestFsFromMountainAsync("fs_readdir", {
			path: String(path),

			options: ipcReadOptions,
		});

		if (!Array.isArray(result))
			throw new Error("readdir IPC response was not an array.");

		if (ipcReadOptions.withFileTypes) {
			return result.map((item: any): FsDirentShim => {
				// item from Mountain should be { name: string, type: number (Node's d_type) }

				if (
					typeof item !== "object" ||
					item === null ||
					typeof item.name !== "string" ||
					typeof item.type !== "number"
				) {
					console.warn(
						"[Cocoon FS Shim] Invalid Dirent structure from Mountain:",

						item,
					);

					// Fallback for malformed Dirent
					return {
						name: String(item?.name || "unknown"),

						isFile: () => false,

						isDirectory: () => false,

						isSymbolicLink: () => false,

						isBlockDevice: () => false,

						isCharacterDevice: () => false,

						isFIFO: () => false,

						isSocket: () => false,
					} as FsDirentShim;
				}

				// Map Node's internal d_type constants (UV_DIRENT_*)
				// These constants are available on nodeFsConstants.constants
				// TODO: Ensure Mountain sends types compatible with these constants for accurate Dirent construction.
				const type = item.type;

				return {
					name: item.name,

					isFile: () =>
						type === nodeFsConstants.constants.UV_DIRENT_FILE,

					isDirectory: () =>
						type === nodeFsConstants.constants.UV_DIRENT_DIR,

					isSymbolicLink: () =>
						type === nodeFsConstants.constants.UV_DIRENT_LNK,

					isBlockDevice: () =>
						type === nodeFsConstants.constants.UV_DIRENT_BLOCK,

					isCharacterDevice: () =>
						type === nodeFsConstants.constants.UV_DIRENT_CHAR,

					isFIFO: () =>
						type === nodeFsConstants.constants.UV_DIRENT_FIFO,

					isSocket: () =>
						type === nodeFsConstants.constants.UV_DIRENT_SOCKET,
				} as FsDirentShim;
			});
		} else if (returnAsBuffer) {
			// Assuming names are strings, convert to Buffer
			return result.map((name) => Buffer.from(String(name)));
		}

		// Default is string[]
		return result as string[];
	},

	rename: async (
		oldPath: PathLikeShim,

		newPath: PathLikeShim,
	): Promise<void> => {
		await requestFsFromMountainAsync("fs_rename", {
			oldPath: String(oldPath),

			newPath: String(newPath),
		});
	},

	access: async (path: PathLikeShim, mode?: number): Promise<void> => {
		// mode defaults to fs.constants.F_OK
		await requestFsFromMountainAsync("fs_access", {
			path: String(path),

			mode: mode ?? nodeFsConstants.constants.F_OK,
		});
	},
};

const fsShimInstance: FsShimStructure = {
	promises: fsPromisesShimImpl,

	// --- Synchronous API Stubs ---
	existsSync: (path) => {
		throw new Error(
			"fs.existsSync shim not implemented (use fs.promises API)",
		);
	},

	statSync: (path, opts) => {
		throw new Error(
			"fs.statSync shim not implemented (use fs.promises.stat)",
		);
	},

	realpathSync: (path, opts) => {
		throw new Error(
			"fs.realpathSync shim not implemented (use fs.promises.realpath)",
		);
	},

	readFileSync: (path, opts) => {
		throw new Error(
			"fs.readFileSync shim not implemented (use fs.promises.readFile)",
		);
	},

	writeFileSync: (path, data, opts) => {
		throw new Error(
			"fs.writeFileSync shim not implemented (use fs.promises.writeFile)",
		);
	},

	mkdirSync: (path, opts) => {
		throw new Error(
			"fs.mkdirSync shim not implemented (use fs.promises.mkdir)",
		);
	},

	unlinkSync: (path) => {
		throw new Error(
			"fs.unlinkSync shim not implemented (use fs.promises.unlink)",
		);
	},

	rmdirSync: (path, opts) => {
		throw new Error(
			"fs.rmdirSync shim not implemented (use fs.promises.rmdir)",
		);
	},

	readdirSync: (path, opts) => {
		throw new Error(
			"fs.readdirSync shim not implemented (use fs.promises.readdir)",
		);
	},

	renameSync: (oldP, newP) => {
		throw new Error(
			"fs.renameSync shim not implemented (use fs.promises.rename)",
		);
	},

	accessSync: (path, mode) => {
		throw new Error(
			"fs.accessSync shim not implemented (use fs.promises.access)",
		);
	},

	// Direct passthrough
	constants: nodeFsConstants.constants,

	// Stream and Watcher stubs (complex to shim, throw for now)
	createReadStream: (_p, _o) => {
		throw new Error("fs.createReadStream shim not implemented");
	},

	createWriteStream: (_p, _o) => {
		throw new Error("fs.createWriteStream shim not implemented");
	},

	watch: (_f, _o, _l) => {
		throw new Error("fs.watch shim not implemented");
	},

	watchFile: (_f, _o, _l) => {
		throw new Error("fs.watchFile shim not implemented");
	},

	unwatchFile: (_f, _l) => {
		throw new Error("fs.unwatchFile shim not implemented");
	},
};

export default fsShimInstance;
