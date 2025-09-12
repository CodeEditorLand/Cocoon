/**
 * @module ApplicationConfiguration
 * @description Defines the service for providing access to merged user, workspace,
 * and application-default settings. It implements the `IConfigurationService`
 * contract from VS Code for high fidelity.
 */

import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import { joinPath } from "@codeeditorland/output/vs/base/common/resources.js";
import type {
	IConfigurationOverrides,
	IConfigurationService,
	IConfigurationValue,
} from "@codeeditorland/output/vs/platform/configuration/common/configuration.js";
import { deepmerge } from "deepmerge-ts";
import { Effect } from "effect";
import type { Uri } from "vscode";

import { ApplicationConfigurationProblem } from "./ApplicationConfiguration/ApplicationConfigurationProblem.js";
import type { IntegrationConfigurationProblem } from "./Integration/Tauri/Configuration/Problem.js";
import { ParseJSON } from "./Integration/Tauri/File/ParseJSON.js";
import { ReadRawFile } from "./Integration/Tauri/File/ReadRawFile.js";
import { ResolveFinalDefaultPath } from "./Integration/Tauri/Path/Default.js";
import type { IntegrationPathProblem } from "./Integration/Tauri/Path/Problem.js";
import { ResolveWorkSpacePath } from "./Integration/Tauri/Path/WorkSpace.js";

const ResolveConfigurationFile = (
	ConfigDirectoryEffect: Effect.Effect<Uri, IntegrationPathProblem>,
	FileName: string,
): Effect.Effect<
	object,
	IntegrationConfigurationProblem | IntegrationPathProblem
> =>
	Effect.flatMap(ConfigDirectoryEffect, (ConfigDirectory) =>
		ReadRawFile(
			ConfigDirectory.with({
				path: joinPath(ConfigDirectory, FileName).path,
			}),
		).pipe(
			Effect.flatMap(ParseJSON),
			Effect.catchAll(() => Effect.succeed({})),
		),
	).pipe(
		Effect.mapError(
			(e) =>
				e as unknown as
					| IntegrationConfigurationProblem
					| IntegrationPathProblem,
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
 * @class ApplicationConfigurationService
 * @description The `Effect.Service` for the ApplicationConfiguration service. It resolves the
 * complete configuration on initialization and provides methods to access the merged
 * settings.
 */
export class ApplicationConfigurationService extends Effect.Service<IConfigurationService>()(
	"vscode/ApplicationConfigurationService",
	{
		effect: Effect.gen(function* () {
			const ConfigurationData = yield* ResolveConfiguration;

			const Service: IConfigurationService = {
				_serviceBrand: undefined,

				getValue<T>(
					section?: string | IConfigurationOverrides,
					_overrides?: IConfigurationOverrides,
				): T {
					const Key =
						typeof section === "string" ? section : undefined;
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
					const value = Service.getValue(key, _overrides) as
						| T
						| undefined;
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
