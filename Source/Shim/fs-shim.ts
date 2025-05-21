// Node.js Buffer
import { Buffer } from "buffer";
// For fs.constants
import * as nodeFsConstants from "node:fs";

// Assuming typed: (method: string, params: any, timeout?: number) => Promise<any>
import { sendToMountainAndWait } from "..";

/*---------------------------------------------------------------------------------------------
 * Cocoon Node 'fs' Shim (shims/fs-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shimmed implementation of the Node.js built-in 'fs' module, primarily
 * focusing on the asynchronous `fs.promises` API. This intercepts direct calls to
 * Node's filesystem functions made by extensions bypassing the `vscode.workspace.fs` API.
 *
 * Responsibilities:
 * - Exporting an object mimicking the structure of the native 'fs' module (esp. `fs.promises`).
 * - Implementing `fs.promises` methods (`stat`, `readFile`, `writeFile`, `mkdir`, `unlink`, etc.).
 * - Proxying each filesystem operation to a corresponding handler in Mountain using
 *   dedicated `fs_*` method names via direct Vine IPC (`sendToMountainAndWait`).
 * - Handling data encoding/decoding between Node.js types (Buffers, strings with encoding)
 *   and the IPC format (likely base64 strings).
 * - Converting error responses from Mountain back into Node.js-style errors with appropriate
 *   error codes (`ENOENT`, `EACCES`, etc.).
 * - **Discouraging/Blocking Synchronous Methods:** Providing stubs for synchronous `fs` methods
 *   (like `existsSync`, `statSync`) that throw errors, guiding developers to use the async API
 *   to avoid blocking Cocoon's event loop.
 *
 * Key Interactions:
 * - Returned by `FsModuleShimFactory` when `require('fs')` is intercepted.
 * - Uses `sendToMountainAndWait` from `cocoon-ipc.js` to call `fs_*` handlers in Mountain.
 * - Interacts with Node.js `Buffer`.
 * - Attempts to mimic Node.js `fs.promises` API behavior and error types.
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon FS Shim] Initializing...");

// --- Type definitions ---

// Node.js fs.Stats object shape (simplified)
interface FsStats {
	isFile(): boolean;

	isDirectory(): boolean;

	isBlockDevice(): boolean;

	isCharacterDevice(): boolean;

	isSymbolicLink(): boolean;

	isFIFO(): boolean;

	isSocket(): boolean;

	dev: number;

	ino: number;

	mode: number;

	nlink: number;

	uid: number;

	gid: number;

	rdev: number;

	size: number;

	blksize: number;

	blocks: number;

	atimeMs: number;

	mtimeMs: number;

	ctimeMs: number;

	birthtimeMs: number;

	atime: Date;

	mtime: Date;

	ctime: Date;

	birthtime: Date;

	// Added based on original JS shim's stat implementation
	// VS Code FileType enum value potentially
	type?: number;
}

// Options for readFile
type ReadFileOptions =
	| { encoding?: BufferEncoding | null; flag?: string }
	| BufferEncoding
	| undefined
	| null;

// Options for writeFile
type WriteFileOptions =
	| { encoding?: BufferEncoding | null; mode?: number; flag?: string }
	| BufferEncoding
	| undefined
	| null;

// Options for mkdir
interface MkdirOptions {
	recursive?: boolean;

	mode?: number;
}

// Options for rmdir (from Node v12+)
interface RmdirOptions {
	maxRetries?: number;

	recursive?: boolean;

	retryDelay?: number;
}

// Options for readdir
type ReaddirOptions =
	| {
			encoding?: BufferEncoding | null;

			withFileTypes?: false;

			recursive?: boolean;
	  }
	| BufferEncoding
	| undefined
	| null;

type ReaddirWithFileTypesOptions = {
	encoding?: BufferEncoding | null;

	withFileTypes: true;

	recursive?: boolean;
};

// Node.js fs.Dirent object shape (simplified)
interface FsDirent {
	isFile(): boolean;

	isDirectory(): boolean;

	isBlockDevice(): boolean;

	isCharacterDevice(): boolean;

	isFIFO(): boolean;

	isSocket(): boolean;

	isSymbolicLink(): boolean;

	name: string;

	// path property available in newer Node versions
	// type property if using internal constants
}

// Shape of the fs.promises API we are shimming
interface FsPromisesApi {
	stat: (path: string | Buffer | URL) => Promise<FsStats>;

	realpath: (
		path: string | Buffer | URL,

		options?: { encoding?: BufferEncoding } | BufferEncoding,
	) => Promise<string>;

	readFile: (
		path: string | Buffer | URL | number,

		options?: ReadFileOptions,
	) => Promise<string | Buffer>;

	writeFile: (
		path: string | Buffer | URL | number,

		data: string | Uint8Array,

		options?: WriteFileOptions,
	) => Promise<void>;

	mkdir: (
		path: string | Buffer | URL,

		options?: number | MkdirOptions,

		// Returns path if recursive true, else undefined
	) => Promise<string | undefined>;

	unlink: (path: string | Buffer | URL) => Promise<void>;

	rmdir: (
		path: string | Buffer | URL,

		options?: RmdirOptions,
	) => Promise<void>;

	readdir: (
		path: string | Buffer | URL,

		options?: ReaddirOptions | ReaddirWithFileTypesOptions,
	) => Promise<string[] | Buffer[] | FsDirent[]>;

	rename: (
		oldPath: string | Buffer | URL,

		newPath: string | Buffer | URL,
	) => Promise<void>;

	// Add other methods like access, copyFile, lstat, etc. as needed
}

// Overall structure of the fs shim
interface FsShim {
	promises: FsPromisesApi;

	existsSync: (path: string | Buffer | URL) => boolean;

	statSync: (
		path: string | Buffer | URL,

		options?: { bigint?: false; throwIfNoEntry?: boolean },
	) => FsStats;

	realpathSync: (
		path: string | Buffer | URL,

		options?: { encoding?: BufferEncoding } | BufferEncoding,
	) => string;

	readFileSync: (
		path: string | Buffer | URL | number,

		options?: ReadFileOptions,
	) => string | Buffer;

	writeFileSync: (
		path: string | Buffer | URL | number,

		data: string | Uint8Array,

		options?: WriteFileOptions,
	) => void;

	mkdirSync: (
		path: string | Buffer | URL,

		options?: number | MkdirOptions,
	) => string | undefined;

	unlinkSync: (path: string | Buffer | URL) => void;

	rmdirSync: (path: string | Buffer | URL, options?: RmdirOptions) => void;

	readdirSync: (
		path: string | Buffer | URL,

		options?: ReaddirOptions | ReaddirWithFileTypesOptions,
	) => string[] | Buffer[] | FsDirent[];

	renameSync: (
		oldPath: string | Buffer | URL,

		newPath: string | Buffer | URL,
	) => void;

	constants: typeof nodeFsConstants.constants;

	// Return type is fs.ReadStream
	createReadStream: (path: string | Buffer | URL, options?: any) => any;

	// Return type is fs.WriteStream
	createWriteStream: (path: string | Buffer | URL, options?: any) => any;

	watch: (
		filename: string | Buffer | URL,

		options?: any,

		listener?: (
			eventType: string,

			filename: string | Buffer | null,
		) => void,

		// fs.FSWatcher
	) => any;

	watchFile: (
		filename: string | Buffer | URL,

		optionsOrListener?: any,

		listener?: (curr: FsStats, prev: FsStats) => void,
	) => void;

	unwatchFile: (
		filename: string | Buffer | URL,

		listener?: (curr: FsStats, prev: FsStats) => void,
	) => void;
}

async function requestFsFromMountainAsync(
	method: string,

	params: any,
): Promise<any> {
	console.log(`[Cocoon FS Shim] Requesting '${method}' with params:`, params);

	try {
		// 10s timeout
		const response = await sendToMountainAndWait(method, params, 10000);

		console.log(
			`[Cocoon FS Shim] Success response received for '${method}'.`,
		);

		return response;
	} catch (e: any) {
		console.error(
			`[Cocoon FS Shim] Error during IPC call for '${method}':`,

			e,
		);

		const err = new Error(
			e.message || `IPC Error during ${method}`,
		) as NodeJS.ErrnoException;

		if (String(e.message).match(/NotFound|ENOENT/i)) err.code = "ENOENT";
		else if (String(e.message).match(/PermissionDenied|EACCES/i))
			err.code = "EACCES";
		else if (String(e.message).match(/AlreadyExists|EEXIST/i))
			err.code = "EEXIST";
		else if (String(e.message).match(/IsDirectory|EISDIR/i))
			err.code = "EISDIR";
		else if (String(e.message).match(/NotDirectory|ENOTDIR/i))
			err.code = "ENOTDIR";
		else if (String(e.message).match(/Timed ?out/i)) err.code = "ETIMEDOUT";
		// Generic I/O error
		else err.code = "EIO";

		throw err;
	}
}

const fsPromisesShim: FsPromisesApi = {
	stat: async (pathInput: string | Buffer | URL): Promise<FsStats> => {
		const result = (await requestFsFromMountainAsync("fs_stat", {
			path: String(pathInput),

			// Assuming Mountain returns this structure
		})) as Partial<FsStats> & { type?: number };

		if (result && typeof result === "object") {
			// Default to unknown if type not present
			const fileType = result.type || 0;

			const now = Date.now();

			return {
				// Default values ensure FsStats interface is met
				dev: result.dev || 0,

				ino: result.ino || 0,

				mode: result.mode || 0,

				nlink: result.nlink || 0,

				uid: result.uid || 0,

				gid: result.gid || 0,

				rdev: result.rdev || 0,

				size: typeof result.size === "number" ? result.size : 0,

				blksize: result.blksize || 0,

				blocks: result.blocks || 0,

				atimeMs:
					typeof result.atimeMs === "number"
						? result.atimeMs
						: result.atime
							? result.atime.getTime()
							: now,

				mtimeMs:
					typeof result.mtimeMs === "number"
						? result.mtimeMs
						: result.mtime
							? result.mtime.getTime()
							: now,

				ctimeMs:
					typeof result.ctimeMs === "number"
						? result.ctimeMs
						: result.ctime
							? result.ctime.getTime()
							: now,

				birthtimeMs:
					typeof result.birthtimeMs === "number"
						? result.birthtimeMs
						: result.birthtime
							? result.birthtime.getTime()
							: now,

				atime: result.atime || new Date(result.atimeMs || now),

				mtime: result.mtime || new Date(result.mtimeMs || now),

				ctime: result.ctime || new Date(result.ctimeMs || now),

				birthtime:
					result.birthtime || new Date(result.birthtimeMs || now),

				// Assuming VS Code FileType.File is 1
				isFile: () => (fileType & 1) !== 0,

				// Assuming VS Code FileType.Directory is 2
				isDirectory: () => (fileType & 2) !== 0,

				// Assuming VS Code FileType.SymbolicLink is 64
				isSymbolicLink: () => (fileType & 64) !== 0,

				// Assume false for MVP
				isBlockDevice: () => false,

				isCharacterDevice: () => false,

				isFIFO: () => false,

				isSocket: () => false,
			};
		}

		throw new Error("Invalid stat result received from host");
	},

	realpath: async (
		pathInput: string | Buffer | URL,

		_options?: { encoding?: BufferEncoding } | BufferEncoding,
	): Promise<string> => {
		return await requestFsFromMountainAsync("fs_realpath", {
			path: String(pathInput),
		});
	},

	readFile: async (
		pathInput: string | Buffer | URL | number,

		options?: ReadFileOptions,
	): Promise<string | Buffer> => {
		const encoding =
			(typeof options === "string" ? options : options?.encoding) || null;

		const resultBase64 = (await requestFsFromMountainAsync("fs_readFile", {
			path: String(pathInput),
		})) as string;

		if (typeof resultBase64 !== "string") {
			throw new Error("Invalid readFile result (expected base64 string)");
		}

		const buffer = Buffer.from(resultBase64, "base64");

		return encoding && encoding !== "buffer"
			? buffer.toString(encoding)
			: buffer;
	},

	writeFile: async (
		pathInput: string | Buffer | URL | number,

		data: string | Uint8Array,

		options?: WriteFileOptions,
	): Promise<void> => {
		let dataBase64: string;

		if (typeof data === "string") {
			const encoding =
				(typeof options === "string" ? options : options?.encoding) ||
				"utf8";

			dataBase64 = Buffer.from(data, encoding).toString("base64");
		} else {
			// Buffer or Uint8Array
			dataBase64 = Buffer.from(data).toString("base64");
		}

		// Serialize options if Mountain needs them (e.g., mode, flag)
		const ipcOptions: any = {};

		if (typeof options === "object" && options !== null) {
			if (options.mode) ipcOptions.mode = options.mode;

			if (options.flag) ipcOptions.flag = options.flag;
		}

		await requestFsFromMountainAsync("fs_writeFile", {
			path: String(pathInput),

			data: dataBase64,

			options: ipcOptions,
		});
	},

	mkdir: async (
		pathInput: string | Buffer | URL,

		options?: number | MkdirOptions,
	): Promise<string | undefined> => {
		const ipcOptions: MkdirOptions =
			typeof options === "number" ? { mode: options } : options || {};

		await requestFsFromMountainAsync("fs_mkdir", {
			path: String(pathInput),

			...ipcOptions,
		});

		// Node's mkdir returns path if recursive, else undefined
		return ipcOptions.recursive ? String(pathInput) : undefined;
	},

	unlink: async (pathInput: string | Buffer | URL): Promise<void> => {
		await requestFsFromMountainAsync("fs_unlink", {
			path: String(pathInput),
		});
	},

	rmdir: async (
		pathInput: string | Buffer | URL,

		options?: RmdirOptions,
	): Promise<void> => {
		await requestFsFromMountainAsync("fs_rmdir", {
			path: String(pathInput),

			options,
		});
	},

	readdir: async (
		pathInput: string | Buffer | URL,

		options?: ReaddirOptions | ReaddirWithFileTypesOptions,
	): Promise<string[] | Buffer[] | FsDirent[]> => {
		const ipcOptions: any = {};

		if (typeof options === "object" && options !== null) {
			ipcOptions.withFileTypes = options.withFileTypes;

			ipcOptions.recursive = options.recursive;

			// encoding not typically sent for readdir, handled by string[] vs Buffer[] return
		} else if (typeof options === "string") {
			// encoding string
			// encoding not sent, influences return type string[] vs Buffer[]
		}

		const result = await requestFsFromMountainAsync("fs_readdir", {
			path: String(pathInput),

			options: ipcOptions,
		});

		// Mountain needs to return string[] or Dirent-like objects based on withFileTypes
		// For now, assume string[] if not withFileTypes, or needs complex Dirent construction.
		if (ipcOptions.withFileTypes && Array.isArray(result)) {
			return result.map((item: any) => ({
				// item should be { name: string, type: number (node internal type) }

				name: item.name,

				isFile: () =>
					item.type === nodeFsConstants.constants.UV_DIRENT_FILE,

				isDirectory: () =>
					item.type === nodeFsConstants.constants.UV_DIRENT_DIR,

				isSymbolicLink: () =>
					item.type === nodeFsConstants.constants.UV_DIRENT_LNK,

				isBlockDevice: () =>
					item.type === nodeFsConstants.constants.UV_DIRENT_BLOCK,

				isCharacterDevice: () =>
					item.type === nodeFsConstants.constants.UV_DIRENT_CHAR,

				isFIFO: () =>
					item.type === nodeFsConstants.constants.UV_DIRENT_FIFO,

				isSocket: () =>
					item.type === nodeFsConstants.constants.UV_DIRENT_SOCKET,
			})) as FsDirent[];
		}

		// string[] or Buffer[]
		return result || [];
	},

	rename: async (
		oldPath: string | Buffer | URL,

		newPath: string | Buffer | URL,
	): Promise<void> => {
		await requestFsFromMountainAsync("fs_rename", {
			oldPath: String(oldPath),

			newPath: String(newPath),
		});
	},
};

const fsShimInstance: FsShim = {
	promises: fsPromisesShim,

	existsSync: (pathInput: string | Buffer | URL): boolean => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.existsSync is synchronous and not reliably shimmed. Use fs.promises.stat or fs.promises.access instead.",
		);

		throw new Error(
			"fs.existsSync shim is not implemented (use fs.promises API)",
		);
	},

	statSync: (
		pathInput: string | Buffer | URL,

		_options?: { bigint?: false; throwIfNoEntry?: boolean },
	): FsStats => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.statSync is synchronous. Use fs.promises.stat instead.",
		);

		throw new Error(
			"fs.statSync shim is not implemented (use fs.promises.stat)",
		);
	},

	realpathSync: (
		pathInput: string | Buffer | URL,

		_options?: { encoding?: BufferEncoding } | BufferEncoding,
	): string => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.realpathSync is synchronous. Use fs.promises.realpath instead.",
		);

		throw new Error(
			"fs.realpathSync shim is not implemented (use fs.promises.realpath)",
		);
	},

	readFileSync: (
		pathInput: string | Buffer | URL | number,

		_options?: ReadFileOptions,
	): string | Buffer => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.readFileSync is synchronous. Use fs.promises.readFile instead.",
		);

		throw new Error(
			"fs.readFileSync shim is not implemented (use fs.promises.readFile)",
		);
	},

	writeFileSync: (
		pathInput: string | Buffer | URL | number,

		_data: string | Uint8Array,

		_options?: WriteFileOptions,
	): void => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.writeFileSync is synchronous. Use fs.promises.writeFile instead.",
		);

		throw new Error(
			"fs.writeFileSync shim is not implemented (use fs.promises.writeFile)",
		);
	},

	mkdirSync: (
		pathInput: string | Buffer | URL,

		_options?: number | MkdirOptions,
	): string | undefined => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.mkdirSync is synchronous. Use fs.promises.mkdir instead.",
		);

		throw new Error(
			"fs.mkdirSync shim is not implemented (use fs.promises.mkdir)",
		);
	},

	unlinkSync: (pathInput: string | Buffer | URL): void => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.unlinkSync is synchronous. Use fs.promises.unlink instead.",
		);

		throw new Error(
			"fs.unlinkSync shim is not implemented (use fs.promises.unlink)",
		);
	},

	rmdirSync: (
		pathInput: string | Buffer | URL,

		_options?: RmdirOptions,
	): void => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.rmdirSync is synchronous. Use fs.promises.rmdir instead.",
		);

		throw new Error(
			"fs.rmdirSync shim is not implemented (use fs.promises.rmdir)",
		);
	},

	readdirSync: (
		pathInput: string | Buffer | URL,

		_options?: ReaddirOptions | ReaddirWithFileTypesOptions,
	): string[] | Buffer[] | FsDirent[] => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.readdirSync is synchronous. Use fs.promises.readdir instead.",
		);

		throw new Error(
			"fs.readdirSync shim is not implemented (use fs.promises.readdir)",
		);
	},

	renameSync: (
		oldPath: string | Buffer | URL,

		newPath: string | Buffer | URL,
	): void => {
		console.warn(
			"[Cocoon FS Shim] WARNING: fs.renameSync is synchronous. Use fs.promises.rename instead.",
		);

		throw new Error(
			"fs.renameSync shim is not implemented (use fs.promises.rename)",
		);
	},

	// Pass through Node's constants
	constants: nodeFsConstants.constants,

	createReadStream: (_path, _options) => {
		throw new Error("fs.createReadStream shim not implemented");
	},

	createWriteStream: (_path, _options) => {
		throw new Error("fs.createWriteStream shim not implemented");
	},

	watch: (_filename, _options, _listener) => {
		throw new Error("fs.watch shim not implemented");
	},

	watchFile: (_filename, _optionsOrListener, _listener) => {
		throw new Error("fs.watchFile shim not implemented");
	},

	unwatchFile: (_filename, _listener) => {
		throw new Error("fs.unwatchFile shim not implemented");
	},
};

export default fsShimInstance;
