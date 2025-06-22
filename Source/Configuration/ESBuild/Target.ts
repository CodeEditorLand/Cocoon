/*
 * File: Cocoon/Source/Configuration/ESBuild/Target.ts
 *
 * This file defines the ESBuild configuration for building the main Cocoon application.
 * It merges a base configuration with specific overrides for bundling the application,
 * injecting build-time constants, and handling module resolution for the ESM interceptor.
 */

import { deepmerge } from "deepmerge-ts";
import type { BuildOptions } from "esbuild";

import BaseConfiguration, { On } from "./Wind.js";

// This is the static contract name for the global function used by the ESM interceptor.
// Hard-coding it here decouples the build configuration from the compiled source code,
// making the build process more robust and avoiding circular dependencies.
const ESM_INTERCEPTOR_GLOBAL_API_FN_NAME = "_COCOON_RESOLVE_ESM_VSCODE_API";

/**
 * ESBuild configuration module for the main application target.
 *
 * @param Current - The current BuildOptions, potentially passed from a preceding build step.
 * @returns A Promise resolving to the configured BuildOptions for esbuild.
 */
export default async (Current: BuildOptions): Promise<BuildOptions> => {
	const EntryPoints = (
		await import("@playform/build/Target/Function/Entry.js")
	).default as (
		current: BuildOptions,
		patterns: string[],
	) => string[] | Record<string, string>;

	return deepmerge<[BuildOptions, BuildOptions]>(BaseConfiguration, {
		outdir: "Target",
		drop: On ? [] : ["debugger", "console"],
		define: {
			__DEV__: On ? "true" : "false",
			__INCREMENT__: `"${`${On ? "DEVELOPMENT" : "PRODUCTION"}-${(await import("ulid")).ulid()}`}"`,
			// Inject the static function name into the ESM loader template.
			// `JSON.stringify` ensures it's inserted as a valid string literal.
			ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME: JSON.stringify(
				ESM_INTERCEPTOR_GLOBAL_API_FN_NAME,
			),
		},
		loader: {
			".template.ts": "text",
			".template.js": "text",
		},
		treeShaking: true,
		entryPoints: EntryPoints(Current, ["Source/**/*.ts"]),
		platform: "node",
		format: "esm",
		bundle: false,
		outbase: "Source",
		tsconfig: "tsconfig.json",
	});
};
