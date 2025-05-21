/*---------------------------------------------------------------------------------------------
 * Cocoon Storage Paths Shim (storage-paths-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionStoragePaths` service for Cocoon. This service provides
 * extensions with URIs pointing to dedicated filesystem locations for storing extension-specific
 * data (global state, workspace state).
 *
 * Responsibilities:
 * - Receiving base storage path URIs (`globalStorageHome`, `workspaceStorageHome`) from
 *   Mountain via `initData.environment`.
 * - Providing methods (`workspaceValue(extension)`, `globalValue(extension)`) that construct
 *   storage path URIs for a given extension by appending its lowercased ID.
 * - Returning locations as `vscode.Uri` objects (from the vscode API shim).
 * - Ensuring base directories exist using the `fs-shim`.
 *
 * Key Interactions:
 * - Relies on `initData` from `index.ts`.
 * - Uses Node.js `path` for path joining.
 * - Uses `vscode.Uri` (from `../Shim/out/vscode`).
 * - Uses the `fs-shim.ts` (Node 'fs' proxy) for directory creation.
 * - Provides storage locations for `ExtensionContext` (`storageUri`, `globalStorageUri`).
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";

// Use vscode.Uri for the API
import { Uri as VscodeUri } from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
} from "./_baseShim";
// Default import of the fs-shim object
import fsShimInstance from "./fs-shim";

// TODO: Import IExtensionStoragePaths from VS Code internals if available and this shim implements it for DI.
// import { IExtensionStoragePaths as VscodeIExtensionStoragePaths } from 'vs/platform/extensionManagement/common/extensionStorage';

// --- Type Definitions ---

// Structure of initData.environment relevant to this shim
interface StoragePathsEnvironment {
	globalStorageHome?: UriComponentsForStorage | string;

	workspaceStorageHome?: UriComponentsForStorage | string;

	// other environment properties
}

// For URI components if passed in initData (fsPath is key here)
interface UriComponentsForStorage {
	// Should be 'file'
	scheme: string;

	// The critical part for local paths
	fsPath: string;

	// Often same as fsPath for file URIs
	path?: string;

	authority?: string;

	query?: string;

	fragment?: string;

	external?: string;
}

// The interface this shim provides (aligns with VS Code's IExtensionStoragePaths)
// TODO: Ensure this matches the VS Code interface `IExtensionStoragePaths` if used for DI.
export interface IExtensionStoragePathsShim {
	// For DI if registered
	readonly _serviceBrand: undefined;

	workspaceValue(extension: IExtensionDescription): VscodeUri | undefined;

	// API guarantees this returns a Uri
	globalValue(extension: IExtensionDescription): VscodeUri;

	whenReady(): Promise<void>;

	onWillDeactivateAll(): void;
}

export class ShimExtensionStoragePaths
	extends BaseCocoonShim
	implements IExtensionStoragePathsShim
{
	public readonly _serviceBrand: undefined;

	// Resolved absolute string path
	readonly #globalStoragePath: string;

	// Resolved absolute string path or null
	readonly #workspaceStoragePath: string | null;

	constructor(
		// Not directly used, passed to super
		rpcService: IExtHostRpcService | undefined,

		environment: StoragePathsEnvironment | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtensionStoragePaths", rpcService, logService);

		this._log("Initializing...");

		const defaultCocoonDataRoot = path.resolve(
			process.cwd(),

			".cocoon-data",
		);

		this.#globalStoragePath = this._resolvePathFromEnvData(
			environment?.globalStorageHome,

			// Fallback for global path
			path.join(defaultCocoonDataRoot, "globalStorage"),
		);

		this.#workspaceStoragePath = this._resolvePathFromEnvData(
			environment?.workspaceStorageHome,

			// No fallback for workspace path; it's null if not provided
			null,
		);

		this._log(`Global Storage Path Base: ${this.#globalStoragePath}`);

		this._log(
			`Workspace Storage Path Base: ${this.#workspaceStoragePath ?? "N/A (No workspace or path provided)"}`,
		);

		// Asynchronously ensure directories exist. `whenReady` doesn't wait for this.
		this._ensureDirectoryExists(this.#globalStoragePath).catch((err) =>
			this._logError(
				`Background check/creation of global storage failed:`,

				err,
			),
		);

		if (this.#workspaceStoragePath) {
			this._ensureDirectoryExists(this.#workspaceStoragePath).catch(
				(err) =>
					this._logError(
						`Background check/creation of workspace storage failed:`,

						err,
					),
			);
		}
	}

	private _resolvePathFromEnvData(
		envPathData: UriComponentsForStorage | string | undefined,

		// Explicitly string or null
		fallbackPathIfUnset: string | null,
	): string | null {
		// Returns string or null
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
				"envPathData for storage path was object but not valid UriComponents with fsPath:",

				envPathData,
			);
		}

		return fallbackPathIfUnset ? path.resolve(fallbackPathIfUnset) : null;
	}

	private async _ensureDirectoryExists(
		dirPath: string | null,
	): Promise<void> {
		if (!dirPath) return;

		try {
			// Check if exists
			await fsShimInstance.promises.stat(dirPath);

			// this._log(`Storage directory already exists: ${dirPath}`);
		} catch (err: any) {
			if (err.code === "ENOENT") {
				// If "Error NO ENTry" (does not exist)
				this._log(`Attempting to create storage directory: ${dirPath}`);

				try {
					await fsShimInstance.promises.mkdir(dirPath, {
						recursive: true,
					});

					this._log(
						`Successfully created storage directory: ${dirPath}`,
					);
				} catch (mkdirErr: any) {
					this._logError(
						`Failed to create storage directory ${dirPath} via fs-shim:`,

						mkdirErr,
					);

					// TODO: Consider if this failure should be more critically handled, e.g., impact whenReady or throw.
				}
			} else {
				this._logError(
					`Error during fs.promises.stat for directory ${dirPath}:`,

					err,
				);

				// TODO: Handle other errors from stat (e.g., permission issues)
			}
		}
	}

	private _getPathUriForExtension(
		extension: IExtensionDescription,

		scopeIsGlobal: boolean,
	): VscodeUri | undefined {
		if (!extension?.identifier?.value) {
			this._logError(
				"Cannot get storage path: Invalid extension descriptor provided.",
			);

			return undefined;
		}

		const baseDir = scopeIsGlobal
			? this.#globalStoragePath
			: this.#workspaceStoragePath;

		if (!baseDir) {
			if (!scopeIsGlobal) {
				// Workspace storage can be undefined if no workspace is open. This is normal.
				// this._log(`Workspace storage path is N/A for extension: ${extension.identifier.value}`);
			} else {
				// Global storage path *should* always exist. This is an issue.
				this._logError(
					`CRITICAL: Global storage base path is undefined! Cannot provide path for ${extension.identifier.value}.`,
				);
			}

			return undefined;
		}

		try {
			// VS Code uses the lowercase extension ID for the directory name.
			const extensionSubDir = extension.identifier.value.toLowerCase();

			const fullStoragePath = path.join(baseDir, extensionSubDir);

			// Use VscodeUri.file factory
			return VscodeUri.file(fullStoragePath);
		} catch (e: any) {
			this._logError(
				`Failed to create file URI for storage path (Base: ${baseDir}, Ext: ${extension.identifier.value}):`,

				e,
			);

			return undefined;
		}
	}

	public workspaceValue(
		extension: IExtensionDescription,
	): VscodeUri | undefined {
		return this._getPathUriForExtension(extension, false /* not global */);
	}

	public globalValue(extension: IExtensionDescription): VscodeUri {
		const uri = this._getPathUriForExtension(
			extension,

			true /* is global */,
		);

		if (!uri) {
			// This should ideally not happen because #globalStoragePath has a fallback.
			// If it does, it indicates a severe initialization problem.
			this._logError(
				`FATAL: globalValue for extension ${extension.identifier.value} resulted in an undefined URI. This indicates a problem with globalStoragePath initialization.`,
			);

			// To satisfy the API contract (must return Uri), create a "best effort" dummy URI.
			// Extensions relying on this path for actual storage will fail, but the API call itself won't crash here.
			const emergencyPath = path.join(
				this.#globalStoragePath || "/tmp/cocoon_ERROR_globalStorage",

				extension.identifier.value.toLowerCase(),
			);

			return VscodeUri.file(emergencyPath);
		}

		return uri;
	}

	public async whenReady(): Promise<void> {
		// The paths are determined synchronously in the constructor.
		// Directory creation (_ensureDirectoryExists) is initiated asynchronously (fire-and-forget style in constructor).
		// The `whenReady` promise in VS Code typically means the storage system is ready for Memento operations,

		// which isn't directly managed by IExtensionStoragePaths but by IExtHostStorage.
		// For this service, "ready" means paths are resolvable.
		// If _ensureDirectoryExists needed to complete before paths are "usable", this would need to await those.
		// TODO: Clarify if whenReady should await directory creation. For now, it resolves immediately.
		return Promise.resolve();
	}

	public onWillDeactivateAll(): void {
		this._log(
			"onWillDeactivateAll called (No-op in this shim for file locks).",
		);

		// In VS Code, this might be used to release file locks on storage if any were held.
		// The initData mock for Cocoon usually includes `skipWorkspaceStorageLock: true`.
	}
}
