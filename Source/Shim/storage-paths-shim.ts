/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Storage Paths Shim (storage-paths-shim.ts)
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
 *   `vscode.workspace.fs.createDirectory` (via an injected `ShimFileSystemApi`).
 *
 * Key Interactions:
 * - Relies on `initData.environment` from Mountain for base storage paths.
 * - Uses Node.js `path` module for path manipulation.
 * - Returns `vscode.Uri` objects.
 * - Uses an injected `IInstantiationService` to access `vscode.workspace.fs` (ShimFileSystemApi)
 *   for attempting to create base storage directories.
 * - Registered with DI in `Cocoon/index.ts` and used for `ExtensionContext` creation.
 *
 *--------------------------------------------------------------------------------------------*/

import * as path from "path"; // Node.js path module
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";
import type { IInstantiationService } from "vs/platform/instantiation/common/instantiation";
// Type for vscode.workspace.fs
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace"; // DI Key to get workspace.fs
import {
	FileSystemError as VscodeFileSystemError,
	Uri as VscodeUri,
	type FileSystem as VscodeFileSystem,
} from "vscode"; // API types

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// No longer importing fsShimInstance

interface StoragePathsEnvironment {
	globalStorageHome?: VSCodeInternalUriComponents | string;
	workspaceStorageHome?: VSCodeInternalUriComponents | string;
}

export interface IExtensionStoragePathsShim {
	readonly _serviceBrand: undefined;
	workspaceValue(extension: IExtensionDescription): VscodeUri | undefined;
	globalValue(extension: IExtensionDescription): VscodeUri;
	whenReady(): Promise<void>;
	onWillDeactivateAll(): void;
}

export class ShimExtensionStoragePaths
	extends BaseCocoonShim
	implements IExtensionStoragePathsShim
{
	public readonly _serviceBrand: undefined;
	readonly #globalStoragePath: string;
	readonly #workspaceStoragePath: string | null;
	private readonly _instantiationService: IInstantiationService;
	private _workspaceFs: VscodeFileSystem | undefined; // Lazy loaded

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		environment: StoragePathsEnvironment | undefined,
		logService: ILogServiceForShim | undefined,
		instantiationService: IInstantiationService, // Injected for DI
	) {
		super("ExtensionStoragePaths", rpcService, logService);
		this._instantiationService = instantiationService;
		this._logInfo("Initializing...");

		const defaultCocoonDataRoot = path.resolve(
			process.cwd(),
			".cocoon-data-storage",
		);
		this.#globalStoragePath = this._resolvePathFromEnvData(
			environment?.globalStorageHome,
			path.join(defaultCocoonDataRoot, "globalStorage"),
		) as string;
		this.#workspaceStoragePath = this._resolvePathFromEnvData(
			environment?.workspaceStorageHome,
			null,
		);

		this._logInfo(
			`Resolved Global Storage Base Path: '${this.#globalStoragePath}'`,
		);
		this._logInfo(
			`Resolved Workspace Storage Base Path: '${this.#workspaceStoragePath ?? "N/A (No workspace storage home provided)"}'`,
		);

		// Asynchronously ensure base storage directories exist using vscode.workspace.fs
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

	// Lazy load vscode.workspace.fs
	private getWorkspaceFs(): VscodeFileSystem {
		if (!this._workspaceFs) {
			try {
				const workspaceService =
					this._instantiationService.get(IExtHostWorkspace);
				if (!workspaceService?.fs) {
					throw new Error(
						"IExtHostWorkspace or its 'fs' property is unavailable.",
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
					createDirectory: async () => {
						throw new Error(
							"Underlying Workspace FS unavailable in StoragePaths for createDirectory",
						);
					},
					stat: async () => {
						throw new Error(
							"Underlying Workspace FS unavailable in StoragePaths for stat",
						);
					},
				} as any;
			}
		}
		return this._workspaceFs;
	}

	protected override _requiresRpc(): boolean {
		return false;
	}

	private _resolvePathFromEnvData(
		envPathData: VSCodeInternalUriComponents | string | undefined,
		fallbackPathIfUnset: string | null,
	): string | null {
		if (envPathData) {
			if (
				typeof envPathData === "object" &&
				typeof envPathData.fsPath === "string"
			) {
				return path.resolve(envPathData.fsPath);
			} else if (typeof envPathData === "string") {
				return path.resolve(envPathData);
			}
			this._logWarn(
				"envPathData for storage home was object but not valid UriComponents with 'fsPath'. Using fallback.",
				"Received:",
				envPathData,
			);
		}
		return fallbackPathIfUnset ? path.resolve(fallbackPathIfUnset) : null;
	}

	private async _ensureDirectoryExistsWithWorkspaceFs(
		dirPath: string | null,
		scopeNameForLog: string,
	): Promise<void> {
		if (!dirPath) return;
		const dirUri = VscodeUri.file(dirPath);
		this._logService?.trace(
			`[${scopeNameForLog} Storage Setup] Ensuring directory exists (via vscode.workspace.fs): '${dirPath}'.`,
		);
		try {
			await this.getWorkspaceFs().stat(dirUri); // Check if exists
			this._logService?.trace(
				`[${scopeNameForLog} Storage Setup] Directory verified: '${dirPath}'.`,
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
					await this.getWorkspaceFs().createDirectory(dirUri);
					this._logInfo(
						`[${scopeNameForLog} Storage Setup] Directory successfully created: '${dirPath}'.`,
					);
				} catch (mkdirError: any) {
					this._logError(
						`[${scopeNameForLog} Storage Setup] Failed to create directory '${dirPath}' via vscode.workspace.fs. Error:`,
						mkdirError,
					);
				}
			} else {
				this._logError(
					`[${scopeNameForLog} Storage Setup] Error checking directory '${dirPath}' with vscode.workspace.fs.stat. Error:`,
					statError,
				);
			}
		}
	}

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
				this._logService?.trace(
					`Workspace storage path N/A for ext: '${extension.identifier.value}'.`,
				);
			} else {
				this._logError(
					`CRITICAL: Global storage base path is null/undefined for ext '${extension.identifier.value}'.`,
				);
			}
			return undefined;
		}
		try {
			const extensionSubdirectoryName =
				extension.identifier.value.toLowerCase();
			const fullExtensionStoragePath = path.join(
				baseDirectoryPath,
				extensionSubdirectoryName,
			);
			return VscodeUri.file(fullExtensionStoragePath);
		} catch (uriCreationError: any) {
			this._logError(
				`Failed to create file URI for extension storage. Base: '${baseDirectoryPath}', ExtID: '${extension.identifier.value}'. Error:`,
				uriCreationError,
			);
			return undefined;
		}
	}

	public workspaceValue(
		extension: IExtensionDescription,
	): VscodeUri | undefined {
		return this._getPathUriForExtension(
			extension,
			false /* isGlobalScope */,
		);
	}

	public globalValue(extension: IExtensionDescription): VscodeUri {
		const uri = this._getPathUriForExtension(
			extension,
			true /* isGlobalScope */,
		);
		if (!uri) {
			// Should be rare due to constructor fallbacks for global path
			this._logError(
				`FATAL: globalValue for ext '${extension.identifier.value}' resulted in undefined URI. Critical init error. Providing emergency fallback.`,
			);
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

	public async whenReady(): Promise<void> {
		return Promise.resolve();
	} // Paths resolved in constructor
	public onWillDeactivateAll(): void {
		this._logService?.trace(
			"onWillDeactivateAll called (NOP in storage paths shim).",
		);
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
