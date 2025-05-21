/*---------------------------------------------------------------------------------------------
 * Cocoon Bootstrap Utilities (cocoon-bootstrap.ts)
 * --------------------------------------------------------------------------------------------
 * Contains utility functions adapted from VS Code's Node.js bootstrap process, primarily
 * for patching the global `process` object to prevent extensions from exiting or crashing
 * the host unintentionally, and potentially setting environment variables expected by
 * VS Code platform code.
 *
 * NOTE: This file is NOT the main entry point for Cocoon; `index.ts` is.
 * This file only provides helper functions imported by `index.ts`.
 *
 * Responsibilities:
 * - Patching `process.exit` to prevent direct calls by extensions (logs warning instead).
 * - Patching `process.crash` (if exists) similarly.
 * - Setting environment variables expected by VS Code code (e.g., `ELECTRON_RUN_AS_NODE`).
 * - Blocking the deprecated 'natives' module.
 *
 * Key Interactions:
 * - Imported and used by `Cocoon/index.ts` early in its execution.
 * - Modifies the global Node.js `process` object.
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon Bootstrap] Loading utilities...");

// --- Block deprecated 'natives' module ---
// With Electron 2.x and node.js 8.x the "natives" module
// can cause a native crash. To prevent this, we blocklist this module.
// Refs: https://github.com/nodejs/node/issues/19891
// Refs: https://github.com/electron/electron/issues/10905
(() => {
	try {
		const Module = require("node:module"); // Use commonjs require for patching global Module

		// Check if Module and _load exist (they should in a Node.js environment)
		if (Module && typeof Module._load === "function") {
			const originalLoad = Module._load;

			Module._load = function (
				request: string,
				parent: any,
				isMain: boolean,
			): any {
				// Added types for _load
				if (request === "natives") {
					console.warn(
						"[Cocoon Bootstrap] An extension or dependency attempted to load the deprecated 'natives' module. Blocking.",
					);

					throw new Error(
						'Using the "natives" node module is deprecated and unsupported. See https://go.microsoft.com/fwlink/?linkid=871887.',
					);
				}

				// Use original arguments, not spreading `arguments` which is not standard in TS arrow functions or strict mode.
				return originalLoad.call(this, request, parent, isMain);
			};

			console.log(
				"[Cocoon Bootstrap] Patched require to block 'natives' module.",
			);
		} else {
			console.warn(
				"[Cocoon Bootstrap] Could not patch 'natives' module: Module._load not found.",
			);
		}
	} catch (error: any) {
		console.error(
			"[Cocoon Bootstrap] Failed to patch require for 'natives' module:",
			error,
		);
	}
})();

// Store original process functions before patching
const nativeExit: (code?: number) => never = process.exit.bind(process);

// process.crash is Electron-specific and might not be present in NodeJS.Process by default
const nativeCrash: (() => void) | undefined = (process as any).crash?.bind(
	process,
);

/**
 * Patches the global `process` object.
 * - `process.exit` is replaced to prevent extensions from terminating the host.
 *   It will only exit if `allowExitFn` returns true (useful for testing scenarios).
 * - `process.crash` (if it exists) is replaced similarly.
 * - Sets `ELECTRON_RUN_AS_NODE=1` environment variable for compatibility.
 *
 * @param allowExitFn A function that returns true if exiting is allowed, false otherwise.
 */
export function patchProcess(allowExitFn: () => boolean): void {
	// Patch process.exit
	process.exit = (code?: number): never => {
		// Match NodeJS.Process['exit'] signature
		if (allowExitFn()) {
			console.log(
				`[Cocoon Bootstrap] Exiting process with code ${code ?? ""} as allowed by host.`, // Handle undefined code
			);

			nativeExit(code);
		} else {
			const err = new Error(
				"An extension called process.exit() and this was prevented.",
			);

			console.warn(`[Cocoon Bootstrap] ${err.message}\n${err.stack}`);

			// In a non-exiting scenario, we need to decide what to do.
			// Throwing here might crash the host if not caught.
			// For now, it just warns and doesn't exit, effectively making process.exit a NOP.
			// To satisfy 'never', we'd theoretically need to throw or loop, but that's not the intent here.
			// This is a tricky type to satisfy perfectly when preventing exit.
			// A common workaround if you *must* satisfy `never` and don't exit is to throw.
			// However, for this specific patch, the goal is to *prevent* termination.
			// Let's assume the runtime won't strictly enforce 'never' if the function returns.
			// For practical purposes, we might need to cast or adjust if the compiler is too strict.
			// One way is to just not declare 'never' if we intend for it to be a NOP.
			// However, to match `process.exit`, `never` is correct if it *always* exits.
			// Since we *sometimes* don't, this is an impedance mismatch.
			// For the shim, logging and not exiting is the primary goal.
		}

		return undefined as never; // This satisfies 'never' for the compiler but is a lie at runtime if not exiting.
	};

	// Patch process.crash (Electron-specific)
	if (typeof nativeCrash === "function") {
		(process as any).crash = (): void => {
			// `process.crash` is not standard on NodeJS.Process
			const err = new Error(
				"An extension called process.crash() and this was prevented.",
			);

			console.warn(`[Cocoon Bootstrap] ${err.message}\n${err.stack}`);
		};

		console.log("[Cocoon Bootstrap] Patched process.crash()");
	} else {
		console.log(
			"[Cocoon Bootstrap] process.crash() not found, skipping patch.",
		);
	}

	// Set ELECTRON_RUN_AS_NODE environment variable
	process.env["ELECTRON_RUN_AS_NODE"] = "1";

	console.log(
		"[Cocoon Bootstrap] Patched process.exit() and set ELECTRON_RUN_AS_NODE=1.",
	);
}

// --- Exports ---
// module.exports = { patchProcess }; // Original JS export
// `export function patchProcess` handles this in TS.

console.log("[Cocoon Bootstrap] Utilities loaded.");
