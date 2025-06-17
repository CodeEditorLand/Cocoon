/*
 * File: Cocoon/Source/Configuration/ESBuild/Target.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./../../cocoon-esm-interceptor.js, esbuild
 * Export: On
 */

// Purpose: ESBuild configuration for the project.
//
// Description:
// This module defines the ESBuild configuration for building the project.
// It uses 'deepmerge-ts' to merge a base configuration (from './Cocoon.js')
// with specific overrides and additions defined here.
//
// Key features configured:
// - Output directory, platform, format, and tree shaking.
// - Conditional 'drop' of console/debugger statements based on the 'On' flag.
// - `define` for build-time constants like __DEV__, __INCREMENT__, and crucially,

//   `ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME` for the Cocoon ESM Interceptor.
// - `loader` configuration to treat '.template.ts' and '.template.js' files as raw text,

//   which is essential for the Cocoon ESM Interceptor's dynamic module generation.
// - Entry points are dynamically determined.
// - Externalization of 'vscode' and 'vs/*' modules.
//
// Note on `bundle: false`:
// With `bundle: false`, esbuild processes files individually. This implies that
// inter-dependencies like the text template import in `dynamic.ts` might need
// specific handling if not inlined, or that output paths must align perfectly
// for runtime `fs.readFileSync` operations (like for the loader hook script).
//
//--------------------------------------------------------------------------------------------*/

import type { BuildOptions } from "esbuild";

// Import the global API function name constant from the compiled interceptor module.
// This ensures the build configuration uses the exact same string that the interceptor expects.
// Adjust path if your config file is located elsewhere relative to the compiled output.
// Assuming this config is in `build/` and interceptor output is `Target/src/cocoon-esm-interceptor.js` (based on outbase/outdir)
// or `Target/cocoon-esm-interceptor.js` if `src/` is flattened.
// The `../../cocoon-esm-interceptor.js` path suggests `cocoon-esm-interceptor.js` is
// at the root of your `Target` directory or similar structure.
// Path to the *compiled* interceptor
// import { COCOON_ESM_INTERCEPTOR_GLOBAL_API_FN_NAME } from "./../../cocoon-esm-interceptor.js";

// Import project-specific build utilities and constants.
// The '.js' extension implies these are already compiled or are JavaScript modules.
// Build mode flag (e.g., development/production)
export const On = (await import("./Cocoon.js")).On;

/**
 * ESBuild configuration module.
 *
 * @param Current - The current BuildOption, potentially passed from a preceding build step or CLI.
 * @returns A Promise resolving to the configured BuildOption for esbuild.
 */
export default async (Current: BuildOptions): Promise<BuildOptions> => {
	// Asynchronously import dependencies for the configuration logic.
	const [deepmergeMod, cocoonMod, ulidMod, playformBuildEntryMod] =
		await Promise.all([
			import("deepmerge-ts"),

			// Base esbuild configuration
			import("./Cocoon.js"),

			// For generating unique IDs
			import("ulid"),

			// Utility for determining entry points
			import("@playform/build/Target/Function/Entry.js"),
		]);

	// Destructure imported modules for convenience.
	const { deepmerge } = deepmergeMod;

	// Base configuration
	const CocoonDefaultConfig = cocoonMod.default as BuildOptions;

	const { ulid } = ulidMod;

	const getEntryPoints = playformBuildEntryMod.default as (
		current: BuildOptions,

		patterns: string[],

		// Type assertion for clarity
	) => string[] | Record<string, string>;

	// Merge the base configuration with specific overrides and additions.
	return deepmerge<[BuildOptions, BuildOptions]>(CocoonDefaultConfig, {
		// Specifies the output directory for compiled files.
		outdir: "Target",

		// Conditionally remove debugger statements and console logs for production builds.
		drop: On ? [] : ["debugger", "console"],

		// Defines global constants to be replaced in the code at build time.
		define: {
			// Development mode flag
			__DEV__: On ? "true" : "false",

			// Unique build increment identifier
			__INCREMENT__: `"${`${On ? "DEVELOPMENT" : "PRODUCTION"}-${ulid()}`}"`,

			// Critical for the Cocoon ESM Interceptor:
			// Replaces `ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME` in template files
			// with the actual string value of the global function name.
			// `JSON.stringify` ensures it's inserted as a valid string literal.
			ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME: JSON.stringify(
				// COCOON_ESM_INTERCEPTOR_GLOBAL_API_FN_NAME,
				`_COCOON_RESOLVE_ESM_VSCODE_API`,
			),
		},

		// Configures how esbuild should load files with specific extensions.
		loader: {
			// Treat '.template.ts' and '.template.js' files as raw text.
			// This is used by `dynamic.ts` to import the content of template files.
			".template.ts": "text",

			// If you also have .js templates
			".template.js": "text",
		},

		// Enables dead code elimination.
		treeShaking: true,

		// Defines the entry points for the build.
		// Includes project-specific configuration and Cocoon ESM Interceptor source files.
		entryPoints: getEntryPoints(Current, [
			// Project-specific entry points
			"Source/Configuration/*",

			// Source files for the Cocoon ESM Interceptor.
			// Esbuild will process these according to the overall configuration.
			// Ensure these paths are correct relative to your project root or esbuild's CWD.
			"src/cocoon-esm-interceptor.ts",

			// Renamed from cocoon-esm-loader-hook.ts
			"src/cocoon-esm-interceptor/hook.ts",

			// Renamed from dynamic-vscode-module-generator.ts
			"src/cocoon-esm-interceptor/dynamic.ts",
		]),

		// Target platform is Node.js (important for the interceptor).
		platform: "node",

		// Output format is ECMAScript Modules.
		format: "esm",

		// `bundle: false` means esbuild processes each entry point into a separate output file
		// without inlining dependencies from other files (unless they are from node_modules
		// and not externalized, and platform allows).
		// This has implications for how `_loadLoaderHookScriptContent` works (requires separate file)
		// and how the text loader handles imports of templates (might not inline if not bundling).
		bundle: false,

		// `outbase: "."` means output paths are relative to the project root into `outdir`.
		// e.g., `src/file.ts` -> `Target/src/file.js`.
		// This should work with `_loadLoaderHookScriptContent` if the relative path
		// in `_LOADER_HOOK_SCRIPT_FILENAME` is correct for the output structure.
		outbase: "Source",

		// Path to the tsconfig file for this build.
		tsconfig: "tsconfig.Target.json",

		// Specifies modules that should not be bundled and treated as external dependencies.
		// external: [
		// 	// Preserve any existing externals from Current.
		// 	...(Current.external || []),

		// 	// The 'vscode' module is always provided by the host environment.
		// 	"vscode",

		// 	// Common pattern for VS Code internal modules.
		// 	"vs/*",
		// ],
	});
};
