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
 *   `workspacefs_*` method names via direct Vine IPC (`_ipcRequestResponse`) or potentially
 *   an RPC proxy if available.
 * - Converting arguments (e.g., `vscode.Uri` to `UriComponents`, `Uint8Array` to base64)
 *   into the format expected by the Mountain handlers.
 * - Converting results received from Mountain back into the format expected by the API
 *   (e.g., base64 to `Uint8Array` for `readFile`, stat structure, directory entry format).
 * - Handling errors returned by Mountain and converting them into appropriate
 *   `vscode.FileSystemError` instances (e.g., `FileNotFound`, `NoPermissions`).
 * - Providing basic implementation or stubs for file events (`onDidChangeFile`, etc.).
 *
 * Key Interactions:
 * - Provides the `vscode.workspace.fs` API object (integrated via `createApiFactory` in `index.js`).
 * - Uses `_ipcRequestResponse` from `_baseShim.js` to call `workspacefs_*` handlers in Mountain.
 * - Handles data serialization/deserialization (URIs, base64 buffers).
 * - Converts error codes/messages into `vscode.FileSystemError`.
 * - Relies on bundled VS Code types (`Uri`, `FileType`, `FileSystemError`, `VSBuffer`).
 *--------------------------------------------------------------------------------------------*/

// Assume API objects available, imported from 'vscode'
// Needs bundling
import { VSBuffer } from "vs/base/common/buffer";
import {
	FilePermission,
	FileStat,
	FileSystemError,
	FileType,
	Uri,
	// Not used in current event stubs
	// FileChangeType,
	// For full API shape, not directly used by this consumer shim
	// FileSystemProvider,
	// For event types
	// FileChangeEvent,
	// Interface this class implements
	// FileSystem,
	// Not directly used in current implementation
	// FileSystemProviderCapabilities,
} from "vscode";

import { BaseCocoonShim, ILogService } from "./_baseShim";

// For event types
// import { Event as VscodeEvent } from "vs/base/common/event";

// --- Type definitions for parameters and return values ---

// For URI components (used in RPC)
interface IUriComponents {
	$mid?: number;

	scheme: string;

	// Optional
	authority?: string;

	path: string;

	// Optional
	query?: string;

	// Optional
	fragment?: string;

	// Optional
	external?: string;
}

// Options for delete operation
interface DeleteOptions {
	recursive?: boolean;

	useTrash?: boolean;
}

// Options for rename/copy operation
interface OverwriteOptions {
	overwrite?: boolean;
}

// For readDirectory result
type DirectoryEntry = [string, FileType];

// For stat result from Mountain (before conversion to FileStat)
interface RawFileStat {
	// 'File', 'Directory', etc.
	type: keyof typeof FileTypeMap;

	ctime: number;

	mtime: number;

	size: number;

	// Optional, as vscode.FileStat has it
	permissions?: FilePermission;
}

// For FileSystemError structured message
interface StructuredFsError {
	code?: string;

	message?: string;
}

const FileTypeMap = {
	[FileType.Unknown]: "Unknown",

	[FileType.File]: "File",

	[FileType.Directory]: "Directory",

	[FileType.SymbolicLink]: "SymbolicLink",

	// Use const assertion for stricter typing of keys
} as const;

const FileTypeReverseMap: { [key: string]: FileType } = {
	"Unknown": FileType.Unknown,

	"File": FileType.File,

	"Directory": FileType.Directory,

	"SymbolicLink": FileType.SymbolicLink,
};

// This shim directly implements the vscode.FileSystem interface
// No _serviceBrand is needed if it's not registered with DI in the same way as ExtHost services.
export class ShimFileSystemApi extends BaseCocoonShim /* implements vscode.FileSystem */ {
	constructor(logService: ILogService | undefined) {
		// No specific ExtHost service, acts as a direct API provider.
		// No RPC proxy needed if using direct IPC helpers from base shim.
		super("WorkspaceFS", undefined /* rpcService */, logService);

		this._log("Initialized vscode.workspace.fs shim.");
	}

	// _convertApiArgToInternal from BaseCocoonShim should handle Uri to components.
	// If a more specific version is needed for this shim, it can be overridden.
	protected _uriToComponents(uri: Uri): IUriComponents | undefined {
		const components = super._convertApiArgToInternal(uri);

		// Basic check to see if it looks like URI components
		if (
			components &&
			typeof components.scheme === "string" &&
			typeof components.path === "string"
		) {
			return components as IUriComponents;
		}

		this._logWarn(
			"Failed to convert URI to components using base method, falling back or erroring.",

			uri,
		);

		// Fallback or throw error if base method is not sufficient for this shim's IPC needs.
		// For now, let's assume base method works or this will be an error point if it doesn't.
		if (!uri) return undefined;

		return {
			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			external: uri.toString(true),
		};
	}

	private _handleFsError(
		operation: string,

		uri: Uri | undefined,

		error: any,
	): FileSystemError {
		this._logError(
			`WorkspaceFS.${operation} failed for ${uri?.toString() || "unknown URI"}:`,

			error,
		);

		let structuredError: StructuredFsError | null = null;

		if (error instanceof Error && error.message) {
			try {
				const parsed = JSON.parse(error.message);

				if (typeof parsed === "object" && parsed !== null) {
					structuredError = parsed as StructuredFsError;
				}
			} catch (e) {
				/* ignore */
			}
		} else if (typeof error === "object" && error !== null) {
			// error itself might be the structured error
			structuredError = error as StructuredFsError;
		}

		// Check error.code as well
		const code = structuredError?.code || (error as any)?.code;

		const msg =
			structuredError?.message ||
			(error instanceof Error ? error.message : String(error)) ||
			`Unknown error during ${operation}`;

		// Use URI in error if available
		const targetUri = uri || (typeof msg === "string" ? msg : undefined);

		if (code === "ENOENT") return FileSystemError.FileNotFound(targetUri);

		if (code === "EEXIST") return FileSystemError.FileExists(targetUri);

		if (code === "EISDIR")
			return FileSystemError.FileIsADirectory(targetUri);

		if (code === "ENOTDIR")
			return FileSystemError.FileNotADirectory(targetUri);

		if (code === "EACCES" || code === "EPERM")
			return FileSystemError.NoPermissions(targetUri);

		if (code === "ENOSPC")
			return FileSystemError.NoPermissions(
				`No space left on device for ${operation} on ${targetUri}`,

				// Example
			);

		if (code === "EROFS")
			return FileSystemError.NoPermissions(
				`Read-only file system for ${operation} on ${targetUri}`,

				// Example
			);

		// Generic error
		return new FileSystemError(msg);
	}

	// --- vscode.FileSystem API Implementation ---

	public async stat(uri: Uri): Promise<FileStat> {
		this._log(`stat: ${uri.toString()}`);

		try {
			const params = { uri: this._uriToComponents(uri) };

			if (!params.uri) throw new Error("URI conversion failed for stat");

			const result = (await this._ipcRequestResponse(
				"workspacefs_stat",

				params,
			)) as RawFileStat;

			return {
				type: FileTypeReverseMap[result.type] ?? FileType.Unknown,

				ctime: result.ctime,

				mtime: result.mtime,

				size: result.size,

				// Assuming Mountain might send this
				permissions: result.permissions,
			};
		} catch (e: any) {
			throw this._handleFsError("stat", uri, e);
		}
	}

	public async readDirectory(uri: Uri): Promise<DirectoryEntry[]> {
		this._log(`readDirectory: ${uri.toString()}`);

		try {
			const params = { uri: this._uriToComponents(uri) };

			if (!params.uri)
				throw new Error("URI conversion failed for readDirectory");

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
			const params = { uri: this._uriToComponents(uri) };

			if (!params.uri)
				throw new Error("URI conversion failed for readFile");

			const base64Data = (await this._ipcRequestResponse(
				"workspacefs_readFile",

				params,
			)) as string;

			const buffer = VSBuffer.fromBase64(base64Data);

			// Uint8Array
			return buffer.buffer;
		} catch (e: any) {
			throw this._handleFsError("readFile", uri, e);
		}
	}

	public async writeFile(
		uri: Uri,

		content: Uint8Array,

		options?: { create?: boolean; overwrite?: boolean; atomic?: boolean },
	): Promise<void> {
		this._log(`writeFile: ${uri.toString()} (${content.byteLength} bytes)`);

		try {
			const buffer = VSBuffer.wrap(content);

			const base64Data = buffer.base64Encode();

			const params = {
				uri: this._uriToComponents(uri),

				content: base64Data,

				// Pass options if Mountain handler supports them
				options: options,
			};

			if (!params.uri)
				throw new Error("URI conversion failed for writeFile");

			await this._ipcRequestResponse("workspacefs_writeFile", params);
		} catch (e: any) {
			throw this._handleFsError("writeFile", uri, e);
		}
	}

	public async createDirectory(uri: Uri): Promise<void> {
		this._log(`createDirectory: ${uri.toString()}`);

		try {
			const params = { uri: this._uriToComponents(uri) };

			if (!params.uri)
				throw new Error("URI conversion failed for createDirectory");

			await this._ipcRequestResponse(
				"workspacefs_createDirectory",

				params,
			);
		} catch (e: any) {
			// As per VS Code API spec, FileExists error should be ignored for createDirectory.
			const filesysError = this._handleFsError("createDirectory", uri, e);

			if (filesysError.code === FileSystemError.FileExists().code) {
				// Check code string
				this._log("createDirectory ignored FileExists error.");

				return;
			}

			throw filesysError;
		}
	}

	public async delete(uri: Uri, options?: DeleteOptions): Promise<void> {
		const recursive = options?.recursive ?? false;

		// Note: useTrash might not be handled by simple IPC
		const useTrash = options?.useTrash ?? false;

		this._log(
			`delete: ${uri.toString()} (recursive=${recursive}, useTrash=${useTrash})`,
		);

		if (useTrash) {
			this._logWarn(
				"delete with useTrash=true NOT IMPLEMENTED robustly by basic IPC shim.",
			);

			//  // Or attempt non-trash deletethrow FileSystemError.NoPermissions('Trash not implemented via
			// simple IPC');
		}

		try {
			const params = {
				uri: this._uriToComponents(uri),

				// Mountain needs to handle useTrash
				options: { recursive /*, useTrash */ },
			};

			if (!params.uri)
				throw new Error("URI conversion failed for delete");

			await this._ipcRequestResponse("workspacefs_delete", params);
		} catch (e: any) {
			throw this._handleFsError("delete", uri, e);
		}
	}

	public async rename(
		source: Uri,

		target: Uri,

		options?: OverwriteOptions,
	): Promise<void> {
		const overwrite = options?.overwrite ?? false;

		this._log(
			`rename: ${source.toString()} -> ${target.toString()} (overwrite=${overwrite})`,
		);

		try {
			const params = {
				source: this._uriToComponents(source),

				target: this._uriToComponents(target),

				options: { overwrite },
			};

			if (!params.source || !params.target)
				throw new Error("URI conversion failed for rename");

			await this._ipcRequestResponse("workspacefs_rename", params);
		} catch (e: any) {
			throw this._handleFsError("rename", source, e);
		}
	}

	public async copy(
		source: Uri,

		target: Uri,

		options?: OverwriteOptions,
	): Promise<void> {
		const overwrite = options?.overwrite ?? false;

		this._log(
			`copy: ${source.toString()} -> ${target.toString()} (overwrite=${overwrite})`,
		);

		// this._logWarn("vscode.workspace.fs.copy is NOT IMPLEMENTED.");

		// throw new FileSystemError("copy operation not implemented");

		try {
			const params = {
				source: this._uriToComponents(source),

				target: this._uriToComponents(target),

				options: { overwrite },
			};

			if (!params.source || !params.target)
				throw new Error("URI conversion failed for copy");

			await this._ipcRequestResponse("workspacefs_copy", params);
		} catch (e: any) {
			throw this._handleFsError("copy", source, e);
		}
	}

	public isWritableFileSystem(scheme: string): boolean | undefined {
		// This information ideally comes from Mountain (e.g., from FileSystemProvider registration)
		this._logWarn(
			`isWritableFileSystem check for '${scheme}' is using basic MVP logic.`,
		);

		if (scheme === "file" || scheme === "untitled") {
			return true;
		}

		// For other schemes, we don't know, so returning undefined is appropriate.
		// Extensions should check for capabilities of a FileSystemProvider if they register one.
		return undefined;

		// TODO: Query Mountain or use initData capabilities map
		// const capabilities = this.#fileSystemInfoService.getCapabilities(scheme);

		// return !(capabilities & FileSystemProviderCapabilities.Readonly);
	}

	// --- File/Directory events (onDid*) ---
	// These would require Mountain to send notifications via Vine/IPC, which then trigger Emitters here.
	// public readonly onDidChangeFile: VscodeEvent<readonly FileChangeEvent[]> = this._createNopEventEmitter();

	//  // Correct type?public readonly onDidCreateFiles: VscodeEvent<FileCreateEvent> = this.
	// _createNopEventEmitter();

	//  // Correct type?public readonly onDidDeleteFiles: VscodeEvent<FileDeleteEvent> = this.
	// _createNopEventEmitter();

	//  // Correct type?public readonly onWillRenameFiles: VscodeEvent<FileRenameEvent> = this.
	// _createNopEventEmitter();

	//  // Correct type?public readonly onDidRenameFiles: VscodeEvent<FileRenameEvent> = this.
	// _createNopEventEmitter();

	// For onDidChangeFile, an emitter needs to be managed if events are proxied.
	// Example:
	// #onDidChangeFileEmitter = this._createEmitter<readonly FileChangeEvent[]>();

	// get onDidChangeFile(): VscodeEvent<readonly FileChangeEvent[]> { return this.#onDidChangeFileEmitter.event; }

	// Then, Mountain would call a method like $onFileChanges(eventsDto) which calls this.#onDidChangeFileEmitter.fire(...)
}

// Class is already exported
// export { ShimFileSystemApi };
