/*---------------------------------------------------------------------------------------------
 * Cocoon Storage Paths Shim (shims/storage-paths-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionStoragePaths` service for Cocoon. This service provides
 * extensions with URIs pointing to dedicated filesystem locations for storing extension-specific
 * data (global state, workspace state) that doesn't fit the Memento key-value API.
 *
 * Responsibilities:
 * - Receiving base storage path URIs (`globalStorageHome`, `workspaceStorageHome`) from
 *   Mountain via the initial `initData.environment`.
 * - Providing methods (`workspaceValue(extension)`, `globalValue(extension)`) that construct
 *   the specific storage path URI for a given extension by appending the lowercased
 *   extension ID to the appropriate base path.
 * - Returning locations as `vscode.Uri` objects.
 * - Potentially ensuring the base directories exist using the `fs-shim`.
 *
 * Key Interactions:
 * - Receives paths from `initData` (provided by `process_mgmt.rs`).
 * - Uses Node.js `path` module for path joining.
 * - Uses the `vscode.Uri` class (needs bundling).
 * - May use the `fs-shim` (Node 'fs' proxy) to create directories.
 * - Provides storage locations used by `ExtensionContext` (`globalStorageUri`, `storageUri`).
 *--------------------------------------------------------------------------------------------*/

// Use Node's path module
import * as path from "path";
// For Extension type
import { IExtensionDescription } from "vs/platform/extensions/common/extensions";

// CRITICAL: Assumes a functional Uri class/shim
import { Uri } from "../Shim/out/vscode";
import { BaseCocoonShim, IExtHostRpcService, ILogService } from "./_baseShim";
// Import the fs-shim's promises API
import * as fsPromises from "./fs-shim";

// Define the structure of initData's environment part relevant to this shim
interface EnvironmentPaths {
	// Can be URI components or a string path
	globalStorageHome?: UriComponents | string;

	// Can be URI components or a string path
	workspaceStorageHome?: UriComponents | string;

	// ... other environment properties
}

// For URI components if passed in initData
interface UriComponents {
	scheme: string;

	authority?: string;

	path: string;

	query?: string;

	fragment?: string;

	// Often included for file URIs
	fsPath?: string;
}

// Define the IExtensionStoragePaths interface based on VS Code's API
export interface IExtensionStoragePaths {
	readonly _serviceBrand: undefined;

	workspaceValue(extension: IExtensionDescription): Uri | undefined;

	// Should always return Uri
	globalValue(extension: IExtensionDescription): Uri | undefined;

	whenReady(): Promise<void>;

	// Typically called by extension host lifecycle
	onWillDeactivateAll(): void;
}

export class ShimExtensionStoragePaths
	extends BaseCocoonShim
	implements IExtensionStoragePaths
{
	public readonly _serviceBrand: undefined;

	// Not strictly needed if paths are resolved and stored directly
	// #environment: EnvironmentPaths;

	// Resolved absolute path string for global storage base
	readonly #globalStoragePath: string;

	// Resolved absolute path string or null
	readonly #workspaceStoragePath: string | null;

	constructor(
		// Not directly used by this shim's methods
		rpcService: IExtHostRpcService | undefined,

		// Make environment potentially undefined for robustness
		environment: EnvironmentPaths | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtensionStoragePaths", rpcService, logService);

		// Store environment or empty object
		// this.#environment = environment || {};

		this._log("Initializing...");

		const defaultBase = path.resolve(process.cwd(), ".vscode-shim-data");

		this.#globalStoragePath =
			this._resolvePathFromEnv(
				environment?.globalStorageHome,

				path.join(defaultBase, "globalStorage"),

				// Ensure globalStoragePath is always set
			) || path.join(defaultBase, "globalStorage");

		this.#workspaceStoragePath = this._resolvePathFromEnv(
			environment?.workspaceStorageHome,

			// No default for workspace path, remains null if not provided
			null,
		);

		this._log(`Global Storage Path: ${this.#globalStoragePath}`);

		this._log(
			`Workspace Storage Path: ${this.#workspaceStoragePath ?? "N/A (No workspace or path provided)"}`,
		);

		this._ensureDirectoryExists(this.#globalStoragePath);

		if (this.#workspaceStoragePath) {
			this._ensureDirectoryExists(this.#workspaceStoragePath);
		}
	}

	private _resolvePathFromEnv(
		envPathData: UriComponents | string | undefined,

		fallbackPath: string | null,
	): string | null {
		let resolvedPath: string | null = null;

		if (envPathData) {
			if (
				typeof envPathData === "object" &&
				typeof envPathData.fsPath === "string"
			) {
				resolvedPath = path.resolve(envPathData.fsPath);
			} else if (typeof envPathData === "string") {
				resolvedPath = path.resolve(envPathData);
			}
		}

		return (
			resolvedPath || (fallbackPath ? path.resolve(fallbackPath) : null)
		);
	}

	private async _ensureDirectoryExists(
		dirPath: string | null,
	): Promise<void> {
		if (!dirPath) return;

		try {
			// fs-shim.ts default exports an object that has a 'promises' property
			// and that object does not have existsSync directly on it.
			// We should use stat for checking existence with promises.
			await fsPromises.default.promises.stat(dirPath);

			this._log(`Base storage directory already exists: ${dirPath}`);
		} catch (err: any) {
			// If stat fails (e.g., ENOENT), directory likely doesn't exist
			if (err.code === "ENOENT") {
				this._log(
					`Base storage directory does not exist, attempting to create: ${dirPath}`,
				);

				try {
					await fsPromises.default.promises.mkdir(dirPath, {
						recursive: true,
					});

					this._log(
						`Successfully created storage directory: ${dirPath}`,
					);
				} catch (mkdirErr: any) {
					this._logError(
						`Failed to create storage directory ${dirPath}:`,

						mkdirErr,
					);
				}
			} else {
				// Other error during stat
				this._logError(
					`Error checking storage directory ${dirPath}:`,

					err,
				);
			}
		}
	}

	private _getPathUri(
		extension: IExtensionDescription,

		globalScope: boolean,
	): Uri | undefined {
		if (!extension?.identifier?.value) {
			this._logError(
				"Cannot get storage path: Invalid extension descriptor.",
			);

			return undefined;
		}

		const extensionIdSubDir = extension.identifier.value.toLowerCase();

		const base = globalScope
			? this.#globalStoragePath
			: this.#workspaceStoragePath;

		if (!base) {
			if (!globalScope) {
				// Too noisy
				// this._logWarn(`Workspace storage path is undefined for ${extensionIdSubDir}`);
			} else {
				this._logError(
					`Global storage base path is undefined for ${extensionIdSubDir}!`,
				);
			}

			return undefined;
		}

		try {
			const storagePath = path.join(base, extensionIdSubDir);

			return Uri.file(storagePath);
		} catch (e: any) {
			this._logError(
				`Failed to create file URI (Base: ${base}, Subdir: ${extensionIdSubDir}):`,

				e,
			);

			return undefined;
		}
	}

	public workspaceValue(extension: IExtensionDescription): Uri | undefined {
		return this._getPathUri(extension, false);
	}

	public globalValue(extension: IExtensionDescription): Uri {
		// API implies globalValue always returns a URI
		const uri = this._getPathUri(extension, true);

		if (!uri) {
			// This case should ideally not happen if globalStoragePath is always initialized.
			this._logError(
				`FATAL: globalValue for extension ${extension.identifier.value} resulted in undefined URI.`,
			);

			// Fallback to a dummy URI to satisfy type, though this indicates a setup problem.
			return Uri.file(
				path.join(
					this.#globalStoragePath ||
						"/tmp/cocoon_global_storage_error",

					extension.identifier.value.toLowerCase(),
				),
			);
		}

		return uri;
	}

	public async whenReady(): Promise<void> {
		// Paths are derived synchronously in constructor, and directory creation is fire-and-forget async.
		// For the purpose of the API, readiness is immediate.
		return Promise.resolve();
	}

	public onWillDeactivateAll(): void {
		this._log("onWillDeactivateAll called (No-op in shim).");

		// Real VS Code might release file locks here.
		// Cocoon initData mock usually sets skipWorkspaceStorageLock: true.
	}
}

// Class is already exported
// export { ShimExtensionStoragePaths };
