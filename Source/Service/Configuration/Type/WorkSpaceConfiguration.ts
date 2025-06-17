/*
 * File: Cocoon/Source/Service/Configuration/Type/WorkSpaceConfiguration.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:42 UTC
 * Dependency: vscode
 */

/**
 * @module WorkSpaceConfiguration (Configuration/Type)
 * @description Defines types for the Configuration service, primarily an alias
 * for the `vscode.WorkspaceConfiguration` interface.
 */

import type { WorkspaceConfiguration } from "vscode";

/**
 * An alias for the `vscode.WorkspaceConfiguration` interface. This represents
 * a snapshot of configuration values for a specific section.
 */
type WorkSpaceConfiguration = WorkspaceConfiguration;
export default WorkSpaceConfiguration;
