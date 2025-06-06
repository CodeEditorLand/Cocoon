/*---------------------------------------------------------------------------------------------
 * Cocoon File System API Shim 
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.fs` API (which conforms to `vscode.FileSystem`),
 *
 * providing extensions with a structured and asynchronous way to interact with various
 * filesystems. This API is distinct from direct Node.js 'fs' module usage.
 *
 * Operations performed through this API (e.g., `stat`, `readFile`, `writeFile`,
 *
 * `readDirectory`) are proxied to dedicated handlers in the Mountain host process. These
 * handlers are assumed to be named with a `workspacefs_*` prefix (e.g., `workspacefs_stat`,
 *
 * `workspacefs_readFile`) and are invoked via direct Vine IPC calls. Mountain is then
 * responsible for executing these operations.
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
 * - Providing `isWritableFileSystem(scheme)` based on capabilities from an injected `IExtHostFileSystemInfo`.
 * - Providing stubs for `vscode.FileSystemProvider`-related events (`onDidChangeFile`, etc.),
 *   as these would require Mountain to push event notifications to Cocoon.
 *
 * Key Interactions:
 * - An instance of `ShimFileSystemApi` is typically created by the API factory and exposed as `vscode.workspace.fs`.
 * - Uses `BaseCocoonShim` for IPC, logging, argument marshalling/revival, and error refinement.
 * - Depends on `IExtHostFileSystemInfo` for `isWritableFileSystem`.
 * - Relies on Mountain implementing corresponding `workspacefs_*` IPC handlers.
 *
 * Assumed IPC Contract with Mountain:
 * - Method "workspacefs_stat": Params: `[uriDto: ILocalUriComponentsForFs]`. Returns: `{ params: RawFileStatFromMountainFsApi }`
 * - Method "workspacefs_readDirectory": Params: `[uriDto]`. Returns: `{ params: [name: string, typeString: "File" | "Directory" | ...][] }`
 * - Method "workspacefs_readFile": Params: `[uriDto]`. Returns: `{ params: base64String }`
 * - Method "workspacefs_writeFile": Params: `[uriDto, base64Data: string, optionsDto: VscodeFileWriteOptions?]`. Returns: `{ params: null }`
 * - Method "workspacefs_createDirectory": Params: `[uriDto]`. Returns: `{ params: null }`
 * - Method "workspacefs_delete": Params: `[uriDto, optionsDto: VscodeFileDeleteOptions?]`. Returns: `{ params: null }`
 * - Method "workspacefs_rename": Params: `[sourceUriDto, targetUriDto, optionsDto: VscodeFileOverwriteOptions?]`. Returns: `{ params: null }`
 * - Method "workspacefs_copy": Params: `[sourceUriDto, targetUriDto, optionsDto: VscodeFileOverwriteOptions?]`. Returns: `{ params: null }`
 * Errors from Mountain are expected as VineErrorPayload.
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

// For Uint8Array <-> base64 string conversion and general buffer operations.
import { VSBuffer } from "vs/base/common/buffer";
// For event types (used for NOP event stubs).
import { Event as VscodeEvent } from "vs/base/common/event";
// For checking $mid in URI DTOs.
import { MarshalledId } from "vs/base/common/marshalling";
// For type compatibility with internal URI representations.
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// For determining filesystem writability.
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";
// For querying filesystem capabilities.
import type { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
// Import types from the public 'vscode' API.
import {
	// FileChangeType as VscodeFileChangeType, // For FileChangeEvent (currently stubbed) - Not actively used by events yet
	FileSystemError as VscodeFileSystemError, // For error handling
	FileType as VscodeFileType, // Enum for file types
	Uri as VscodeUri, // The public API Uri type
	type FileChangeEvent as VscodeFileChangeEvent, // For onDidChangeFile event (stubbed)
	type FilePermission as VscodeFilePermission, // For FileStat.permissions
	type FileStat as VscodeFileStat, // Return type of stat()
	type FileSystem as VscodeFileSystem, // The interface this class implements
} from "vscode";

import {
	BaseCocoonShim,
	// refineErrorForShim, // refineErrorForShim is used internally by _ipcRequestResponse
	type ILogServiceForShim,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Data Transfer Object (DTO) for `vscode.Uri` components sent over IPC for filesystem operations.
 * This structure should be produced by `_uriToDtoForFsIpc` and be consumable by Mountain.
 */
interface ILocalUriComponentsForFs extends VSCodeInternalUriComponents {
	fsPath?: string; // Crucial for 'file' URIs if Mountain needs direct path access
	external?: string; // Full string representation, often useful for Mountain or debugging
}

/** Options for `vscode.FileSystem.writeFile`. */
interface VscodeFileWriteOptions {
	create?: boolean;
	overwrite?: boolean;
	atomic?: boolean | { undoStopBefore: boolean; undoStopAfter: boolean }; // Atomic part is advanced
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
	64: VscodeFileType.SymbolicLink, // VS Code's internal value for SymbolicLink
};

/**
 * Cocoon's implementation of the `vscode.workspace.fs` API (`vscode.FileSystem`).
 * It proxies filesystem operations to the Mountain host via direct Vine IPC.
 */
export class ShimFileSystemApi
	extends BaseCocoonShim
	implements VscodeFileSystem
{
	private readonly _fsInfo: IExtHostFileSystemInfo;

	/**
	 * Creates an instance of ShimFileSystemApi.
	 * @param logService The logging service.
	 * @param fsInfoService Service to get filesystem capabilities.
	 */
	constructor(
		logService: ILogServiceForShim | undefined,
		fsInfoService: IExtHostFileSystemInfo,
	) {
		super(
			"WorkspaceFS_API", // Service identifier for logging
			undefined, // rpcService is not used by this shim for its primary IPC calls
			logService,
		);
		this._fsInfo = fsInfoService;
		this._logInfo(
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
				"Received:",
				uri,
			);
			return undefined;
		}
		const components = super._convertApiArgToInternal(uri);

		if (
			components &&
			(components.$mid === MarshalledId.UriSimple ||
				components.$mid === MarshalledId.Uri ||
				(typeof components.scheme === "string" &&
					typeof components.path === "string"))
		) {
			const dto = components as ILocalUriComponentsForFs;
			// Ensure fsPath and external string are present if Mountain might need them
			if (uri.scheme === "file" && dto.fsPath === undefined) {
				dto.fsPath = uri.fsPath;
			}
			if (dto.external === undefined) {
				dto.external = uri.toString(true); // true to skip encoding, Mountain might prefer raw
			}
			return dto;
		}
		this._logError(
			"Base marshaller did not produce an expected URI DTO for FS IPC. This could lead to issues on Mountain side.",
			"Input URI:",
			uri,
			"Marshalled output:",
			components,
		);
		return undefined; // Indicate failure to convert
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
		const errorCode = (error as NodeJS.ErrnoException).code; // From refineErrorForShim
		const errorMessage =
			error.message || `Unknown error during ${operation}`;

		this._logError(
			`WorkspaceFS_API.${operation} failed for URI '${uri?.toString() ?? "unknown"}'. Code: ${errorCode || "N/A"}, Message: ${errorMessage}`,
			error.stack, // Log full stack for debugging
		);

		// Create specific FileSystemError based on the code.
		// The URI passed to FileSystemError constructors helps identify the problematic resource.
		const targetResourceForError = uri || errorMessage; // Fallback to message if URI is undefined

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
			return VscodeFileSystemError.NoSpace(errorMessage); // NoSpace takes message
		if (errorCode === "ENOTEMPTY")
			return VscodeFileSystemError.FileNotEmpty(targetResourceForError);
		if (errorCode === "ENOTSUP")
			return new VscodeFileSystemError(errorMessage); // Operation not supported
		if (errorCode === "EBADARG" || errorCode === "EINVAL")
			return new VscodeFileSystemError(errorMessage); // Invalid argument
		if (errorCode === "EBADMSG")
			return new VscodeFileSystemError(errorMessage); // Bad IPC message (e.g., unparseable base64)
		if (errorCode === "ETIMEDOUT")
			return VscodeFileSystemError.Unavailable(errorMessage); // Map timeout to unavailable

		// For other/unknown errors, use a generic FileSystemError.
		return new VscodeFileSystemError(errorMessage);
	}

	// --- vscode.FileSystem API Implementation ---

	/** {@inheritDoc vscode.FileSystem.stat} */
	public async stat(uri: VscodeUri): Promise<VscodeFileStat> {
		this._logDebug(`API stat: URI='${uri.toString()}'`);
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
				permissions: rawStat.permissions, // Pass through if available, undefined otherwise
			};
		} catch (e: any) {
			throw this._handleFsApiError("stat", uri, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.readDirectory} */
	public async readDirectory(
		uri: VscodeUri,
	): Promise<VscodeDirectoryEntry[]> {
		this._logDebug(`API readDirectory: URI='${uri.toString()}'`);
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
				let fileTypeEnum = VscodeFileType.Unknown;
				const lowerTypeStr = typeStr.toLowerCase();
				if (lowerTypeStr === "file") fileTypeEnum = VscodeFileType.File;
				else if (lowerTypeStr === "directory")
					fileTypeEnum = VscodeFileType.Directory;
				else if (lowerTypeStr === "symboliclink")
					fileTypeEnum = VscodeFileType.SymbolicLink;
				return [name, fileTypeEnum];
			});
		} catch (e: any) {
			throw this._handleFsApiError("readDirectory", uri, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.readFile} */
	public async readFile(uri: VscodeUri): Promise<Uint8Array> {
		this._logDebug(`API readFile: URI='${uri.toString()}'`);
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
			return buffer.buffer; // Get the underlying Uint8Array
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
		this._logDebug(
			`API writeFile: URI='${uri.toString()}', ContentLength=${content.byteLength}, Opts=${JSON.stringify(options)}`,
		);
		try {
			const uriDto = this._uriToDtoForFsIpc(uri);
			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for writeFile: ${uri.toString()}`,
				);
			if (!(content instanceof Uint8Array))
				throw new TypeError("writeFile content must be a Uint8Array.");

			// Convert Uint8Array content to base64 string for IPC transport.
			const base64Data = VSBuffer.wrap(content).toString("base64"); // Use VSBuffer for consistency

			// Mountain's `workspacefs_writeFile` handler expects `params: [uriDto, base64Data, optionsDto]`.
			const params = [uriDto, base64Data, options || {}]; // Send empty options object if undefined.
			await this._ipcRequestResponse("workspacefs_writeFile", params);
		} catch (e: any) {
			throw this._handleFsApiError("writeFile", uri, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.createDirectory} */
	public async createDirectory(uri: VscodeUri): Promise<void> {
		this._logDebug(`API createDirectory: URI='${uri.toString()}'`);
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
				this._logDebug(
					`createDirectory: Directory '${uri.toString()}' already exists. Operation considered successful (idempotent).`,
				);
				return; // Ignore FileExists error, as per API contract.
			}
			throw filesysError; // Rethrow other errors.
		}
	}

	/** {@inheritDoc vscode.FileSystem.delete} */
	public async delete(
		uri: VscodeUri,
		options?: VscodeFileDeleteOptions,
	): Promise<void> {
		this._logDebug(
			`API delete: URI='${uri.toString()}', Opts=${JSON.stringify(options)}`,
		);
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
		this._logDebug(
			`API rename: Src='${source.toString()}', Target='${target.toString()}', Opts=${JSON.stringify(options)}`,
		);
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
		this._logDebug(
			`API copy: Src='${source.toString()}', Target='${target.toString()}', Opts=${JSON.stringify(options)}`,
		);
		try {
			const sourceDto = this._uriToDtoForFsIpc(source);
			const targetDto = this._uriToDtoForFsIpc(target);
			if (!sourceDto || !targetDto) {
				throw new VscodeFileSystemError(
					`Invalid source or target URI for copy. Source: ${source.toString()}, Target: ${target.toString()}`,
				);
			}
			// Mountain's `workspacefs_copy` handler expects `params: [sourceDto, targetDto, optionsDto]`.
			const params = [sourceDto, targetDto, options || {}];
			await this._ipcRequestResponse("workspacefs_copy", params);
		} catch (e: any) {
			throw this._handleFsApiError("copy", source, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.isWritableFileSystem} */
	public isWritableFileSystem(scheme: string): boolean | undefined {
		const capabilities = this._fsInfo.getCapabilities(scheme);
		if (capabilities === undefined) {
			this._logWarnOnce(
				`isWritableFileSystem: Capabilities for scheme '${scheme}' are unknown by IExtHostFileSystemInfo. Returning undefined.`,
			);
			return undefined; // As per vscode.FileSystem spec for unknown schemes
		}
		// Writable if Readonly capability is NOT set
		const isWritable = !(
			capabilities & FileSystemProviderCapabilities.Readonly
		);
		this._logDebug(
			`isWritableFileSystem for scheme '${scheme}': ${isWritable} (Capabilities: ${capabilities})`,
		);
		return isWritable;
	}

	// --- File Events (onDid*) ---
	// These are NOPs in the current shim as they require Mountain to push event notifications to Cocoon.
	// TODO: Fully implement event propagation for a richer FS API experience. This would involve
	// an `ExtHostFileSystemEventService` listening to RPC calls from Mountain.

	/** NOP: Event for file changes. Requires notifications from Mountain. */
	public readonly onDidChangeFile: VscodeEvent<
		readonly VscodeFileChangeEvent[]
	> = VscodeEvent.None;
	// public readonly onDidCreateFiles: VscodeEvent<any /*vscode.FileCreateEvent*/> = VscodeEvent.None; // Placeholder
	// public readonly onDidDeleteFiles: VscodeEvent<any /*vscode.FileDeleteEvent*/> = VscodeEvent.None; // Placeholder
	// public readonly onWillRenameFiles: VscodeEvent<any /*vscode.FileRenameEvent*/> = VscodeEvent.None; // Placeholder

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		this._logInfo("Disposed.");
		// No specific event emitters or complex resources in this shim to dispose beyond what base handles.
	}
}
