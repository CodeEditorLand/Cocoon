/**
 * @module Type (Configuration)
 * @description Defines types for the Configuration service, primarily an alias
 * for the `vscode.WorkspaceConfiguration` interface.
 */

import type { WorkspaceConfiguration } from "vscode";

/**
 * An alias for the `vscode.WorkspaceConfiguration` interface. This represents
 * a snapshot of configuration values for a specific section.
 */
export type WorkSpaceConfiguration = WorkspaceConfiguration;
