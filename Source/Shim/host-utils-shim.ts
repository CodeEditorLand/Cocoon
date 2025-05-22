/*---------------------------------------------------------------------------------------------
 * Cocoon Host Utils Shim (host-utils-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for the `IHostUtils` service. This service typically offers
 * utilities related to the host process environment, such as process ID, an exit function
 * (though usually restricted), and basic synchronous-like filesystem checks.
 *
 * This shim delegates its functionalities to other shims:
 * - `process-shim.ts` for `pid`.
 * - `fs-shim.ts` (specifically `fs.promises`) for `fsExists` and `fsRealpath`.
 *
 * Key Interactions:
 * - Implements the `IHostUtils` interface (or a relevant subset).
 * - Used by other ExtHost services, notably `ExtHostExtensionService`.
 * - Registered with DI in `index.ts`.
 *--------------------------------------------------------------------------------------------*/

// Default import from fs-shim.ts
import fsShimInstance from "./fs-shim";
// Default import from process-shim.ts
import processShimInstance from "./process-shim";

// IHostUtils interface should ideally be imported from VS Code's type definitions.
// e.g., import { IHostUtils } from 'vs/platform/native/common/native'; (path can vary)
// Or from 'vs/workbench/api/common/extHostExtensionService.ts' as it's often defined or used there.

// --- Type Definitions ---

// TODO: Ensure this local IHostUtils definition accurately matches the canonical
// VS Code interface that `ExtHostExtensionService` and other consumers expect.
export interface IHostUtilsShim {
	// Renamed to avoid conflict if real IHostUtils is imported for comparison
	readonly _serviceBrand: undefined;

	readonly pid?: number;

	/**
	 * Attempts to exit the host process. In Cocoon, this is typically prevented.
	 * @param code The exit code.
	 */
	// Note: process.exit is `never`, but IHostUtils.exit might be `void` if it doesn't guarantee exit.
	exit(code: number): void;

	/**
	 * Asynchronously checks if a file or directory exists.
	 * @param path The absolute path to check.
	 */
	fsExists(path: string): Promise<boolean>;

	/**
	 * Asynchronously resolves a path to its canonical absolute path.
	 * @param path The path to resolve.
	 */
	fsRealpath(path: string): Promise<string>;

	// TODO: Add other methods from the real IHostUtils if they exist and are needed by Cocoon.
	// e.g., methods related to trash, revealing files in OS, etc.
}

export class ShimHostUtils implements IHostUtilsShim {
	public readonly _serviceBrand: undefined;

	constructor() {
		// Optional logging
		// private readonly logService?: ILogService
		// this.logService?.trace("[Cocoon HostUtils Shim] Initialized.");
	}

	public get pid(): number | undefined {
		// `processShimInstance` is the default export of `process-shim.ts`.
		// Ensure it correctly exposes `pid`.
		try {
			return processShimInstance.pid;
		} catch (e: any) {
			// this.logService?.error("[Cocoon HostUtils Shim] Error accessing processShimInstance.pid:", e);

			console.error(
				"[Cocoon HostUtils Shim] Error accessing processShimInstance.pid:",

				e.message,
			);

			return undefined;
		}
	}

	public exit(code: number): void {
		// This shim's `exit` method should align with the intended behavior for extensions
		// calling this utility. VS Code's `IHostUtils.exit` typically *does* terminate the
		// extension host process.
		// However, `cocoon-bootstrap.ts` patches the global `process.exit`.
		// If `IHostUtils.exit` is meant to be a *controlled* exit, it should perhaps call
		// the *original* `nativeProcessExit` from `cocoon-bootstrap.ts` after notifying Mountain,

		// or simply call the (now patched) `process.exit`.

		// Current behavior from original JS: Warn and ignore.
		// This effectively makes `IHostUtils.exit()` a NOP from the extension's perspective via this service.
		console.warn(
			`[Cocoon HostUtils Shim] IHostUtils.exit(${code}) called. Shim is configured to prevent direct exit through this utility. Global process.exit is patched separately.`,
		);

		// If a real exit was intended here under specific circumstances, the `allowExitFn`
		// from `cocoon-bootstrap.ts` would need to be accessible and checked.
		// For now, it's a NOP, aligning with the idea of preventing unintentional exits.
	}

	public async fsExists(path: string): Promise<boolean> {
		if (!fsShimInstance?.promises?.stat) {
			console.error(
				"[Cocoon HostUtils Shim] fs-shim.promises.stat is not available for fsExists check.",
			);

			return false;
		}

		try {
			await fsShimInstance.promises.stat(path);

			return true;
		} catch (err: any) {
			if (err.code === "ENOENT" || err.code === "ENOTDIR") {
				// Common codes for non-existence
				return false;
			}

			// Log other unexpected errors but still treat as "does not exist" for fsExists's boolean contract.
			console.warn(
				`[Cocoon HostUtils Shim] fsExists check for "${path}" encountered an unexpected error during stat:`,

				err.message,
			);

			return false;
		}
	}

	public async fsRealpath(path: string): Promise<string> {
		if (!fsShimInstance?.promises?.realpath) {
			const errorMsg =
				"[Cocoon HostUtils Shim] fs-shim.promises.realpath is not available.";

			console.error(errorMsg);

			return Promise.reject(new Error(errorMsg));
		}

		try {
			return await fsShimInstance.promises.realpath(path);
		} catch (err: any) {
			// fs.promises.realpath throws for non-existent paths.
			// The error from fs-shim should already be NodeJS.ErrnoException-like.
			console.warn(
				`[Cocoon HostUtils Shim] fsRealpath for "${path}" failed:`,

				err.message,
			);

			// Rethrow the error as fs.realpath is expected to throw.
			throw err;
		}
	}
}
