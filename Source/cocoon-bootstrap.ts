/*---------------------------------------------------------------------------------------------
 * Cocoon Bootstrap Utilities (cocoon-bootstrap.ts)
 * --------------------------------------------------------------------------------------------
 * Provides essential utilities executed early in the Cocoon sidecar's startup process.
 * Its primary functions are to patch global Node.js `process` object behaviors
 * to prevent unintentional exits or crashes initiated by extensions, and to set up
 * environment configurations expected by VS Code platform code or extensions.
 *
 * Responsibilities:
 * - Patching `process.exit` to be conditional, controlled by a host-provided function.
 * - Patching `process.crash` (if it exists on the `process` object, typically in Electron-like
 *   environments, though less relevant for a pure Node.js sidecar) to log a warning
 *   and prevent the crash.
 * - Setting the `ELECTRON_RUN_AS_NODE=1` environment variable, a common practice in
 *   VS Code extension hosts to influence module behavior.
 * - Attempting to block the loading of the deprecated 'natives' Node.js module by
 *   patching `Module._load`.
 *
 * Key Interactions:
 * - Imported and executed by `Cocoon/index.ts` during its early initialization phase.
 * - Modifies the global Node.js `process` object.
 * - Modifies `Module._load` (a Node.js internal).
 *

 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon Bootstrap] Initializing bootstrap utilities...");

// --- Block deprecated 'natives' module ---
// This IIFE attempts to patch Node.js's internal module loading mechanism
// to prevent extensions from loading the deprecated 'natives' module.
// Based on VS Code's bootstrap logic.
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
// Bind them to `process` to maintain their original `this` context.
const nativeProcessExit: (code?: number) => never = process.exit.bind(process);

// `process.crash` is typically Electron-specific. It might not exist in a standard
// Node.js environment where Cocoon primarily runs.
const nativeProcessCrash: (() => void) | undefined =
	typeof (process as any).crash === "function"
		? (process as any).crash.bind(process)
		: undefined;

/**
 * Patches the global `process` object to control termination and environment settings.
 * - `process.exit`: Replaced to make termination conditional based on `allowExitFn`.
 * - `process.crash`: If present, replaced to log a warning and prevent the crash.
 * - `ELECTRON_RUN_AS_NODE`: Environment variable set to '1'.
 *
 * This function should be called very early in the application lifecycle.
 *
 * @param allowExitFn A synchronous function that returns `true` if the host allows the
 *                    Cocoon process to exit, `false` otherwise. This function is
 *                    called when `process.exit()` is invoked.
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
				`[Cocoon Bootstrap] ${errorMessage}\nCall stack:\n${new Error("Stack trace for prevented process.exit()").stack || "(No stack trace for this error object)"}`,
			);

			// To satisfy the `never` return type when not exiting, we must throw an error.
			// This makes the call to process.exit() behave like it failed if not allowed.
			// The primary goal is to prevent the exit and log the attempt.
			throw new Error(
				`Blocked call to process.exit(${code ?? ""}) by Cocoon host policy.`,
			);
		}
	};

	// Patch process.crash (Electron-specific, but good to handle if present)
	if (nativeProcessCrash) {
		(process as any).crash = (): void => {
			const errorMessage =
				"process.crash() was called but PREVENTED by Cocoon's host policy. The Cocoon process will continue running.";

			console.warn(
				`[Cocoon Bootstrap] ${errorMessage}\nCall stack:\n${new Error("Stack trace for prevented process.crash()").stack || "(No stack trace for this error object)"}`,
			);

			// The goal is to prevent the crash. A warning is usually sufficient.
			// If `process.crash` were typed as `() => never`, we might need to throw.
			// Assuming it's `() => void` (or can be treated as such for prevention).
		};

		console.log("[Cocoon Bootstrap] Patched process.crash().");
	} else {
		console.log(
			"[Cocoon Bootstrap] process.crash() not found on global process object, skipping patch.",
		);
	}

	// Set ELECTRON_RUN_AS_NODE environment variable.
	// This is a common practice in VS Code's extension host and can influence
	// how some Node modules or child processes behave, making them assume a
	// more standard Node.js environment.
	try {
		process.env["ELECTRON_RUN_AS_NODE"] = "1";
	} catch (envError: any) {
		// process.env might not be writable in some very restricted environments.
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
}

console.log(
	"[Cocoon Bootstrap] Bootstrap utilities loaded and self-executed patches (like 'natives' block) applied.",
);
