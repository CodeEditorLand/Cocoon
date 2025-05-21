/*---------------------------------------------------------------------------------------------
 * Cocoon File System API Shim (shims/fs-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.workspace.fs` API, providing extensions with a structured way
 * to interact with the filesystem exposed by Mountain. This is distinct from the shim
 * for the internal Node.js 'fs' module.
 *
 * Responsibilities:
 * - Implementing methods matching the `vscode.FileSystem` interface (`stat`, `readFile`,
 *
 *
 *   `writeFile`, `readDirectory`, `createDirectory`, `delete`, `rename`, `copy`, `isWritableFileSystem`).
 * - Proxying each API call to a corresponding handler in Mountain using dedicated
 *   `workspacefs_*` method names via direct Vine IPC (`_ipcRequestResponse`).
 * - Converting arguments (e.g., `vscode.Uri` to `UriComponents`, `Uint8Array` to base64)
 *   into the format expected by the Mountain handlers using BaseCocoonShim helpers.
 * - Converting results received from Mountain back into the format expected by the API
 *   (e.g., base64 to `Uint8Array` for `readFile`, stat structure, directory entry format).
 * - Handling errors returned by Mountain and converting them into appropriate
 *   `vscode.FileSystemError` instances.
 * - Providing stubs for file events (`onDidChangeFile`, etc.) which would require
 *   notifications from Mountain to be fully implemented.
 *
 * Key Interactions:
 * - Provides the `vscode.workspace.fs` API object (integrated via `createApiFactory` in `index.ts`).
 * - Uses `_ipcRequestResponse` from `_baseShim.ts` to call `workspacefs_*` handlers in Mountain.
 * - Handles data serialization/deserialization (URIs, base64 buffers).
 * - Converts error codes/messages into `vscode.FileSystemError`.
 * - Relies on bundled VS Code types (`Uri`, `FileType`, `FileSystemError`, `VSBuffer`).
 *--------------------------------------------------------------------------------------------*/

// Assume API objects available, imported from 'vscode' shim
// Needs bundling
import { VSBuffer } from "vs/base/common/buffer";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// For event types
import {
	// For FileStat.permissions
	FilePermission,
	FileStat,
	FileSystemError,
	// For isWritableFileSystem, though not fully used
	FileSystemProviderCapabilities,
	FileType,
	Uri,
	// For event types (if implemented)
	// FileChangeEvent,
	// To avoid conflict with node fs.FSWatcher
	// FileSystemWatcher as VscodeFileSystemWatcher,
	// Interface this class implements
	// FileSystem as VscodeFileSystem,
} from "vscode";

import { BaseCocoonShim, ILogService, refineError } from "./_baseShim";

// --- Type definitions for parameters and return values ---

// For URI components (used in RPC), should align with BaseCocoonShim's output
interface ILocalUriComponents {
	// MarshalledId.Uri or UriSimple
	$mid?: number;

	scheme: string;

	authority?: string;

	path: string;

	query?: string;

	fragment?: string;

	external?: string;

	// Sometimes useful
	fsPath?: string;
}

// Options for writeFile operation (from vscode.d.ts)
interface FileWriteOptions {
	create?: boolean;

	overwrite?: boolean;

	atomic?:
		| boolean
		| {
				undoStopBefore: boolean;

				undoStopAfter: boolean;
		  };
}

// Options for delete operation (from vscode.d.ts)
interface FileDeleteOptions {
	recursive?: boolean;

	useTrash?: boolean;
}

// Options for rename/copy operation (from vscode.d.ts)
interface FileOverwriteOptions {
	overwrite?: boolean;
}

// For readDirectory result (from vscode.d.ts)
type DirectoryEntry = [string, FileType];

// For stat result from Mountain (before conversion to vscode.FileStat)
interface RawFileStatFromMountain {
	// 'File', 'Directory', etc. as strings
	type: keyof typeof FileTypeMap;

	// Milliseconds since epoch
	ctime: number;

	// Milliseconds since epoch
	mtime: number;

	size: number;

	// Optional, as vscode.FileStat has it
	permissions?: FilePermission;
}

// For FileSystemError structured message (parsed from IPC error)
interface StructuredFsErrorPayload {
	// e.g., 'ENOENT'
	code?: string;

	message?: string;

	// Other potential fields from Mountain's error structure
}

const FileTypeMap = {
	[FileType.Unknown]: "Unknown",

	[FileType.File]: "File",

	[FileType.Directory]: "Directory",

	[FileType.SymbolicLink]: "SymbolicLink",
} as const;

const FileTypeReverseMap: { [key: string]: FileType } = {
	"Unknown": FileType.Unknown,

	"File": FileType.File,

	"Directory": FileType.Directory,

	"SymbolicLink": FileType.SymbolicLink,
};

// ShimFileSystemApi implements the vscode.FileSystem interface
// TODO: Explicitly add `implements VscodeFileSystem` if VscodeFileSystem is imported and correctly defined.
export class ShimFileSystemApi extends BaseCocoonShim {
	// No _serviceBrand needed as this is directly instantiated by createApiFactory in index.ts for vscode.workspace.fs

	constructor(logService: ILogService | undefined) {
		// No RPC proxy needed if using direct IPC helpers from base shim.
		super("WorkspaceFS", undefined /* rpcService */, logService);

		this._log("Initialized vscode.workspace.fs shim.");
	}

	// Override from BaseCocoonShim if more specific marshalling is needed for fs URIs.
	// For now, assume the base class _convertApiArgToInternal is sufficient.
	protected _uriDtoForIpc(uri: Uri): ILocalUriComponents | undefined {
		// This should produce UriSimple like structure
		const components = super._convertApiArgToInternal(uri);

		if (components && components.$mid === 1 /* MarshalledId.UriSimple */) {
			// Ensure it has the core fields for clarity, even if $mid implies them
			return {
				scheme: components.scheme,

				authority: components.authority,

				path: components.path,

				query: components.query,

				fragment: components.fragment,

				// Ensure external is present if needed
				external: components.external || uri.toString(true),

				fsPath:
					components.fsPath ||
					(uri.scheme === "file" ? uri.fsPath : undefined),

				$mid: components.$mid,
			};
		}

		this._logError(
			"URI to DTO conversion for IPC failed or produced unexpected format.",

			uri,

			components,
		);

		// Fallback to a basic conversion if base method isn't suitable
		return {
			scheme: uri.scheme,

			path: uri.path,

			external: uri.toString(true),

			fsPath: uri.fsPath,
		};
	}

	private _handleFsError(
		operation: string,

		uri: Uri | undefined,

		thrownError: any,
	): FileSystemError {
		// Use refineError from BaseCocoonShim to attempt parsing structured JSON errors
		const initialError =
			thrownError instanceof Error
				? thrownError
				: new Error(String(thrownError));

		const refinedError = refineError(
			initialError,

			this._logService,

			`WorkspaceFS.${operation}`,
		);

		this._logError(
			`WorkspaceFS.${operation} failed for ${uri?.toString() || "unknown URI"}:`,

			refinedError,
		);

		// Now, map common error codes (from refinedError or original) to FileSystemError static methods
		const code =
			(refinedError as NodeJS.ErrnoException).code ||
			(initialError as NodeJS.ErrnoException).code;

		// Use message from refinedError
		const msg = refinedError.message;

		const targetUriForError =
			uri || (typeof msg === "string" ? msg : undefined);

		if (code === "ENOENT")
			return FileSystemError.FileNotFound(targetUriForError);

		if (code === "EEXIST")
			return FileSystemError.FileExists(targetUriForError);

		if (code === "EISDIR")
			return FileSystemError.FileIsADirectory(targetUriForError);

		if (code === "ENOTDIR")
			return FileSystemError.FileNotADirectory(targetUriForError);

		if (code === "EACCES" || code === "EPERM")
			return FileSystemError.NoPermissions(targetUriForError);

		// vscode.FileSystemError has NoSpace
		if (code === "ENOSPC") return FileSystemError.NoSpace(msg);

		if (code === "EROFS")
			return FileSystemError.NoPermissions(
				`Read-only file system for ${operation} on ${targetUriForError}`,
			);

		// TODO: Add more mappings as identified (e.g., FileSystemError.Unavailable, FileSystemError.Unknown)

		// Generic error if no specific code matched
		return new FileSystemError(msg);
	}

	// --- vscode.FileSystem API Implementation ---

	public async stat(uri: Uri): Promise<FileStat> {
		this._log(`stat: ${uri.toString()}`);

		try {
			const uriDto = this._uriDtoForIpc(uri);

			if (!uriDto)
				throw new Error(
					"URI DTO conversion failed for stat operation.",
				);

			const params = { uri: uriDto };

			const result = (await this._ipcRequestResponse(
				"workspacefs_stat",

				params,
			)) as RawFileStatFromMountain;

			return {
				type: FileTypeReverseMap[result.type] ?? FileType.Unknown,

				ctime: result.ctime,

				mtime: result.mtime,

				size: result.size,

				// Optional: if Mountain provides permissions
				permissions: result.permissions,
			};
		} catch (e: any) {
			throw this._handleFsError("stat", uri, e);
		}
	}

	public async readDirectory(uri: Uri): Promise<DirectoryEntry[]> {
		this._log(`readDirectory: ${uri.toString()}`);

		try {
			const uriDto = this._uriDtoForIpc(uri);

			if (!uriDto)
				throw new Error("URI DTO conversion failed for readDirectory.");

			const params = { uri: uriDto };

			const result = (await this._ipcRequestResponse(
				"workspacefs_readDirectory",

				params,
			)) as [string, keyof typeof FileTypeMap][];

			return result.map(([name, typeStr]) => [
				name,

				FileTypeReverseMap[typeStr] ?? FileType.Unknown,
			]);
		} catch (e: any) {
			throw this._handleFsError("readDirectory", uri, e);
		}
	}

	public async readFile(uri: Uri): Promise<Uint8Array> {
		this._log(`readFile: ${uri.toString()}`);

		try {
			const uriDto = this._uriDtoForIpc(uri);

			if (!uriDto)
				throw new Error("URI DTO conversion failed for readFile.");

			const params = { uri: uriDto };

			const base64Data = (await this._ipcRequestResponse(
				"workspacefs_readFile",

				params,
			)) as string;

			if (typeof base64Data !== "string")
				throw new Error(
					"readFile IPC response was not a base64 string.",
				);

			const buffer = VSBuffer.fromBase64(base64Data);

			// Returns Uint8Array
			return buffer.buffer;
		} catch (e: any) {
			throw this._handleFsError("readFile", uri, e);
		}
	}

	public async writeFile(
		uri: Uri,

		content: Uint8Array,

		options?: FileWriteOptions,
	): Promise<void> {
		this._log(
			`writeFile: ${uri.toString()} (${content.byteLength} bytes), options: ${JSON.stringify(options)}`,
		);

		try {
			// VSBuffer can wrap Uint8Array
			const buffer = VSBuffer.wrap(content);

			// VSBuffer.toString('base64')
			const base64Data = buffer.toString("base64");

			// TODO: Confirm VSBuffer.toString('base64') is available and correct.
			// If not, use `Buffer.from(content).toString('base64')`.
			// The previous conversion used `buffer.base64Encode()` which is not standard on VSBuffer.

			const uriDto = this._uriDtoForIpc(uri);

			if (!uriDto)
				throw new Error("URI DTO conversion failed for writeFile.");

			const params = {
				uri: uriDto,

				content: base64Data,

				// Pass options if Mountain handler supports them (e.g., create, overwrite)
				options: options,
			};

			await this._ipcRequestResponse("workspacefs_writeFile", params);
		} catch (e: any) {
			throw this._handleFsError("writeFile", uri, e);
		}
	}

	public async createDirectory(uri: Uri): Promise<void> {
		this._log(`createDirectory: ${uri.toString()}`);

		try {
			const uriDto = this._uriDtoForIpc(uri);

			if (!uriDto)
				throw new Error(
					"URI DTO conversion failed for createDirectory.",
				);

			const params = { uri: uriDto };

			await this._ipcRequestResponse(
				"workspacefs_createDirectory",

				params,
			);
		} catch (e: any) {
			const filesysError = this._handleFsError("createDirectory", uri, e);

			// As per VS Code API spec, FileExists error during createDirectory should NOT be thrown by provider.
			if (filesysError.code === FileSystemError.FileExists().code) {
				this._log(
					"createDirectory ignored FileExists error as per spec.",
				);

				// Success, directory already exists
				return;
			}

			// Rethrow other errors
			throw filesysError;
		}
	}

	public async delete(uri: Uri, options?: FileDeleteOptions): Promise<void> {
		const recursive = options?.recursive ?? false;

		const useTrash = options?.useTrash ?? false;

		this._log(
			`delete: ${uri.toString()} (recursive=${recursive}, useTrash=${useTrash})`,
		);

		// TODO: Mountain's `workspacefs_delete` handler needs to support `useTrash`.
		// If not, this shim might need to implement a fallback or always log a warning.
		if (useTrash) {
			this._logWarnOnce(
				"delete with useTrash=true relies on Mountain's implementation.",
			);
		}

		try {
			const uriDto = this._uriDtoForIpc(uri);

			if (!uriDto)
				throw new Error("URI DTO conversion failed for delete.");

			const params = { uri: uriDto, options: { recursive, useTrash } };

			await this._ipcRequestResponse("workspacefs_delete", params);
		} catch (e: any) {
			throw this._handleFsError("delete", uri, e);
		}
	}

	public async rename(
		source: Uri,

		target: Uri,

		options?: FileOverwriteOptions,
	): Promise<void> {
		const overwrite = options?.overwrite ?? false;

		this._log(
			`rename: ${source.toString()} -> ${target.toString()} (overwrite=${overwrite})`,
		);

		try {
			const sourceDto = this._uriDtoForIpc(source);

			const targetDto = this._uriDtoForIpc(target);

			if (!sourceDto || !targetDto)
				throw new Error("URI DTO conversion failed for rename.");

			const params = {
				source: sourceDto,

				target: targetDto,

				options: { overwrite },
			};

			await this._ipcRequestResponse("workspacefs_rename", params);
		} catch (e: any) {
			// Pass source URI for error context
			throw this._handleFsError("rename", source, e);
		}
	}

	public async copy(
		source: Uri,

		target: Uri,

		options?: FileOverwriteOptions,
	): Promise<void> {
		const overwrite = options?.overwrite ?? false;

		this._log(
			`copy: ${source.toString()} -> ${target.toString()} (overwrite=${overwrite})`,
		);

		// TODO: Ensure 'workspacefs_copy' is implemented in Mountain and handles overwrite.
		try {
			const sourceDto = this._uriDtoForIpc(source);

			const targetDto = this._uriDtoForIpc(target);

			if (!sourceDto || !targetDto)
				throw new Error("URI DTO conversion failed for copy.");

			const params = {
				source: sourceDto,

				target: targetDto,

				options: { overwrite },
			};

			await this._ipcRequestResponse("workspacefs_copy", params);
		} catch (e: any) {
			throw this._handleFsError("copy", source, e);
		}
	}

	public isWritableFileSystem(scheme: string): boolean | undefined {
		// TODO: This should ideally query Mountain or use capabilities registered by FileSystemProviders.
		// For MVP, a hardcoded list is acceptable but limited.
		this._logWarnOnce(
			`isWritableFileSystem check for '${scheme}' is using basic MVP logic (file, untitled).`,
		);

		if (scheme === "file" || scheme === "untitled") {
			return true;
		}

		// For other schemes, if not registered, VS Code typically returns `undefined`.
		return undefined;
	}

	// --- File Events (onDid*) ---
	// TODO: These require Mountain to send notifications (e.g., via Vine IPC or specific RPC calls on an ExtHostFileSystemEventService).
	// The ExtHost side would then have Emitters that fire these VscodeEvent types.
	// Example for one event:
	// private readonly _onDidChangeFileEmitter = new VscodeEmitter<readonly vscode.FileChangeEvent[]>();

	// public readonly onDidChangeFile: VscodeEvent<readonly vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

	// Mountain would call something like `$acceptFileChanges(eventDto)` on an ExtHost service,

	// which would then revive DTOs and fire `_onDidChangeFileEmitter`.

	// For now, returning VscodeEvent.None for all.
	public readonly onDidChangeFile: VscodeEvent<any /*readonly vscode.FileChangeEvent[]*/> =
		VscodeEvent.None;

	// public readonly onDidCreateFiles: VscodeEvent<vscode.FileCreateEvent> = VscodeEvent.None;

	// public readonly onDidDeleteFiles: VscodeEvent<vscode.FileDeleteEvent> = VscodeEvent.None;

	// public readonly onWillRenameFiles: VscodeEvent<vscode.FileRenameEvent> = VscodeEvent.None;

	// public readonly onDidRenameFiles: VscodeEvent<vscode.FileRenameEvent> = VscodeEvent.None;
}
