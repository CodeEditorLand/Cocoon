/*
 * File: Cocoon/Source/Core/ESMInterceptor/Constants.ts
 *
 * This file defines constants used by the ESM interception mechanism.
 */

/**
 * The filename of the standalone script that implements the loader hook logic.
 * This file is loaded by Node.js in a separate "loader thread".
 */
export const LOADER_HOOK_SCRIPT_FILENAME = "Hook.js";

/**
 * The name of the function exposed on the `globalThis` object.
 * The dynamically generated `vscode` module will call this function to retrieve
 * its specific, sandboxed API instance.
 *
 * NOTE: This is intentionally in `UPPER_SNAKE_CASE` as it represents a
 * global, build-time constant, which is a common convention for such values.
 * It is a contract between the build system (which injects this name) and the
 * runtime (which defines the global function).
 */
export const ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME =
	"_COCOON_RESOLVE_ESM_VSCODE_API";
