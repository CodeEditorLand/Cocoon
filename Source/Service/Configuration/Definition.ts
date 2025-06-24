/*
 * File: Cocoon/Source/Service/Configuration/Definition.ts
 * Role: Provides the live implementation of the IConfigurationService.
 * Responsibilities:
 *   - Implements a read-only version of the `IConfigurationService` interface.
 *   - Fetches its data on initialization by executing the `ResolveConfiguration` workflow.
 */

import { Effect } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type {
	IConfigurationService,
	IConfigurationValue,
} from "vs/platform/configuration/common/configuration.js";
import { ResolveConfiguration } from "./Orchestrate/ResolveConfiguration.js";

/**
 * A robust helper function to retrieve a nested property from a configuration object
 * using a dot-separated key string.
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
 * An `Effect` that builds the live, read-only implementation of the `Configuration` service.
 * It resolves the final configuration state upon initialization and provides methods
 * to access that state.
 */
const Definition = Effect.gen(function* (Generator) {
	// Fetch the fully merged configuration data from the integration layer on startup.
	const ConfigurationData = yield* Generator(ResolveConfiguration);

	const Service: IConfigurationService = {
		_serviceBrand: undefined,

		/**
		 * Gets a configuration value for a given section.
		 */
		getValue<T>(section?: string, _overrides?: any): T {
			if (!section) {
				return ConfigurationData as T;
			}
			return GetValueFromObject(ConfigurationData, section) as T;
		},

		// --- Stubs for read-write and complex inspection methods ---
		// A full implementation would require RPC calls to Mountain to modify settings.

		updateValue: () => Promise.resolve(),

		inspect: <T>(key: string, _overrides?: any): IConfigurationValue<T> => {
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
});

export default Definition;
