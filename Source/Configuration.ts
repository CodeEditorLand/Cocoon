--- START OF FILE Configuration.ts ---

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
	IConfigurationOverrides,
} from "vs/platform/configuration/common/configuration.js";
import { Emitter } from "vs/base/common/event.js";
import { URI, type URI as VSCodeURI } from "./Platform/VSCode/Type.js";
import { ApplicationConfigurationProblem } from "./Configuration/ApplicationConfigurationProblem.js";
import type { IntegrationConfigurationProblem } from "./Integration/Tauri/Configuration/Error.js";
import type { IntegrationPathProblem } from "./Integration/Tauri/Path/Error.js";
import { ReadRawFile } from "./Integration/Tauri/File/ReadRawFile.js";
import { ParseJson } from "./Integration/Tauri/File/ParseJson.js";
import { ResolveFinalDefaultPath } from "./Integration/Tauri/Path/Default.js";
import { ResolveWorkSpacePath } from "./Integration/Tauri/Path/WorkSpace.js";
import { joinPath } from "vs/base/common/resources.js";

const ResolveConfigurationFile = (
	ConfigDirectoryEffect: Effect.Effect<VSCodeURI, IntegrationPathProblem>,
	FileName: string,
): Effect.Effect<object, IntegrationConfigurationProblem | IntegrationPathProblem> =>
	Effect.flatMap(ConfigDirectoryEffect, (ConfigDirectory) =>
		ReadRawFile(ConfigDirectory.with({ path: joinPath(ConfigDirectory, FileName).path })).pipe(
			Effect.flatMap(ParseJson),
			Effect.catchAll(() => Effect.succeed({})),
		),
	).pipe(
		Effect.mapError(
			(e) => e as unknown as (IntegrationConfigurationProblem | IntegrationPathProblem),
		),
	);

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
 * @class ConfigurationService
 * @description The `Effect.Service` for the Configuration service. It resolves the
 * complete configuration on initialization and provides methods to access the merged
 * settings.
 */
export class ConfigurationService extends Effect.Service<IConfigurationService>()(
	"vscode/ConfigurationService",
	{
		effect: Effect.gen(function* () {
			const ConfigurationData = yield* ResolveConfiguration;

			const Service: IConfigurationService = {
				_serviceBrand: undefined,

				getValue<T>(
					section?: string | IConfigurationOverrides,
					_overrides?: IConfigurationOverrides,
				): T {
					const Key = typeof section === "string" ? section : undefined;
					if (!Key) {
						return ConfigurationData as T;
					}
					return GetValueFromObject(ConfigurationData, Key) as T;
				},
				updateValue: () => Promise.resolve(),
				inspect: <T>(
					key: string,
					_overrides?: any,
				): IConfigurationValue<T> => {
					const value = Service.getValue(key, _overrides) as T | undefined;
					return {
						key: key,
						value,
						defaultValue: value,
						userValue: value,
						workspaceValue: value,
						workspaceFolderValue: value,
					} as IConfigurationValue<T>;
				},
				keys: () => ({
					default: [],
					user: [],
					workspace: [],
					workspaceFolder: [],
				}),
				reloadConfiguration: () => Promise.resolve(),
				onDidChangeConfiguration: new Emitter<any>().event,
			} as unknown as IConfigurationService;

			return Service;
		}),
	},
) {}
