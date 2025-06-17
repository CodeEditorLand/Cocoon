/*
 * File: Cocoon/Source/Core/ESMInterceptor/Constants.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:44 UTC
 * Export: ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME, LOADER_HOOK_SCRIPT_FILENAME
 */

/**
 * @module Constants (ESMInterceptor)
 * @description Defines constants used by the ESM interception mechanism.
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
 */
export const ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME =
	"_COCOON_RESOLVE_ESM_VSCODE_API";
