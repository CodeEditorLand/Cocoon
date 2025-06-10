/**
 * @module Service (Configuration)
 * @description Defines the interface and Context.Tag for the Configuration service.
 */

import { Context, Effect, Stream } from "effect";
import type { ConfigurationChangeEvent, ConfigurationScope } from "vscode";

import type { ConfigurationUpdateError } from "./Error.js";
import type { WorkspaceConfiguration } from "./Type.js";

export interface Interface {
	/**
	 * Retrieves a `WorkspaceConfiguration` object for a given section and scope.
	 */
	readonly GetConfiguration: (
		Section?: string,
		Scope?: ConfigurationScope,
	) => Effect.Effect<WorkspaceConfiguration, Error>;

	/**
	 * An event stream that fires when the effective configuration has changed.
	 */
	readonly OnDidChangeConfiguration: Stream.Stream<
		ConfigurationChangeEvent,
		never
	>;
}
