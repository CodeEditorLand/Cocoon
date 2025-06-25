/*
 * File: Cocoon/Source/Configuration/ESBuild/Target/Compile.ts
 * Responsibility: Configures ESBuild options for the Compile target by merging base settings from the Target module with Compile-specific properties (bundle mode, output base, TypeScript config) to define the build process for the Land project.
 * Modified: 2025-06-09 00:59:16 UTC
 * Dependency: esbuild
 * Export: Bundle, Merge, On
 */

import type { BuildOptions } from "esbuild";

export const On = (await import("../Cocoon.js")).On;

export const Bundle = (await import("../Cocoon.js")).Bundle;

export const Merge = (await import("deepmerge-ts")).deepmergeCustom({
	mergeArrays: false,
});

/**
 * @module ESBuild
 *
 */
export default async (Current: BuildOptions): Promise<BuildOptions> =>
	Merge<[BuildOptions, BuildOptions]>(
		await (await import("../Target.js")).default(Current),

		{
			bundle: true,

			outbase: "Target",

			tsconfig: "Configuration/tsconfig/Target/Compile.json",

			plugins: [],

			allowOverwrite: true,
		},
	);
