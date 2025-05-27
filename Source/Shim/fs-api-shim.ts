/*---------------------------------------------------------------------------------------------
 * Cocoon File System API Shim (fs-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.fs` API (which conforms to `vscode.FileSystem`),
 *
 * providing extensions with a structured and asynchronous way to interact with various
 * filesystems. This API is distinct from direct Node.js 'fs' module usage, which is
 * typically path-based and handled by `fs-shim.ts`.
 *
 * Operations performed through this API (e.g., `stat`, `readFile`, `writeFile`,
 *
 * `readDirectory`) are proxied to dedicated handlers in the Mountain host process. These
 * handlers are assumed to be named with a `workspacefs_*` prefix (e.g., `workspacefs_stat`,
 *
 * `workspacefs_readFile`) and are invoked via direct Vine IPC calls. Mountain is then
 * responsible for executing these operations, potentially by interacting with different
 * underlying filesystem providers (local disk, remote filesystems, virtual in-memory
 * filesystems, etc.).
 *
 * Responsibilities:
 * - Implementing all methods of the `vscode.FileSystem` interface as defined in `vscode.d.ts`.
 * - Proxying each filesystem operation to a corresponding `workspacefs_*` IPC handler
 *   on Mountain using the `_ipcRequestResponse` helper from `BaseCocoonShim`.
 * - Marshalling arguments for IPC transport:
 *   - `vscode.Uri` objects are converted to a serializable DTO (`ILocalUriComponentsForFs`)
 *     using `_uriToDtoForFsIpc`, which leverages `BaseCocoonShim._convertApiArgToInternal`.
 *   - `Uint8Array` content for `writeFile` is converted to a base64 encoded string.
 * - Unmarshalling results received from Mountain via IPC:
 *   - Base64 encoded string content from `readFile` is converted back to `Uint8Array`.
 *   - Raw stat data DTO received from `stat` is converted into a `vscode.FileStat` object.
 *   - Directory entry DTOs from `readDirectory` are converted into
 *     `[name: string, type: vscode.FileType]` tuples.
 * - Converting structured error responses or generic errors from Mountain/IPC into
 *   specific `vscode.FileSystemError` instances (e.g., `FileNotFound`, `FileExists`,
 *
 *   `NoPermissions`) using the `_handleFsApiError` utility.
 * - Providing stubs for `vscode.FileSystemProvider`-related events (`onDidChangeFile`, etc.),
 *
 *   as a full implementation of these would require Mountain to push event notifications
 *   to Cocoon, which is beyond the scope of this MVP shim.
 *
 * Key Interactions:
 * - An instance of `ShimFileSystemApi` is typically created by the API factory provider
 *   in `Cocoon/index.ts` and made available to extensions as `vscode.workspace.fs`.
 * - Uses helper methods from `BaseCocoonShim` for:
 *   - IPC communication (`_ipcRequestResponse`).
 *   - Argument marshalling (`_convertApiArgToInternal` via `_uriToDtoForFsIpc`).
 *   - Logging (`_logDebug`, `_logError`, etc.).
 * - Relies on the Mountain host process implementing the corresponding `workspacefs_*`
 *   IPC handlers (e.g., in `handlers/workspace_fs_api.rs` or a similar module on the
 *   Mountain side).
 *
 *--------------------------------------------------------------------------------------------*/

// For Uint8Array <-> base64 string conversion (using VSBuffer) and general buffer operations.
import { VSBuffer } from "vs/base/common/buffer";
// For event types (used for NOP event stubs, e.g., VscodeEvent.None).
import { Event as VscodeEvent } from "vs/base/common/event";
// For checking $mid in URI DTOs, if BaseCocoonShim._convertApiArgToInternal produces it.
import { MarshalledId } from "vs/base/common/marshalling";
// For type of URI components if marshalling from VSCodeInternalURI
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// Import types from the public 'vscode' API.
import {
	// For FileChangeEvent (currently stubbed) - not directly used if event is VscodeEvent.None
	// FileChangeType,

	// For error handling and creating specific FS errors.
	FileSystemError as VscodeFileSystemError,
	// Enum for file types (File, Directory, SymbolicLink, Unknown).
	FileType as VscodeFileType,
	// The public API Uri type used in method signatures.
	Uri as VscodeUri,
	// For onDidChangeFile event type (stubbed).
	type FileChangeEvent as VscodeFileChangeEvent,
	// For FileStat.permissions property.
	type FilePermission as VscodeFilePermission,
	// Return type of stat().
	type FileStat as VscodeFileStat,
	// The interface this class implements.
	type FileSystem as VscodeFileSystem,
	// Not directly used by this consumer-side shim that proxies to Mountain.
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
 * This structure should be reliably produced by `_uriToDtoForFsIpc` (which internally uses
 * `BaseCocoonShim._convertApiArgToInternal`) and be consumable by Mountain's URI parsing
 * utilities (e.g., `path_from_uri_components` if Mountain uses Rust).
 */
interface ILocalUriComponentsForFs extends VSCodeInternalUriComponents {
	// BaseCocoonShim._convertApiArgToInternal for a VscodeApiUri should produce a structure
	// compatible with this, potentially including a `$mid: MarshalledId.UriSimple` marker.
	// Optional fields that might be included by the marshaller or useful for Mountain:
	// Full string representation, e.g., uri.toString(true)
	// external?: string;
	// Absolute filesystem path, crucial for 'file' URIs if Mountain needs direct path access.
	// fsPath?: string;
}

/** Options for `vscode.FileSystem.writeFile` method. */
interface VscodeFileWriteOptions {
	// If true, create the file if it does not exist.
	create?: boolean;

	// If true, overwrite the file if it already exists.
	overwrite?: boolean;

	// `atomic` options are advanced and typically require specific provider support.
	// For MVP, Mountain's handler might not support full atomicity.
	atomic?: boolean | { undoStopBefore: boolean; undoStopAfter: boolean };
}

/** Options for `vscode.FileSystem.delete` method. */
interface VscodeFileDeleteOptions {
	// If true, delete directories recursively.
	recursive?: boolean;

	// If true, move to OS trash/recycle bin instead of permanent deletion.
	useTrash?: boolean;
}

/** Options for `vscode.FileSystem.rename` or `vscode.FileSystem.copy` methods. */
interface VscodeFileOverwriteOptions {
	// If true, overwrite the target if it exists.
	overwrite?: boolean;
}

/** Tuple representing a directory entry: `[name: string, type: vscode.FileType]`. */
type VscodeDirectoryEntry = [string, VscodeFileType];

/**
 * Raw structure for file statistics (metadata) received from Mountain's `workspacefs_stat` IPC handler.
 * This DTO is then converted to a `vscode.FileStat` object by the shim.
 * Mountain must send data that can be mapped to these fields.
 */
interface RawFileStatFromMountainFsApi {
	/** Numeric value corresponding to `vscode.FileType` enum (0:Unknown, 1:File, 2:Directory, 64:SymbolicLink). */
	type: number;

	/** Creation time in milliseconds since epoch (Unix timestamp). */
	ctime: number;

	/** Modification time in milliseconds since epoch. */
	mtime: number;

	/** File size in bytes. For directories, this might be 0 or provider-dependent. */
	size: number;

	/** Optional: File permissions bitmask (from `vscode.FilePermission` enum, e.g., Readonly). */
	permissions?: VscodeFilePermission;
}

/** Maps raw numeric file types received from Mountain to `vscode.FileType` enum values. */
const RawFileTypeToVscodeFileType: { [key: number]: VscodeFileType } = {
	0: VscodeFileType.Unknown,

	1: VscodeFileType.File,

	2: VscodeFileType.Directory,

	// 64 is VS Code's internal representation for SymbolicLink in FileType.
	64: VscodeFileType.SymbolicLink,
};

/**
 * Cocoon's implementation of the `vscode.workspace.fs` API (`vscode.FileSystem`).
 * It proxies filesystem operations to the Mountain host process via direct Vine IPC calls.
 */
export class ShimFileSystemApi
	extends BaseCocoonShim
	implements VscodeFileSystem
{
	// `_serviceBrand` is not typically defined for `vscode.workspace.fs` as it's a direct API object,

	// not a DI-injected service in the same way other ExtHost services are.
	// public readonly _serviceBrand: undefined;

	/**
	 * Creates an instance of ShimFileSystemApi.
	 * @param logService The logging service instance.
	 */
	constructor(logService: ILogServiceForShim | undefined) {
		super(
			// Service identifier for logging purposes.
			"WorkspaceFS_API",

			// rpcService is not used by this shim for its primary IPC calls.
			undefined,

			logService,
		);

		this._logInfo(
			"Initialized vscode.workspace.fs API shim (uses direct IPC to Mountain for operations).",
		);
	}

	/**
	 * This shim uses direct IPC (`_ipcRequestResponse`) for its core filesystem operations
	 * and does not rely on the main RPC proxy mechanism.
	 * @returns `false` as RPC is not required for this shim's functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Converts a `vscode.Uri` (public API type) to a DTO suitable for FS IPC calls to Mountain.
	 * This method leverages `BaseCocoonShim._convertApiArgToInternal` for the primary conversion
	 * and then ensures critical fields like `fsPath` (for 'file' scheme URIs) are present if
	 * Mountain's URI parsing logic might rely on them.
	 *
	 * @param uri The `vscode.Uri` instance to convert.
	 * @returns The DTO for IPC, or `undefined` if the input URI is invalid or conversion fails.
	 */
	protected _uriToDtoForFsIpc(
		uri: VscodeUri,
	): ILocalUriComponentsForFs | undefined {
		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Cannot convert non-VscodeUri to DTO for FS IPC. Input must be a vscode.Uri instance.",

				"Received:",

				uri,
			);

			return undefined;
		}

		// `BaseCocoonShim._convertApiArgToInternal` should produce a DTO compatible with ILocalUriComponentsForFs.
		// This DTO often includes a `$mid: MarshalledId.UriSimple` marker.
		const components = super._convertApiArgToInternal(uri);

		if (
			components &&
			(components.$mid === MarshalledId.UriSimple ||
				components.$mid === MarshalledId.Uri ||
				(components.scheme && components.path !== undefined))
		) {
			// If it's a recognized marshalled URI DTO or has basic URI components, assume it's valid.
			// Ensure fsPath is present for 'file' URIs, as Mountain's native FS operations might need it.
			if (uri.scheme === "file" && components.fsPath === undefined) {
				// Add fsPath if missing for file URIs.
				components.fsPath = uri.fsPath;
			}

			return components as ILocalUriComponentsForFs;
		}

		this._logError(
			"Base marshaller `_convertApiArgToInternal` did not produce an expected URI DTO structure for FS IPC. " +
				"This could lead to issues on the Mountain (host) side when parsing the URI.",

			"Input URI:",

			uri,

			"Output from marshaller:",

			components,
		);

		// Fallback to a manual, minimal construction if the base marshaller fails or produces an unexpected structure.
		// This is a safety net but might lack specific marshalling details (like $mid) if Mountain relies on them.
		this._logWarn(
			"Falling back to manual URI DTO construction for FS IPC due to marshaller issue.",
		);

		return {
			// Assume $mid: MarshalledId.UriSimple if generating manually for direct IPC.
			$mid: MarshalledId.UriSimple,

			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			// Include full string representation for robustness.
			external: uri.toString(true),

			// Ensure fsPath for file URIs.
			fsPath: uri.scheme === "file" ? uri.fsPath : undefined,
		} as ILocalUriComponentsForFs;
	}

	/**
	 * Handles errors received from filesystem IPC operations. It attempts to convert
	 * these errors (which might be generic or have specific codes from Mountain) into
	 * appropriate `vscode.FileSystemError` instances for the extension API.
	 *
	 * @param operation The name of the filesystem operation being performed (e.g., "stat", "readFile"), for logging.
	 * @param uri The `vscode.Uri` involved in the operation, used for context in error messages.
	 * @param thrownError The error object thrown by the `_ipcRequestResponse` call (already refined by `refineErrorForShim`).
	 * @returns A `vscode.FileSystemError` instance, specialized if the error code is recognized.
	 */
	private _handleFsApiError(
		operation: string,

		uri: VscodeUri | undefined,

		thrownError: any,
	): VscodeFileSystemError {
		// `thrownError` should already be an `Error` instance due to `_ipcRequestResponse` using `refineErrorForShim`.
		const error =
			thrownError instanceof Error
				? thrownError
				: new Error(String(thrownError));

		// `refineErrorForShim` might add this.
		const errorCode = (error as NodeJS.ErrnoException).code;

		const errorMessage =
			error.message || `Unknown error during ${operation}`;

		this._logError(
			`WorkspaceFS_API operation '${operation}' failed for URI '${uri?.toString() ?? "unknown"}'. Code: ${errorCode || "N/A"}, Message: ${errorMessage}`,

			// Log full stack for debugging.
			error.stack,
		);

		// Create specific `vscode.FileSystemError` based on the error code.
		// The `uri` passed to FileSystemError constructors helps identify the problematic resource for the extension.
		// Fallback to using the error message if URI is undefined.
		const targetResourceForError = uri || errorMessage;

		// Map common Node.js/POSIX error codes to vscode.FileSystemError types.
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
			// NoSpace takes a message string.
			return VscodeFileSystemError.NoSpace(errorMessage);

		if (errorCode === "ENOTEMPTY")
			return VscodeFileSystemError.FileNotEmpty(targetResourceForError);

		// Generic or less common errors:
		if (errorCode === "ENOTSUP")
			// Operation not supported.
			return new VscodeFileSystemError(errorMessage);

		if (
			errorCode === "EBADMSG" ||
			errorCode === "EINVAL" ||
			errorCode === "EBADARG"
		)
			// Invalid argument or bad IPC message.
			return new VscodeFileSystemError(errorMessage);

		if (errorCode === "ETIMEDOUT")
			// Map timeout to Unavailable.
			return VscodeFileSystemError.Unavailable(errorMessage);

		// For other/unknown errors, use a generic FileSystemError with the original message.
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
					`Invalid URI provided for stat operation: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_stat` handler expects `params: [uriDto]`.
			const rawStat = (await this._ipcRequestResponse(
				"workspacefs_stat",

				[uriDto],
			)) as RawFileStatFromMountainFsApi;

			// Validate the structure of rawStat received from Mountain.
			if (
				typeof rawStat?.type !== "number" ||
				typeof rawStat.ctime !== "number" ||
				typeof rawStat.mtime !== "number" ||
				typeof rawStat.size !== "number"
			) {
				this._logError(
					"Received malformed stat data DTO from Mountain for URI:",

					uri.toString(),

					"Raw DTO:",

					rawStat,
				);

				throw new VscodeFileSystemError(
					`Malformed stat data received from host for ${uri.toString()}`,
				);
			}

			return {
				type:
					RawFileTypeToVscodeFileType[rawStat.type] ??
					// Map numeric type to enum.
					VscodeFileType.Unknown,

				// Creation time (milliseconds since epoch).
				ctime: rawStat.ctime,

				// Modification time.
				mtime: rawStat.mtime,

				// File size in bytes.
				size: rawStat.size,

				// Optional permissions (e.g., Readonly). Pass through if available.
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
		this._logDebug(`API readDirectory: URI='${uri.toString()}'`);

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI provided for readDirectory operation: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_readDirectory` handler expects `params: [uriDto]`
			// and is assumed to return an array of `[name: string, typeString: "File" | "Directory" | "SymbolicLink" | "Unknown"]` tuples.
			const rawEntries = (await this._ipcRequestResponse(
				"workspacefs_readDirectory",

				[uriDto],
			)) as [string, string][];

			if (!Array.isArray(rawEntries)) {
				this._logError(
					"Received malformed readDirectory data (expected an array) from Mountain for URI:",

					uri.toString(),

					"Raw Data:",

					rawEntries,
				);

				throw new VscodeFileSystemError(
					`Malformed readDirectory data received from host for ${uri.toString()}`,
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

				// If typeStr is "unknown" or not recognized, it defaults to VscodeFileType.Unknown.
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
					`Invalid URI provided for readFile operation: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_readFile` handler expects `params: [uriDto]` and returns file content as a base64 encoded string.
			const base64Data = (await this._ipcRequestResponse(
				"workspacefs_readFile",

				[uriDto],
			)) as string;

			if (typeof base64Data !== "string") {
				this._logError(
					`readFile IPC response for URI '${uri.toString()}' was not a string (expected base64 data). Received type: ${typeof base64Data}`,

					"Received value (first 100 chars):",

					String(base64Data).substring(0, 100),
				);

				throw new VscodeFileSystemError(
					`Received invalid data format from host for readFile: ${uri.toString()}`,
				);
			}

			// Convert base64 string to VSBuffer.
			const buffer = VSBuffer.fromBase64(base64Data);

			// Return the underlying Uint8Array from VSBuffer.
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
		this._logDebug(
			`API writeFile: URI='${uri.toString()}', ContentLength=${content.byteLength}, Options=${JSON.stringify(options)}`,
		);

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI provided for writeFile operation: ${uri.toString()}`,
				);

			if (!(content instanceof Uint8Array)) {
				// API contract expects Uint8Array.
				throw new TypeError("writeFile content must be a Uint8Array.");
			}

			// Convert Uint8Array content to a base64 encoded string for IPC transport.
			// Using Node.js Buffer for robust and standard base64 encoding.
			const base64Data = Buffer.from(content).toString("base64");

			// Mountain's `workspacefs_writeFile` handler expects `params: [uriDto, base64Data, optionsDto]`.
			// Send empty options object if none provided.
			const params = [uriDto, base64Data, options || {}];

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
					`Invalid URI provided for createDirectory operation: ${uri.toString()}`,
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

			// The `createDirectory` API should be idempotent: if the directory already exists, it should not throw an error.
			if (
				filesysError.code === VscodeFileSystemError.FileExists().code ||
				(e as NodeJS.ErrnoException).code === "EEXIST"
			) {
				this._logDebug(
					`createDirectory: Directory '${uri.toString()}' already exists. Operation considered successful as per API contract.`,
				);

				// Ignore FileExists error, fulfilling idempotency.
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
		this._logDebug(
			`API delete: URI='${uri.toString()}', Options=${JSON.stringify(options)}`,
		);

		if (options?.useTrash) {
			this._logWarnOnce(
				"delete operation with useTrash=true: Behavior depends on Mountain's underlying OS trash/recycle bin implementation.",
			);
		}

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI provided for delete operation: ${uri.toString()}`,
				);

			// Mountain's `workspacefs_delete` handler expects `params: [uriDto, optionsDto]`.
			// Send empty options object if none provided.
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
			`API rename: Source='${source.toString()}', Target='${target.toString()}', Options=${JSON.stringify(options)}`,
		);

		try {
			const sourceDto = this._uriToDtoForFsIpc(source);

			const targetDto = this._uriToDtoForFsIpc(target);

			if (!sourceDto || !targetDto) {
				throw new VscodeFileSystemError(
					`Invalid source or target URI provided for rename operation. Source: ${source.toString()}, Target: ${target.toString()}`,
				);
			}

			// Mountain's `workspacefs_rename` handler expects `params: [sourceDto, targetDto, optionsDto]`.
			const params = [sourceDto, targetDto, options || {}];

			await this._ipcRequestResponse("workspacefs_rename", params);
		} catch (e: any) {
			// Pass source URI for error context, as it's often the primary subject of failure
			// (e.g., if it doesn't exist or permissions are incorrect on the source).
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
			`API copy: Source='${source.toString()}', Target='${target.toString()}', Options=${JSON.stringify(options)}`,
		);

		try {
			const sourceDto = this._uriToDtoForFsIpc(source);

			const targetDto = this._uriToDtoForFsIpc(target);

			if (!sourceDto || !targetDto) {
				throw new VscodeFileSystemError(
					`Invalid source or target URI provided for copy operation. Source: ${source.toString()}, Target: ${target.toString()}`,
				);
			}

			// Mountain's `workspacefs_copy` handler expects `params: [sourceDto, targetDto, optionsDto]`.
			// It's Mountain's responsibility to correctly implement overwrite behavior based on the options.
			const params = [sourceDto, targetDto, options || {}];

			await this._ipcRequestResponse("workspacefs_copy", params);
		} catch (e: any) {
			throw this._handleFsApiError("copy", source, e);
		}
	}

	/** {@inheritDoc vscode.FileSystem.isWritableFileSystem} */
	public isWritableFileSystem(scheme: string): boolean | undefined {
		// For MVP, assume 'file' and 'untitled' schemes are writable by default.
		// Other schemes are considered unknown unless their capabilities are pushed by Mountain.
		// A full implementation might query `IExtHostFileSystemInfo` or a MainThread service
		// for richer provider capability information.
		if (scheme === Schemas.file || scheme === Schemas.untitled) {
			this._logDebug(
				`isWritableFileSystem for scheme '${scheme}' returning 'true' (Cocoon MVP default).`,
			);

			return true;
		}

		this._logWarnOnce(
			`isWritableFileSystem for scheme '${scheme}' returning 'undefined' (unknown scheme in Cocoon MVP). ` +
				`A full implementation would query provider capabilities.`,
		);

		// As per `vscode.FileSystem` specification, return `undefined` for unknown schemes
		// if their writability cannot be determined by this host.
		return undefined;
	}

	// --- File Events (onDid*) ---
	// These are NOPs (No Operations) in the current shim as they would require Mountain
	// to push event notifications to Cocoon when filesystem changes occur.
	// TODO: Fully implement event propagation for a richer FS API experience. This would
	// involve an `ExtHostFileSystemEventService` listening to RPC calls or IPC notifications
	// from Mountain regarding file changes, creations, deletions, and renames.

	/**
	 * An event that is emitted when files are changed, created, or deleted.
	 * NOP in this shim: Returns `VscodeEvent.None`.
	 */
	public readonly onDidChangeFile: VscodeEvent<
		readonly VscodeFileChangeEvent[]
	> = VscodeEvent.None;

	// Placeholder for future FileCreateEvent if supported:
	// public readonly onDidCreateFiles: VscodeEvent<vscode.FileCreateEvent> = VscodeEvent.None;

	// Placeholder for future FileDeleteEvent if supported:
	// public readonly onDidDeleteFiles: VscodeEvent<vscode.FileDeleteEvent> = VscodeEvent.None;

	// Placeholder for future FileRenameEvent if supported:
	// Note: onWill* typically allows async listeners
	// public readonly onWillRenameFiles: VscodeEvent<vscode.FileRenameEvent> = VscodeEvent.None;

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this._logInfo("Disposed.");
	}
}
