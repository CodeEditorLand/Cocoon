/**
 * @module GetConfiguration
 * @description Defines an `Effect`-based wrapper for retrieving a VS Code
 * workspace configuration section. This is intended for use by other internal
 * services or commands within Cocoon, not for direct exposure to extensions.
 */

import { Effect } from "effect";
import type * as VSCode from "vscode";

import { Configuration } from "./Service.js";

/**
 * An `Effect` that retrieves a workspace configuration object for a specific
 * section by using the central `Configuration` service.
 *
 * @param Section The configuration section to retrieve.
 * @param Scope An optional `vscode.ConfigurationScope` for which to retrieve
 *   the configuration.
 * @returns An `Effect` that resolves to the `vscode.WorkSpaceConfiguration`.
 */
export function GetConfiguration(
	Section?: string,
	Scope?: VSCode.ConfigurationScope | null,
): Effect.Effect<
	VSCode.WorkspaceConfiguration,
	Error,
	Configuration.Interface
> {
	return Effect.flatMap(Configuration.Tag, (service) =>
		service.GetConfiguration(Section, Scope ?? undefined),
	);
}
