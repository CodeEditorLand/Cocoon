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
 * `ExtensionContext.globalStorageUri` and `ExtensionContext.storageUri`. These URIs
 * point to directories where extensions can then use `vscode.workspace.fs` (handled by
 * `fs-api-shim.ts`) or potentially `require('fs')` (handled by `fs-shim.ts`, though
 * with caveats) to manage their files.
 *
 * Responsibilities:
 * - Receiving base storage path URIs (typically `globalStorageHome` for global storage
 *   and `workspaceStorageHome` for workspace-specific storage) from the Mountain host
 *   via `initData.environment`.
 * - Resolving these base paths into absolute filesystem paths. If paths are not
 *   provided by Mountain, it uses sensible fallbacks within a `.cocoon-data-storage`
 *   directory relative to Cocoon's current working directory.
 * - Constructing specific storage path URIs for each extension by creating a subdirectory
 *   named after the extension's lowercased identifier (e.g., `publisher.name`)
 *   under the appropriate base global or workspace storage path.
 * - Providing `workspaceValue(extension)` and `globalValue(extension)` methods that
 *   return these extension-specific storage locations as `vscode.Uri` objects.
 * - Attempting to ensure that the base storage directories exist on the filesystem.
 *   This is done asynchronously in the background during initialization using the
 *   `fs-shim.ts` (Node 'fs' proxy) via its `_ensureDirectoryExists` helper.
 *   **WARNING:** The functionality of `_ensureDirectoryExists` (and thus background
 *   directory creation) is currently compromised due to `fs-shim.ts` relying on a
 *   deprecated backend (`handlers/native_fs.rs`) in Mountain. Extensions should not
 *   rely on these directories being auto-created by this service at this time.
 *
 * Key Interactions:
 * - Relies on initialization data (`ExtHostInitData.environment`) provided by `index.ts`
 *   (originating from Mountain) for the base storage paths.
 * - Uses the Node.js `path` module for robust path manipulation and resolution.
 * - Returns `vscode.Uri` objects (from `../Shim/out/vscode.js` or a similar API shim)
 *   as per the VS Code API contract.
 * - Utilizes `fs-shim.ts` (specifically `fsShimInstance.promises.mkdir`) for its
 *   attempt to create base storage directories. The success of this depends on the
 *   `fs-shim.ts` backend being functional.
 * - An instance of `ShimExtensionStoragePaths` is registered with Dependency Injection
 *   in `Cocoon/index.ts` and is used by the extension host lifecycle, particularly
 *   for populating `ExtensionContext`.
 *
 *--------------------------------------------------------------------------------------------*/

// Node.js path module for joining and resolving paths
import * as path from "path";
// For initData type
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";

// Use vscode.Uri from the API shim for consistency with what extensions and ExtensionContext expect.
import { Uri as VscodeUri } from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	// For BaseCocoonShim constructor
	type ILogServiceForShim,
	// For BaseCocoonShim constructor
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";
// Default import of the fs-shim object instance for directory creation operations.
// WARNING: Backend for fs-shim (native_fs.rs) is deprecated.
import fsShimInstance from "./fs-shim";

// VS Code's internal IExtensionStoragePaths interface for type compatibility if this shim is registered with DI under that key.
// import { IExtensionStoragePaths as VscodeIExtensionStoragePaths } from 'vs/platform/extensionManagement/common/extensionStorage';

// --- Type Definitions ---

/**
 * Defines the structure of `initData.environment` relevant to this storage paths shim.
 * It expects URIs (as `VSCodeInternalUriComponents` after revival, or path strings pre-revival)
 * pointing to the home directories for global and workspace-specific extension storage.
 */
interface StoragePathsEnvironment {
	/**
	 * The base URI (typically `VSCodeInternalUriComponents` if revived from JSON by `index.ts`,
	 *
	 *
	 * or a path string if consumed before full revival) for global extension storage.
	 */
	globalStorageHome?: VSCodeInternalUriComponents | string;

	/**
	 * The base URI (similarly, `VSCodeInternalUriComponents` or path string) for
	 * workspace-specific extension storage. This may be undefined if no workspace is open.
	 */
	workspaceStorageHome?: VSCodeInternalUriComponents | string;

	// Other environment properties might exist but are not directly used by this shim.
}

/**
 * The public interface provided by this shim, aligning with VS Code's `IExtensionStoragePaths`.
 * This interface is what `ExtensionContext` and other services rely on for obtaining
 * standardized storage path URIs for extensions.
 */
export interface IExtensionStoragePathsShim {
	// For DI compatibility if registered as a VS Code service.
	readonly _serviceBrand: undefined;

	/**
	 * Returns the workspace-specific storage URI for the given extension.
	 * This location is intended for data that should only be available when the current
	 * workspace (or workspace folder, depending on VS Code's exact scoping rules) is active.
	 * @param extension The `IExtensionDescription` of the extension for which to get the storage path.
	 * @returns A `vscode.Uri` pointing to the workspace storage location for the extension,
	 *
	 *
	 *          or `undefined` if no workspace storage is available (e.g., when no folder
	 *          is opened or if Mountain does not provide a `workspaceStorageHome`).
	 */
	workspaceValue(extension: IExtensionDescription): VscodeUri | undefined;

	/**
	 * Returns the global storage URI for the given extension.
	 * This location is intended for data that should persist across all workspaces and
	 * sessions for that particular extension (e.g., user-wide settings or caches).
	 * @param extension The `IExtensionDescription` of the extension for which to get the storage path.
	 * @returns A `vscode.Uri` pointing to the global storage location for the extension.
	 *          This method is guaranteed to return a URI (it uses a fallback mechanism if the primary
	 *          global storage path cannot be determined from `initData`).
	 */
	globalValue(extension: IExtensionDescription): VscodeUri;

	/**
	 * A promise that resolves when the storage paths service is considered "ready" to provide paths.
	 * In this shim, storage paths are determined synchronously during constructor initialization.
	 * The asynchronous background task of attempting to ensure base directories exist does not block
	 * this promise. Thus, it resolves immediately, indicating paths can be requested.
	 * @returns A promise that resolves when paths are available for resolution.
	 */
	whenReady(): Promise<void>;

	/**
	 * A lifecycle hook called by the extension host when all extensions are about to be deactivated
	 * (e.g., during a shutdown sequence). In a full VS Code environment, services managing
	 * storage (like an SQLite-backed Memento service) might use this to flush buffers or
	 * release file locks. This is a No-Operation (NOP) in the current shim, as it only
	 * provides paths and doesn't manage locks itself.
	 */
	onWillDeactivateAll(): void;
}

/**
 * Cocoon's implementation of `IExtensionStoragePaths`.
 * It resolves and provides filesystem URIs for extension-specific global and workspace storage, * based on paths received from Mountain or sensible defaults.
 */
export class ShimExtensionStoragePaths
	extends BaseCocoonShim
	implements IExtensionStoragePathsShim
{
	public readonly _serviceBrand: undefined;

	// Resolved absolute string path for the base global storage directory. Guaranteed to be set due to fallbacks.
	readonly #globalStoragePath: string;

	// Resolved absolute string path for the base workspace storage directory, or `null` if not applicable/provided.
	readonly #workspaceStoragePath: string | null;

	/**
	 * Creates an instance of ShimExtensionStoragePaths.
	 * @param rpcService The RPC service adapter (passed to `BaseCocoonShim`, not directly used by this service's core logic).
	 * @param environment The environment data from `initData` (e.g., `revivedInitData.environment`),
	 *
	 *
	 *                    which should contain `globalStorageHome` and `workspaceStorageHome` URI components or paths.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		// Expects ExtHostInitData.environment
		environment: StoragePathsEnvironment | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtensionStoragePaths", rpcService, logService);

		// Use Info for major lifecycle events.
		this._logInfo("Initializing...");

		// Define a default root directory for Cocoon's persistent data if specific paths are not provided by Mountain.
		// This ensures that storage paths can always be resolved, even in minimal or fallback scenarios.
		const defaultCocoonDataRoot = path.resolve(
			process.cwd(),

			".cocoon-data-storage",

			// More specific name
		);

		this.#globalStoragePath = this._resolvePathFromEnvData(
			environment?.globalStorageHome,

			// Fallback path for global storage.
			path.join(defaultCocoonDataRoot, "globalStorage"),

			// Cast to string: global path is guaranteed to resolve due to the fallback.
		) as string;

		this.#workspaceStoragePath = this._resolvePathFromEnvData(
			environment?.workspaceStorageHome,

			// No fallback for workspace path; it remains `null` if not provided by Mountain (e.g., no workspace open).
			null,
		);

		this._logInfo(
			`Resolved Global Storage Base Path: '${this.#globalStoragePath}'`,
		);

		this._logInfo(
			`Resolved Workspace Storage Base Path: '${this.#workspaceStoragePath ?? "N/A (No workspace or no workspace storage home provided)"}'`,
		);

		// Asynchronously attempt to ensure the base storage directories exist.
		// These operations run in the background and do not block constructor completion or `whenReady()`.
		// Errors during this process are logged but don't prevent the service from providing path URIs.
		// CRITICAL WARNING: This relies on fs-shim.ts, whose backend is deprecated.
		this._logWarnOnce(
			"Attempting to ensure storage directories exist using fs-shim.ts. " +
				"WARNING: The backend for fs-shim.ts (native_fs.rs in Mountain) is DEPRECATED. " +
				"Directory creation may fail or be unreliable.",
		);

		this._ensureDirectoryExists(this.#globalStoragePath, "Global").catch(
			(err) =>
				this._logError(
					`Background task to ensure Global storage base directory ('${this.#globalStoragePath}') failed. ` +
						`This might be due to the deprecated 'fs-shim' backend or permissions. Error:`,

					err,
				),
		);

		if (this.#workspaceStoragePath) {
			this._ensureDirectoryExists(
				this.#workspaceStoragePath,

				"Workspace",
			).catch((err) =>
				this._logError(
					`Background task to ensure Workspace storage base directory ('${this.#workspaceStoragePath}') failed. ` +
						`This might be due to the deprecated 'fs-shim' backend or permissions. Error:`,

					err,
				),
			);
		}
	}

	/**
	 * This shim's core logic relies on `initData` (passed to constructor) and local path manipulation;
	 *
	 *
	 *
	 * it does not require RPC for its primary functionality of resolving storage paths.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Resolves an absolute filesystem path from environment data provided in `initData`.
	 * The environment data for a path can be a structured URI object (typically `VSCodeInternalUriComponents`
	 * after `initData` revival, containing an `fsPath`) or a direct path string.
	 *
	 * @param envPathData The path data from `initData.environment` (e.g., `globalStorageHome`).
	 *                    This could be `VSCodeInternalUriComponents` or a `string`.
	 * @param fallbackPathIfUnset The absolute path string to use as a fallback if `envPathData`
	 *                              is not provided, invalid, or doesn't yield a usable path. Can be `null`.
	 * @returns The resolved absolute path string, or `null` if no valid path could be determined
	 *          and `fallbackPathIfUnset` was also `null`.
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
				// If envPathData is UriComponents (revived from JSON), use its fsPath.
				return path.resolve(envPathData.fsPath);
			} else if (typeof envPathData === "string") {
				// If it's a direct path string.
				return path.resolve(envPathData);
			}

			// If envPathData is an object but not a valid UriComponents DTO with an `fsPath`, or an unexpected type.
			this._logWarn(
				"envPathData for a storage home location was provided but was not a valid UriComponents object with an 'fsPath' string, nor a direct path string. Using fallback path if available.",

				"Received envPathData:",

				envPathData,
			);
		}

		// If envPathData was not usable or not provided, use the fallback.
		return fallbackPathIfUnset ? path.resolve(fallbackPathIfUnset) : null;
	}

	/**
	 * Asynchronously ensures that a given directory path exists on the filesystem.
	 * If the directory (or its parent directories) do not exist, it attempts to create them
	 * recursively using the `fs-shim` (which proxies to Mountain's `fs_mkdir` handler).
	 *
	 * **WARNING:** This method's reliability depends on `fs-shim.ts` and its backend in Mountain
	 * (`handlers/native_fs.rs`), which is currently marked as DEPRECATED and may be non-functional.
	 * Directory creation attempts via this method are therefore likely to fail or be unreliable
	 * until the `fs-shim` backend dependency is resolved (e.g., by reviving `native_fs.rs` or
	 * by this service using `vscode.workspace.fs` which has a functional backend).
	 * Errors during this background operation are logged.
	 *
	 * @param dirPath The absolute path of the directory to ensure. If `null`, the method is a NOP.
	 * @param scopeNameForLog A descriptive name for the scope (e.g., "Global", "Workspace") for logging purposes.
	 */
	private async _ensureDirectoryExists(
		dirPath: string | null,

		scopeNameForLog: string,
	): Promise<void> {
		if (!dirPath) return;

		this._logService?.trace(
			`[${scopeNameForLog} Storage Setup] Attempting to ensure base directory exists (via fs-shim): '${dirPath}'. NOTE: fs-shim backend is currently DEPRECATED.`,
		);

		try {
			// Check if directory exists using fs-shim (which proxies a `stat` operation).
			await fsShimInstance.promises.stat(dirPath);

			this._logService?.trace(
				`[${scopeNameForLog} Storage Setup] Base directory verified to exist: '${dirPath}' (via fs-shim stat).`,
			);
		} catch (statError: any) {
			if (statError.code === "ENOENT") {
				// "Error NO ENTry" (path does not exist)
				this._logInfo(
					`[${scopeNameForLog} Storage Setup] Base directory not found at '${dirPath}'. Attempting to create it via fs-shim (note: fs-shim backend is deprecated)...`,
				);

				try {
					// Use fs-shim's mkdir, which is proxied to Mountain's `fs_mkdir` handler.
					await fsShimInstance.promises.mkdir(dirPath, {
						recursive: true,
					});

					this._logInfo(
						`[${scopeNameForLog} Storage Setup] fs-shim mkdir call completed for '${dirPath}'. Actual success depends on the (deprecated) functional backend in Mountain.`,
					);
				} catch (mkdirError: any) {
					this._logError(
						`[${scopeNameForLog} Storage Setup] CRITICAL: Failed to create base directory '${dirPath}' via fs-shim. ` +
							`Storage for this scope may be unreliable or fail. This is likely due to the deprecated 'fs-shim' backend. mkdir Error:`,

						mkdirError,
					);
				}
			} else {
				// Other errors during stat (e.g., permission issues preventing access, or backend failure).
				this._logError(
					`[${scopeNameForLog} Storage Setup] Error checking base directory '${dirPath}' with fs.promises.stat. ` +
						`The path may exist but be inaccessible, or the fs-shim backend may have failed (it is deprecated). Error:`,

					statError,
				);
			}
		}
	}

	/**
	 * Constructs the full storage path URI for a given extension and scope (global or workspace).
	 * The path is formed by appending the lowercased extension ID (publisher.name) as a subdirectory
	 * to the relevant base global or workspace storage directory.
	 *
	 * @param extension The `IExtensionDescription` of the extension for which to create the path.
	 * @param scopeIsGlobal `true` to get the global storage path, `false` for the workspace-specific path.
	 * @returns A `VscodeUri` (of scheme 'file') for the extension's storage path in the specified scope,
	 *
	 *
	 *          or `undefined` if a base path for that scope is unavailable (e.g., no workspace storage path defined).
	 */
	private _getPathUriForExtension(
		extension: IExtensionDescription,

		scopeIsGlobal: boolean,
	): VscodeUri | undefined {
		if (!extension?.identifier?.value) {
			this._logError(
				"Cannot get storage path: Invalid IExtensionDescription or missing 'identifier.value' provided.",
			);

			return undefined;
		}

		const baseDirectoryPath = scopeIsGlobal
			? this.#globalStoragePath
			: this.#workspaceStoragePath;

		if (!baseDirectoryPath) {
			if (!scopeIsGlobal) {
				// This is an expected and normal scenario if no workspace is open or if Mountain
				// does not configure/provide a workspace-specific storage home.
				// Extensions will receive `undefined` for `ExtensionContext.storageUri` in this case.
				this._logService?.trace(
					`Workspace storage path is N/A (no base path defined) for extension: '${extension.identifier.value}'.`,
				);
			} else {
				// This case (global base path being null or undefined) should ideally not occur
				// due to the fallback mechanism in the constructor for #globalStoragePath.
				// If it does, it signals a critical problem in the initialization logic for global storage.
				this._logError(
					`CRITICAL FAILURE: Global storage base path (#globalStoragePath) is unexpectedly null or undefined. ` +
						`Cannot provide a global storage path for extension '${extension.identifier.value}'. Check initData and fallback logic.`,
				);
			}

			return undefined;
		}

		try {
			// VS Code convention: use the lowercased extension ID (format: "publisher.name")
			// as the name of the subdirectory for that extension's storage.
			const extensionSubdirectoryName =
				extension.identifier.value.toLowerCase();

			const fullExtensionStoragePath = path.join(
				baseDirectoryPath,

				extensionSubdirectoryName,
			);

			// Create a `vscode.Uri` (which will be a 'file://' URI) from the resolved absolute filesystem path.
			return VscodeUri.file(fullExtensionStoragePath);
		} catch (uriCreationError: any) {
			// Catch errors from path.join or VscodeUri.file if paths are malformed.
			this._logError(
				`Failed to create file URI for extension storage path. Base Directory: '${baseDirectoryPath}', ` +
					`Extension ID: '${extension.identifier.value}'. Error:`,

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
			// This situation should be extremely rare for globalValue due to constructor fallbacks for #globalStoragePath.
			// If #globalStoragePath was somehow nullified post-construction or the fallback failed,

			// this indicates a severe internal error in the service's initialization.
			this._logError(
				`FATAL: globalValue for extension '${extension.identifier.value}' resulted in an undefined URI, ` +
					`despite globalStoragePath being expected to always resolve. This indicates a critical problem with ` +
					`storage path initialization. Returning an emergency fallback URI to satisfy API contract, but storage will likely fail.`,
			);

			// Provide a "best effort" emergency fallback URI to satisfy the API contract (which mandates returning a Uri).
			// Extensions attempting to use this path for actual storage will likely encounter I/O errors.
			const emergencyBase =
				this.#globalStoragePath ||
				path.join(
					process.cwd(),

					".cocoon-data-ERROR",

					"globalStorage-critical-fallback",
				);

			const emergencyPath = path.join(
				emergencyBase,

				extension.identifier.value.toLowerCase(),
			);

			return VscodeUri.file(emergencyPath);
		}

		return uri;
	}

	/** {@inheritDoc IExtensionStoragePathsShim.whenReady} */
	public async whenReady(): Promise<void> {
		// In this shim, storage paths are determined synchronously during the constructor.
		// The background task of attempting to ensure base directories exist (`_ensureDirectoryExists`)
		// is asynchronous and fire-and-forget; `whenReady()` does not and should not await its completion.
		// For the `IExtensionStoragePaths` service, "ready" primarily means that path URIs can be resolved
		// and provided to consumers like `ExtensionContext`. The actual writability or physical existence
		// of these paths is a concern for filesystem operations themselves, not for this path provider service.
		return Promise.resolve();
	}

	/** {@inheritDoc IExtensionStoragePathsShim.onWillDeactivateAll} */
	public onWillDeactivateAll(): void {
		this._logService?.trace(
			"onWillDeactivateAll called (No-Operation in this storage paths shim).",
		);

		// In a full VS Code environment, this lifecycle hook might be used by services that manage
		// storage state directly (e.g., an SQLite-backed Memento service) to flush write-buffers
		// to disk or release file locks on storage databases before shutdown.
		// Since this `ShimExtensionStoragePaths` service only *provides paths* and Cocoon's Memento
		// implementation (`storage-shim.ts`) relies on Mountain for actual data persistence, this
		// service itself has no locks to release or buffers to flush.
		// Note: The `initData` for Cocoon often includes `skipWorkspaceStorageLock: true`, implying that
		// such low-level storage locks are not a primary concern for Cocoon's simplified host model.
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles via `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables.
		super.dispose();

		// Use Info for major lifecycle.
		this._logInfo("Disposed.");
	}
}
