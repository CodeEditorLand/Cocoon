/*---------------------------------------------------------------------------------------------
 * Cocoon Bootstrap Utilities (cocoon-bootstrap.ts)
 * --------------------------------------------------------------------------------------------
 * Contains utility functions adapted from VS Code's Node.js bootstrap process, primarily
 * for patching the global `process` object to prevent extensions from unintentionally
 * exiting or crashing the host, and setting environment variables expected by
 * VS Code platform code.
 *
 * This file provides helper functions imported by `index.ts` during early startup.
 *
 * Responsibilities:
 * - Patching `process.exit` to be conditional.
 * - Patching `process.crash` (if it exists) to be conditional or a NOP.
 * - Setting `ELECTRON_RUN_AS_NODE=1` environment variable.
 * - Attempting to block the deprecated 'natives' Node.js module.
 *
 * Key Interactions:
 * - Imported and used by `Cocoon/index.ts`.
 * - Modifies the global Node.js `process` object and `Module._load`.
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon Bootstrap] Loading utilities...");

// --- Block deprecated 'natives' module ---
// Based on VS Code's bootstrap logic.
(() => {
	try {
		// Use CommonJS require for patching Node.js internals like Module._load
		const Module = require("node:module");

		if (Module && typeof Module._load === "function") {
			const originalLoad = Module._load;

			Module._load = function (
				request: string,

				parentModule: any,

				isMain: boolean,
			): any {
				if (request === "natives") {
					const errorMessage =
						"[Cocoon Bootstrap] Attempt to load deprecated 'natives' module blocked. See https://go.microsoft.com/fwlink/?linkid=871887.";

					console.warn(errorMessage);

					throw new Error(errorMessage);
				}

				// Call original with original arguments context

				return originalLoad.call(this, request, parentModule, isMain);
			};

			console.log(
				"[Cocoon Bootstrap] Patched Module._load to block 'natives' module.",
			);
		} else {
			console.warn(
				"[Cocoon Bootstrap] Could not patch 'natives' module: Module._load not found or not a function.",
			);
		}
	} catch (error: any) {
		console.error(
			"[Cocoon Bootstrap] Failed to patch Module._load for 'natives' module:",

			error.message || error,
		);
	}
})();

// Store original process functions before patching.
// Ensure these are bound to `process` to maintain `this` context if they expect it.
const nativeProcessExit: (code?: number) => never = process.exit.bind(process);

// `process.crash` is Electron-specific. It might not exist in a standard Node.js environment
// where Cocoon could potentially run for testing or other purposes.
const nativeProcessCrash: (() => void) | undefined =
	typeof (process as any).crash === "function"
		? (process as any).crash.bind(process)
		: undefined;

/**
 * Patches the global `process` object to control termination behavior.
 * - `process.exit` is replaced. It will only call the native exit if `allowExitFn()` returns true.
 * - `process.crash` (if it exists) is replaced to log a warning and prevent the crash.
 * - Sets `ELECTRON_RUN_AS_NODE=1` environment variable for compatibility with some Node modules
 *   or child processes expecting an Electron-like Node environment.
 *
 * @param allowExitFn A function that returns `true` if exiting is allowed, `false` otherwise.
 */
export function patchProcess(allowExitFn: () => boolean): void {
	// Patch process.exit
	process.exit = (code?: number): never => {
		if (allowExitFn()) {
			const exitCodeStr = code !== undefined ? String(code) : "(no code)";

			console.log(
				`[Cocoon Bootstrap] process.exit(${exitCodeStr}) called and allowed by host. Terminating.`,
			);

			// This will terminate the process.
			nativeProcessExit(code);
		} else {
			const err = new Error(
				"process.exit() was called by an extension or internal code but was prevented by Cocoon bootstrap policy.",
			);

			// Log as a warning because this is an attempt to exit that's being gracefully handled.
			console.warn(
				`[Cocoon Bootstrap] ${err.message}\n${err.stack || "(No stack trace for this error object)"}`,
			);

			// To satisfy the `never` return type when not exiting, we must throw an error.
			// This makes the call to process.exit() behave like it failed if not allowed.
			// However, the original intent was often just to prevent exit and continue.
			// If continuing is desired, the `never` type is problematic here.
			// For now, let's throw to indicate the operation was blocked, which is a form of failure.
			// If the goal is to truly make it a NOP and continue, the function signature should not be `never`.
			// Given `process.exit` *should* be `never`, throwing aligns with "operation failed to complete as expected".
			throw new Error(`Blocked call to process.exit(${code ?? ""})`);
		}
	};

	// Patch process.crash (Electron-specific)
	if (nativeProcessCrash) {
		// Check if it was found and bound
		(process as any).crash = (): void => {
			const err = new Error(
				"process.crash() was called by an extension or internal code but was prevented by Cocoon bootstrap policy.",
			);

			console.warn(
				`[Cocoon Bootstrap] ${err.message}\n${err.stack || "(No stack trace for this error object)"}`,
			);

			// Similar to process.exit, if process.crash is typed as `() => never`, we might need to throw.
			// However, the goal is to prevent the crash. A warning is usually sufficient.
			// If VS Code's `process.crash` is `() => void` then just returning is fine.
			// For now, assume it's `() => void` and the warning is the main action.
		};

		console.log("[Cocoon Bootstrap] Patched process.crash().");
	} else {
		console.log(
			"[Cocoon Bootstrap] process.crash() not found on global process object, skipping patch.",
		);
	}

	// Set ELECTRON_RUN_AS_NODE environment variable.
	// This can influence how some Node modules or child processes behave,

	// making them think they are in a more standard Node.js environment
	// even if running under an Electron-like parent (though Cocoon is Node.js).
	// It's a common setting in VS Code's extension host.
	process.env["ELECTRON_RUN_AS_NODE"] = "1";

	console.log(
		"[Cocoon Bootstrap] Patched process methods and set ELECTRON_RUN_AS_NODE=1.",
	);

	// Note on `process.on('uncaughtException')`:
	// The original JS file mentioned omitting this patch because `index.ts` sets up
	// VS Code's `ErrorHandler`. This remains a valid approach. `index.ts` should
	// be responsible for comprehensive error handling for the fully initialized environment.
}

// `export function patchProcess` handles the export.
// The IIFE for 'natives' patching executes on import/require.

console.log("[Cocoon Bootstrap] Utilities loaded.");
