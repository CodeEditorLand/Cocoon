/**
 * @module Service (Configuration)
 * @description Defines the interface and Context.Tag for the Configuration service.
 */

import { Context, Effect, Stream } from "effect";
import type { ConfigurationChangeEvent, ConfigurationScope } from "vscode";

import type { ConfigurationUpdateError } from "./Error.js";
import type { WorkSpaceConfiguration } from "./Type.js";

export interface Interface {
	/**
	 * Retrieves a `WorkSpaceConfiguration` object for a given section and scope.
	 */
	readonly GetConfiguration: (
		Section?: string,
		Scope?: ConfigurationScope,
	) => Effect.Effect<WorkSpaceConfiguration, Error>;

	/**
	 * An event stream that fires when the effective configuration has changed.
	 */
	readonly OnDidChangeConfiguration: Stream.Stream<
		ConfigurationChangeEvent,
		never
	>;
}
