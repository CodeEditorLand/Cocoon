/*
 * File: Cocoon/Source/Shim/HostUtils.ts
 * Responsibility: Implements the IHostUtils interface for the Cocoon sidecar, providing process information and filesystem utilities by leveraging Mountain's IPC layer (Vine) and the ShimFileSystemApi to interact with the native backend.
 * Modified: 2025-06-07 05:37:38 UTC
 * Dependency: ./Process, vs/platform/instantiation/common/instantiation, vs/workbench/api/common/extHostWorkspace
 * Export: IHostUtilsShim, ShimHostUtils
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Host Utilities Shim
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for the `IHostUtils` service interface, which in
 * VS Code typically offers utility functions related to the host process environment.
 *
 * This shim delegates its functionalities:
 * - `Pid`: Retrieves the process ID from the Process shim.
 * - `Exit(Code)`: Delegates the exit request to the global `process.exit` function,
 *   which is patched by `cocoon-bootstrap.ts` for conditional termination based on host policy.
 * - `CheckFsExist(Path)`: Uses `vscode.workspace.fs.stat()` (via an injected `IInstantiationService`
 *   to get `IExtHostWorkspace` which provides `fs` - typically `ShimFileSystemApi`)
 *   to check for path existence. This relies on the functional `workspacefs_*` backend in Mountain.
 * - `ResolveFsRealPath(Path)`: Proxies the request to Mountain via a direct IPC call (`utils_fsRealpath`)
 *   for native `realpath` resolution, bypassing the deprecated `fs-shim` for this operation.
 *
 * Responsibilities:
 * - Implementing an interface compatible with VS Code's `IHostUtils`.
 * - Providing access to the Cocoon host process's PID.
 * - Offering a controlled `Exit` method aligned with Cocoon's termination policy.
 * - Providing asynchronous filesystem utility functions (`CheckFsExist`, `ResolveFsRealPath`) that
 *   use functional backends (either `vscode.workspace.fs` or direct IPC to Mountain).
 *
 * Key Interactions:
 * - An instance of `ShimHostUtils` is registered with Dependency Injection in
 *   `Cocoon/index.ts`.
 * - It may be used by other ExtHost services for accessing environment information.
 * - The `Exit` method's behavior is ultimately governed by the `allowExitFn`
 *   configured in `index.ts` and applied by `cocoon-bootstrap.ts`.
 * - `CheckFsExist` requires `IInstantiationService` to get `vscode.workspace.fs`.
 * - `ResolveFsRealPath` uses direct IPC (`_IpcRequestResponse`) to Mountain.
 * - Extends `BaseCocoonShim` for standardized logging.
 *
 *--------------------------------------------------------------------------------------------*/

import type { IInstantiationService } from "vs/platform/instantiation/common/instantiation";
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace";
import {
	FileSystemError as VscodeFileSystemError,
	Uri as VscodeUri,
	type FileSystem as VscodeFileSystem,
} from "vscode";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_BaseShim";
import ProcessShimInstance from "./Process";

/**
 * Defines the interface for host utility functions provided by this shim.
 */
export interface IHostUtilsShim {
	readonly _serviceBrand: undefined;
	readonly Pid?: number;
	Exit(Code: number): void;
	CheckFsExist(TargetPath: string): Promise<boolean>;
	ResolveFsRealPath(TargetPath: string): Promise<string>;
}

/** Cocoon's implementation of `IHostUtils`. */
export class ShimHostUtils extends BaseCocoonShim implements IHostUtilsShim {
	public readonly _serviceBrand: undefined;
	private readonly _InstantiationService: IInstantiationService;
	private _WorkspaceFs: VscodeFileSystem | undefined;

	constructor(
		RpcService: IRpcProtocolServiceAdapter | undefined,
		LogService: ILogServiceForShim | undefined,
		InstantiationService: IInstantiationService,
	) {
		super("HostUtils", RpcService, LogService);
		this._InstantiationService = InstantiationService;
		this._LogInfo("Initialized.");
	}

	// Lazy load vscode.workspace.fs to avoid circular DI if HostUtils is needed very early.
	private GetWorkspaceFs(): VscodeFileSystem {
		if (!this._WorkspaceFs) {
			try {
				// Assuming IExtHostWorkspace provides 'fs' property which is our ShimFileSystemApi
				const WorkspaceService =
					this._InstantiationService.get(IExtHostWorkspace);
				if (!WorkspaceService || !WorkspaceService.fs) {
					throw new Error(
						"IExtHostWorkspace or its 'fs' property is unavailable via DI.",
					);
				}
				this._WorkspaceFs = WorkspaceService.fs;
			} catch (DiError: any) {
				this._LogError(
					"CRITICAL: Cannot access vscode.workspace.fs for HostUtils. CheckFsExist will fail.",
					DiError,
				);
				// Provide a throwing FS to prevent null errors downstream.
				this._WorkspaceFs = {
					stat: async (_Uri: VscodeUri) => {
						throw new Error(
							"Workspace FS unavailable in HostUtils for stat",
						);
					},
				} as any;
			}
		}
		return this._WorkspaceFs!;
	}

	/** This shim's core logic relies on local shims or direct IPC, not standard RPC proxying. */
	protected override _RequireRpc(): boolean {
		return false;
	}

	/** The Process ID (PID) of the Cocoon host process. */
	public get Pid(): number | undefined {
		try {
			// Assumes the Process shim instance also follows the convention.
			return ProcessShimInstance.Pid;
		} catch (Error: any) {
			this._LogError(
				"Error accessing 'Pid' from ProcessShimInstance. This may indicate an issue with Process shim initialization.",
				"Error:",
				Error,
			);
			return undefined;
		}
	}

	/** Requests termination of the Cocoon host process with a specified exit code. */
	public Exit(Code: number): void {
		this._LogWarn(
			`IHostUtils.Exit(${Code}) called. Delegating to global 'process.exit()'.`,
		);
		process.exit(Code); // Delegates to the globally patched process.exit
	}

	/** Asynchronously checks if a file or directory exists at the given path. */
	public async CheckFsExist(TargetPath: string): Promise<boolean> {
		this._LogService?.trace(
			`CheckFsExist for path: '${TargetPath}' (using vscode.workspace.fs.stat).`,
		);
		if (
			!TargetPath ||
			typeof TargetPath !== "string" ||
			TargetPath.trim() === ""
		) {
			this._LogWarn(
				`CheckFsExist: Invalid or empty TargetPath provided: '${TargetPath}'. Returning false.`,
			);
			return false;
		}
		try {
			const Uri = VscodeUri.file(TargetPath);
			await this.GetWorkspaceFs().stat(Uri);
			return true; // If stat succeeds, the path exists.
		} catch (Error: any) {
			// Check if the error is specifically FileSystemError.FileNotFound
			if (
				Error instanceof VscodeFileSystemError &&
				Error.code === "FileNotFound"
			) {
				return false;
			}
			// For other errors, log and return false as path is not verifiable.
			this._LogWarn(
				`CheckFsExist for path "${TargetPath}" encountered an error during 'stat' (path may exist but be inaccessible). Error: ${Error.message || Error}. Returning false.`,
			);
			return false;
		}
	}

	/** Asynchronously resolves a path to its canonical absolute path. */
	public async ResolveFsRealPath(TargetPath: string): Promise<string> {
		this._LogService?.trace(
			`ResolveFsRealPath for path: '${TargetPath}' (using direct IPC 'utils_fsRealpath').`,
		);
		if (
			!TargetPath ||
			typeof TargetPath !== "string" ||
			TargetPath.trim() === ""
		) {
			const ErrorMessage = `ResolveFsRealPath: Invalid or empty TargetPath provided: '${TargetPath}'.`;
			this._LogError(ErrorMessage);
			throw new Error(ErrorMessage); // Fail fast for invalid input.
		}
		try {
			const Result = await this._IpcRequestResponse("utils_fsRealpath", {
				path: TargetPath,
			});

			if (typeof Result === "string") {
				return Result;
			}
			const ErrorMessage = `ResolveFsRealPath for "${TargetPath}" received unexpected non-string result from Mountain: ${JSON.stringify(Result)}`;
			this._LogError(ErrorMessage);
			throw new Error(ErrorMessage);
		} catch (Error: any) {
			// _IpcRequestResponse already refines and logs the error.
			this._LogWarn(
				`ResolveFsRealPath for "${TargetPath}" failed via IPC. Error: ${Error.message}`,
			);
			throw Error;
		}
	}

	public override Dispose(): void {
		super.Dispose();
		this._LogInfo("Disposed.");
	}
}
