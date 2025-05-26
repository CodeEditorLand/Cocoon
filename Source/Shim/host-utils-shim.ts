/*---------------------------------------------------------------------------------------------
 * Cocoon Host Utilities Shim (host-utils-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for the `IHostUtils` service interface. In VS Code,
 * 
 * 
 * this service typically offers utilities related to the host process environment,
 * 
 * 
 * such as retrieving the process ID (PID), providing a controlled way to request
 * process termination, and performing basic synchronous-like filesystem existence
 * or path resolution checks (though often implemented asynchronously).
 *
 * This shim delegates most of its functionalities to other, more specialized shims:
 * - `pid`: Delegates to `process-shim.ts`.
 * - `exit(code)`: Delegates to the global `process.exit`, which is patched by
 *   `cocoon-bootstrap.ts` to be conditional.
 * - `fsExists(path)`: Uses `fs-shim.ts` (specifically `fs.promises.stat`).
 * - `fsRealpath(path)`: Uses `fs-shim.ts` (specifically `fs.promises.realpath`).
 *
 * Responsibilities:
 * - Implementing the `IHostUtils` interface (or a compatible subset, `IHostUtilsShim`).
 * - Providing access to the host process's PID via the `process-shim`.
 * - Offering a controlled `exit` method that respects Cocoon's termination policy.
 * - Providing asynchronous filesystem checks (`fsExists`, `fsRealpath`) by leveraging
 *   the `fs-shim`.
 *
 * Key Interactions:
 * - Registered with Dependency Injection in `Cocoon/index.ts`.
 * - Used by other ExtHost services, notably `ExtHostExtensionService`, for environment
 *   information and utility functions.
 * - Relies on `fs-shim.ts` (for filesystem operations) and `process-shim.ts` (for PID).
 * - The `exit` method indirectly interacts with the patched global `process.exit`
 *   from `cocoon-bootstrap.ts`.
 *

 *--------------------------------------------------------------------------------------------*/

// Default import of the fs-shim object instance
import fsShimInstance from "./fs-shim";
// Default import of the process-shim object instance
import processShimInstance from "./process-shim";

// IHostUtils interface should ideally be imported from VS Code's type definitions.
// e.g., import { IHostUtils } from 'vs/platform/native/common/native'; (path can vary)
// or from 'vs/workbench/api/common/extHostExtensionService.ts' as it's often defined there.

// --- Type Definitions ---

/**
 * Defines the interface for host utility functions provided by this shim.
 * This should align with the relevant parts of VS Code's `IHostUtils` interface.
 */
export interface IHostUtilsShim {
	// For DI compatibility
	readonly _serviceBrand: undefined;

	/** The process ID (PID) of the Cocoon host process. */
	readonly pid?: number;

	/**
	 * Requests termination of the Cocoon host process with a given exit code.
	 * This call delegates to the global `process.exit`, which is patched by
	 * `cocoon-bootstrap.ts` and may be prevented by the host policy.
	 * @param code The exit code for the process.
	 */
	// `process.exit` is `never`, but this utility method might not guarantee exit.
	exit(code: number): void;

	/**
	 * Asynchronously checks if a file or directory exists at the given path.
	 * @param path The absolute path to check.
	 * @returns A promise that resolves to `true` if the path exists, `false` otherwise.
	 */
	fsExists(path: string): Promise<boolean>;

	/**
	 * Asynchronously resolves a path to its canonical absolute path.
	 * This typically resolves symbolic links.
	 * @param path The path to resolve.
	 * @returns A promise that resolves to the canonical absolute path string, or rejects
	 *          if the path does not exist or an error occurs.
	 */
	fsRealpath(path: string): Promise<string>;

	// TODO: Add other methods from the real IHostUtils if they are necessary for Cocoon's
	// supported extensions or VS Code platform code it runs (e.g., methods related to
	// trash, revealing files in OS, etc.).
}

/**
 * Cocoon's implementation of `IHostUtils`.
 * It provides host process utilities by delegating to other shims or Node.js primitives.
 */
export class ShimHostUtils implements IHostUtilsShim {
	// Required by VS Code's service types
	public readonly _serviceBrand: undefined;

	// Optional logger, can be injected if BaseCocoonShim is used as a base.
	// For this standalone shim, direct console logging is used for simplicity if no logger passed.
	// private readonly _logService?: ILogServiceForShim;

	/**
	 * Creates an instance of ShimHostUtils.
	 * @param _logService Optional logging service (currently unused in this direct implementation).
	 */
	constructor(_logService?: {
		trace: (message: string, ...args: any[]) => void;

		error: (message: string | Error, ...args: any[]) => void;

		warn: (message: string, ...args: any[]) => void;
	}) {
		// this._logService = _logService;

		// this._logService?.trace("[Cocoon HostUtils Shim] Initialized.");

		console.log("[Cocoon HostUtils Shim] Initialized.");
	}

	/**
	 * Gets the process ID (PID) of the Cocoon host process.
	 * Retrieves the PID from the `process-shim`.
	 */
	public get pid(): number | undefined {
		try {
			// `processShimInstance` is the default export of `process-shim.ts`.
			return processShimInstance.pid;
		} catch (e: any) {
			console.error(
				"[Cocoon HostUtils Shim] Error accessing processShimInstance.pid:",

				e.message,

				e.stack,
			);

			return undefined;
		}
	}

	/**
	 * Requests termination of the Cocoon host process.
	 * This method calls the global `process.exit()`, which is patched by `cocoon-bootstrap.ts`.
	 * The bootstrap patch will consult `allowExitFn` (provided by `index.ts`) to determine
	 * if the process is actually allowed to terminate.
	 * @param code The exit code.
	 */
	public exit(code: number): void {
		// This call delegates to the globally patched `process.exit`.
		// `cocoon-bootstrap.ts` handles the logic of whether to allow the exit or prevent it.
		console.warn(
			`[Cocoon HostUtils Shim] IHostUtils.exit(${code}) called. Delegating to global process.exit(), which is subject to Cocoon's host policy.`,
		);

		// This will trigger the patched global exit.
		process.exit(code);
	}

	/**
	 * Asynchronously checks if a file or directory exists at the given path.
	 * Uses the `fs-shim` (which proxies to Mountain) to perform a `stat` operation.
	 * @param targetPath The absolute path to check.
	 * @returns A promise resolving to `true` if the path exists, `false` otherwise.
	 */
	public async fsExists(targetPath: string): Promise<boolean> {
		if (!fsShimInstance?.promises?.stat) {
			console.error(
				"[Cocoon HostUtils Shim] fs-shim.promises.stat is not available for fsExists check. Returning false.",
			);

			return false;
		}

		try {
			await fsShimInstance.promises.stat(targetPath);

			// If stat succeeds, the path exists.
			return true;
		} catch (err: any) {
			// Common error codes for non-existence from fs.stat.
			if (err.code === "ENOENT" || err.code === "ENOTDIR") {
				return false;
			}

			// For other unexpected errors during stat (e.g., permission issues),

			// log the error but still treat as "does not exist" for `fsExists` contract.
			console.warn(
				`[Cocoon HostUtils Shim] fsExists check for path "${targetPath}" encountered an unexpected error during 'stat' operation (path may exist but be inaccessible). Error:`,

				err.message,
			);

			return false;
		}
	}

	/**
	 * Asynchronously resolves a path to its canonical absolute path using the `fs-shim`.
	 * This will typically resolve symbolic links.
	 * @param targetPath The path to resolve.
	 * @returns A promise that resolves to the canonical absolute path string.
	 * @throws An error (propagated from `fs-shim`) if the path does not exist or an error occurs during resolution.
	 */
	public async fsRealpath(targetPath: string): Promise<string> {
		if (!fsShimInstance?.promises?.realpath) {
			const errorMsg =
				"[Cocoon HostUtils Shim] fs-shim.promises.realpath is not available.";

			console.error(errorMsg);

			// Match typical fs promise rejection with an Error object.
			return Promise.reject(new Error(errorMsg));
		}

		try {
			return await fsShimInstance.promises.realpath(targetPath);
		} catch (err: any) {
			// `fs.promises.realpath` is expected to throw if the path doesn't exist or other errors occur.
			// The error from `fs-shim` should already be an `Error` (potentially NodeJS.ErrnoException-like).
			// Log it here for context but rethrow it as the caller expects.
			console.warn(
				`[Cocoon HostUtils Shim] fsRealpath for path "${targetPath}" failed (this is expected if path does not exist). Error:`,

				err.message,
			);

			throw err;
		}
	}
}
