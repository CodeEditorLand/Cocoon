/*
 * File: Cocoon/Source/Shim/FsApiShim.ts
 * Responsibility: Implements the VS Code file system API as a shim, proxying file operations to the Mountain backend via Vine IPC to enable native file system access for extensions.
 * Modified: 2025-06-07 00:57:42 UTC
 * Dependency: ./_BaseShim, vs/base/common/buffer, vs/base/common/event, vs/base/common/marshalling, vs/base/common/uri, vs/platform/files/common/files, vs/workbench/api/common/extHostFileSystemInfo
 * Export: ShimFileSystemApi
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon File System API Shim
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.fs` API (conforming to `vscode.FileSystem`),
 * providing a structured and asynchronous way to interact with filesystems.
 *
 * Operations are proxied to dedicated `workspacefs_*` handlers in the Mountain host
 * process via direct Vine IPC calls.
 *
 * Responsibilities:
 * - Implementing all methods of the `vscode.FileSystem` interface, transformed to PascalCase.
 * - Proxying each filesystem operation to a corresponding `workspacefs_*` IPC handler.
 * - Marshalling arguments for IPC (e.g., Uri to DTO, Uint8Array to base64).
 * - Unmarshalling results from IPC (e.g., base64 to Uint8Array, DTO to FileStat).
 * - Converting errors from the IPC layer into specific `vscode.FileSystemError` instances.
 * - Providing `CheckIsWritableFileSystem(Scheme)` based on `IExtHostFileSystemInfo`.
 * - Providing stubs for filesystem events like `OnDidChangeFile`.
 *
 * Assumed IPC Contract with Mountain:
 * - Method "workspacefs_stat": Params: `[UriDto]`. Returns: `{ params: RawFileStat }`
 * - Method "workspacefs_readFile": Params: `[UriDto]`. Returns: `{ params: Base64String }`
 * - And so on for other `workspacefs_*` methods.
 *
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer";
import { Event as VscodeEvent } from "vs/base/common/event";
import { MarshalledId } from "vs/base/common/marshalling";
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";
import type { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
import {
	FileSystemError as VscodeFileSystemError,
	FileType as VscodeFileType,
	Uri as VscodeUri,
	type FileChangeEvent as VscodeFileChangeEvent,
	type FilePermission as VscodeFilePermission,
	type FileStat as VscodeFileStat,
	type FileSystem as VscodeFileSystem,
} from "vscode";

import { BaseCocoonShim, type ILogServiceForShim } from "./_BaseShim";

// --- Type Definitions ---

interface ILocalUriComponentsForFs extends VSCodeInternalUriComponents {
	fsPath?: string;
	external?: string;
}
interface VscodeFileWriteOption {
	create?: boolean;
	overwrite?: boolean;
	atomic?: boolean | { undoStopBefore: boolean; undoStopAfter: boolean };
}
interface VscodeFileDeleteOption {
	recursive?: boolean;
	useTrash?: boolean;
}
interface VscodeFileOverwriteOption {
	overwrite?: boolean;
}
type VscodeDirectoryEntry = [string, VscodeFileType];
interface IRawFileStatFromMountain {
	type: number;
	ctime: number;
	mtime: number;
	size: number;
	permissions?: VscodeFilePermission;
}

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
	private readonly _FileSystemInfo: IExtHostFileSystemInfo;

	constructor(
		LogService: ILogServiceForShim | undefined,
		FileSystemInfoService: IExtHostFileSystemInfo,
	) {
		super("WorkspaceFileSystemApi", undefined, LogService);
		this._FileSystemInfo = FileSystemInfoService;
		this._LogInfo(
			"Initialized vscode.workspace.fs API shim (uses direct IPC).",
		);
	}

	protected override _RequireRpc(): boolean {
		return false;
	}

	protected _ConvertUriToDtoForIpc(
		Uri: VscodeUri,
	): ILocalUriComponentsForFs | undefined {
		if (!(Uri instanceof VscodeUri)) {
			this._LogError(
				"Cannot convert non-VscodeUri to DTO for FS IPC.",
				Uri,
			);
			return undefined;
		}
		const Component = super._ConvertApiArgToInternal(Uri);

		if (
			Component &&
			(Component.$mid === MarshalledId.UriSimple ||
				(typeof Component.scheme === "string" &&
					typeof Component.path === "string"))
		) {
			const Dto = Component as ILocalUriComponentsForFs;
			if (Uri.scheme === "file" && Dto.fsPath === undefined) {
				Dto.fsPath = Uri.fsPath;
			}
			if (Dto.external === undefined) {
				Dto.external = Uri.toString(true);
			}
			return Dto;
		}
		this._LogError(
			"Base marshaller did not produce an expected URI DTO for FS IPC.",
			"Input URI:",
			Uri,
			"Marshalled output:",
			Component,
		);
		return undefined;
	}

	private _HandleFsError(
		Operation: string,
		Uri: VscodeUri | undefined,
		ThrownError: any,
	): VscodeFileSystemError {
		const ErrorInstance =
			ThrownError instanceof Error
				? ThrownError
				: new Error(String(ThrownError));
		const ErrorCode = (ErrorInstance as NodeJS.ErrnoException).code;
		const ErrorMessage =
			ErrorInstance.message || `Unknown error during ${Operation}`;

		this._LogError(
			`WorkspaceFileSystemApi.${Operation} failed for URI '${Uri?.toString() ?? "unknown"}'. Code: ${ErrorCode || "N/A"}`,
			ErrorInstance.stack,
		);

		const TargetResourceForError = Uri || ErrorMessage;

		if (ErrorCode === "ENOENT")
			return VscodeFileSystemError.FileNotFound(TargetResourceForError);
		if (ErrorCode === "EEXIST")
			return VscodeFileSystemError.FileExists(TargetResourceForError);
		if (ErrorCode === "EISDIR")
			return VscodeFileSystemError.FileIsADirectory(
				TargetResourceForError,
			);
		if (ErrorCode === "ENOTDIR")
			return VscodeFileSystemError.FileNotADirectory(
				TargetResourceForError,
			);
		if (ErrorCode === "EACCES" || ErrorCode === "EPERM")
			return VscodeFileSystemError.NoPermissions(TargetResourceForError);
		if (ErrorCode === "ENOSPC")
			return VscodeFileSystemError.NoSpace(ErrorMessage);

		return new VscodeFileSystemError(ErrorMessage);
	}

	// --- vscode.FileSystem API Implementation (Transformed to PascalCase) ---

	public async GetStat(Uri: VscodeUri): Promise<VscodeFileStat> {
		this._LogDebug(`GetStat: URI='${Uri.toString()}'`);
		try {
			const UriDto = this._ConvertUriToDtoForIpc(Uri);
			if (!UriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for GetStat: ${Uri.toString()}`,
				);

			const RawStat = (await this._IpcRequestResponse(
				"workspacefs_stat",
				[UriDto],
			)) as IRawFileStatFromMountain;

			if (
				typeof RawStat?.type !== "number" ||
				typeof RawStat.ctime !== "number" ||
				typeof RawStat.mtime !== "number" ||
				typeof RawStat.size !== "number"
			) {
				throw new VscodeFileSystemError(
					`Malformed stat data received for ${Uri.toString()}`,
				);
			}

			return {
				type:
					RawFileTypeToVscodeFileType[RawStat.type] ??
					VscodeFileType.Unknown,
				ctime: RawStat.ctime,
				mtime: RawStat.mtime,
				size: RawStat.size,
				permissions: RawStat.permissions,
			};
		} catch (Error: any) {
			throw this._HandleFsError("GetStat", Uri, Error);
		}
	}

	public async ReadDirectory(
		Uri: VscodeUri,
	): Promise<VscodeDirectoryEntry[]> {
		this._LogDebug(`ReadDirectory: URI='${Uri.toString()}'`);
		try {
			const UriDto = this._ConvertUriToDtoForIpc(Uri);
			if (!UriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for ReadDirectory: ${Uri.toString()}`,
				);

			const RawEntry = (await this._IpcRequestResponse(
				"workspacefs_readDirectory",
				[UriDto],
			)) as [string, string][];

			if (!Array.isArray(RawEntry)) {
				throw new VscodeFileSystemError(
					`Malformed ReadDirectory data for ${Uri.toString()}`,
				);
			}

			return RawEntry.map(([Name, TypeString]): VscodeDirectoryEntry => {
				let FileTypeEnum = VscodeFileType.Unknown;
				const LowerTypeString = TypeString.toLowerCase();
				if (LowerTypeString === "file")
					FileTypeEnum = VscodeFileType.File;
				else if (LowerTypeString === "directory")
					FileTypeEnum = VscodeFileType.Directory;
				else if (LowerTypeString === "symboliclink")
					FileTypeEnum = VscodeFileType.SymbolicLink;
				return [Name, FileTypeEnum];
			});
		} catch (Error: any) {
			throw this._HandleFsError("ReadDirectory", Uri, Error);
		}
	}

	public async ReadFile(Uri: VscodeUri): Promise<Uint8Array> {
		this._LogDebug(`ReadFile: URI='${Uri.toString()}'`);
		try {
			const UriDto = this._ConvertUriToDtoForIpc(Uri);
			if (!UriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for ReadFile: ${Uri.toString()}`,
				);

			const Base64Data = (await this._IpcRequestResponse(
				"workspacefs_readFile",
				[UriDto],
			)) as string;

			if (typeof Base64Data !== "string") {
				throw new VscodeFileSystemError(
					`Received invalid data format for ReadFile: ${Uri.toString()}`,
				);
			}
			return VSBuffer.fromBase64(Base64Data).buffer;
		} catch (Error: any) {
			throw this._HandleFsError("ReadFile", Uri, Error);
		}
	}

	public async WriteFile(
		Uri: VscodeUri,
		Content: Uint8Array,
		Option?: VscodeFileWriteOption,
	): Promise<void> {
		this._LogDebug(
			`WriteFile: URI='${Uri.toString()}', Length=${Content.byteLength}`,
		);
		try {
			const UriDto = this._ConvertUriToDtoForIpc(Uri);
			if (!UriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for WriteFile: ${Uri.toString()}`,
				);
			if (!(Content instanceof Uint8Array))
				throw new TypeError("WriteFile content must be a Uint8Array.");

			const Base64Data = VSBuffer.wrap(Content).toString("base64");
			await this._IpcRequestResponse("workspacefs_writeFile", [
				UriDto,
				Base64Data,
				Option || {},
			]);
		} catch (Error: any) {
			throw this._HandleFsError("WriteFile", Uri, Error);
		}
	}

	public async CreateDirectory(Uri: VscodeUri): Promise<void> {
		this._LogDebug(`CreateDirectory: URI='${Uri.toString()}'`);
		try {
			const UriDto = this._ConvertUriToDtoForIpc(Uri);
			if (!UriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for CreateDirectory: ${Uri.toString()}`,
				);

			await this._IpcRequestResponse("workspacefs_createDirectory", [
				UriDto,
			]);
		} catch (Error: any) {
			const FileSystemError = this._HandleFsError(
				"CreateDirectory",
				Uri,
				Error,
			);
			if (
				FileSystemError.code === VscodeFileSystemError.FileExists().code
			) {
				this._LogDebug(
					`CreateDirectory: '${Uri.toString()}' already exists (idempotent success).`,
				);
				return;
			}
			throw FileSystemError;
		}
	}

	public async Delete(
		Uri: VscodeUri,
		Option?: VscodeFileDeleteOption,
	): Promise<void> {
		this._LogDebug(
			`Delete: URI='${Uri.toString()}', Options=${JSON.stringify(Option)}`,
		);
		try {
			const UriDto = this._ConvertUriToDtoForIpc(Uri);
			if (!UriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for Delete: ${Uri.toString()}`,
				);

			await this._IpcRequestResponse("workspacefs_delete", [
				UriDto,
				Option || {},
			]);
		} catch (Error: any) {
			throw this._HandleFsError("Delete", Uri, Error);
		}
	}

	public async Rename(
		Source: VscodeUri,
		Target: VscodeUri,
		Option?: VscodeFileOverwriteOption,
	): Promise<void> {
		this._LogDebug(
			`Rename: From='${Source.toString()}', To='${Target.toString()}'`,
		);
		try {
			const SourceDto = this._ConvertUriToDtoForIpc(Source);
			const TargetDto = this._ConvertUriToDtoForIpc(Target);
			if (!SourceDto || !TargetDto)
				throw new VscodeFileSystemError(
					"Invalid source or target URI for Rename.",
				);

			await this._IpcRequestResponse("workspacefs_rename", [
				SourceDto,
				TargetDto,
				Option || {},
			]);
		} catch (Error: any) {
			throw this._HandleFsError("Rename", Source, Error);
		}
	}

	public async Copy(
		Source: VscodeUri,
		Target: VscodeUri,
		Option?: VscodeFileOverwriteOption,
	): Promise<void> {
		this._LogDebug(
			`Copy: From='${Source.toString()}', To='${Target.toString()}'`,
		);
		try {
			const SourceDto = this._ConvertUriToDtoForIpc(Source);
			const TargetDto = this._ConvertUriToDtoForIpc(Target);
			if (!SourceDto || !TargetDto)
				throw new VscodeFileSystemError(
					"Invalid source or target URI for Copy.",
				);

			await this._IpcRequestResponse("workspacefs_copy", [
				SourceDto,
				TargetDto,
				Option || {},
			]);
		} catch (Error: any) {
			throw this._HandleFsError("Copy", Source, Error);
		}
	}

	public CheckIsWritableFileSystem(Scheme: string): boolean | undefined {
		const Capability = this._FileSystemInfo.getCapabilities(Scheme);
		if (Capability === undefined) {
			this._LogWarnOnce(
				`CheckIsWritableFileSystem: Capabilities for scheme '${Scheme}' are unknown. Returning undefined.`,
			);
			return undefined;
		}
		const IsWritable = !(
			Capability & FileSystemProviderCapabilities.Readonly
		);
		this._LogDebug(
			`CheckIsWritableFileSystem for '${Scheme}': ${IsWritable}`,
		);
		return IsWritable;
	}

	// --- File Events (Transformed to PascalCase) ---
	public readonly OnDidChangeFile: VscodeEvent<
		readonly VscodeFileChangeEvent[]
	> = VscodeEvent.None;

	public override Dispose(): void {
		super.Dispose();
		this._LogInfo("Disposed.");
	}
}
