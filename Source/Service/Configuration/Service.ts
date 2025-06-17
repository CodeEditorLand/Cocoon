/*
 * File: Cocoon/Source/Service/Configuration/Service.ts
 * Responsibility: Defines the ConfigurationService interface for managing workspace and user settings within the Cocoon sidecar, providing type-safe access to configuration values and change events using the Effect framework.
 * Modified: 2025-06-17 10:32:42 UTC
 * Dependency: ./Type/WorkSpaceConfiguration.js, effect
 * Export: ConfigurationService
 */

/**
 * @module Service (Configuration)
 * @description Defines the interface and Context.Tag for the Configuration service.
 * This service manages access to all workspace and user settings.
 */

import { Context, type Effect } from "effect";
import type {
	ConfigurationChangeEvent,
	ConfigurationScope,
	Event,
} from "vscode";

import type WorkSpaceConfiguration from "./Type/WorkSpaceConfiguration.js";

export default class ConfigurationService extends Context.Tag(
	"Service/Configuration",
)<
	ConfigurationService,
	{
		/**
		 * Retrieves a `WorkSpaceConfiguration` object for a given section and scope.
		 * @param Section The configuration section to retrieve (e.g., 'files.autoSave').
		 * @param Scope A resource URI or other scope for which to get the configuration.
		 * @returns An `Effect` that resolves with the configuration object.
		 */
		readonly GetConfiguration: (
			Section?: string,
			Scope?: ConfigurationScope,
		) => Effect.Effect<WorkSpaceConfiguration, Error>;

		/**
		 * An event that is fired when the configuration has changed.
		 */
		readonly onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
	}
>() {}
