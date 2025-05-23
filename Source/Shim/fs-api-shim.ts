/*---------------------------------------------------------------------------------------------
 * Cocoon File System API Shim (shims/fs-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.fs` API (`vscode.FileSystem`), providing extensions
 * with structured filesystem access proxied to Mountain.
 *
 * Responsibilities:
 * - Implementing `vscode.FileSystem` methods (`stat`, `readFile`, `writeFile`, etc.).
 * - Proxying calls to Mountain's `workspacefs_*` handlers via direct Vine IPC
 *   (using `_ipcRequestResponse` from BaseCocoonShim).
 * - Marshalling arguments (vscode.Uri to DTO, Uint8Array to base64) and
 *   unmarshalling results (base64 to Uint8Array, DTOs to vscode API types).
 * - Converting structured error responses from Mountain into `vscode.FileSystemError`.
 * - Providing stubs for `vscode.FileSystemProvider` related events.
 *
 * Key Interactions:
 * - Provides the `vscode.workspace.fs` object (via API factory in `index.ts`).
 * - Uses `BaseCocoonShim` helpers for IPC and error refinement.
 * - Interacts with Mountain's `handlers/workspace_fs_api.rs`.
 *--------------------------------------------------------------------------------------------*/

// Assuming API objects from 'vscode' shim or real API
// For Uint8Array <-> base64
import { VSBuffer } from "vs/base/common/buffer";
// For event types
import { Event as VscodeEvent } from "vs/base/common/event";
// For URI marshalling check
import { MarshalledId } from "vs/base/common/marshallingIds";
import {
	FileChangeType as VscodeFileChangeType,
	FileSystemError as VscodeFileSystemError,
	FileType as VscodeFileType,
	// Use VscodeUri for API consistency
	Uri as VscodeUri,
	type FileChangeEvent as VscodeFileChangeEvent,
	type FilePermission as VscodeFilePermission,
	type FileStat as VscodeFileStat,
	// The interface this class implements
	type FileSystem as VscodeFileSystem,
} from "vscode";

import { BaseCocoonShim, refineError, type ILogService } from "./_baseShim";

// --- Type Definitions ---

// DTO for URI components for RPC, should align with what BaseCocoonShim._convertApiArgToInternal produces for URIs
interface ILocalUriComponentsForFs {
	// e.g., MarshalledId.UriSimple
	$mid?: number;

	scheme: string;

	authority?: string;

	path: string;

	query?: string;

	fragment?: string;

	// Often included by marshallers
	external?: string;

	// Important for 'file' URIs
	fsPath?: string;
}

// Options for writeFile operation (from vscode.d.ts)
interface VscodeFileWriteOptions {
	create?: boolean;

	overwrite?: boolean;

	atomic?: boolean | { undoStopBefore: boolean; undoStopAfter: boolean };
}

// Options for delete operation (from vscode.d.ts)
interface VscodeFileDeleteOptions {
	recursive?: boolean;

	useTrash?: boolean;
}

// Options for rename/copy operation (from vscode.d.ts)
interface VscodeFileOverwriteOptions {
	overwrite?: boolean;
}

// [name, type]
type VscodeDirectoryEntry = [string, VscodeFileType];

// For stat result from Mountain (before conversion to VscodeFileStat)
// Mountain's `handlers/workspace_fs_api.rs` returns:
// `json!({ "type": file_type_numeric (0-Unknown,1-File,2-Dir,64-Symlink), "ctime": ..., "mtime": ..., "size": ... })`
interface RawFileStatFromMountainFsApi {
	// 0, 1, 2, 64 (corresponds to vscode.FileType values directly)
	type: number;

	// Milliseconds since epoch
	ctime: number;

	// Milliseconds since epoch
	mtime: number;

	size: number;

	// Optional
	permissions?: VscodeFilePermission;
}

// FileType mapping based on numeric values from Mountain's stat
const RawFileTypeToVscodeFileType: { [key: number]: VscodeFileType } = {
	0: VscodeFileType.Unknown,

	1: VscodeFileType.File,

	2: VscodeFileType.Directory,

	64: VscodeFileType.SymbolicLink,
};

export class ShimFileSystemApi
	extends BaseCocoonShim
	implements VscodeFileSystem
{
	// No _serviceBrand if not a DI service, but part of vscode.workspace.fs
	// public readonly _serviceBrand: undefined;

	constructor(logService: ILogService | undefined) {
		super(
			"WorkspaceFS_API",

			undefined /* rpcService for BaseCocoonShim, not used by direct IPC */,

			logService,
		);

		this._log("Initialized vscode.workspace.fs API shim.");
	}

	// Override from BaseCocoonShim to ensure the specific DTO format for FS IPC.
	// This ensures that $mid is present if Mountain's path_from_uri_components relies on it,

	// or that 'external' and 'fsPath' are consistently available.
	protected _uriToDtoForFsIpc(
		uri: VscodeUri,
	): ILocalUriComponentsForFs | undefined {
		if (!(uri instanceof VscodeUri)) {
			this._logError(
				"Cannot convert non-VscodeUri to DTO for FS IPC",

				uri,
			);

			return undefined;
		}

		// Use the base marshaller, then ensure our required fields or $mid are present.
		const components = super._convertApiArgToInternal(uri);

		if (
			components &&
			(components.$mid === MarshalledId.UriSimple ||
				components.$mid === MarshalledId.Uri)
		) {
			return components as ILocalUriComponentsForFs;
		}

		// Fallback or augmentation if base marshaller isn't enough
		this._logWarn(
			"Base marshaller did not produce expected Uri DTO for FS IPC, using manual conversion.",

			uri,

			components,
		);

		return {
			// Assume simple for direct IPC if not otherwise specified
			$mid: MarshalledId.UriSimple,

			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			external: uri.toString(true),

			fsPath: uri.scheme === "file" ? uri.fsPath : undefined,
		};
	}

	private _handleFsApiError(
		operation: string,

		uri: VscodeUri | undefined,

		thrownError: any,
	): VscodeFileSystemError {
		// Use refineError from BaseCocoonShim to attempt parsing structured JSON errors from IPC layer
		const initialError =
			thrownError instanceof Error
				? thrownError
				: new Error(String(thrownError));

		// The IPC layer might already return a refined error if sendToMountainAndWait's catch block uses refineError.
		// If not, refineError here is a good fallback.
		const refinedError = refineError(
			initialError,

			this._logService,

			`WorkspaceFS_API.${operation}`,
		);

		this._logError(
			`WorkspaceFS_API.${operation} failed for ${uri?.toString() || "unknown URI"}:`,

			refinedError.message,

			refinedError.stack,
		);

		// From refineError or original
		const code = (refinedError as NodeJS.ErrnoException).code;

		const msg = refinedError.message;

		// Pass URI to FileSystemError if available
		const targetUriForError = uri || msg;

		if (code === "ENOENT")
			return VscodeFileSystemError.FileNotFound(targetUriForError);

		if (code === "EEXIST")
			return VscodeFileSystemError.FileExists(targetUriForError);

		if (code === "EISDIR")
			return VscodeFileSystemError.FileIsADirectory(targetUriForError);

		if (code === "ENOTDIR")
			return VscodeFileSystemError.FileNotADirectory(targetUriForError);

		if (code === "EACCES" || code === "EPERM")
			return VscodeFileSystemError.NoPermissions(targetUriForError);

		if (code === "ENOSPC") return VscodeFileSystemError.NoSpace(msg);

		if (code === "ENOTEMPTY")
			// From CommonError mapping
			return VscodeFileSystemError.FileNotEmpty(targetUriForError);

		// Operation not supported
		if (code === "ENOTSUP") return new VscodeFileSystemError(msg);

		if (code === "EBADARG" || code === "EINVAL")
			// Invalid argument
			return new VscodeFileSystemError(msg);

		// Bad message/payload (e.g. bad base64)
		if (code === "EBADMSG") return new VscodeFileSystemError(msg);

		// TODO: Add more specific FileSystemError types (Unavailable, Unknown) if codes map to them.
		// Generic error
		return new VscodeFileSystemError(msg);
	}

	// --- vscode.FileSystem API Implementation ---

	public async stat(uri: VscodeUri): Promise<VscodeFileStat> {
		// Can be verbose
		// this._log(`stat: ${uri.toString()}`);

		try {
			const uriDto = this._uriToDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for stat: ${uri.toString()}`,
				);

			// Mountain's handler `handle_stat` expects `params: Value` where `params[0]` is the URI DTO.
			const result = (await this._ipcRequestResponse("workspacefs_stat", [
				uriDto,
			])) as RawFileStatFromMountainFsApi;

			return {
				type:
					RawFileTypeToVscodeFileType[result.type] ??
					VscodeFileType.Unknown,

				ctime: result.ctime,

				mtime: result.mtime,

				size: result.size,

				// Pass through if available
				permissions: result.permissions,
			};
		} catch (e: any) {
			throw this._handleFsApiError("stat", uri, e);
		}
	}

	public async readDirectory(
		uri: VscodeUri,
	): Promise<VscodeDirectoryEntry[]> {
		// this._log(`readDirectory: ${uri.toString()}`);

		try {
			const uriDto = this._uriDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for readDirectory: ${uri.toString()}`,
				);

			// Mountain's handler `handle_read_directory` expects `params: Value` where `params[0]` is the URI DTO.
			const result = (await this._ipcRequestResponse(
				"workspacefs_readDirectory",

				[uriDto],

				// Mountain returns [name, typeString]
			)) as [string, string][];

			return result.map(([name, typeStr]) => {
				// Mountain's workspace_fs_api.rs uses string type names: "File", "Directory"
				// This needs to match FileTypeReverseMap from previous version or similar logic.
				// Let's assume it sends these strings directly.
				let fileType = VscodeFileType.Unknown;

				if (typeStr === "File") fileType = VscodeFileType.File;
				else if (typeStr === "Directory")
					fileType = VscodeFileType.Directory;
				else if (typeStr === "SymbolicLink")
					fileType = VscodeFileType.SymbolicLink;

				return [name, fileType];
			});
		} catch (e: any) {
			throw this._handleFsApiError("readDirectory", uri, e);
		}
	}

	public async readFile(uri: VscodeUri): Promise<Uint8Array> {
		// this._log(`readFile: ${uri.toString()}`);

		try {
			const uriDto = this._uriDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for readFile: ${uri.toString()}`,
				);

			// Mountain's handler `handle_read_file` expects `params: Value` where `params[0]` is the URI DTO.
			const base64Data = (await this._ipcRequestResponse(
				"workspacefs_readFile",

				[uriDto],
			)) as string;

			if (typeof base64Data !== "string")
				throw new VscodeFileSystemError(
					`readFile IPC response not a string for ${uri.toString()}`,
				);

			const buffer = VSBuffer.fromBase64(base64Data);

			return buffer.buffer;
		} catch (e: any) {
			throw this._handleFsApiError("readFile", uri, e);
		}
	}

	public async writeFile(
		uri: VscodeUri,

		content: Uint8Array,

		options?: VscodeFileWriteOptions,
	): Promise<void> {
		// this._log(`writeFile: ${uri.toString()} (${content.byteLength} bytes), opts: ${JSON.stringify(options)}`);

		try {
			const buffer = VSBuffer.wrap(content);

			// Safest conversion
			const base64Data = Buffer.from(buffer.buffer).toString("base64");

			const uriDto = this._uriDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for writeFile: ${uri.toString()}`,
				);

			// Mountain's handler `handle_write_file` expects `params: Value` where `params[0]` is URI DTO, `params[1]` is content, `params[2]` is options.
			// Pass options, even if empty, for consistency if handler expects it.
			const params = [uriDto, base64Data, options || {}];

			await this._ipcRequestResponse("workspacefs_writeFile", params);
		} catch (e: any) {
			throw this._handleFsApiError("writeFile", uri, e);
		}
	}

	public async createDirectory(uri: VscodeUri): Promise<void> {
		// this._log(`createDirectory: ${uri.toString()}`);

		try {
			const uriDto = this._uriDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for createDirectory: ${uri.toString()}`,
				);

			// Mountain's handler `handle_create_directory` expects `params: Value` where `params[0]` is the URI DTO.
			await this._ipcRequestResponse("workspacefs_createDirectory", [
				uriDto,
			]);
		} catch (e: any) {
			const filesysError = this._handleFsApiError(
				"createDirectory",

				uri,

				e,
			);

			if (filesysError.code === VscodeFileSystemError.FileExists().code) {
				return;

				// Ignore FileExists
			}

			throw filesysError;
		}
	}

	public async delete(
		uri: VscodeUri,

		options?: VscodeFileDeleteOptions,
	): Promise<void> {
		// this._log(`delete: ${uri.toString()}, opts: ${JSON.stringify(options)}`);

		if (options?.useTrash)
			this._logWarnOnce(
				"delete with useTrash=true relies on Mountain's native implementation.",
			);

		try {
			const uriDto = this._uriDtoForFsIpc(uri);

			if (!uriDto)
				throw new VscodeFileSystemError(
					`Invalid URI for delete: ${uri.toString()}`,
				);

			// Mountain's handler `handle_delete` expects `params: Value` where `params[0]` is URI DTO, `params[1]` is options.
			const params = [uriDto, options || {}];

			await this._ipcRequestResponse("workspacefs_delete", params);
		} catch (e: any) {
			throw this._handleFsApiError("delete", uri, e);
		}
	}

	public async rename(
		source: VscodeUri,

		target: VscodeUri,

		options?: VscodeFileOverwriteOptions,
	): Promise<void> {
		// this._log(`rename: ${source.toString()} -> ${target.toString()}, opts: ${JSON.stringify(options)}`);

		try {
			const sourceDto = this._uriDtoForFsIpc(source);

			const targetDto = this._uriDtoForFsIpc(target);

			if (!sourceDto || !targetDto)
				throw new VscodeFileSystemError(
					`Invalid URI for rename: ${source.toString()} or ${target.toString()}`,
				);

			// Mountain's handler `handle_rename` expects `params: Value` where `params[0]` is source, `params[1]` is target, `params[2]` is options.
			const params = [sourceDto, targetDto, options || {}];

			await this._ipcRequestResponse("workspacefs_rename", params);
		} catch (e: any) {
			throw this._handleFsApiError("rename", source, e);
		}
	}

	public async copy(
		source: VscodeUri,

		target: VscodeUri,

		options?: VscodeFileOverwriteOptions,
	): Promise<void> {
		// this._log(`copy: ${source.toString()} -> ${target.toString()}, opts: ${JSON.stringify(options)}`);

		// TODO: Ensure 'workspacefs_copy' is fully implemented in Mountain and handles overwrite.
		try {
			const sourceDto = this._uriDtoForFsIpc(source);

			const targetDto = this._uriDtoForFsIpc(target);

			if (!sourceDto || !targetDto)
				throw new VscodeFileSystemError(
					`Invalid URI for copy: ${source.toString()} or ${target.toString()}`,
				);

			const params = [sourceDto, targetDto, options || {}];

			await this._ipcRequestResponse("workspacefs_copy", params);
		} catch (e: any) {
			throw this._handleFsApiError("copy", source, e);
		}
	}

	public isWritableFileSystem(scheme: string): boolean | undefined {
		this._logWarnOnce(
			`isWritableFileSystem check for '${scheme}' using MVP logic (file, untitled true; others undefined).`,
		);

		if (scheme === "file" || scheme === "untitled") return true;

		// TODO: Query Mountain for FileSystemProviderCapabilities if a more dynamic check is needed.
		// As per vscode.FileSystem spec for unknown/unsupported schemes
		return undefined;
	}

	// --- File Events (onDid*) ---
	// These require Mountain to send notifications to Cocoon (e.g., via Vine IPC or specific RPC on an ExtHostFileSystemEventService).
	// Cocoon's index.ts or a dedicated event service would listen and fire these VscodeEmitters.
	// TODO: Fully implement event propagation for a richer FS API experience.
	public readonly onDidChangeFile: VscodeEvent<
		readonly VscodeFileChangeEvent[]
		// Placeholder
	> = VscodeEvent.None;

	public readonly onDidCreateFiles: VscodeEvent</*vscode.FileCreateEvent*/ any> =
		// Placeholder
		VscodeEvent.None;

	public readonly onDidDeleteFiles: VscodeEvent</*vscode.FileDeleteEvent*/ any> =
		// Placeholder
		VscodeEvent.None;

	public readonly onWillRenameFiles: VscodeEvent</*vscode.FileRenameEvent*/ any> =
		// Placeholder
		VscodeEvent.None;

	// Placeholder
	// public readonly onDidRenameFiles: VscodeEvent<vscode.FileRenameEvent> = VscodeEvent.None;

	// --- VscodeFileSystemProvider related methods (if this shim were to also *be* a provider, which it is not)
	// watch, stat, readDirectory, readFile, writeFile, delete, createDirectory, rename, copy are already implemented above.
}
