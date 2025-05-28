/*---------------------------------------------------------------------------------------------
 * Cocoon Host Utilities Shim (host-utils-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for the `IHostUtils` service interface, which in
 * VS Code typically offers utility functions related to the host process environment.
 *
 * This shim delegates its functionalities:
 * - `pid`: Retrieves the process ID from `process-shim.ts`.
 * - `exit(code)`: Delegates the exit request to the global `process.exit` function, * *   which is patched by `cocoon-bootstrap.ts` for conditional termination.
 * - `fsExists(path)`: Uses `vscode.workspace.fs.stat()` (via an injected `ShimFileSystemApi`
 *   instance obtained through DI) to check for path existence. This relies on the functional
 *   `workspacefs_*` backend in Mountain.
 * - `fsRealpath(path)`: Proxies the request to Mountain via a direct IPC call (`utils_fsRealpath`)
 *   for native `realpath` resolution.
 *
 * Responsibilities:
 * - Implementing an interface compatible with VS Code's `IHostUtils`.
 * - Providing access to the Cocoon host process's PID.
 * - Offering a controlled `exit` method aligned with Cocoon's termination policy.
 * - Providing asynchronous filesystem utility functions (`fsExists`, `fsRealpath`) that
 *   now use functional backends (either `vscode.workspace.fs` or direct IPC to Mountain).
 *
 * Key Interactions:
 * - An instance of `ShimHostUtils` is registered with Dependency Injection in
 *   `Cocoon/index.ts`.
 * - Relies on `process-shim.ts` for PID.
 * - `exit` method interacts with `cocoon-bootstrap.ts`'s patched `process.exit`.
 * - `fsExists` requires `IInstantiationService` to get `vscode.workspace.fs` (provided by `ShimFileSystemApi`).
 * - `fsRealpath` uses direct IPC (`_ipcRequestResponse`) to Mountain.
 * - Extends `BaseCocoonShim` for standardized logging.
 *
 *--------------------------------------------------------------------------------------------*/

import type { IInstantiationService } from "vs/platform/instantiation/common/instantiation";
// Type for vscode.workspace.fs
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace"; // DI Key to get workspace.fs
import {
	FileSystemError as VscodeFileSystemError,
	Uri as VscodeUri,
	type FileSystem as VscodeFileSystem,
} from "vscode"; // For fsExists

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter, // Not directly used for core logic but part of BaseCocoonShim constructor
} from "./_baseShim";
import processShimInstance from "./process-shim"; // For PID

// --- Type Definitions ---
export interface IHostUtilsShim {
	readonly _serviceBrand: undefined;
	readonly pid?: number;
	exit(code: number): void;
	fsExists(targetPath: string): Promise<boolean>;
	fsRealpath(targetPath: string): Promise<string>;
}

/** Cocoon's implementation of `IHostUtils`. */
export class ShimHostUtils extends BaseCocoonShim implements IHostUtilsShim {
	public readonly _serviceBrand: undefined;
	private readonly _instantiationService: IInstantiationService;
	private _workspaceFs: VscodeFileSystem | undefined; // Lazy loaded

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined, // For BaseCocoonShim
		logService: ILogServiceForShim | undefined,
		instantiationService: IInstantiationService, // Injected for DI
	) {
		super("HostUtils", rpcService, logService);
		this._instantiationService = instantiationService;
		this._logInfo("Initialized.");
	}

	// Lazy load vscode.workspace.fs to avoid circular DI if HostUtils is needed very early.
	private getWorkspaceFs(): VscodeFileSystem {
		if (!this._workspaceFs) {
			// Assuming IExtHostWorkspace provides 'fs' property which is our ShimFileSystemApi
			const workspaceService =
				this._instantiationService.get(IExtHostWorkspace);
			if (!workspaceService || !workspaceService.fs) {
				this._logError(
					"CRITICAL: Cannot access vscode.workspace.fs (ShimFileSystemApi) via IExtHostWorkspace for HostUtils. fsExists will fail.",
				);
				// Return a NOP/throwing FS to prevent null errors, though operations will fail.
				this._workspaceFs = {
					stat: async () => {
						throw new Error(
							"Workspace FS unavailable in HostUtils",
						);
					},
					// Implement other methods as throwing NOPs if this state is critical
				} as any;
			} else {
				this._workspaceFs = workspaceService.fs;
			}
		}
		return this._workspaceFs!;
	}

	protected override _requiresRpc(): boolean {
		return false;
	} // Core logic uses local shims or direct IPC

	public get pid(): number | undefined {
		try {
			return processShimInstance.pid;
		} catch (e: any) {
			this._logError(
				"Error accessing 'pid' from processShimInstance.",
				"Error:",
				e,
			);
			return undefined;
		}
	}

	public exit(code: number): void {
		this._logWarn(
			`IHostUtils.exit(${code}) called. Delegating to global 'process.exit()', subject to Cocoon's host termination policy.`,
		);
		process.exit(code); // Delegates to patched global exit
	}

	public async fsExists(targetPath: string): Promise<boolean> {
		this._logService?.trace(
			`fsExists check for path: '${targetPath}' (using vscode.workspace.fs.stat).`,
		);
		if (!targetPath || typeof targetPath !== "string") {
			this._logWarn(
				`fsExists: Invalid targetPath provided: ${targetPath}. Returning false.`,
			);
			return false;
		}
		try {
			const uri = VscodeUri.file(targetPath);
			await this.getWorkspaceFs().stat(uri);
			return true; // stat succeeded, path exists
		} catch (err: any) {
			// Check if the error is specifically FileSystemError.FileNotFound
			// The `code` property on FileSystemError is a string like 'FileNotFound'.
			if (
				err instanceof VscodeFileSystemError &&
				err.code === "FileNotFound"
			) {
				return false; // Path does not exist
			}
			// For other errors (permissions, etc.), log it and return false as per typical fsExists contract.
			this._logWarn(
				`fsExists check for path "${targetPath}" encountered an error during 'stat'. Returning false. Error:`,
				err.message || err,
			);
			return false;
		}
	}

	public async fsRealpath(targetPath: string): Promise<string> {
		this._logService?.trace(
			`fsRealpath request for path: '${targetPath}' (using direct IPC to Mountain).`,
		);
		if (!targetPath || typeof targetPath !== "string") {
			const errorMsg = `fsRealpath: Invalid targetPath provided: ${targetPath}.`;
			this._logError(errorMsg);
			throw new Error(errorMsg);
		}
		try {
			// Assumes Mountain has an IPC handler "utils_fsRealpath"
			// that takes `{ path: string }` and returns `{ params: string | null }` or throws.
			const result = await this._ipcRequestResponse("utils_fsRealpath", {
				path: targetPath,
			});
			if (typeof result === "string") {
				return result;
			}
			// If Mountain returns null or unexpected, treat as error (realpath should find or fail)
			const errorMsg = `fsRealpath for "${targetPath}" received unexpected non-string result from Mountain: ${JSON.stringify(result)}`;
			this._logError(errorMsg);
			throw new Error(errorMsg);
		} catch (err: any) {
			// _ipcRequestResponse already refines error
			this._logWarn(
				`fsRealpath for path "${targetPath}" failed via IPC. Error: ${err.message}`,
			);
			throw err; // Rethrow to signal failure as per realpath contract
		}
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
