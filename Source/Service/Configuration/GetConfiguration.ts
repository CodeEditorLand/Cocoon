/**
 * @module GetConfiguration
 * @description Defines an `Effect`-based wrapper for retrieving a VS Code
 * workspace configuration section.
 */

import { Effect } from "effect";
import type * as Vscode from "vscode";

/**
 * An `Effect` that retrieves a workspace configuration object for a specific
 * section.
 *
 * This function wraps the synchronous `vscode.workspace.getConfiguration` API
 * call in an `Effect`, making configuration access a declarative and composable
 * part of the application's workflow.
 *
 * @param Section The configuration section to retrieve. If undefined, the root
 *   configuration object is returned.
 * @param Scope An optional `vscode.ConfigurationScope` for which to retrieve
 *   the configuration.
 * @returns An `Effect` that synchronously resolves to the
 *   `vscode.WorkspaceConfiguration`.
 */
export const GetConfiguration = (
	Section?: string,
	Scope?: Vscode.ConfigurationScope | null,
): Effect.Effect<Vscode.WorkspaceConfiguration> =>
	Effect.sync(() => Vscode.workspace.getConfiguration(Section, Scope));
