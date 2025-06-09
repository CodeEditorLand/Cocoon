/*
 * File: Cocoon/Source/Shim/Fs.ts
 * Responsibility: Provides a deprecated Node.js 'fs' module shim within the Cocoon sidecar to intercept and proxy file system operations, encouraging migration to the native 'vscode.workspace.fs' API for improved performance and functionality.
 * Modified: 2025-06-07 05:37:39 UTC
 * Dependency: fs, node:buffer, node:fs
 * Export: IFsPromisesApiShim, IFsShim, while
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js 'fs' Module Shim  - For `require('fs')` - OBSOLETE
 * --------------------------------------------------------------------------------------------
 * ##########################################################################################
 * # WARNING: OBSOLETE MODULE - TO BE REMOVED                                               #
 * ##########################################################################################
 * This shim was designed to provide a proxied implementation for Node.js's built-in
 * 'fs' module. HOWEVER, THE INTENDED MOUNTAIN BACKEND FOR THIS SHIM IS
 * DEPRECATED AND NON-FUNCTIONAL.
 *
 * CONSEQUENTLY, THIS `Fs.ts` SHIM WILL **NOT FUNCTION CORRECTLY** AND SHOULD BE REMOVED.
 * Extensions MUST use the `vscode.workspace.fs` API for all filesystem operations.
 *
 * This file is preserved temporarily for context. Its operations have been modified
 * to throw an error immediately to reflect the non-functional backend.
 *
 * Original Intended Responsibilities (if backend were functional):
 * - Mimicking the `fs.promises` API by making asynchronous IPC calls to Mountain.
 * - Discouraging the use of synchronous `fs` methods by providing stubs that throw.
 * - Providing Node.js `fs.constants`.
 *
 *--------------------------------------------------------------------------------------------*/

import { Buffer } from "node:buffer";
import * as NodeFs from "node:fs";
import type * as NodeFsTypes from "node:fs";

console.error(
	"[Cocoon FsShim OBSOLETE] Initializing Node 'fs' module shim. " +
		"WARNING: This shim is NON-FUNCTIONAL due to its deprecated backend. " +
		"This shim WILL BE REMOVED. Extensions MUST use `vscode.workspace.fs`.",
);

// --- Type Definitions ---
type PathLike = NodeFsTypes.PathLike;
type StatsShim = NodeFsTypes.Stats;
type ReadFileOptionShim = Parameters<typeof NodeFs.promises.readFile>[1];
type WriteFileOptionShim = Parameters<typeof NodeFs.promises.writeFile>[2];
type MkdirOptionShim = Parameters<typeof NodeFs.promises.mkdir>[1];
type RmdirOptionShim = Parameters<typeof NodeFs.promises.rmdir>[1];
type ReaddirOptionShim = Parameters<typeof NodeFs.promises.readdir>[1];
type DirentShim = NodeFsTypes.Dirent;

export interface IFsPromisesApiShim {
	Access(Path: PathLike, Mode?: number): Promise<void>;
	GetStat(
		Path: PathLike,
		Option?: NodeFsTypes.StatOptions,
	): Promise<StatsShim>;
	GetLinkStat?(
		Path: PathLike,
		Option?: NodeFsTypes.StatOptions,
	): Promise<StatsShim>;
	GetRealPath(
		Path: PathLike,
		Option?: NodeFsTypes.ObjectEncodingOptions | BufferEncoding,
	): Promise<string>;
	ReadFile(
		Path: PathLike | NodeFsTypes.promises.FileHandle,
		Option?: ReadFileOptionShim,
	): Promise<string | Buffer>;
	WriteFile(
		Path: PathLike | NodeFsTypes.promises.FileHandle,
		Data: string | Uint8Array,
		Option?: WriteFileOptionShim,
	): Promise<void>;
	MakeDirectory(
		Path: PathLike,
		Option?: MkdirOptionShim,
	): Promise<string | undefined>;
	Unlink(Path: PathLike): Promise<void>;
	Remove?(Path: PathLike, Option?: NodeFsTypes.RmOptions): Promise<void>;
	RemoveDirectory(Path: PathLike, Option?: RmdirOptionShim): Promise<void>;
	ReadDirectory(
		Path: PathLike,
		Option?: ReaddirOptionShim,
	): Promise<string[] | Buffer[] | DirentShim[]>;
	Rename(OldPath: PathLike, NewPath: PathLike): Promise<void>;
	CopyFile?(
		Source: PathLike,
		Destination: PathLike,
		Mode?: number,
	): Promise<void>;
}

export interface IFsShim {
	Promise: IFsPromisesApiShim;
	Constant: typeof NodeFs.constants;
	ExistsSync(Path: PathLike): boolean;
	GetStatSync(
		Path: PathLike,
		Option?: NodeFsTypes.StatSyncOptions,
	): StatsShim | undefined;
}

/**
 * Throws an error for any attempted asynchronous FS operation, indicating non-functionality.
 */
async function ThrowAsyncNonFunctionalError(
	OperationName: string,
): Promise<any> {
	const ErrorMessage = `[Node FsShim OBSOLETE & NON-FUNCTIONAL] Attempted async FS operation '${OperationName}'. This relies on a deprecated backend. Extensions MUST use 'vscode.workspace.fs'.`;
	console.error(ErrorMessage);
	const ErrorInstance = new Error(ErrorMessage) as NodeJS.ErrnoException;
	ErrorInstance.code = "ENOSYS"; // Function not implemented
	throw ErrorInstance;
}

/**
 * Throws an error for any attempted synchronous FS operation, indicating non-functionality.
 */
function ThrowSyncNonFunctionalError(OperationName: string): never {
	const ErrorMessage = `[Node FsShim OBSOLETE] fs.${OperationName} is synchronous and its backend is DEPRECATED and NON-FUNCTIONAL. Extensions MUST use the asynchronous 'vscode.workspace.fs' API.`;
	console.error(ErrorMessage);
	throw new Error(ErrorMessage);
}

const FsPromisesImplementation: IFsPromisesApiShim = {
	Access: (Path, Mode) => ThrowAsyncNonFunctionalError("Promise.Access"),
	GetStat: (Path, Option) => ThrowAsyncNonFunctionalError("Promise.GetStat"),
	GetLinkStat: (Path, Option) =>
		ThrowAsyncNonFunctionalError("Promise.GetLinkStat"),
	GetRealPath: (Path, Option) =>
		ThrowAsyncNonFunctionalError("Promise.GetRealPath"),
	ReadFile: (Path, Option) =>
		ThrowAsyncNonFunctionalError("Promise.ReadFile"),
	WriteFile: (Path, Data, Option) =>
		ThrowAsyncNonFunctionalError("Promise.WriteFile"),
	MakeDirectory: (Path, Option) =>
		ThrowAsyncNonFunctionalError("Promise.MakeDirectory"),
	Unlink: (Path) => ThrowAsyncNonFunctionalError("Promise.Unlink"),
	Remove: NodeFs.promises.rm
		? (Path, Option) => ThrowAsyncNonFunctionalError("Promise.Remove")
		: undefined,
	RemoveDirectory: (Path, Option) =>
		ThrowAsyncNonFunctionalError("Promise.RemoveDirectory"),
	ReadDirectory: (Path, Option) =>
		ThrowAsyncNonFunctionalError("Promise.ReadDirectory"),
	Rename: (OldPath, NewPath) =>
		ThrowAsyncNonFunctionalError("Promise.Rename"),
	CopyFile: NodeFs.promises.copyFile
		? (Source, Destination, Mode) =>
				ThrowAsyncNonFunctionalError("Promise.CopyFile")
		: undefined,
};

const FsShimInstance = {
	Promise: FsPromisesImplementation,
	Constant: NodeFs.constants,

	// All synchronous methods throw an error.
	ExistsSync: (Path) => ThrowSyncNonFunctionalError("ExistsSync"),
	GetStatSync: (Path) => ThrowSyncNonFunctionalError("GetStatSync"),
	GetLinkStatSync: (Path) => ThrowSyncNonFunctionalError("GetLinkStatSync"),
	GetRealPathSync: (Path) => ThrowSyncNonFunctionalError("GetRealPathSync"),
	ReadFileSync: (Path) => ThrowSyncNonFunctionalError("ReadFileSync"),
	WriteFileSync: (Path) => ThrowSyncNonFunctionalError("WriteFileSync"),
	MakeDirectorySync: (Path) =>
		ThrowSyncNonFunctionalError("MakeDirectorySync"),
	UnlinkSync: (Path) => ThrowSyncNonFunctionalError("UnlinkSync"),
	RemoveSync: NodeFs.rmSync
		? (Path) => ThrowSyncNonFunctionalError("RemoveSync")
		: undefined,
	RemoveDirectorySync: (Path) =>
		ThrowSyncNonFunctionalError("RemoveDirectorySync"),
	ReadDirectorySync: (Path) =>
		ThrowSyncNonFunctionalError("ReadDirectorySync"),
	RenameSync: (OldPath, NewPath) => ThrowSyncNonFunctionalError("RenameSync"),
	AccessSync: NodeFs.accessSync
		? (Path) => ThrowSyncNonFunctionalError("AccessSync")
		: undefined,
	CreateReadStream: () =>
		ThrowSyncNonFunctionalError(
			"CreateReadStream. Use vscode.workspace.fs instead.",
		),
	CreateWriteStream: () =>
		ThrowSyncNonFunctionalError(
			"CreateWriteStream. Use vscode.workspace.fs instead.",
		),
	Watch: () =>
		ThrowSyncNonFunctionalError(
			"Watch. Use vscode.workspace.createFileSystemWatcher instead.",
		),
};

// Casting to 'any' to satisfy default export type while internally using PascalCase properties.
export default FsShimInstance as any;
