/*---------------------------------------------------------------------------------------------
 * Cocoon Host Utilities Shim (host-utils-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for the `IHostUtils` service interface, which in
 * VS Code typically offers utility functions related to the host process environment.
 *
 * This shim delegates its functionalities:
 * - `pid`: Retrieves the process ID from `process-shim.ts`.
 * - `exit(code)`: Delegates the exit request to the global `process.exit` function,
 *   which is patched by `cocoon-bootstrap.ts` for conditional termination based on host policy.
 * - `fsExists(path)`: Uses `vscode.workspace.fs.stat()` (via an injected `IInstantiationService`
 *   to get `IExtHostWorkspace` which provides `fs` - typically `ShimFileSystemApi`)
 *   to check for path existence. This relies on the functional `workspacefs_*` backend in Mountain.
 * - `fsRealpath(path)`: Proxies the request to Mountain via a direct IPC call (`utils_fsRealpath`)
 *   for native `realpath` resolution, bypassing the deprecated `fs-shim` for this operation.
 *
 * Responsibilities:
 * - Implementing an interface compatible with VS Code's `IHostUtils`.
 * - Providing access to the Cocoon host process's PID.
 * - Offering a controlled `exit` method aligned with Cocoon's termination policy.
 * - Providing asynchronous filesystem utility functions (`fsExists`, `fsRealpath`) that
 *   use functional backends (either `vscode.workspace.fs` or direct IPC to Mountain).
 *
 * Key Interactions:
 * - An instance of `ShimHostUtils` is registered with Dependency Injection in
 *   `Cocoon/index.ts`.
 * - It may be used by other ExtHost services (e.g., `ExtHostExtensionService`) for
 *   accessing environment information or performing utility operations.
 * - Relies on `process-shim.ts` for PID.
 * - The `exit` method's behavior is ultimately governed by the `allowExitFn`
 *   configured in `index.ts` and applied by `cocoon-bootstrap.ts`.
 * - `fsExists` requires `IInstantiationService` to get `vscode.workspace.fs`.
 * - `fsRealpath` uses direct IPC (`_ipcRequestResponse`) to Mountain.
 * - Extends `BaseCocoonShim` for standardized logging.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import type { IInstantiationService } from "vs/platform/instantiation/common/instantiation";
// DI Key to get vscode.workspace.fs, which provides VscodeFileSystem type
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
	type IRpcProtocolServiceAdapter, // Not directly used for core logic but part of BaseCocoonShim constructor
} from "./_baseShim";
import processShimInstance from "./process-shim"; // For PID

// --- Type Definitions ---

/**
 * Defines the interface for host utility functions provided by this shim.
 * This aims to be compatible with the relevant parts of VS Code's `IHostUtils` interface.
 */
export interface IHostUtilsShim {
	readonly _serviceBrand: undefined; // For DI compatibility if registered as a service.

	/** The Process ID (PID) of the Cocoon host process. */
	readonly pid?: number;

	/** Requests termination of the Cocoon host process with a specified exit code. */
	exit(code: number): void;

	/** Asynchronously checks if a file or directory exists at the given path. */
	fsExists(targetPath: string): Promise<boolean>;

	/** Asynchronously resolves a path to its canonical absolute path. */
	fsRealpath(targetPath: string): Promise<string>;
}

/** Cocoon's implementation of `IHostUtils`. */
export class ShimHostUtils extends BaseCocoonShim implements IHostUtilsShim {
	public readonly _serviceBrand: undefined;
	private readonly _instantiationService: IInstantiationService;
	private _workspaceFs: VscodeFileSystem | undefined; // Lazy loaded via DI

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined, // For BaseCocoonShim
		logService: ILogServiceForShim | undefined,
		instantiationService: IInstantiationService, // Injected for DI to get workspace.fs
	) {
		super("HostUtils", rpcService, logService);
		this._instantiationService = instantiationService;
		this._logInfo("Initialized.");
	}

	// Lazy load vscode.workspace.fs to avoid circular DI if HostUtils is needed very early.
	private getWorkspaceFs(): VscodeFileSystem {
		if (!this._workspaceFs) {
			try {
				// Assuming IExtHostWorkspace provides 'fs' property which is our ShimFileSystemApi or similar
				const workspaceService =
					this._instantiationService.get(IExtHostWorkspace);
				if (!workspaceService || !workspaceService.fs) {
					throw new Error(
						"IExtHostWorkspace or its 'fs' property is unavailable via DI.",
					);
				}
				this._workspaceFs = workspaceService.fs;
			} catch (diError: any) {
				this._logError(
					"CRITICAL: Cannot access vscode.workspace.fs (ShimFileSystemApi) via IExtHostWorkspace for HostUtils. fsExists will fail.",
					diError,
				);
				// Provide a NOP/throwing FS to prevent null errors downstream if this state is critical,
				// though operations using it will fail.
				this._workspaceFs = {
					stat: async (_uri: VscodeUri) => {
						throw new Error(
							"Workspace FS unavailable in HostUtils for stat",
						);
					},
					// Implement other methods as throwing NOPs if a more complete NOP FS is required for fallback
				} as any; // Cast to VscodeFileSystem, acknowledging it's a partial NOP
			}
		}
		return this._workspaceFs!; // Assume it's initialized by the getter logic.
	}

	/** This shim's core logic relies on local shims or direct IPC, not standard RPC proxying. */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/** {@inheritDoc IHostUtilsShim.pid} */
	public get pid(): number | undefined {
		try {
			return processShimInstance.pid; // From process-shim.ts
		} catch (e: any) {
			this._logError(
				"Error accessing 'pid' from processShimInstance. This may indicate an issue with process-shim initialization.",
				"Error:",
				e,
			);
			return undefined;
		}
	}

	/** {@inheritDoc IHostUtilsShim.exit} */
	public exit(code: number): void {
		this._logWarn(
			`IHostUtils.exit(${code}) called. Delegating to global 'process.exit()', which is subject to Cocoon's host termination policy (via cocoon-bootstrap.ts).`,
		);
		process.exit(code); // Delegates to the globally patched process.exit
	}

	/** {@inheritDoc IHostUtilsShim.fsExists} */
	public async fsExists(targetPath: string): Promise<boolean> {
		this._logService?.trace(
			`fsExists check for path: '${targetPath}' (using vscode.workspace.fs.stat).`,
		);
		if (
			!targetPath ||
			typeof targetPath !== "string" ||
			targetPath.trim() === ""
		) {
			this._logWarn(
				`fsExists: Invalid or empty targetPath provided: '${targetPath}'. Returning false.`,
			);
			return false;
		}
		try {
			const uri = VscodeUri.file(targetPath); // Convert string path to vscode.Uri
			await this.getWorkspaceFs().stat(uri); // Attempt to stat the path
			return true; // If stat succeeds (does not throw), the path exists.
		} catch (err: any) {
			// Check if the error is specifically FileSystemError.FileNotFound
			// The `code` property on VscodeFileSystemError is a string like 'FileNotFound'.
			if (
				err instanceof VscodeFileSystemError &&
				err.code === "FileNotFound"
			) {
				return false; // Path does not exist.
			}
			// For other errors (e.g., permissions, network issues for remote FS):
			// Log the error and return false as per typical fsExists contract (path is not accessible/verifiable as existing).
			this._logWarn(
				`fsExists check for path "${targetPath}" encountered an error during 'stat' (path may exist but be inaccessible, or underlying FS operation failed). Error: ${err.message || err}. Returning false.`,
			);
			return false;
		}
	}

	/** {@inheritDoc IHostUtilsShim.fsRealpath} */
	public async fsRealpath(targetPath: string): Promise<string> {
		this._logService?.trace(
			`fsRealpath request for path: '${targetPath}' (using direct IPC to Mountain: 'utils_fsRealpath').`,
		);
		if (
			!targetPath ||
			typeof targetPath !== "string" ||
			targetPath.trim() === ""
		) {
			const errorMsg = `fsRealpath: Invalid or empty targetPath provided: '${targetPath}'.`;
			this._logError(errorMsg);
			throw new Error(errorMsg); // Fail fast for invalid input.
		}
		try {
			// Assumes Mountain has an IPC handler "utils_fsRealpath"
			// that takes `{ path: string }` and returns `{ params: string | null }` or throws a VineErrorPayload.
			const result = await this._ipcRequestResponse("utils_fsRealpath", {
				path: targetPath,
			});

			if (typeof result === "string") {
				return result; // Successfully resolved realpath from Mountain.
			}
			// If Mountain returns null or an unexpected type, treat as an error (realpath should find or fail).
			const errorMsg = `fsRealpath for "${targetPath}" received unexpected non-string result from Mountain: ${JSON.stringify(result)}`;
			this._logError(errorMsg);
			throw new Error(errorMsg);
		} catch (err: any) {
			// _ipcRequestResponse already refines and logs the error from IPC layer.
			// We log again for context specific to fsRealpath.
			this._logWarn(
				`fsRealpath for path "${targetPath}" failed via IPC. Error from IPC layer: ${err.message}`,
			);
			// Rethrow the error to signal failure as per realpath's contract (it throws on failure).
			throw err;
		}
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
