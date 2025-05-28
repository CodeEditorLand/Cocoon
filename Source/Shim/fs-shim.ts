/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js 'fs' Module Shim (fs-shim.ts) - For `require('fs')` - OBSOLETE
 * --------------------------------------------------------------------------------------------
 * ##########################################################################################
 * # WARNING: OBSOLETE MODULE - TO BE REMOVED                                               #
 * ##########################################################################################
 * This shim was designed to provide a proxied implementation for Node.js's built-in
 * 'fs' module, primarily by making IPC calls (e.g., "fs_stat", "fs_readFile") to
 * corresponding handlers expected on the Mountain host process (originally in
 * `handlers/native_fs.rs`).
 *
 * HOWEVER, THE INTENDED MOUNTAIN BACKEND (`handlers/native_fs.rs`) FOR THESE `fs_*`
 * IPC CALLS IS CURRENTLY MARKED AS **DEPRECATED AND NON-FUNCTIONAL**.
 *
 * CONSEQUENTLY, THIS `fs-shim.ts` WILL **NOT FUNCTION CORRECTLY** AND SHOULD BE REMOVED.
 * Extensions MUST use the `vscode.workspace.fs` API (handled by `fs-api-shim.ts`)
 * for all filesystem operations.
 *
 * This file is preserved temporarily for context during the refactoring process.
 *
 * Original Intended Responsibilities (if backend were functional):
 * - Mimicking the `fs.promises` API by making asynchronous IPC calls to Mountain.
 * - Handling data encoding/decoding for IPC transport.
 * - Mapping error responses received from Mountain into Node.js-style filesystem errors.
 * - Strongly discouraging the use of synchronous `fs` methods by providing stubs that throw.
 * - Providing Node.js `fs.constants`.
 *
 *--------------------------------------------------------------------------------------------*/

import { Buffer } from "node:buffer"; // Explicit import for Buffer operations
import * as nodeFs from "node:fs"; // For fs.constants and creating new nodeFs.Stats/Dirent instances
import type * as NodeFsTypes from "node:fs"; // For comprehensive type information

import { sendToMountainAndWait } from "../cocoon-ipc";

console.error(
	// Changed to console.error for high visibility
	"[Cocoon FS Shim - OBSOLETE] Initializing Node 'fs' module shim (for `require('fs')`). " +
		"WARNING: This shim is NON-FUNCTIONAL due to its corresponding backend handlers in Mountain being DEPRECATED. " +
		"This shim WILL BE REMOVED. Extensions MUST use `vscode.workspace.fs` for filesystem operations.",
);

// --- Type Definitions ---
type PathLike = NodeFsTypes.PathLike;
type StatsShim = NodeFsTypes.Stats; // Using Node's own Stats type
type ReadFileOptionsShim = Parameters<typeof nodeFs.promises.readFile>[1];
type WriteFileOptionsShim = Parameters<typeof nodeFs.promises.writeFile>[2];
type MkdirOptionsShim = Parameters<typeof nodeFs.promises.mkdir>[1];
type RmdirOptionsShim = Parameters<typeof nodeFs.promises.rmdir>[1];
type ReaddirOptionsShim = Parameters<typeof nodeFs.promises.readdir>[1];
type DirentShim = NodeFsTypes.Dirent; // Using Node's own Dirent type

export interface FsPromisesApiShim {
	access: (path: PathLike, mode?: number) => Promise<void>;
	stat: (
		path: PathLike,
		opts?: NodeFsTypes.StatOptions,
	) => Promise<StatsShim>;
	lstat?: (
		path: PathLike,
		opts?: NodeFsTypes.StatOptions,
	) => Promise<StatsShim>; // lstat is often present
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
	rm?: (path: PathLike, options?: NodeFsTypes.RmOptions) => Promise<void>; // `rm` is newer
	rmdir: (path: PathLike, options?: RmdirOptionsShim) => Promise<void>;
	readdir: (
		path: PathLike,
		options?: ReaddirOptionsShim,
	) => Promise<string[] | Buffer[] | DirentShim[]>;
	rename: (oldPath: PathLike, newPath: PathLike) => Promise<void>;
	copyFile?: (src: PathLike, dest: PathLike, mode?: number) => Promise<void>; // `copyFile` might not be in all Node versions
}

export interface FsShimStructure {
	promises: FsPromisesApiShim;
	constants: typeof nodeFs.constants;
	// Synchronous API stubs
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
	// Stream and Watcher stubs
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

async function requestFsOpAsync(
	ipcMethod: string,
	ipcParams: any,
): Promise<any> {
	const NON_FUNCTIONAL_ERROR_MESSAGE = `[Node FS Shim - OBSOLETE & NON-FUNCTIONAL] Attempted IPC call to Mountain for '${ipcMethod}'. This relies on backend handlers in 'native_fs.rs' which are DEPRECATED. This operation WILL FAIL. Extensions MUST use 'vscode.workspace.fs'.`;
	console.error(NON_FUNCTIONAL_ERROR_MESSAGE, "Params:", ipcParams);
	// To make the failure very clear and immediate for developers.
	const err = new Error(
		NON_FUNCTIONAL_ERROR_MESSAGE,
	) as NodeJS.ErrnoException;
	err.code = "ENOSYS"; // Function not implemented - a fitting error code.
	throw err;
	// Original try-catch block for sendToMountainAndWait is commented out as it's non-functional.
	/*
	try {
		return await sendToMountainAndWait(ipcMethod, ipcParams, 20000);
	} catch (e: any) {
		// ... error mapping logic ...
		throw err;
	}
	*/
}

const fsPromisesImpl: FsPromisesApiShim = {
	access: async (path: PathLike, mode?: number): Promise<void> => {
		return requestFsOpAsync("fs_access", {
			path: String(path),
			mode: mode ?? nodeFs.constants.F_OK,
		});
	},
	stat: async (
		path: PathLike,
		opts?: NodeFsTypes.StatOptions,
	): Promise<StatsShim> => {
		return requestFsOpAsync("fs_stat", {
			path: String(path),
			bigint: opts?.bigint,
		}) as Promise<StatsShim>; // DTO conversion was here
	},
	lstat: async (
		path: PathLike,
		opts?: NodeFsTypes.StatOptions,
	): Promise<StatsShim> => {
		return requestFsOpAsync("fs_lstat", {
			path: String(path),
			bigint: opts?.bigint,
		}) as Promise<StatsShim>; // DTO conversion was here
	},
	realpath: async (
		path: PathLike,
		_options?: NodeFsTypes.ObjectEncodingOptions | BufferEncoding,
	): Promise<string> => {
		return requestFsOpAsync("fs_realpath", { path: String(path) });
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
					"fs.promises.readFile with FileHandle is not supported by this (obsolete) shim.",
				),
				{ code: "ERR_INVALID_ARG_TYPE" },
			);
		}
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
		const buffer = Buffer.from(resultBase64, "base64"); // This part will fail if requestFsOpAsync throws
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
					"fs.promises.writeFile with FileHandle is not supported by this (obsolete) shim.",
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
		}
		return requestFsOpAsync("fs_writeFile", {
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
		return requestFsOpAsync("fs_mkdir", {
			path: String(path),
			options: ipcOptions,
		});
	},
	unlink: async (path: PathLike): Promise<void> => {
		return requestFsOpAsync("fs_unlink", { path: String(path) });
	},
	rm: nodeFs.promises.rm
		? async (
				path: PathLike,
				options?: NodeFsTypes.RmOptions,
			): Promise<void> => {
				return requestFsOpAsync("fs_rm", {
					path: String(path),
					options,
				});
			}
		: undefined,
	rmdir: async (
		path: PathLike,
		options?: RmdirOptionsShim,
	): Promise<void> => {
		return requestFsOpAsync("fs_rmdir", { path: String(path), options });
	},
	readdir: async (
		path: PathLike,
		options?: ReaddirOptionsShim,
	): Promise<string[] | Buffer[] | DirentShim[]> => {
		// ... (original readdir logic with options parsing) ...
		// This will also fail due to requestFsOpAsync throwing.
		return requestFsOpAsync("fs_readdir", {
			path: String(path) /* options for IPC */,
		});
	},
	rename: async (oldPath: PathLike, newPath: PathLike): Promise<void> => {
		return requestFsOpAsync("fs_rename", {
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
				return requestFsOpAsync("fs_copyFile", {
					src: String(src),
					dest: String(dest),
					mode,
				});
			}
		: undefined,
};

const fsShimModuleInstance: FsShimStructure = {
	promises: fsPromisesImpl,
	constants: nodeFs.constants, // Safe to pass through
	// Synchronous API stubs now consistently throw an error indicating obsolescence and non-functionality.
	existsSync: (_path) => {
		const msg =
			"fs.existsSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	statSync: (_path) => {
		const msg =
			"fs.statSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	lstatSync: (_path) => {
		const msg =
			"fs.lstatSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	realpathSync: (_path) => {
		const msg =
			"fs.realpathSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	readFileSync: (_path) => {
		const msg =
			"fs.readFileSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	writeFileSync: (_path) => {
		const msg =
			"fs.writeFileSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	mkdirSync: (_path) => {
		const msg =
			"fs.mkdirSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	unlinkSync: (_path) => {
		const msg =
			"fs.unlinkSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	rmSync: nodeFs.rmSync
		? (_path) => {
				const msg =
					"fs.rmSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
				console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
				throw new Error(msg);
			}
		: undefined,
	rmdirSync: (_path) => {
		const msg =
			"fs.rmdirSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	readdirSync: (_path) => {
		const msg =
			"fs.readdirSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	renameSync: (_oldP) => {
		const msg =
			"fs.renameSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
		console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
		throw new Error(msg);
	},
	accessSync: nodeFs.accessSync
		? (_path) => {
				const msg =
					"fs.accessSync is synchronous and its backend is DEPRECATED/NON-FUNCTIONAL; use vscode.workspace.fs.";
				console.error(`[Node FS Shim - OBSOLETE] ${msg}`);
				throw new Error(msg);
			}
		: undefined,
	createReadStream: () => {
		throw new Error(
			"fs.createReadStream not supported in Cocoon's obsolete proxied fs shim. Use vscode.workspace.fs.",
		);
	},
	createWriteStream: () => {
		throw new Error(
			"fs.createWriteStream not supported in Cocoon's obsolete proxied fs shim. Use vscode.workspace.fs.",
		);
	},
	watch: () => {
		throw new Error(
			"fs.watch not supported in Cocoon's obsolete proxied fs shim. Use vscode.workspace.createFileSystemWatcher.",
		);
	},
};

export default fsShimModuleInstance;
