/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/Configuration
 * @description
 * Configuration read/write proxy for the workspace shim.
 *
 * VS Code's `WorkspaceConfiguration.get(key, default)` is synchronous, but our
 * backing store is a gRPC round-trip to Mountain. Bridge that mismatch with a
 * write-through cache:
 *   - First sync read misses, returns `DefaultValue`, fires background
 *     `Configuration.Inspect` to prime the cache.
 *   - Subsequent reads hit the cache and return the real value.
 *   - `update()` writes to Mountain AND the cache; triggers change event.
 *   - `onDidChangeConfiguration` listeners fire on every cache mutation.
 * A single cache is shared across all `getConfiguration(section)` calls
 * because extensions expect settings changes in one section to be visible
 * to another's listener.
 */

import type { HandlerContext } from "../../HandlerContext.js";
import { Call } from "./Helpers.js";

export type ConfigurationChangeEvent = {
	affectsConfiguration: (Key: string) => boolean;
};

export type ConfigurationState = {
	ConfigCache: Map<string, unknown>;
	ConfigInFlight: Set<string>;
	ConfigListeners: Set<(Event: ConfigurationChangeEvent) => void>;
	FireConfigChange: (ChangedKey: string) => void;
	PrimeConfig: (Key: string) => void;
};

export const CreateConfigurationState = (
	Context: HandlerContext,
): ConfigurationState => {
	const ConfigCache = new Map<string, unknown>();
	const ConfigInFlight = new Set<string>();
	const ConfigListeners = new Set<
		(Event: ConfigurationChangeEvent) => void
	>();

	const FireConfigChange = (ChangedKey: string): void => {
		if (ConfigListeners.size === 0) return;
		const Event = {
			affectsConfiguration: (QueryKey: string): boolean =>
				ChangedKey === QueryKey ||
				ChangedKey.startsWith(`${QueryKey}.`),
		};
		for (const Listener of ConfigListeners) {
			try {
				Listener(Event);
			} catch {
				// Never let a bad listener abort the fan-out.
			}
		}
	};

	const PrimeConfig = (Key: string): void => {
		if (ConfigInFlight.has(Key)) return;
		ConfigInFlight.add(Key);
		void Call<{ value?: unknown } | unknown>(
			Context,
			"Configuration.Inspect",
			[Key],
		).then((Value) => {
			ConfigInFlight.delete(Key);
			if (Value === undefined) return;
			// Mountain may return either the bare value or a
			// `{ defaultValue, globalValue, workspaceValue }` shape.
			// Prefer the most-specific override, fall through to defaults.
			// Shape can be null when the key is not present in Mountain config.
			const Shape = Value as Record<string, unknown> | null;
			const Resolved =
				Shape?.["workspaceFolderValue"] ??
				Shape?.["workspaceValue"] ??
				Shape?.["globalValue"] ??
				Shape?.["defaultValue"] ??
				Value;
			const Prior = ConfigCache.get(Key);
			ConfigCache.set(Key, Resolved);
			if (Prior !== Resolved) FireConfigChange(Key);
		});
	};

	// Listen for Mountain-side `configuration.change` notifications (routed
	// through NotificationHandler into `configurationChanged` on the main
	// Context.Emitter). When a user edits settings.json outside the extension
	// host, Mountain fires this notification - we invalidate the affected
	// cache entries and re-prime so downstream `get()` calls reflect the new
	// value and listeners fire.
	Context.Emitter.on("configurationChanged", (Payload: unknown) => {
		const Shape = (Payload ?? {}) as { keys?: unknown; affected?: unknown };
		const Keys: string[] = Array.isArray(Shape.keys)
			? (Shape.keys as string[])
			: Array.isArray(Shape.affected)
				? (Shape.affected as string[])
				: [];
		if (Keys.length === 0) {
			// Unknown affected keys - invalidate everything. Future reads
			// re-prime lazily; listeners fire for each cached key.
			for (const CachedKey of [...ConfigCache.keys()]) {
				ConfigCache.delete(CachedKey);
				FireConfigChange(CachedKey);
			}
			return;
		}
		for (const Key of Keys) {
			ConfigCache.delete(Key);
			FireConfigChange(Key);
			PrimeConfig(Key);
		}
	});

	return { ConfigCache, ConfigInFlight, ConfigListeners, FireConfigChange, PrimeConfig };
};

export const BuildGetConfiguration = (
	Context: HandlerContext,
	State: ConfigurationState,
) =>
(Section?: string, _Scope?: unknown) => ({
	get: <T>(Key: string, DefaultValue?: T): T | undefined => {
		const Full = Section ? `${Section}.${Key}` : Key;
		if (State.ConfigCache.has(Full)) {
			return State.ConfigCache.get(Full) as T;
		}
		State.PrimeConfig(Full);
		return DefaultValue;
	},
	update: async (Key: string, Value: unknown, Target?: unknown) => {
		const Full = Section ? `${Section}.${Key}` : Key;
		// Target index: 0 = User, 1 = Workspace (matches dispatcher).
		const TargetIndex =
			Target === 2
				? 1
				: Target === true
					? 0
					: typeof Target === "number"
						? Target
						: 0;
		await Call<void>(Context, "Configuration.Update", [
			Full,
			Value,
			TargetIndex,
		]);
		// Write through so the next `get()` reflects the change and
		// so listeners fire without waiting for a Mountain round-trip.
		const Prior = State.ConfigCache.get(Full);
		State.ConfigCache.set(Full, Value);
		if (Prior !== Value) State.FireConfigChange(Full);
	},
	has: (Key: string): boolean => {
		const Full = Section ? `${Section}.${Key}` : Key;
		if (State.ConfigCache.has(Full)) return true;
		State.PrimeConfig(Full);
		return false;
	},
	inspect: <T>(Key: string) => {
		const Full = Section ? `${Section}.${Key}` : Key;
		if (!State.ConfigCache.has(Full)) {
			State.PrimeConfig(Full);
			return undefined;
		}
		const Cached = State.ConfigCache.get(Full) as T;
		return {
			key: Full,
			defaultValue: undefined,
			globalValue: Cached,
			workspaceValue: undefined,
			workspaceFolderValue: undefined,
			defaultLanguageValue: undefined,
			globalLanguageValue: undefined,
			workspaceLanguageValue: undefined,
			workspaceFolderLanguageValue: undefined,
			languageIds: [] as string[],
		};
	},
});

export const BuildOnDidChangeConfiguration = (
	State: ConfigurationState,
) =>
(
	Listener: (Event: ConfigurationChangeEvent) => void,
) => {
	State.ConfigListeners.add(Listener);
	return {
		dispose: () => {
			State.ConfigListeners.delete(Listener);
		},
	};
};
