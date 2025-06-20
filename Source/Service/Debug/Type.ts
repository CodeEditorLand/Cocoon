

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Breakpoint,
	DebugAdapterDescriptorFactory,
	DebugAdapterTrackerFactory,
	DebugConfigurationProvider,
	DebugConsole,
	DebugSession,
} from "vscode";

/**
 * A union of all possible provider types the Debug service can manage.
 */
export type AnyProvider =
	| DebugConfigurationProvider
	| DebugAdapterDescriptorFactory
	| DebugAdapterTrackerFactory;

/**
 * An entry in one of the provider registries, associating a provider with its type and owning extension.
 */
export interface ProviderEntry {
	readonly Type: string;
	readonly Provider: AnyProvider;
	readonly Extension: IExtensionDescription;
}

/**
 * Represents the internal state managed by the Debug service.
 */
export interface Debugger {
	readonly ActiveDebugSession: DebugSession | undefined;
	readonly ActiveDebugConsole: DebugConsole;
	readonly Breakpoints: readonly Breakpoint[];
	readonly DebugConfigurationProviders: Map<number, ProviderEntry>;
	readonly DebugAdapterDescriptorFactories: Map<number, ProviderEntry>;
	readonly DebugAdapterTrackerFactories: Map<number, ProviderEntry>;
}
