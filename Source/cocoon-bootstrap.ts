/*---------------------------------------------------------------------------------------------
 * Cocoon Bootstrap Utilities (cocoon-bootstrap.ts)
 * --------------------------------------------------------------------------------------------
 * Provides essential utilities executed very early in the Cocoon sidecar's startup process,
 *
 * before most other modules are loaded or services initialized. Its primary functions are to
 * patch global Node.js `process` object behaviors to prevent unintentional termination or
 * crashes initiated by extensions, and to set up critical environment configurations
 * expected by VS Code platform code or extensions running within Cocoon.
 *
 * Responsibilities:
 * - Patching `process.exit(code?)`: Replaces the global `process.exit` function to make
 *   termination conditional. The patched version consults a host-provided `allowExitFn`
 *   before allowing the process to terminate. If exit is disallowed, a warning is logged,
 *
 *   and an error is thrown to halt the exiting code path.
 * - Patching `process.crash()`: If this Electron-specific method exists on the `process`
 *   object (less common in a pure Node.js sidecar like Cocoon but handled for robustness),
 *
 *   it's replaced to log a warning and prevent the actual crash, allowing Cocoon to
 *   continue running.
 * - Setting the `ELECTRON_RUN_AS_NODE=1` environment variable: This is a common practice
 *   in VS Code extension hosts. It signals to certain Node.js modules or native dependencies
 *   that they are running in a Node.js-like environment, potentially influencing their behavior.
 * - Attempting to block the loading of the deprecated 'natives' Node.js module: This is
 *   achieved by patching the internal `Module._load` function to throw an error if an
 *   attempt is made to `require('natives')`.
 *
 * Key Interactions:
 * - This module is imported and its `patchProcess` function is executed by `Cocoon/index.ts`
 *   during its earliest initialization phase, before the DI container or RPC protocol
 *   are fully set up.
 * - It directly modifies the global Node.js `process` object and Node's internal `Module._load`.
 * - The `allowExitFn` parameter for `patchProcess` is provided by `Cocoon/index.ts` and
 *   reflects the host's (Mountain's) policy on whether Cocoon is allowed to terminate.
 *
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon Bootstrap] Initializing bootstrap utilities...");

// --- Block deprecated 'natives' module ---
// This IIFE attempts to patch Node.js's internal module loading mechanism
// to prevent extensions from loading the deprecated 'natives' module.
// This pattern is based on VS Code's own bootstrap logic.
(() => {
	try {
		// Dynamically require 'node:module' for patching Node.js internals.
		// This is a CommonJS specific approach.
		const Module = require("node:module");

		if (Module && typeof Module._load === "function") {
			const originalModuleLoad = Module._load;

			Module._load = function (
				request: string,

				// Node's internal parent module object
				parentModule: any,

				isMain: boolean,
			): any {
				if (request === "natives") {
					const errorMessage =
						"[Cocoon Bootstrap] Attempt to load deprecated 'natives' module blocked. This module is not available. See https://go.microsoft.com/fwlink/?linkid=871887 for more details.";

					console.warn(errorMessage);

					throw new Error(errorMessage);
				}

				// Call original with original arguments and `this` context.
				return originalModuleLoad.call(
					this,

					request,

					parentModule,

					isMain,
				);
			};

			console.log(
				"[Cocoon Bootstrap] Patched Module._load to block 'natives' module.",
			);
		} else {
			console.warn(
				"[Cocoon Bootstrap] Could not patch 'natives' module: Module._load not found or not a function. This might occur in non-standard Node.js environments or future versions.",
			);
		}
	} catch (error: any) {
		console.error(
			"[Cocoon Bootstrap] Failed to patch Module._load for 'natives' module:",

			error.message || error,
		);
	}
})();

// Store original process functions before any patching occurs.
// Bind them to `process` to maintain their original `this` context if they rely on it.
const nativeProcessExit: (code?: number) => never = process.exit.bind(process);

// `process.crash` is typically Electron-specific. It might not exist in a standard
// Node.js environment where Cocoon primarily runs. Check for its existence before attempting to patch.
const nativeProcessCrash: (() => void) | undefined =
	typeof (process as any).crash === "function"
		? (process as any).crash.bind(process)
		: undefined;

/**
 * Patches the global `process` object to control termination and configure environment settings.
 * This function should be called very early in the application lifecycle, before extensions are loaded.
 *
 * Key patches:
 * - `process.exit(code?)`: Replaced to make termination conditional based on `allowExitFn`.
 *   If `allowExitFn` returns `false`, the exit is prevented, a warning is logged, and an
 *   error is thrown to halt the code path that attempted the exit.
 * - `process.crash()`: If this Electron-specific method is present, it is replaced to log a
 *   warning and prevent the actual crash, allowing Cocoon to continue operating.
 * - `process.env.ELECTRON_RUN_AS_NODE`: This environment variable is set to '1'. This is a
 *   convention used in VS Code to signal to some modules or native dependencies that they
 *   should behave as if running in a standard Node.js environment, even if the host
 *   environment has Electron characteristics.
 *
 * @param allowExitFn A synchronous function that returns `true` if the host allows the
 *                    Cocoon process to exit (e.g., during a clean shutdown sequence initiated
 *                    by Mountain), or `false` if exit attempts (e.g., by an extension) should
 *                    be prevented.
 */
export function patchProcess(allowExitFn: () => boolean): void {
	console.log(
		"[Cocoon Bootstrap] Applying patches to global 'process' object...",
	);

	// Patch process.exit
	process.exit = (code?: number): never => {
		if (allowExitFn()) {
			const exitCodeStr = code !== undefined ? String(code) : "(no code)";

			console.log(
				`[Cocoon Bootstrap] process.exit(${exitCodeStr}) called and ALLOWED by host policy. Terminating process.`,
			);

			// Call the original, unpatched exit function.
			nativeProcessExit(code);
		} else {
			const errorMessage =
				"process.exit() was called but PREVENTED by Cocoon's host policy. The Cocoon process will continue running.";

			// Log as a warning because this is an attempt to exit that's being gracefully handled (prevented).
			// Include a stack trace to help identify the source of the `process.exit()` call.
			console.warn(
				`[Cocoon Bootstrap] ${errorMessage}\nCall stack for prevented exit:\n${new Error("Stack trace for prevented process.exit()").stack || "(Stack trace unavailable)"}`,
			);

			// To satisfy the `never` return type when not exiting, we must throw an error.
			// This makes the call to process.exit() behave like it failed if not allowed.
			// The primary goal is to prevent the exit and log the attempt.
			throw new Error(
				`Blocked call to process.exit(${code ?? ""}) by Cocoon host policy.`,
			);
		}
	};

	// Patch process.crash (Electron-specific, but good to handle if it ever appears)
	if (nativeProcessCrash) {
		(process as any).crash = (): void => {
			const errorMessage =
				"process.crash() was called but PREVENTED by Cocoon's host policy. The Cocoon process will continue running.";

			console.warn(
				`[Cocoon Bootstrap] ${errorMessage}\nCall stack for prevented crash:\n${new Error("Stack trace for prevented process.crash()").stack || "(Stack trace unavailable)"}`,
			);

			// The goal is to prevent the crash. A warning is usually sufficient.
			// If `process.crash` were typed as `() => never`, we might need to throw.
			// Assuming it's `() => void` (or can be treated as such for prevention).
		};

		console.log("[Cocoon Bootstrap] Patched process.crash().");
	} else {
		console.log(
			"[Cocoon Bootstrap] process.crash() not found on global process object, skipping patch (this is normal for pure Node.js).",
		);
	}

	// Set ELECTRON_RUN_AS_NODE environment variable.
	// This is a common practice in VS Code's extension host and can influence
	// how some Node modules or child processes behave, making them assume a
	// more standard Node.js environment.
	try {
		process.env["ELECTRON_RUN_AS_NODE"] = "1";
	} catch (envError: any) {
		// process.env might not be writable in some very restricted environments, though unlikely for Node.js.
		console.error(
			"[Cocoon Bootstrap] Failed to set ELECTRON_RUN_AS_NODE environment variable:",

			envError.message,
		);
	}

	console.log(
		"[Cocoon Bootstrap] Global 'process' object patched and environment configured.",
	);

	// Note on `process.on('uncaughtException')`:
	// The original Cocoon design correctly omits patching 'uncaughtException' here,

	// as `index.ts` sets up VS Code's `ErrorHandler` for comprehensive error management
	// in the fully initialized environment. This remains the recommended approach.
	// Patching it here might interfere with that more sophisticated handler.
}

console.log(
	"[Cocoon Bootstrap] Bootstrap utilities loaded and self-executed patches (like the 'natives' block) have been applied.",
);
