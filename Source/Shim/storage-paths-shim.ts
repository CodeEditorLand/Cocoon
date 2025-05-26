/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Storage Paths Shim (storage-paths-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionStoragePaths` service interface for Cocoon. This service
 * is responsible for providing extensions with well-defined, unique filesystem URI
 * locations where they can store global state (persisting across all workspaces)
 * and workspace-specific state.
 *
 * The paths provided are crucial for the `vscode.ExtensionContext.globalStorageUri`
 * and `vscode.ExtensionContext.storageUri` properties.
 *
 * Responsibilities:
 * - Receiving base storage path URIs (typically `globalStorageHome` and
 *   `workspaceStorageHome`) from the Mountain host via `initData.environment`.
 * - Resolving these base paths and constructing specific storage path URIs for each
 *   extension by appending its lowercased identifier as a subdirectory name.
 * - Providing methods (`workspaceValue(extension)`, `globalValue(extension)`) that
 *   return these extension-specific storage locations as `vscode.Uri` objects.
 * - Attempting to ensure that the base storage directories exist on the filesystem
 *   using the `fs-shim` (Node 'fs' proxy) during initialization.
 *
 * Key Interactions:
 * - Relies on initialization data (`ExtHostInitData.environment`) provided by `index.ts`
 *   (originating from Mountain) for base storage paths.
 * - Uses Node.js `path` module for path manipulation.
 * - Uses `vscode.Uri` (from `../Shim/out/vscode.js` or a similar API shim) for the
 *   URIs it returns.
 * - Utilizes `fs-shim.ts` (specifically `fsShimInstance.promises.mkdir`) to attempt
 *   creation of the base storage directories.
 * - The URIs provided by this service are consumed by `ExtHostExtensionService` (or a
 *   simulated version) when creating `ExtensionContext` instances for extensions.
 * - Registered with Dependency Injection in `Cocoon/index.ts`.
 *

 *--------------------------------------------------------------------------------------------*/

// Node.js path module for joining paths
import * as path from "path";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";

// Use vscode.Uri from the API shim for consistency with what extensions expect
import { Uri as VscodeUri } from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	// Renamed from ILogService
	type ILogServiceForShim,
	// Renamed from IExtHostRpcService
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";
// Default import of the fs-shim object for directory creation
import fsShimInstance from "./fs-shim";

// VS Code's internal IExtensionStoragePaths for type compatibility if registered with DI
// import { IExtensionStoragePaths as VscodeIExtensionStoragePaths } from 'vs/platform/extensionManagement/common/extensionStorage';

// --- Type Definitions ---

/**
 * Defines the structure of `initData.environment` relevant to this storage paths shim.
 * It expects paths to the home directories for global and workspace-specific storage.
 */
interface StoragePathsEnvironment {
	/**
	 * The base URI (or path string) for global extension storage.
	 * Can be `UriComponentsForStorage` (if sent as a structured URI object from Mountain)
	 * or a direct filesystem path string.
	 */
	globalStorageHome?: UriComponentsForStorage | string;

	/**
	 * The base URI (or path string) for workspace-specific extension storage.
	 * Can be `UriComponentsForStorage` or a direct filesystem path string.
	 * This may be undefined if no workspace is open.
	 */
	workspaceStorageHome?: UriComponentsForStorage | string;

	// other environment properties might exist but are not used by this shim.
}

/**
 * Represents URI components, primarily focusing on `fsPath`, if `initData`
 * provides storage home locations as structured URI objects.
 */
interface UriComponentsForStorage {
	// Should typically be 'file' for local storage paths.
	scheme: string;

	// The absolute filesystem path.
	fsPath: string;

	// Often the same as fsPath for file URIs.
	path?: string;

	authority?: string;

	query?: string;

	fragment?: string;

	// String representation, e.g., from URI.toString(true)
	external?: string;
}

/**
 * The public interface provided by this shim, aligning with VS Code's `IExtensionStoragePaths`.
 */
export interface IExtensionStoragePathsShim {
	// For DI compatibility
	readonly _serviceBrand: undefined;

	/**
	 * Returns the workspace-specific storage URI for the given extension.
	 * @param extension The extension description.
	 * @returns A `vscode.Uri` pointing to the workspace storage location, or `undefined`
	 *          if no workspace storage is available (e.g., no workspace open).
	 */
	workspaceValue(extension: IExtensionDescription): VscodeUri | undefined;

	/**
	 * Returns the global storage URI for the given extension.
	 * This location is shared across all workspaces.
	 * @param extension The extension description.
	 * @returns A `vscode.Uri` pointing to the global storage location. This method
	 *          is guaranteed to return a URI (uses a fallback if necessary).
	 */
	globalValue(extension: IExtensionDescription): VscodeUri;

	/**
	 * A promise that resolves when the storage paths service is ready.
	 * In this shim, paths are determined synchronously, so it resolves immediately.
	 * Directory creation is attempted asynchronously in the background.
	 */
	whenReady(): Promise<void>;

	/**
	 * Called when all extensions are about to be deactivated, e.g., during shutdown.
	 * In VS Code, this might be used to release file locks on storage.
	 * This is a NOP in the current shim.
	 */
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

	// Resolved absolute string path for the base global storage directory.
	readonly #globalStoragePath: string;

	// Resolved absolute string path for the base workspace storage directory, or null if not applicable.
	readonly #workspaceStoragePath: string | null;

	/**
	 * Creates an instance of ShimExtensionStoragePaths.
	 * @param rpcService The RPC service adapter (passed to base, not directly used here).
	 * @param environment The environment data from `initData`, containing base storage paths.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		environment: StoragePathsEnvironment | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtensionStoragePaths", rpcService, logService);

		this._log("Initializing...");

		// Define a default root for Cocoon data if specific paths are not provided.
		// This helps ensure that storage paths can always be resolved, even in minimal setups.
		const defaultCocoonDataRoot = path.resolve(
			process.cwd(),

			".cocoon-data",
		);

		this.#globalStoragePath = this._resolvePathFromEnvData(
			environment?.globalStorageHome,

			// Fallback for global path
			path.join(defaultCocoonDataRoot, "globalStorage"),

			// Cast as string because global always has a fallback
		) as string;

		this.#workspaceStoragePath = this._resolvePathFromEnvData(
			environment?.workspaceStorageHome,

			// No fallback for workspace path; it remains null if not provided by Mountain.
			null,
		);

		this._log(`Global Storage Path Base: ${this.#globalStoragePath}`);

		this._log(
			`Workspace Storage Path Base: ${this.#workspaceStoragePath ?? "N/A (No workspace or path provided from Mountain)"}`,
		);

		// Asynchronously try to ensure the base directories exist.
		// These calls are fire-and-forget from the constructor's perspective;

		// `whenReady()` does not await their completion.
		this._ensureDirectoryExists(this.#globalStoragePath).catch((err) =>
			this._logError(
				`Background check/creation of global storage base directory failed: ${this.#globalStoragePath}`,

				err,
			),
		);

		if (this.#workspaceStoragePath) {
			this._ensureDirectoryExists(this.#workspaceStoragePath).catch(
				(err) =>
					this._logError(
						`Background check/creation of workspace storage base directory failed: ${this.#workspaceStoragePath}`,

						err,
					),
			);
		}
	}

	/**
	 * This shim does not require RPC for its core functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Resolves an absolute filesystem path from environment data.
	 * The environment data can be a structured URI object (with `fsPath`) or a direct path string.
	 *
	 * @param envPathData The path data from the environment (initData).
	 * @param fallbackPathIfUnset The fallback path to use if `envPathData` is not provided or invalid. Can be `null`.
	 * @returns The resolved absolute path string, or `null` if no valid path could be determined and `fallbackPathIfUnset` was `null`.
	 */
	private _resolvePathFromEnvData(
		envPathData: UriComponentsForStorage | string | undefined,

		fallbackPathIfUnset: string | null,
	): string | null {
		if (envPathData) {
			if (
				typeof envPathData === "object" &&
				typeof envPathData.fsPath === "string"
			) {
				// Use fsPath from UriComponents
				return path.resolve(envPathData.fsPath);
			} else if (typeof envPathData === "string") {
				// It's a direct string path
				return path.resolve(envPathData);
			}

			this._logWarn(
				"envPathData for storage path was an object but not valid UriComponents with fsPath, or an unexpected type. Using fallback.",

				envPathData,
			);
		}

		return fallbackPathIfUnset ? path.resolve(fallbackPathIfUnset) : null;
	}

	/**
	 * Asynchronously ensures that a given directory path exists, creating it recursively if necessary.
	 * Uses the `fs-shim` for filesystem operations.
	 *
	 * @param dirPath The absolute path of the directory to ensure. If `null`, the method is a NOP.
	 */
	private async _ensureDirectoryExists(
		dirPath: string | null,
	): Promise<void> {
		if (!dirPath) return;

		try {
			await fsShimInstance.promises.stat(dirPath);

			// this._log(`Storage directory already exists: ${dirPath}`);
		} catch (err: any) {
			if (err.code === "ENOENT") {
				// "Error NO ENTry" (does not exist)
				this._log(`Attempting to create storage directory: ${dirPath}`);

				try {
					// Use fs-shim's mkdir, which is proxied to Mountain.
					await fsShimInstance.promises.mkdir(dirPath, {
						recursive: true,
					});

					this._log(
						`Successfully created storage directory via fs-shim: ${dirPath}`,
					);
				} catch (mkdirErr: any) {
					this._logError(
						`Failed to create storage directory ${dirPath} via fs-shim:`,

						mkdirErr,
					);

					// This failure might impact extensions relying on these paths.
					// Depending on Cocoon's error strategy, this could be logged more severely or throw.
				}
			} else {
				// Other errors during stat (e.g., permission issues).
				this._logError(
					`Error during fs.promises.stat for directory ${dirPath} (it may exist but be inaccessible):`,

					err,
				);
			}
		}
	}

	/**
	 * Constructs the full storage path URI for a given extension and scope (global or workspace).
	 *
	 * @param extension The extension description.
	 * @param scopeIsGlobal `true` for global storage, `false` for workspace storage.
	 * @returns A `VscodeUri` for the storage path, or `undefined` if a base path is unavailable (e.g., no workspace storage path).
	 */
	private _getPathUriForExtension(
		extension: IExtensionDescription,

		scopeIsGlobal: boolean,
	): VscodeUri | undefined {
		if (!extension?.identifier?.value) {
			// Check for valid extension identifier
			this._logError(
				"Cannot get storage path: Invalid extension descriptor or identifier provided.",
			);

			return undefined;
		}

		const baseDir = scopeIsGlobal
			? this.#globalStoragePath
			: this.#workspaceStoragePath;

		if (!baseDir) {
			if (!scopeIsGlobal) {
				// This is normal if no workspace is open or workspace storage isn't configured by Mountain.
				// this._log(`Workspace storage path is N/A for extension: ${extension.identifier.value}`);
			} else {
				// Global storage path *should* always resolve due to fallbacks. This indicates an issue.
				this._logError(
					`CRITICAL: Global storage base path is unexpectedly undefined! Cannot provide path for extension '${extension.identifier.value}'.`,
				);
			}

			return undefined;
		}

		try {
			// VS Code convention: use the lowercased extension ID for the subdirectory name.
			const extensionSubDir = extension.identifier.value.toLowerCase();

			const fullStoragePath = path.join(baseDir, extensionSubDir);

			// Create a file URI
			return VscodeUri.file(fullStoragePath);
		} catch (e: any) {
			this._logError(
				`Failed to create file URI for storage path. Base: '${baseDir}', Extension ID: '${extension.identifier.value}'. Error:`,

				e,
			);

			return undefined;
		}
	}

	/**
	 * {@inheritDoc IExtensionStoragePathsShim.workspaceValue}
	 *
	 */
	public workspaceValue(
		extension: IExtensionDescription,
	): VscodeUri | undefined {
		return this._getPathUriForExtension(extension, false /* not global */);
	}

	/**
	 * {@inheritDoc IExtensionStoragePathsShim.globalValue}
	 *
	 */
	public globalValue(extension: IExtensionDescription): VscodeUri {
		const uri = this._getPathUriForExtension(
			extension,

			true /* is global */,
		);

		if (!uri) {
			// This should not happen if #globalStoragePath is always initialized.
			// If it does, it's a critical failure in initialization logic.
			this._logError(
				`FATAL: globalValue for extension '${extension.identifier.value}' resulted in an undefined URI. This indicates a problem with globalStoragePath initialization. Returning emergency fallback URI.`,
			);

			// Provide a "best effort" emergency URI to satisfy the API contract (must return Uri).
			// Extensions relying on this path for actual storage will likely fail.
			const emergencyBase =
				this.#globalStoragePath ||
				path.join(process.cwd(), ".cocoon-data-ERROR", "globalStorage");

			const emergencyPath = path.join(
				emergencyBase,

				extension.identifier.value.toLowerCase(),
			);

			return VscodeUri.file(emergencyPath);
		}

		return uri;
	}

	/**
	 * {@inheritDoc IExtensionStoragePathsShim.whenReady}
	 *
	 */
	public async whenReady(): Promise<void> {
		// In this shim, storage paths are determined synchronously in the constructor.
		// The _ensureDirectoryExists calls are initiated asynchronously (fire-and-forget).
		// `whenReady` in VS Code's IExtensionStoragePaths typically means the paths are resolvable
		// and the underlying storage system is prepared (e.g., for Memento operations by IExtHostStorage).
		// For this specific service, "ready" primarily means paths can be calculated.
		// If directory creation *must* complete before these paths are considered truly "usable"
		// by dependent services like Memento, then this method would need to await those operations.
		// However, the fs-shim operations are themselves async and proxied.
		return Promise.resolve();
	}

	/**
	 * {@inheritDoc IExtensionStoragePathsShim.onWillDeactivateAll}
	 *
	 */
	public onWillDeactivateAll(): void {
		this._log(
			"onWillDeactivateAll called (No-op in this shim regarding file locks).",
		);

		// In a full VS Code environment, this might be used to release file locks on storage
		// directories if any were held by the extension host.
		// The initData mock for Cocoon typically includes `skipWorkspaceStorageLock: true`,

		// implying such locks are not a primary concern for this simplified host.
	}
}
