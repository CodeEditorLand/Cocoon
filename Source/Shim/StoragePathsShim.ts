/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Storage Paths Shim 
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionStoragePaths` service interface for the Cocoon environment.
 * This service is crucial for providing extensions with well-defined, unique, and
 * persistent filesystem URI locations where they can store their state. It distinguishes
 * between global storage (shared across all workspaces for an extension) and
 * workspace-specific storage.
 *
 * The paths provided by this service are consumed by `ExtHostExtensionService` (or its
 * shim) when creating `ExtensionContext` instances, populating properties like
 * `ExtensionContext.globalStorageUri` and `ExtensionContext.storageUri`.
 *
 * Responsibilities:
 * - Receiving base storage path URIs (typically `globalStorageHome` and `workspaceStorageHome`)
 *   from the Mountain host via `initData.environment`.
 * - Resolving these base paths into absolute filesystem paths. If paths are not
 *   provided by Mountain, it uses sensible fallbacks within a `.cocoon-data-storage`
 *   directory relative to Cocoon's current working directory.
 * - Constructing specific storage path URIs for each extension by creating a subdirectory
 *   named after the extension's lowercased identifier (e.g., `publisher.name`)
 *   under the appropriate base global or workspace storage path.
 * - Providing `workspaceValue(extension)` and `globalValue(extension)` methods that
 *   return these extension-specific storage locations as `vscode.Uri` objects.
 * - Attempting to ensure that the base storage directories exist on the filesystem.
 *   This is done asynchronously in the background during initialization using
 *   `vscode.workspace.fs.createDirectory` (via an injected `IInstantiationService`
 *   to access `IExtHostWorkspace` which provides `fs`).
 *
 * Key Interactions:
 * - Relies on `initData.environment` from Mountain for base storage paths.
 * - Uses Node.js `path` module for path manipulation.
 * - Returns `vscode.Uri` objects.
 * - Uses an injected `IInstantiationService` to access `vscode.workspace.fs`
 *   for attempting to create base storage directories.
 * - Registered with DI in `Cocoon/index.ts` and used for `ExtensionContext` creation.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path"; // Node.js path module
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri"; // For initData types
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";
import type { IInstantiationService } from "vs/platform/instantiation/common/instantiation";
// DI Key to get workspace.fs, which provides VscodeFileSystem
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace";
// API types (ensure this path resolves to Cocoon's 'vscode' shim)
import {
	FileSystemError as VscodeFileSystemError,
	Uri as VscodeUri,
	type FileSystem as VscodeFileSystem,
} from "vscode";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

/**
 * Defines the structure of `initData.environment` relevant to this storage paths shim.
 * It expects paths to the home directories for global and workspace-specific storage.
 */
interface StoragePathsEnvironment {
	globalStorageHome?: VSCodeInternalUriComponents | string; // Can be DTO or path string
	workspaceStorageHome?: VSCodeInternalUriComponents | string; // Can be DTO or path string
}

/**
 * The public interface provided by this shim, aligning with VS Code's `IExtensionStoragePaths`.
 */
export interface IExtensionStoragePathsShim {
	readonly _serviceBrand: undefined; // For DI compatibility

	workspaceValue(extension: IExtensionDescription): VscodeUri | undefined;
	globalValue(extension: IExtensionDescription): VscodeUri;
	whenReady(): Promise<void>;
	onWillDeactivateAll(): void;
}

/**
 * Cocoon's implementation of `IExtensionStoragePaths`.
 * It resolves and provides filesystem URIs for extension-specific storage.
 */
export class ShimExtensionStoragePaths
	extends BaseCocoonShim
	implements IExtensionStoragePathsShim
{
	public readonly _serviceBrand: undefined;

	readonly #globalStoragePath: string; // Resolved absolute string path
	readonly #workspaceStoragePath: string | null; // Resolved, or null if not applicable
	private readonly _instantiationService: IInstantiationService;
	private _workspaceFs: VscodeFileSystem | undefined; // Lazy loaded via DI

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		environment: StoragePathsEnvironment | undefined, // From initData.environment
		logService: ILogServiceForShim | undefined,
		instantiationService: IInstantiationService, // Injected for DI
	) {
		super("ExtensionStoragePaths", rpcService, logService);
		this._instantiationService = instantiationService;
		this._logInfo("Initializing...");

		// Define a default root for Cocoon data if specific paths are not provided.
		const defaultCocoonDataRoot = path.resolve(
			process.cwd(),
			".cocoon-data-storage",
		);

		this.#globalStoragePath = this._resolvePathFromEnvData(
			environment?.globalStorageHome,
			path.join(defaultCocoonDataRoot, "globalStorage"), // Fallback for global path
		) as string; // Cast as string because global always has a fallback

		this.#workspaceStoragePath = this._resolvePathFromEnvData(
			environment?.workspaceStorageHome,
			null, // No fallback for workspace path; it remains null if not provided.
		);

		this._logInfo(
			`Resolved Global Storage Base Path: '${this.#globalStoragePath}'`,
		);
		this._logInfo(
			`Resolved Workspace Storage Base Path: '${this.#workspaceStoragePath ?? "N/A (No workspace storage home provided)"}'`,
		);

		// Asynchronously ensure base storage directories exist using vscode.workspace.fs.
		// These calls are fire-and-forget from the constructor's perspective.
		this._ensureDirectoryExistsWithWorkspaceFs(
			this.#globalStoragePath,
			"Global",
		).catch((err) =>
			this._logError(
				`Background task to ensure Global storage directory ('${this.#globalStoragePath}') failed:`,
				err,
			),
		);

		if (this.#workspaceStoragePath) {
			this._ensureDirectoryExistsWithWorkspaceFs(
				this.#workspaceStoragePath,
				"Workspace",
			).catch((err) =>
				this._logError(
					`Background task to ensure Workspace storage directory ('${this.#workspaceStoragePath}') failed:`,
					err,
				),
			);
		}
	}

	// Lazy load vscode.workspace.fs via IInstantiationService
	private getWorkspaceFs(): VscodeFileSystem {
		if (!this._workspaceFs) {
			try {
				const workspaceService =
					this._instantiationService.get(IExtHostWorkspace);
				if (!workspaceService?.fs) {
					throw new Error(
						"IExtHostWorkspace or its 'fs' property is unavailable via DI.",
					);
				}
				this._workspaceFs = workspaceService.fs;
			} catch (diError: any) {
				this._logError(
					"CRITICAL: Cannot access vscode.workspace.fs for StoragePaths directory creation. DI failed.",
					diError,
				);
				// Provide a NOP/throwing FS to prevent null errors downstream if truly critical,
				// though directory creation is best-effort.
				this._workspaceFs = {
					createDirectory: async (_uri: VscodeUri) => {
						throw new Error(
							"Underlying Workspace FS unavailable in StoragePaths for createDirectory",
						);
					},
					stat: async (_uri: VscodeUri) => {
						throw new Error(
							"Underlying Workspace FS unavailable in StoragePaths for stat",
						);
					},
					// Add other methods as needed if a more complete NOP FS is required for fallback.
				} as any; // Cast to VscodeFileSystem, acknowledging it's a partial NOP
			}
		}
		return this._workspaceFs;
	}

	/** This shim does not require RPC for its core functionality. */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Resolves an absolute filesystem path from environment data (which can be UriComponents or a string)
	 * or uses a fallback.
	 */
	private _resolvePathFromEnvData(
		envPathData: VSCodeInternalUriComponents | string | undefined,
		fallbackPathIfUnset: string | null,
	): string | null {
		if (envPathData) {
			if (
				typeof envPathData === "object" &&
				typeof envPathData.fsPath === "string"
			) {
				// If UriComponents with fsPath (typical for file URIs from initData)
				return path.resolve(envPathData.fsPath);
			} else if (typeof envPathData === "string") {
				// If it's a direct string path
				return path.resolve(envPathData);
			}
			this._logWarn(
				"envPathData for storage home was an object but not valid UriComponents with 'fsPath', or an unexpected type. Using fallback.",
				"Received:",
				envPathData,
			);
		}
		return fallbackPathIfUnset ? path.resolve(fallbackPathIfUnset) : null;
	}

	/**
	 * Asynchronously ensures that a given directory path exists, creating it if necessary,
	 * using `vscode.workspace.fs`.
	 */
	private async _ensureDirectoryExistsWithWorkspaceFs(
		dirPath: string | null,
		scopeNameForLog: string,
	): Promise<void> {
		if (!dirPath) return; // If path is null (e.g., no workspace storage), do nothing.

		const dirUri = VscodeUri.file(dirPath);
		this._logService?.trace(
			`[${scopeNameForLog} Storage Setup] Ensuring directory exists (via vscode.workspace.fs): '${dirPath}'.`,
		);

		try {
			await this.getWorkspaceFs().stat(dirUri); // Check if directory/file exists
			this._logService?.trace(
				`[${scopeNameForLog} Storage Setup] Directory/file verified at: '${dirPath}'. (Assumed to be a directory if no error)`,
			);
		} catch (statError: any) {
			if (
				statError instanceof VscodeFileSystemError &&
				statError.code === "FileNotFound"
			) {
				this._logInfo(
					`[${scopeNameForLog} Storage Setup] Directory not found at '${dirPath}'. Attempting to create it...`,
				);
				try {
					await this.getWorkspaceFs().createDirectory(dirUri); // Create directory recursively
					this._logInfo(
						`[${scopeNameForLog} Storage Setup] Directory successfully created: '${dirPath}'.`,
					);
				} catch (mkdirError: any) {
					this._logError(
						`[${scopeNameForLog} Storage Setup] Failed to create directory '${dirPath}' via vscode.workspace.fs. Error:`,
						mkdirError,
					);
					// Depending on Cocoon's error strategy, this could be logged more severely.
				}
			} else {
				// Other errors during stat (e.g., permission issues, or path is a file).
				this._logError(
					`[${scopeNameForLog} Storage Setup] Error checking directory '${dirPath}' with vscode.workspace.fs.stat. Error:`,
					statError,
				);
			}
		}
	}

	/**
	 * Constructs the full storage path URI for a given extension and scope (global or workspace).
	 */
	private _getPathUriForExtension(
		extension: IExtensionDescription,
		scopeIsGlobal: boolean,
	): VscodeUri | undefined {
		if (!extension?.identifier?.value) {
			this._logError(
				"Cannot get storage path: Invalid IExtensionDescription or missing identifier.",
				"Ext:",
				extension,
			);
			return undefined;
		}

		const baseDirectoryPath = scopeIsGlobal
			? this.#globalStoragePath
			: this.#workspaceStoragePath;

		if (!baseDirectoryPath) {
			if (!scopeIsGlobal) {
				// Workspace storage path might legitimately be null
				this._logService?.trace(
					`Workspace storage path N/A for ext: '${extension.identifier.value}'. No workspace storage home provided.`,
				);
			} else {
				// Global storage path should always be resolved due to fallback
				this._logError(
					`CRITICAL: Global storage base path is unexpectedly null/undefined for ext '${extension.identifier.value}'. This indicates an initialization issue.`,
				);
			}
			return undefined;
		}

		try {
			// VS Code convention: use the lowercased extension ID for the subdirectory name.
			const extensionSubdirectoryName =
				extension.identifier.value.toLowerCase();
			const fullExtensionStoragePath = path.join(
				baseDirectoryPath,
				extensionSubdirectoryName,
			);
			return VscodeUri.file(fullExtensionStoragePath); // Create a file URI
		} catch (uriCreationError: any) {
			this._logError(
				`Failed to create file URI for extension storage. Base: '${baseDirectoryPath}', ExtID: '${extension.identifier.value}'. Error:`,
				uriCreationError,
			);
			return undefined;
		}
	}

	/** {@inheritDoc IExtensionStoragePathsShim.workspaceValue} */
	public workspaceValue(
		extension: IExtensionDescription,
	): VscodeUri | undefined {
		return this._getPathUriForExtension(
			extension,
			false /* isGlobalScope = false */,
		);
	}

	/** {@inheritDoc IExtensionStoragePathsShim.globalValue} */
	public globalValue(extension: IExtensionDescription): VscodeUri {
		const uri = this._getPathUriForExtension(
			extension,
			true /* isGlobalScope = true */,
		);
		if (!uri) {
			// This should be rare due to constructor fallbacks for the global path.
			this._logError(
				`FATAL: globalValue for ext '${extension.identifier.value}' resulted in undefined URI. This indicates a critical initialization error. Providing emergency fallback URI.`,
			);
			// Provide a "best effort" emergency URI to satisfy the API contract (must return Uri).
			const emergencyBase =
				this.#globalStoragePath ||
				path.join(
					process.cwd(),
					".cocoon-data-ERROR",
					"globalStorage-CRITICAL-FALLBACK",
				);
			return VscodeUri.file(
				path.join(
					emergencyBase,
					extension.identifier.value.toLowerCase(),
				),
			);
		}
		return uri;
	}

	/** {@inheritDoc IExtensionStoragePathsShim.whenReady} */
	public async whenReady(): Promise<void> {
		// Paths are resolved synchronously in the constructor.
		// Directory creation is attempted asynchronously (fire-and-forget) in the background.
		// `whenReady` typically means paths are resolvable.
		return Promise.resolve();
	}

	/** {@inheritDoc IExtensionStoragePathsShim.onWillDeactivateAll} */
	public onWillDeactivateAll(): void {
		this._logService?.trace(
			"onWillDeactivateAll called (NOP in this storage paths shim).",
		);
		// In VS Code, this might be used to release file locks on storage.
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
