/*---------------------------------------------------------------------------------------------
 * Cocoon Host Utilities Shim (host-utils-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for the `IHostUtils` service interface, which in
 * VS Code typically offers utility functions related to the host process environment.
 * These can include retrieving the process ID (PID), providing a controlled way to
 * request process termination, and performing basic filesystem checks or path
 * resolution operations.
 *
 * This shim delegates its functionalities to other, more specialized shims within Cocoon:
 * - `pid`: Retrieves the process ID from `process-shim.ts`.
 * - `exit(code)`: Delegates the exit request to the global `process.exit` function, * *   which is patched by `cocoon-bootstrap.ts`. The patched version consults an
 *   `allowExitFn` to determine if Cocoon is permitted to terminate.
 * - `fsExists(path)`: Uses `fs-shim.ts` (specifically `fsShimInstance.promises.stat`)
 *   to check for path existence. **WARNING:** This method's reliability is currently
 *   compromised as `fs-shim.ts` depends on a deprecated backend in Mountain
 *   (`handlers/native_fs.rs`). This function is therefore likely to be
 *   non-functional or unreliable until that dependency is resolved.
 * - `fsRealpath(path)`: Uses `fs-shim.ts` (specifically `fsShimInstance.promises.realpath`)
 *   to resolve canonical paths. **WARNING:** Also dependent on the deprecated `fs-shim` backend.
 *
 * Responsibilities:
 * - Implementing an interface compatible with VS Code's `IHostUtils`.
 * - Providing access to the Cocoon host process's PID via `process-shim.ts`.
 * - Offering a controlled `exit` method that aligns with Cocoon's termination policy.
 * - Providing asynchronous filesystem utility functions (`fsExists`, `fsRealpath`), * *   while clearly noting their current dependency on a potentially non-functional backend.
 *
 * Key Interactions:
 * - An instance of `ShimHostUtils` is registered with Dependency Injection in
 *   `Cocoon/index.ts`.
 * - It may be used by other ExtHost services, such as `ExtHostExtensionService`, for
 *   accessing environment information or performing utility operations.
 * - Relies on `fs-shim.ts` for filesystem-related utilities and `process-shim.ts`
 *   for process ID information.
 * - The `exit` method's behavior is ultimately governed by the `allowExitFn`
 *   configured in `index.ts` and applied by `cocoon-bootstrap.ts`.
 * - Extends `BaseCocoonShim` for standardized logging.
 *
 *--------------------------------------------------------------------------------------------*/

// Default import of the fs-shim object instance for filesystem utilities.

// Base class for Cocoon shims, providing logging and other common utilities.
import {
	BaseCocoonShim,
	// For BaseCocoonShim constructor
	type ILogServiceForShim,
	// For BaseCocoonShim constructor
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";
// WARNING: Backend for fs-shim (native_fs.rs) is deprecated.
import fsShimInstance from "./fs-shim";
// Default import of the process-shim object instance for process information.
import processShimInstance from "./process-shim";

// The IHostUtils interface should ideally be imported from VS Code's type definitions
// if available and compatible (e.g., from 'vs/platform/native/common/native' or
// 'vs/workbench/api/common/extHostExtensionService.ts').
// For this shim, we define `IHostUtilsShim` to represent the targeted API surface.

// --- Type Definitions ---

/**
 * Defines the interface for host utility functions provided by this shim.
 * This aims to be compatible with the relevant parts of VS Code's `IHostUtils` interface.
 */
export interface IHostUtilsShim {
	// For DI compatibility if registered as a service.
	readonly _serviceBrand: undefined;

	/**
	 * The Process ID (PID) of the Cocoon host process.
	 * Retrieved from the `process-shim`. Returns `undefined` if the PID cannot be determined.
	 */
	readonly pid?: number;

	/**
	 * Requests termination of the Cocoon host process with a specified exit code.
	 * This call delegates to the global `process.exit` function, which is patched by
	 * `cocoon-bootstrap.ts`. The patched version consults an `allowExitFn` (provided by
	 * `index.ts`) to determine if the process is actually permitted to terminate.
	 * If not permitted, an error will be thrown by the patched `process.exit`.
	 * @param code The exit code for the process.
	 */
	// Note: `process.exit` itself is `never`, but this utility method signature is `void`.
	exit(code: number): void;

	/**
	 * Asynchronously checks if a file or directory exists at the given path.
	 * **WARNING:** This method relies on `fs-shim.ts`, whose backend in Mountain
	 * (`native_fs.rs`) is currently DEPRECATED. This function is therefore likely
	 * to be non-functional or unreliable until that dependency is resolved by either
	 * reviving the backend or removing reliance on `fs-shim.ts`.
	 * @param targetPath The absolute path to check.
	 * @returns A promise that resolves to `true` if the path exists (and `fs-shim` is functional),
	 *
	 *
	 *
	 *
	 *
	 *          `false` otherwise or if an error occurs (e.g., permission denied, non-functional backend).
	 */
	fsExists(targetPath: string): Promise<boolean>;

	/**
	 * Asynchronously resolves a path to its canonical absolute path, typically resolving symbolic links.
	 * **WARNING:** This method relies on `fs-shim.ts`, whose backend in Mountain
	 * (`native_fs.rs`) is currently DEPRECATED. This function is therefore likely
	 * to be non-functional or unreliable until that dependency is resolved.
	 * @param targetPath The path to resolve.
	 * @returns A promise that resolves to the canonical absolute path string.
	 * @throws An error (propagated from `fs-shim`) if the path does not exist, the
	 *         `fs-shim` backend is non-functional, or another error occurs during resolution.
	 */
	fsRealpath(targetPath: string): Promise<string>;

	// TODO (Future): Consider adding other methods from VS Code's `IHostUtils` if they become
	// necessary for Cocoon's supported extensions or for platform code that Cocoon runs.
	// Examples might include utilities related to:
	// - Moving files/folders to trash (e.g., `trash(path)`).
	// - Revealing files in the operating system's file explorer (e.g., `revealInFinder(path)`).
	// - Getting platform-specific information not covered by `os-shim`.
	// Each would require a corresponding backend implementation in Mountain and careful security consideration.
}

/**
 * Cocoon's implementation of `IHostUtils`.
 * It provides utility functions related to the host process environment by delegating
 * to other specialized shims (like `process-shim` and `fs-shim`) or Node.js primitives.
 */
export class ShimHostUtils extends BaseCocoonShim implements IHostUtilsShim {
	// Required by VS Code's service type system for DI.
	public readonly _serviceBrand: undefined;

	/**
	 * Creates an instance of ShimHostUtils.
	 * @param rpcService The RPC service adapter (passed to BaseCocoonShim, not directly used by this shim's core logic).
	 * @param logService The logging service instance.
	 */
	constructor(
		// For BaseCocoonShim
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		// Service identifier for logging
		super("HostUtils", rpcService, logService);

		// Use Info for major lifecycle
		this._logInfo("Initialized.");
	}

	/**
	 * This shim's core logic relies on local shims (`process-shim`, `fs-shim`) or the global `process` object.
	 * It does not make direct RPC calls itself for its primary functionalities.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc IHostUtilsShim.pid}
	 *
	 *
	 *
	 *
	 *
	 *
	 */
	public get pid(): number | undefined {
		try {
			// `processShimInstance` is the default export of `process-shim.ts`.
			return processShimInstance.pid;
		} catch (e: any) {
			this._logError(
				"Error accessing 'pid' from processShimInstance. This may indicate an issue with process-shim.ts initialization or availability.",

				"Error details:",

				e,
			);

			return undefined;
		}
	}

	/**
	 * {@inheritDoc IHostUtilsShim.exit}
	 *
	 *
	 *
	 *
	 *
	 *
	 */
	public exit(code: number): void {
		// This call delegates to the global `process.exit` function.
		// `cocoon-bootstrap.ts` patches the global `process.exit` to consult an `allowExitFn`
		// (provided by `index.ts` based on Mountain's state) before actually terminating the process.
		// If `allowExitFn` returns false, the patched `process.exit` will throw an error,

		// preventing termination and making the `exit()` call effectively fail.
		this._logWarn(
			`IHostUtils.exit(${code}) called. Delegating to global 'process.exit()', which is subject to ` +
				`Cocoon's host termination policy (controlled via allowExitFn in cocoon-bootstrap.ts).`,
		);

		// This will trigger the patched global exit mechanism.
		process.exit(code);
	}

	/**
	 * {@inheritDoc IHostUtilsShim.fsExists}
	 *
	 *
	 *
	 *
	 *
	 *
	 */
	public async fsExists(targetPath: string): Promise<boolean> {
		this._logService?.trace(
			`fsExists check initiated for path: '${targetPath}' (will use fs-shim).`,
		);

		this._logWarnOnce(
			`fsExists (and fsRealpath) rely on fs-shim.ts, whose Mountain backend (native_fs.rs) is DEPRECATED. ` +
				`These file operations are likely non-functional. Extensions should use vscode.workspace.fs.`,
		);

		if (!fsShimInstance?.promises?.stat) {
			this._logError(
				"fs-shim.promises.stat is unavailable for fsExists check. This is likely due to fs-shim.ts issues or " +
					"its deprecated backend in Mountain. Cannot perform existence check. Returning false.",
			);

			return false;
		}

		try {
			await fsShimInstance.promises.stat(targetPath);

			// If stat succeeds (does not throw), the path exists.
			return true;
		} catch (err: any) {
			// `fsShimInstance.promises.stat` (via `requestFsOpAsync` in fs-shim.ts)
			// should throw NodeJS.ErrnoException-like errors.
			if (err.code === "ENOENT" || err.code === "ENOTDIR") {
				// Standard error codes indicating the path does not exist or is not a type that can be "stat"-ed.
				return false;
			}

			// For other unexpected errors (e.g., permission issues, or fs-shim backend truly failing):
			this._logWarn(
				`fsExists check for path "${targetPath}" encountered an unexpected error during 'stat' operation. ` +
					`This could be due to permissions, the path existing but being inaccessible, or the fs-shim backend failing. ` +
					`Error: ${err.message}. Returning false as per fsExists contract on error.`,
			);

			// Fulfill the boolean contract of fsExists by returning false on other errors.
			return false;
		}
	}

	/**
	 * {@inheritDoc IHostUtilsShim.fsRealpath}
	 *
	 *
	 *
	 *
	 *
	 *
	 */
	public async fsRealpath(targetPath: string): Promise<string> {
		this._logService?.trace(
			`fsRealpath request initiated for path: '${targetPath}' (will use fs-shim).`,
		);

		this._logWarnOnce(
			// Ensure this critical warning is seen but not spammed.
			`fsRealpath (and fsExists) rely on fs-shim.ts, whose Mountain backend (native_fs.rs) is DEPRECATED. ` +
				`These file operations are likely non-functional. Extensions should use vscode.workspace.fs.`,
		);

		if (!fsShimInstance?.promises?.realpath) {
			const errorMsg =
				"fs-shim.promises.realpath is unavailable. This might be due to fs-shim.ts issues or " +
				"its deprecated backend in Mountain. Cannot perform realpath operation.";

			this._logError(errorMsg);

			// Throw to indicate the utility itself is non-functional.
			throw new Error(errorMsg);
		}

		try {
			return await fsShimInstance.promises.realpath(targetPath);
		} catch (err: any) {
			// `fs.promises.realpath` (and thus our fs-shim version) is expected to throw if the path
			// doesn't exist or if other filesystem errors occur (including backend failure).
			// The error from `fs-shim` (via `requestFsOpAsync`) should already be an `Error` instance.
			this._logWarn(
				`fsRealpath for path "${targetPath}" failed. This is expected if the path does not exist, ` +
					`permissions are insufficient, or the fs-shim backend is non-functional. Error: ${err.message}`,
			);

			// Rethrow the error as the caller of `fsRealpath` expects it to throw on failure.
			throw err;
		}
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles via `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		// Use Info for major lifecycle
		this._logInfo("Disposed.");
	}
}
