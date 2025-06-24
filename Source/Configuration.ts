/**
 * @module Configuration
 * @description Defines the service for providing access to merged user, workspace,
 * and application-default settings. It implements the `IConfigurationService`
 * contract from VS Code for high fidelity.
 */

import { Effect } from "effect";
import { deepmerge } from "deepmerge-ts";
import type {
	IConfigurationService,
	IConfigurationValue,
} from "vs/platform/configuration/common/configuration.js";
import { Emitter } from "vs/base/common/event.js";
import type { Uri } from "./Platform/Vscode/Type.js";
import { ApplicationConfigurationProblem } from "./Configuration/ApplicationConfigurationProblem.js";

// --- NOTE: Integration-level imports are placeholders as the source was not provided. ---
// In a real implementation, these would point to the refactored integration layer.
import type { IntegrationConfigurationProblem } from "./Integration/Tauri/Configuration/Error.js";
import type { IntegrationPathProblem } from "./Integration/Tauri/Path/Error.js";
import { ReadRawFile } from "./Integration/Tauri/File/ReadRawFile.js";
import { ParseJson } from "./Integration/Tauri/File/ParseJson.js";
import { ResolveFinalDefaultPath } from "./Integration/Tauri/Path/Default.js";
import { ResolveWorkSpacePath } from "./Integration/Tauri/Path/WorkSpace.js";
import { joinPath } from "vs/base/common/resources.js";

/**
 * @description An internal helper Effect to resolve a specific configuration file
 * (e.g., 'settings.json') from a given base directory `Effect`. It gracefully
 * handles file reading and JSON parsing errors by returning an empty object.
 * @param ConfigDirectoryEffect - An `Effect` that resolves to the base directory `Uri`.
 * @param FileName - The name of the configuration file to resolve.
 * @returns An `Effect` resolving to the parsed configuration object or `{}`.
 */
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

/**
 * @description An internal helper Effect that orchestrates the finding, loading,
 * and merging of all relevant configuration files into a single settings object.
 */
const ResolveConfiguration = Effect.all(
	{
		User: ResolveConfigurationFile(
			ResolveFinalDefaultPath(),
			"settings.json",
		),
		WorkSpace: ResolveConfigurationFile(
			ResolveWorkSpacePath(),
			"settings.json",
		),
	},
	{ concurrency: "unbounded" },
).pipe(
	Effect.map(({ User, WorkSpace }) => deepmerge(User, WorkSpace)),
	Effect.mapError(
		(Cause) =>
			new ApplicationConfigurationProblem({
				Cause: Cause as IntegrationConfigurationProblem,
				Context: "FailedToResolveConfiguration",
			}),
	),
);

/**
 * @description An internal helper function to retrieve a nested property from an
 * object using a dot-separated key string.
 * @param ConfigurationObject - The root configuration object to search within.
 * @param Key - The dot-separated key (e.g., 'workbench.editor.fontSize').
 * @returns The value if found, otherwise `undefined`.
 */
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

/**
 * @class Configuration
 * @description The `Effect.Service` for the Configuration service. It resolves the
 * complete configuration on initialization and provides methods to access the merged
 * settings.
 */
export class Configuration extends Effect.Service<IConfigurationService>()(
	"vscode/ConfigurationService",
	{
		effect: Effect.gen(function* () {
			const ConfigurationData = yield* ResolveConfiguration;

			// This is a read-only implementation of the VS Code IConfigurationService.
			const Service: IConfigurationService = {
				_serviceBrand: undefined,

				getValue<T>(section?: string, _overrides?: any): T {
					if (!section) {
						return ConfigurationData as T;
					}
					return GetValueFromObject(ConfigurationData, section) as T;
				},

				// Stubs for write/inspection methods as they require host communication.
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
