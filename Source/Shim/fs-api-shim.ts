/*---------------------------------------------------------------------------------------------
 * Cocoon File System API Shim (fs-api-shim.ts)
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
 * - Marshalling arguments for IPC: `vscode.Uri` to `UriComponents` DTO, `Uint8Array` to base64.
 * - Unmarshalling results from Mountain: base64 to `Uint8Array`, raw stat DTO to `vscode.FileStat`,
 *   directory entry DTOs to `[name: string, type: vscode.FileType][]`.
 * - Converting Mountain/IPC errors into specific `vscode.FileSystemError` instances.
 * - Providing `isWritableFileSystem(scheme)` based on capabilities from an injected `IExtHostFileSystemInfo`.
 * - Stubbing `vscode.FileSystemProvider`-related events (`onDidChangeFile`, etc.) as NOPs for MVP.
 *
 * Key Interactions:
 * - An instance is typically created by `ShimExtHostWorkspace` and exposed as `vscode.workspace.fs`.
 * - Uses `BaseCocoonShim` for IPC, logging, and error refinement.
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
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer"; // For Uint8Array <-> base64
import { Event as VscodeEvent } from "vs/base/common/event"; // For NOP event stubs
import { MarshalledId } from "vs/base/common/marshalling"; // For checking $mid in URI DTOs
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files"; // For isWritableFileSystem

import type { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo"; // For isWritableFileSystem
import {
	FileSystemError as VscodeFileSystemError,
	FileType as VscodeFileType,
	Uri as VscodeUri,
	type FileChangeEvent as VscodeFileChangeEvent,
	type FilePermission as VscodeFilePermission,
	type FileStat as VscodeFileStat,
	type FileSystem as VscodeFileSystem,
} from "vscode";

// API types

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
} from "./_baseShim";

// --- Type Definitions ---
interface ILocalUriComponentsForFs extends VSCodeInternalUriComponents {
	fsPath?: string; // Often useful for Mountain if scheme is 'file'
	external?: string; // Full string representation
}
interface VscodeFileWriteOptions {
	create?: boolean;
	overwrite?: boolean;
	atomic?: boolean | { undoStopBefore: boolean; undoStopAfter: boolean };
}
interface VscodeFileDeleteOptions {
	recursive?: boolean;
	useTrash?: boolean;
}
interface VscodeFileOverwriteOptions {
	overwrite?: boolean;
}
type VscodeDirectoryEntry = [string, VscodeFileType];

interface RawFileStatFromMountainFsApi {
	type: number; // Numeric value for VscodeFileType
	ctime: number; // Milliseconds since epoch
	mtime: number; // Milliseconds since epoch
	size: number; // Bytes
	permissions?: VscodeFilePermission; // Optional
}

const RawFileTypeToVscodeFileType: { [key: number]: VscodeFileType } = {
	0: VscodeFileType.Unknown,
	1: VscodeFileType.File,
	2: VscodeFileType.Directory,
	64: VscodeFileType.SymbolicLink, // VS Code's internal value for SymbolicLink
};

export class ShimFileSystemApi
	extends BaseCocoonShim
	implements VscodeFileSystem
{
	private readonly _fsInfo: IExtHostFileSystemInfo;

	constructor(
		logService: ILogServiceForShim | undefined,
		fsInfoService: IExtHostFileSystemInfo, // Injected dependency
	) {
		super(
			"WorkspaceFS_API",
			undefined /* rpcService not used for core ops */,
			logService,
		);
		this._fsInfo = fsInfoService;
		this._logInfo(
			"Initialized vscode.workspace.fs API shim (uses direct IPC).",
		);
	}

	protected override _requiresRpc(): boolean {
		return false;
	} // Uses direct IPC

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
		const components = super._convertApiArgToInternal(uri); // Should produce UriComponents DTO
		if (
			components &&
			(components.$mid === MarshalledId.UriSimple ||
				components.$mid === MarshalledId.Uri ||
				(components.scheme && components.path !== undefined))
		) {
			const dto = components as ILocalUriComponentsForFs;
			// Ensure fsPath and external string are present if Mountain might need them
			if (uri.scheme === "file" && !dto.fsPath) dto.fsPath = uri.fsPath;
			if (!dto.external) dto.external = uri.toString(true); // true to skip encoding, Mountain might prefer raw
			return dto;
		}
		this._logError(
			"Base marshaller did not produce an expected URI DTO for FS IPC.",
			"Input URI:",
			uri,
			"Output:",
			components,
		);
		return undefined; // Fallback if conversion is not as expected
	}

	private _handleFsApiError(
		operation: string,
		uri: VscodeUri | undefined,
		thrownError: any,
	): VscodeFileSystemError {
		const error =
			thrownError instanceof Error
				? thrownError
				: new Error(String(thrownError)); // Already refined by _ipcRequestResponse
		const errorCode = (error as NodeJS.ErrnoException).code;
		const errorMessage =
			error.message || `Unknown error during ${operation}`;
		this._logError(
			`FS_API '${operation}' failed for URI '${uri?.toString() ?? "unknown"}'. Code: ${errorCode || "N/A"}, Msg: ${errorMessage}`,
			error.stack,
		);

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
			return VscodeFileSystemError.NoSpace(errorMessage);
		if (errorCode === "ENOTEMPTY")
			return VscodeFileSystemError.FileNotEmpty(targetResourceForError);
		if (errorCode === "ENOTSUP")
			return new VscodeFileSystemError(errorMessage); // Operation not supported
		if (errorCode === "ETIMEDOUT")
			return VscodeFileSystemError.Unavailable(errorMessage); // Map timeout
		return new VscodeFileSystemError(errorMessage); // Generic
	}

	public async stat(uri: VscodeUri): Promise<VscodeFileStat> {
		this._logDebug(`API stat: URI='${uri.toString()}'`);
		try {
			const uriDto = this._uriToDtoForFsIpc(uri);
			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for stat: ${uri.toString()}`,
				);
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
				throw new VscodeFileSystemError(
					`Malformed stat data from host for ${uri.toString()}`,
				);
			}
			return {
				type:
					RawFileTypeToVscodeFileType[rawStat.type] ??
					VscodeFileType.Unknown,
				ctime: rawStat.ctime,
				mtime: rawStat.mtime,
				size: rawStat.size,
				permissions: rawStat.permissions,
			};
		} catch (e: any) {
			throw this._handleFsApiError("stat", uri, e);
		}
	}

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
			const rawEntries = (await this._ipcRequestResponse(
				"workspacefs_readDirectory",
				[uriDto],
			)) as [string, string][]; // Assumes Mountain sends type as string
			if (!Array.isArray(rawEntries))
				throw new VscodeFileSystemError(
					`Malformed readdir data for ${uri.toString()}`,
				);
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

	public async readFile(uri: VscodeUri): Promise<Uint8Array> {
		this._logDebug(`API readFile: URI='${uri.toString()}'`);
		try {
			const uriDto = this._uriToDtoForFsIpc(uri);
			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for readFile: ${uri.toString()}`,
				);
			const base64Data = (await this._ipcRequestResponse(
				"workspacefs_readFile",
				[uriDto],
			)) as string;
			if (typeof base64Data !== "string")
				throw new VscodeFileSystemError(
					`Invalid data from host for readFile: ${uri.toString()}`,
				);
			return VSBuffer.fromBase64(base64Data).buffer;
		} catch (e: any) {
			throw this._handleFsApiError("readFile", uri, e);
		}
	}

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
				throw new TypeError("writeFile content must be Uint8Array.");
			const base64Data = VSBuffer.wrap(content).toString("base64"); // Use VSBuffer for consistency
			await this._ipcRequestResponse("workspacefs_writeFile", [
				uriDto,
				base64Data,
				options || {},
			]);
		} catch (e: any) {
			throw this._handleFsApiError("writeFile", uri, e);
		}
	}

	public async createDirectory(uri: VscodeUri): Promise<void> {
		this._logDebug(`API createDirectory: URI='${uri.toString()}'`);
		try {
			const uriDto = this._uriToDtoForFsIpc(uri);
			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for createDirectory: ${uri.toString()}`,
				);
			await this._ipcRequestResponse("workspacefs_createDirectory", [
				uriDto,
			]);
		} catch (e: any) {
			const filesysError = this._handleFsApiError(
				"createDirectory",
				uri,
				e,
			);
			if (
				filesysError.code === VscodeFileSystemError.FileExists().code ||
				(e as NodeJS.ErrnoException).code === "EEXIST"
			) {
				this._logDebug(
					`createDirectory: '${uri.toString()}' already exists. Success (idempotent).`,
				);
				return; // Idempotent
			}
			throw filesysError;
		}
	}

	public async delete(
		uri: VscodeUri,
		options?: VscodeFileDeleteOptions,
	): Promise<void> {
		this._logDebug(
			`API delete: URI='${uri.toString()}', Opts=${JSON.stringify(options)}`,
		);
		try {
			const uriDto = this._uriToDtoForFsIpc(uri);
			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for delete: ${uri.toString()}`,
				);
			await this._ipcRequestResponse("workspacefs_delete", [
				uriDto,
				options || {},
			]);
		} catch (e: any) {
			throw this._handleFsApiError("delete", uri, e);
		}
	}

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
			if (!sourceDto || !targetDto)
				throw new VscodeFileSystemError(
					`Invalid URI for rename. Src: ${source}, Target: ${target}`,
				);
			await this._ipcRequestResponse("workspacefs_rename", [
				sourceDto,
				targetDto,
				options || {},
			]);
		} catch (e: any) {
			throw this._handleFsApiError("rename", source, e);
		}
	}

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
			if (!sourceDto || !targetDto)
				throw new VscodeFileSystemError(
					`Invalid URI for copy. Src: ${source}, Target: ${target}`,
				);
			await this._ipcRequestResponse("workspacefs_copy", [
				sourceDto,
				targetDto,
				options || {},
			]);
		} catch (e: any) {
			throw this._handleFsApiError("copy", source, e);
		}
	}

	public isWritableFileSystem(scheme: string): boolean | undefined {
		const capabilities = this._fsInfo.getCapabilities(scheme); // Uses injected IExtHostFileSystemInfo
		if (capabilities === undefined) {
			this._logWarnOnce(
				`isWritableFileSystem: Capabilities for scheme '${scheme}' are unknown. Returning undefined.`,
			);
			return undefined;
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

	// --- File Events (STUBBED for MVP) ---
	public readonly onDidChangeFile: VscodeEvent<
		readonly VscodeFileChangeEvent[]
	> = VscodeEvent.None;
	// TODO: Implement onDidCreateFiles, onDidDeleteFiles, onWillRenameFiles etc. if/when Mountain supports pushing these events.

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
