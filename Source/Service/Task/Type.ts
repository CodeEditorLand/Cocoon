/*
 * File: Cocoon/Source/Service/Task/Type.ts
 * Role: Defines types used by the Task service.
 * Responsibilities:
 *   - Provide clear type definitions for internal data structures, like the
 *     `ProviderEntry`, which links a provider to its owning extension.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Task, TaskProvider } from "vscode";

/**
 * An entry in one of the provider registries, associating a provider with its
 * type identifier and the extension that registered it.
 */
export interface ProviderEntry<T extends Task> {
	readonly Type: string;
	readonly Provider: TaskProvider<T>;
	readonly Extension: IExtensionDescription;
}

// Re-exporting complex types from vscode for cleaner imports elsewhere.
export type {
	Task,
	TaskExecution,
	TaskFilter,
	TaskProvider,
	TaskStartEvent,
	TaskEndEvent,
	TaskProcessStartEvent,
	TaskProcessEndEvent,
} from "vscode";
