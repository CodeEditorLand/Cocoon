/*---------------------------------------------------------------------------------------------
 * Cocoon File System API Shim (shims/fs-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.fs` API, which provides extensions with a structured
 * and asynchronous way to interact with filesystems. This API is distinct from direct
 * Node.js 'fs' module usage (which is handled by `fs-shim.ts`).
 *
 * Operations performed through this API (e.g., `stat`, `readFile`, `writeFile`) are
 * proxied to dedicated handlers in the Mountain host process (typically named
 * `workspacefs_*`) via direct Vine IPC calls. Mountain is then responsible for
 * executing these operations, potentially interacting with different filesystem providers
 * (local disk, remote filesystems, virtual filesystems).
 *
 * Responsibilities:
 * - Implementing all methods of the `vscode.FileSystem` interface.
 * - Proxying each filesystem operation to a corresponding `workspacefs_*` IPC handler
 *   on Mountain using `_ipcRequestResponse` from `BaseCocoonShim`.
 * - Marshalling arguments for IPC:
 *   - `vscode.Uri` objects are converted to a serializable DTO (`ILocalUriComponentsForFs`).
 *   - `Uint8Array` content for `writeFile` is converted to a base64 string.
 * - Unmarshalling results from IPC:
 *   - Base64 string content from `readFile` is converted back to `Uint8Array`.
 *   - Raw stat data DTO from `stat` is converted to a `vscode.FileStat` object.
 *   - Directory entry DTOs from `readDirectory` are converted to `[string, vscode.FileType]` tuples.
 * - Converting structured error responses or generic errors from Mountain/IPC into
 *   specific `vscode.FileSystemError` instances (e.g., `FileNotFound`, `FileExists`).
 * - Providing stubs for `vscode.FileSystemProvider`-related events (`onDidChangeFile`, etc.),
 * 
 * 
 *   as these would require Mountain to push event notifications to Cocoon.
 *
 * Key Interactions:
 * - An instance of `ShimFileSystemApi` is typically created by the API factory in
 *   `Cocoon/index.ts` and made available as `vscode.workspace.fs`.
 * - Uses `BaseCocoonShim` helpers for IPC communication (`_ipcRequestResponse`),
 * 
 * 
 *   argument marshalling/revival, and logging.
 * - Relies on Mountain implementing `workspacefs_*` IPC handlers (e.g., in
 *   `handlers/workspace_fs_api.rs` or similar).
 *

 *--------------------------------------------------------------------------------------------*/

// For Uint8Array <-> base64 string conversion and general buffer operations.
import { VSBuffer } from "vs/base/common/buffer";
// For event types (used for NOP event stubs).
import { Event as VscodeEvent } from "vs/base/common/event";
// For checking $mid in URI DTOs, if BaseCocoonShim._convertApiArgToInternal produces it.
import { MarshalledId } from "vs/base/common/marshalling";
// For RPC DTOs
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// Import types from the public 'vscode' API.
import {
	// For FileChangeEvent (currently stubbed)
	FileChangeType as VscodeFileChangeType,
	// For error handling
	FileSystemError as VscodeFileSystemError,
	// Enum for file types
	FileType as VscodeFileType,
	// The public API Uri type
	Uri as VscodeUri,
	// For onDidChangeFile event (stubbed)
	type FileChangeEvent as VscodeFileChangeEvent,
	// For FileStat.permissions
	type FilePermission as VscodeFilePermission,
	// Return type of stat()
	type FileStat as VscodeFileStat,
	// The interface this class implements
	type FileSystem as VscodeFileSystem,
	// Not directly used by this consumer-side shim
	// type FileSystemProvider,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Data Transfer Object (DTO) for `vscode.Uri` components sent over IPC for filesystem operations.
 * This structure should be produced by `_uriToDtoForFsIpc` (using `BaseCocoonShim._convertApiArgToInternal`)
 * and be consumable by Mountain's `path_from_uri_components` or similar utility.
 */
interface ILocalUriComponentsForFs extends VSCodeInternalUriComponents {
	// BaseCocoonShim._convertApiArgToInternal for VscodeApiUri should produce this structure,
	// potentially including $mid: MarshalledId.UriSimple.
	// Often included for debugging or if path is ambiguous
	// external?: string;
	// Crucial for 'file' URIs if Mountain needs direct path access
	// fsPath?: string;
}

/** Options for `vscode.FileSystem.writeFile`. */
interface VscodeFileWriteOptions {
	create?: boolean;

	overwrite?: boolean;

	// Though atomic part is advanced
	atomic?: boolean | { undoStopBefore: boolean; undoStopAfter: boolean };
}

/** Options for `vscode.FileSystem.delete`. */
interface VscodeFileDeleteOptions {
	recursive?: boolean;

	useTrash?: boolean;
}

/** Options for `vscode.FileSystem.rename` or `vscode.FileSystem.copy`. */
interface VscodeFileOverwriteOptions {
	overwrite?: boolean;
}

/** Tuple representing a directory entry: `[name: string, type: vscode.FileType]`. */
type VscodeDirectoryEntry = [string, VscodeFileType];

/**
 * Raw structure for file statistics received from Mountain's `workspacefs_stat` IPC handler.
 * This DTO is then converted to a `vscode.FileStat` object.
 */
interface RawFileStatFromMountainFsApi {
	/** Numeric value corresponding to `vscode.FileType` enum (0:Unknown, 1:File, 2:Directory, 64:SymbolicLink). */
	type: number;

	/** Creation time in milliseconds since epoch. */
	ctime: number;

	/** Modification time in milliseconds since epoch. */
	mtime: number;

	/** File size in bytes. */
	size: number;

	/** Optional: File permissions bitmask (from `vscode.FilePermission`). */
	permissions?: VscodeFilePermission;
}

/** Maps raw numeric file types from Mountain to `vscode.FileType` enum values. */
const RawFileTypeToVscodeFileType: { [key: number]: VscodeFileType } = {
	0: VscodeFileType.Unknown,

	1: VscodeFileType.File,

	2: VscodeFileType.Directory,

	64: VscodeFileType.SymbolicLink,
};

/**
 * Cocoon's implementation of the `vscode.workspace.fs` API (`vscode.FileSystem`).
 * It proxies filesystem operations to the Mountain host via direct Vine IPC.
 */
export class ShimFileSystemApi
	extends BaseCocoonShim
	implements VscodeFileSystem
{
	// Not a typical DI service, but part of vscode.workspace
	// public readonly _serviceBrand: undefined;

	/**
	 * Creates an instance of ShimFileSystemApi.
	 * @param logService The logging service.
	 */
	constructor(logService: ILogServiceForShim | undefined) {
		super(
			// Service identifier for logging
			"WorkspaceFS_API",

			// rpcService is not used by this shim for its primary IPC calls
			undefined,

			logService,
		);

		this._log(
			"Initialized vscode.workspace.fs API shim (uses direct IPC to Mountain).",
		);
	}

	/**
	 * This shim uses direct IPC and does not strictly require RPC for its core functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Converts a `vscode.Uri` (API type) to a DTO suitable for FS IPC calls.
	 * This ensures that critical fields like `fsPath` (for file URIs) or `external`
	 * string representation are consistently available if Mountain's URI parsing relies on them.
	 * It leverages `BaseCocoonShim._convertApiArgToInternal`.
	 *
	 * @param uri The `vscode.Uri` to convert.
	 * @returns The DTO for IPC, or `undefined` if conversion fails.
	 */
	protected _uriToDtoForFsIpc(
		uri: VscodeUri,
	): ILocalUriComponentsForFs | undefined {
		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Cannot convert non-VscodeUri to DTO for FS IPC.",

				uri,
			);

			return undefined;
		}

		// BaseCocoonShim._convertApiArgToInternal should produce a DTO compatible with ILocalUriComponentsForFs.
		// It typically includes $mid: MarshalledId.UriSimple.
		const components = super._convertApiArgToInternal(uri);

		if (
			components &&
			(components.$mid === MarshalledId.UriSimple ||
				components.$mid === MarshalledId.Uri ||
				(components.scheme && components.path !== undefined))
		) {
			// If it's a marshalled URI DTO or has basic components, assume it's good.
			// Ensure fsPath is present for file URIs if Mountain needs it.
			if (uri.scheme === "file" && components.fsPath === undefined) {
				components.fsPath = uri.fsPath;
			}

			return components as ILocalUriComponentsForFs;
		}

		this._logError(
			"Base marshaller did not produce expected URI DTO for FS IPC. This could lead to issues on Mountain side.",

			"Input URI:",

			uri,

			"Marshalled:",

			components,
		);

		// Fallback to manual construction if really needed, but _convertApiArgToInternal should be primary.
		return {
			// Assume simple for direct IPC if not otherwise specified
			$mid: MarshalledId.UriSimple,

			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			// Include full string representation
			external: uri.toString(true),

			// Ensure fsPath for file URIs
			fsPath: uri.scheme === "file" ? uri.fsPath : undefined,
		};
	}

	/**
	 * Handles errors from filesystem IPC operations, converting them into
	 * appropriate `vscode.FileSystemError` instances.
	 * @param operation The name of the filesystem operation (e.g., "stat", "readFile").
	 * @param uri The URI involved in the operation, for error reporting.
	 * @param thrownError The error object thrown by the IPC call (after refinement by `_ipcRequestResponse`).
	 * @returns A `vscode.FileSystemError` instance.
	 */
	private _handleFsApiError(
		operation: string,

		uri: VscodeUri | undefined,

		thrownError: any,
	): VscodeFileSystemError {
		// `thrownError` should already be an Error instance, potentially with a `code` property,

		// due to `_ipcRequestResponse` using `refineErrorForShim`.
		const error =
			thrownError instanceof Error
				? thrownError
				: new Error(String(thrownError));

		// From refineErrorForShim
		const errorCode = (error as NodeJS.ErrnoException).code;

		const errorMessage = error.message;

		this._logError(
			`WorkspaceFS_API.${operation} failed for URI '${uri?.toString() ?? "unknown"}'. Code: ${errorCode}, Message: ${errorMessage}`,

			// Log full stack for debugging
			error.stack,
		);

		// Create specific FileSystemError based on the code.
		// The URI passed to FileSystemError constructors helps identify the problematic resource.
		// Fallback to message if URI is undefined
		const targetResourceForError = uri || errorMessage;

		if (errorCode === "ENOENT")
			return VscodeFileSystemError.FileNotFound(targetResourceForError);

		if (errorCode === "EEXIST")
			return VscodeFileSystemError.FileExists(targetResourceForError);

		if (errorCode === "EISDIR")
			return VscodeFileSystemError.FileIsADirectory(
				targetResourceForError,
			);

		if (errorCode === "ENOTDIR")
			return VscodeFileSystemError.FileNotADirectory(
				targetResourceForError,
			);

		if (errorCode === "EACCES" || errorCode === "EPERM")
			return VscodeFileSystemError.NoPermissions(targetResourceForError);

		if (errorCode === "ENOSPC")
			// NoSpace takes message
			return VscodeFileSystemError.NoSpace(errorMessage);

		if (errorCode === "ENOTEMPTY")
			return VscodeFileSystemError.FileNotEmpty(targetResourceForError);

		if (errorCode === "ENOTSUP")
			// Operation not supported
			return new VscodeFileSystemError(errorMessage);

		if (errorCode === "EBADARG" || errorCode === "EINVAL")
			// Invalid argument
			return new VscodeFileSystemError(errorMessage);

		if (errorCode === "EBADMSG")
			// Bad IPC message (e.g., unparseable base64)
			return new VscodeFileSystemError(errorMessage);

		if (errorCode === "ETIMEDOUT")
			// Map timeout to unavailable
			return VscodeFileSystemError.Unavailable(errorMessage);

		// For other/unknown errors, use a generic FileSystemError.
		return new VscodeFileSystemError(errorMessage);
	}

	// --- vscode.FileSystem API Implementation ---

	/** {@inheritDoc vscode.FileSystem.stat} */
	public async stat(uri: VscodeUri): Promise<VscodeFileStat> {
		// this._log(`stat: URI='${uri.toString()}'`);

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for stat: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_stat` handler expects `params: [uriDto]`.
			const rawStat = (await this._ipcRequestResponse(
				"workspacefs_stat",

				[uriDto],
			)) as RawFileStatFromMountainFsApi;

			if (
				typeof rawStat?.type !== "number" ||
				typeof rawStat.ctime !== "number" ||
				typeof rawStat.mtime !== "number" ||
				typeof rawStat.size !== "number"
			) {
				this._logError(
					"Received malformed stat data from Mountain for URI:",

					uri.toString(),

					rawStat,
				);

				throw new VscodeFileSystemError(
					`Malformed stat data received for ${uri.toString()}`,
				);
			}

			return {
				type:
					RawFileTypeToVscodeFileType[rawStat.type] ??
					VscodeFileType.Unknown,

				ctime: rawStat.ctime,

				mtime: rawStat.mtime,

				size: rawStat.size,

				// Pass through if available, undefined otherwise
				permissions: rawStat.permissions,
			};
		} catch (e: any) {
			throw this._handleFsApiError("stat", uri, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.readDirectory} */
	public async readDirectory(
		uri: VscodeUri,
	): Promise<VscodeDirectoryEntry[]> {
		// this._log(`readDirectory: URI='${uri.toString()}'`);

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for readDirectory: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_readDirectory` handler expects `params: [uriDto]`
			// and returns `[name: string, typeString: "File" | "Directory" | "SymbolicLink" | "Unknown"][]`.
			const rawEntries = (await this._ipcRequestResponse(
				"workspacefs_readDirectory",

				[uriDto],
			)) as [string, string][];

			if (!Array.isArray(rawEntries)) {
				this._logError(
					"Received malformed readDirectory data (not an array) from Mountain for URI:",

					uri.toString(),

					rawEntries,
				);

				throw new VscodeFileSystemError(
					`Malformed readDirectory data received for ${uri.toString()}`,
				);
			}

			return rawEntries.map(([name, typeStr]): VscodeDirectoryEntry => {
				let fileType = VscodeFileType.Unknown;

				if (typeStr.toLowerCase() === "file")
					fileType = VscodeFileType.File;
				else if (typeStr.toLowerCase() === "directory")
					fileType = VscodeFileType.Directory;
				else if (typeStr.toLowerCase() === "symboliclink")
					fileType = VscodeFileType.SymbolicLink;

				return [name, fileType];
			});
		} catch (e: any) {
			throw this._handleFsApiError("readDirectory", uri, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.readFile} */
	public async readFile(uri: VscodeUri): Promise<Uint8Array> {
		// this._log(`readFile: URI='${uri.toString()}'`);

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for readFile: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_readFile` handler expects `params: [uriDto]` and returns base64 string content.
			const base64Data = (await this._ipcRequestResponse(
				"workspacefs_readFile",

				[uriDto],
			)) as string;

			if (typeof base64Data !== "string") {
				this._logError(
					`readFile IPC response for URI '${uri.toString()}' was not a string as expected. Received:`,

					base64Data,
				);

				throw new VscodeFileSystemError(
					`Received invalid data format for readFile: ${uri.toString()}`,
				);
			}

			const buffer = VSBuffer.fromBase64(base64Data);

			// Get the underlying Uint8Array
			return buffer.buffer;
		} catch (e: any) {
			throw this._handleFsApiError("readFile", uri, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.writeFile} */
	public async writeFile(
		uri: VscodeUri,

		content: Uint8Array,

		options?: VscodeFileWriteOptions,
	): Promise<void> {
		// this._log(`writeFile: URI='${uri.toString()}', ContentLength=${content.byteLength}, Options=${JSON.stringify(options)}`);

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for writeFile: ${uri.toString()}`,
				);

			if (!(content instanceof Uint8Array))
				throw new TypeError("writeFile content must be a Uint8Array.");

			// Convert Uint8Array content to base64 string for IPC transport.
			// Using Node's Buffer for robust base64 encoding.
			const base64Data = Buffer.from(content).toString("base64");

			// Mountain's `workspacefs_writeFile` handler expects `params: [uriDto, base64Data, optionsDto]`.
			// Send empty options object if undefined.
			const params = [uriDto, base64Data, options || {}];

			await this._ipcRequestResponse("workspacefs_writeFile", params);
		} catch (e: any) {
			throw this._handleFsApiError("writeFile", uri, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.createDirectory} */
	public async createDirectory(uri: VscodeUri): Promise<void> {
		// this._log(`createDirectory: URI='${uri.toString()}'`);

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for createDirectory: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_createDirectory` handler expects `params: [uriDto]`.
			await this._ipcRequestResponse("workspacefs_createDirectory", [
				uriDto,
			]);
		} catch (e: any) {
			const filesysError = this._handleFsApiError(
				"createDirectory",

				uri,

				e,
			);

			// `createDirectory` should be idempotent: if the directory already exists, it should not throw an error.
			if (
				filesysError.code === VscodeFileSystemError.FileExists().code ||
				(e as NodeJS.ErrnoException).code === "EEXIST"
			) {
				// this._log(`createDirectory: Directory '${uri.toString()}' already exists. Operation considered successful.`);

				// Ignore FileExists error, as per API contract.
				return;
			}

			// Rethrow other errors.
			throw filesysError;
		}
	}

	/** {@inheritDoc vscode.FileSystem.delete} */
	public async delete(
		uri: VscodeUri,

		options?: VscodeFileDeleteOptions,
	): Promise<void> {
		// this._log(`delete: URI='${uri.toString()}', Options=${JSON.stringify(options)}`);

		if (options?.useTrash) {
			this._logWarnOnce(
				"delete with useTrash=true: Behavior depends on Mountain's native OS trash implementation.",
			);
		}

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for delete: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_delete` handler expects `params: [uriDto, optionsDto]`.
			const params = [uriDto, options || {}];

			await this._ipcRequestResponse("workspacefs_delete", params);
		} catch (e: any) {
			throw this._handleFsApiError("delete", uri, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.rename} */
	public async rename(
		source: VscodeUri,

		target: VscodeUri,

		options?: VscodeFileOverwriteOptions,
	): Promise<void> {
		// this._log(`rename: Source='${source.toString()}', Target='${target.toString()}', Options=${JSON.stringify(options)}`);

		try {
			const sourceDto = this._uriToDtoForFsIpc(source);

			const targetDto = this._uriToDtoForFsIpc(target);

			if (!sourceDto || !targetDto) {
				throw new VscodeFileSystemError(
					`Invalid source or target URI for rename. Source: ${source.toString()}, Target: ${target.toString()}`,
				);
			}

			// Mountain's `workspacefs_rename` handler expects `params: [sourceDto, targetDto, optionsDto]`.
			const params = [sourceDto, targetDto, options || {}];

			await this._ipcRequestResponse("workspacefs_rename", params);
		} catch (e: any) {
			// Pass source URI for error context, as it's the primary subject of failure if it doesn't exist or permissions are wrong.
			throw this._handleFsApiError("rename", source, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.copy} */
	public async copy(
		source: VscodeUri,

		target: VscodeUri,

		options?: VscodeFileOverwriteOptions,
	): Promise<void> {
		// this._log(`copy: Source='${source.toString()}', Target='${target.toString()}', Options=${JSON.stringify(options)}`);

		try {
			const sourceDto = this._uriToDtoForFsIpc(source);

			const targetDto = this._uriToDtoForFsIpc(target);

			if (!sourceDto || !targetDto) {
				throw new VscodeFileSystemError(
					`Invalid source or target URI for copy. Source: ${source.toString()}, Target: ${target.toString()}`,
				);
			}

			// Mountain's `workspacefs_copy` handler expects `params: [sourceDto, targetDto, optionsDto]`.
			// Ensure Mountain's handler correctly implements overwrite behavior based on options.
			const params = [sourceDto, targetDto, options || {}];

			await this._ipcRequestResponse("workspacefs_copy", params);
		} catch (e: any) {
			throw this._handleFsApiError("copy", source, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.isWritableFileSystem} */
	public isWritableFileSystem(scheme: string): boolean | undefined {
		// For MVP, assume 'file' and 'untitled' are writable. Other schemes are unknown.
		// A full implementation might query `MainThreadFileSystemInfoService` for provider capabilities.
		if (scheme === "file" || scheme === "untitled") {
			// this._logWarnOnce(`isWritableFileSystem for scheme '${scheme}' returning 'true' (MVP default).`);

			return true;
		}

		this._logWarnOnce(
			`isWritableFileSystem for scheme '${scheme}' returning 'undefined' (unknown scheme in MVP).`,
		);

		// As per vscode.FileSystem spec, return `undefined` for unknown schemes if capabilities cannot be determined.
		return undefined;
	}

	// --- File Events (onDid*) ---
	// These are NOPs in the current shim as they require Mountain to push event notifications to Cocoon.
	// TODO: Fully implement event propagation for a richer FS API experience. This would involve
	// an `ExtHostFileSystemEventService` listening to RPC calls from Mountain.

	/** NOP: Event for file changes. Requires notifications from Mountain. */
	public readonly onDidChangeFile: VscodeEvent<
		readonly VscodeFileChangeEvent[]
	> = VscodeEvent.None;

	// Placeholder for FileCreateEvent
	// public readonly onDidCreateFiles: VscodeEvent<any /*vscode.FileCreateEvent*/> = VscodeEvent.None;

	// Placeholder for FileDeleteEvent
	// public readonly onDidDeleteFiles: VscodeEvent<any /*vscode.FileDeleteEvent*/> = VscodeEvent.None;

	// Placeholder for FileRenameEvent
	// public readonly onWillRenameFiles: VscodeEvent<any /*vscode.FileRenameEvent*/> = VscodeEvent.None;

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		// No specific event emitters or complex resources in this shim to dispose beyond what base handles.
	}
}
