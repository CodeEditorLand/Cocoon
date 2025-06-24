/*
 * File: Cocoon/Source/Service/Configuration/Orchestrate/ResolveConfiguration.ts
 * Role: Main Configuration Resolution Workflow
 * Responsibilities:
 *   - Defines a composed Effect for finding, loading, and merging all relevant
 *     configuration files (user, workspace, etc.) into a single settings object.
 *   - Orchestrates calls to lower-level integration services for path resolution
 *     and file I/O.
 */

import { deepmerge } from "deepmerge-ts";
import { Effect } from "effect";
import { joinPath } from "vs/base/common/resources.js";
import type { Uri } from "Source/Platform/VSCode/Type.js";
import { ApplicationConfigurationProblem } from "../Error.js";
// @ts-expect-error - Assuming these integration types and services exist
import type { IntegrationConfigurationProblem } from "Source/Integration/Tauri/Configuration/Error.js";
// @ts-expect-error
import type { IntegrationPathProblem } from "Source/Integration/Tauri/Path/Error.js";
// @ts-expect-error
import { ReadRawFile } from "Source/Integration/Tauri/File/ReadRawFile.js";
// @ts-expect-error
import { ParseJson } from "Source/Integration/Tauri/File/ParseJson.js";
// @ts-expect-error
import { ResolveFinalDefaultPath } from "Source/Integration/Tauri/Path/Default.js";
// @ts-expect-error
import { ResolveWorkspacePath } from "Source/Integration/Tauri/Path/Workspace.js";

type ConfigurationProblem =
	| ApplicationConfigurationProblem
	| IntegrationConfigurationProblem
	| IntegrationPathProblem;

/**
 * Creates an `Effect` that resolves a specific configuration file (e.g., 'settings.json')
 * from a given base directory `Effect`. It handles file reading and JSON parsing,
 * returning an empty object `{}` on any failure (e.g., file not found).
 * @param ConfigDirectoryEffect - An `Effect` that resolves to the base directory `Uri`.
 * @param FileName - The name of the configuration file to resolve.
 * @returns An `Effect` that resolves to the parsed configuration object or an empty object.
 */
const ResolveConfigurationFile = (
	ConfigDirectoryEffect: Effect.Effect<Uri, IntegrationPathProblem>,
	FileName: string,
): Effect.Effect<object, IntegrationConfigurationProblem> =>
	Effect.flatMap(ConfigDirectoryEffect, (ConfigDirectory) =>
		ReadRawFile(joinPath(ConfigDirectory, FileName)).pipe(
			Effect.flatMap(ParseJson),
			// If the file doesn't exist or is invalid, gracefully treat it as an empty object.
			Effect.catchAll(() => Effect.succeed({})),
		),
	);

/**
 * The main composed `Effect` to resolve the final, merged configuration object.
 *
 * It orchestrates the following steps:
 * 1. Concurrently resolve the paths for the user-global and workspace configuration files.
 * 2. Concurrently fetch and parse both files.
 * 3. Perform a deep merge of the two, with workspace settings overriding global settings.
 * 4. Wraps all potential errors from the integration layer in a domain-specific
 *    `ApplicationConfigurationProblem`.
 */
export const ResolveConfiguration = Effect.all(
	{
		User: ResolveConfigurationFile(
			ResolveFinalDefaultPath(),
			"settings.json",
		),
		Workspace: ResolveConfigurationFile(
			ResolveWorkspacePath(),
			"settings.json",
		),
	},
	{ concurrency: "unbounded" },
).pipe(
	Effect.map(({ User, Workspace }) => deepmerge(User, Workspace)),
	Effect.mapError(
		(Cause) =>
			new ApplicationConfigurationProblem({
				Cause: Cause as IntegrationConfigurationProblem,
				Context: "FailedToResolveConfiguration",
			}),
	),
);
