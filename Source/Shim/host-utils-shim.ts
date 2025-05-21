/*---------------------------------------------------------------------------------------------
 * Cocoon Host Utils Shim (host-utils-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for the `IHostUtils` service, which typically offers utilities
 * related to the host process environment (like PID, exit, basic fs checks).
 * This shim uses other shims (`fs-shim`, `process-shim`) for its functionality.
 *
 * Key Interactions:
 * - Implements the `IHostUtils` interface (or a relevant subset).
 * - Uses `fs-shim.ts` for filesystem existence and realpath checks.
 * - Uses `process-shim.ts` for process ID.
 * - Registered with DI in `index.ts`.
 *--------------------------------------------------------------------------------------------*/

// Default import from fs-shim.ts
import fsShimInstance from "./fs-shim";
// Default import from process-shim.ts
import processShimInstance from "./process-shim";

// IHostUtils interface should ideally be imported from VS Code's type definitions
// For example: import { IHostUtils } from 'vs/platform/native/common/native'; (path may vary)
// If not available, define it locally based on usage.

// --- Type Definitions ---

// TODO: If IHostUtils is not imported from VS Code types, ensure this local definition
// matches the actual interface expected by consumers (e.g., ExtHostExtensionService).
export interface IHostUtils {
	readonly _serviceBrand: undefined;

	// Process ID of the host
	readonly pid?: number;

	/**
	 * Exits the host process. This is typically a restricted operation.
	 * @param code The exit code.
	 */
	exit(code: number): void;

	/**
	 * Checks if a file or directory exists at the given path.
	 * @param path The path to check.
	 */
	fsExists(path: string): Promise<boolean>;

	/**
	 * Resolves a path to its canonical absolute path.
	 * @param path The path to resolve.
	 */
	fsRealpath(path: string): Promise<string>;
}

export class ShimHostUtils implements IHostUtils {
	public readonly _serviceBrand: undefined;

	constructor() {
		// Logging can be added if desired
		// console.log("[Cocoon HostUtils Shim] Initialized.");
	}

	public get pid(): number | undefined {
		// `processShimInstance` is the default export of `process-shim.ts`, which is an object.
		// It should have a `pid` property.
		return processShimInstance.pid;
	}

	public exit(code: number): void {
		// This shim explicitly prevents extensions from exiting the host process.
		// This behavior is consistent with how VS Code's extension host manages `process.exit`.
		console.warn(
			`[Cocoon HostUtils Shim] HostUtils.exit(${code}) called. Exit is being prevented by the shim.`,
		);

		// In a real host, this might signal the main process or log more severely.
		// For Cocoon, preventing exit is the key.
	}

	public fsExists(path: string): Promise<boolean> {
		// `fsShimInstance` is the default export of `fs-shim.ts`.
		// It has a `promises` property which contains the async fs methods.
		if (!fsShimInstance?.promises?.stat) {
			console.error(
				"[Cocoon HostUtils Shim] fs-shim.promises.stat is not available for fsExists check.",
			);

			// Indicate non-existence if fs.promises.stat is missing
			return Promise.resolve(false);
		}

		return fsShimInstance.promises
			.stat(path)
			.then(() => true)
			.catch((err: any) => {
				// ENOENT is expected if file doesn't exist, other errors might be actual problems
				if (err.code === "ENOENT") {
					return false;
				}

				// Log other errors encountered during stat, but still treat as "does not exist" for fsExists.
				console.warn(
					`[Cocoon HostUtils Shim] fsExists check for "${path}" encountered an error during stat:`,
					err.message,
				);

				return false;
			});
	}

	public fsRealpath(path: string): Promise<string> {
		if (!fsShimInstance?.promises?.realpath) {
			console.error(
				"[Cocoon HostUtils Shim] fs-shim.promises.realpath is not available.",
			);

			return Promise.reject(
				new Error("fs.promises.realpath is not available in shim."),
			);
		}

		return fsShimInstance.promises.realpath(path);
	}
}
