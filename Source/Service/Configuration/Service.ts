/*
 * File: Cocoon/Source/Service/Configuration/Service.ts
 * Role: Defines the Configuration service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for providing access to merged user and workspace settings.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect } from "effect";
import { deepmerge } from "deepmerge-ts";
import type {
	IConfigurationService,
	IConfigurationValue,
} from "vs/platform/configuration/common/configuration.js";
import { Emitter } from "vs/base/common/event.js";
import type { IntegrationConfigurationProblem } from "Source/Integration/Tauri/Configuration/Error.js"; // Assumed import
import type { IntegrationPathProblem } from "Source/Integration/Tauri/Path/Error.js"; // Assumed import
import { ReadRawFile } from "Source/Integration/Tauri/File/ReadRawFile.js"; // Assumed import
import { ParseJson } from "Source/Integration/Tauri/File/ParseJson.js"; // Assumed import
import { ResolveFinalDefaultPath } from "Source/Integration/Tauri/Path/Default.js"; // Assumed import
import { ResolveWorkspacePath } from "Source/Integration/Tauri/Path/Workspace.js"; // Assumed import
import type { Uri } from "Source/Platform/VSCode/Type.js";
import { ApplicationConfigurationProblem } from "./Error.js";

// --- Internal Logic (previously in Orchestrate/ResolveConfiguration.ts) ---
type ConfigurationProblem =
	| ApplicationConfigurationProblem
	| IntegrationPathProblem
	| IntegrationConfigurationProblem;

const ResolveConfigurationFile = (
	ConfigDirectoryEffect: Effect.Effect<Uri, IntegrationPathProblem>,
	FileName: string,
): Effect.Effect<object, IntegrationConfigurationProblem> =>
	Effect.flatMap(ConfigDirectoryEffect, (ConfigDirectory) =>
		ReadRawFile(joinPath(ConfigDirectory, FileName)).pipe(
			Effect.flatMap(ParseJson),
			Effect.catchAll(() => Effect.succeed({})),
		),
	);

const ResolveConfiguration = Effect.all(
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

const GetValueFromObject = (
	ConfigurationObject: object,
	Key: string,
): unknown => {
	if (
		typeof ConfigurationObject !== "object" ||
		ConfigurationObject === null
	) {
		return undefined;
	}
	return Key.split(".").reduce(
		(Current, Part) => (Current as any)?.[Part],
		ConfigurationObject,
	);
};

// --- Service Definition ---
export class Configuration extends Effect.Service<IConfigurationService>()(
	"vscode/ConfigurationService",
	{
		// The `effect` property defines how to construct the service.
		// This logic comes from your `Definition.ts` file.
		effect: Effect.gen(function* (Generator) {
			const ConfigurationData = yield* Generator(ResolveConfiguration);

			const Service: IConfigurationService = {
				_serviceBrand: undefined,

				getValue<T>(section?: string, _overrides?: any): T {
					if (!section) {
						return ConfigurationData as T;
					}
					return GetValueFromObject(ConfigurationData, section) as T;
				},

				updateValue: () => Promise.resolve(),

				inspect: <T>(
					key: string,
					_overrides?: any,
				): IConfigurationValue<T> => {
					const value = Service.getValue(key, _overrides);
					return {
						key,
						value,
						defaultValue: value,
						userValue: value,
						workspaceValue: value,
						workspaceFolderValue: value,
					};
				},

				keys: () => ({
					default: [],
					user: [],
					workspace: [],
					workspaceFolder: [],
				}),
				reloadConfiguration: () => Promise.resolve(),
				onDidChangeConfiguration: new Emitter<any>().event,
			};

			return Service;
		}),
	},
) {}
