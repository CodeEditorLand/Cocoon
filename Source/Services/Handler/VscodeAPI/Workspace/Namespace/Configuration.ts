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

import { CocoonDevLog } from "../../../../Dev/Log.js";
import type { HandlerContext } from "../../../Handler/Context.js";
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

	/**
	 * Walk `contributes.configuration.properties` on the given extension
	 * manifest and seed the cache with each declared default. Extensions
	 * (GitLens, rust-analyzer, vscodevim, …) reach into sub-sections
	 * synchronously during `activate()` via
	 * `workspace.getConfiguration('gitlens').blame.format` - without the
	 * declared defaults the first reads hit empty cache → `undefined`
	 * → `TypeError: Cannot read properties of undefined`. Priming on
	 * activate prevents that entire class of failure.
	 */
	PrePopulateFromManifest: (PackageJSON: unknown) => void;
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
			// Mountain returns `InspectResultDataDTO` serialized with
			// `#[serde(rename_all = "camelCase")]` - i.e. keys are
			// `effectiveValue`, `workspaceFolderValue`, `workspaceValue`,
			// `userValue`, `defaultValue`, etc. (matching VS Code's
			// `WorkspaceConfiguration.inspect()` shape). The DTO already
			// pre-cascades the merge order (workspaceFolder → workspace →
			// user → default) into `effectiveValue`, so prefer that. The
			// per-scope reads remain as a fallback for partial shapes
			// (sentinel `null` on a particular scope).
			const Shape = Value as Record<string, unknown> | null;
			const Resolved =
				Shape?.["effectiveValue"] ??
				Shape?.["workspaceFolderValue"] ??
				Shape?.["workspaceValue"] ??
				Shape?.["userValue"] ??
				Shape?.["globalValue"] ??
				Shape?.["defaultValue"] ??
				Value;
			const Prior = ConfigCache.get(Key);
			ConfigCache.set(Key, Resolved);
			if (Prior !== Resolved) FireConfigChange(Key);
		});
	};

	const PrePopulateFromManifest = (PackageJSON: unknown): void => {
		const Manifest = (PackageJSON ?? {}) as {
			contributes?: {
				configuration?:
					| {
							properties?: Record<string, { default?: unknown }>;
					  }
					| Array<{
							properties?: Record<string, { default?: unknown }>;
					  }>;
			};
		};
		const Contributed = Manifest.contributes?.configuration;
		if (!Contributed) return;
		// `contributes.configuration` may be either a single object or an
		// array of objects, both with a `properties` map keyed on the full
		// dotted path (e.g. `gitlens.blame.format`).
		const Sections = Array.isArray(Contributed)
			? Contributed
			: [Contributed];
		let Seeded = 0;
		let Skipped = 0;
		let ExtensionId = "";
		const ManifestShape = (PackageJSON ?? {}) as {
			publisher?: string;
			name?: string;
		};
		if (ManifestShape.publisher && ManifestShape.name) {
			ExtensionId = `${ManifestShape.publisher}.${ManifestShape.name}`;
		}
		for (const Section of Sections) {
			const Properties = Section?.properties;
			if (!Properties) continue;
			for (const [DottedKey, Declaration] of Object.entries(Properties)) {
				// Only seed keys that don't already have a cached value -
				// a user override (workspace or global settings) always
				// wins over the manifest default.
				if (ConfigCache.has(DottedKey)) {
					Skipped++;
					continue;
				}
				if (
					Declaration !== null &&
					typeof Declaration === "object" &&
					"default" in Declaration
				) {
					ConfigCache.set(DottedKey, Declaration.default);
					Seeded++;
				}
			}
		}
		// `config-prime` tag: surfaces per-extension priming activity so
		// `Trace=config-prime tail -f Mountain.dev.log` shows
		// which extension manifests successfully seeded defaults vs
		// which ones contributed zero config (non-issue) vs which ones
		// hit cache-already-populated paths (follows up on F2 / GitLens
		// fix correctness). Cocoon stdout is captured into Mountain's
		// log via the existing `[Cocoon stdout]` sink.
		CocoonDevLog(
			"config-prime",

			`[ConfigPrime] prepopulate ext=${ExtensionId || "<unknown>"} seeded=${Seeded} skipped=${Skipped}`,
		);
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
			// Boot-time `configuration.change` broadcasts (e.g. the
			// post-extension-scan re-merge) carry an empty keys list as a
			// "configuration model rebuilt" signal. Wiping the entire
			// cache here was destroying manifest-seeded defaults
			// (`git.enabled = true`, `git.autoRepositoryDetection = true`)
			// after every extension's `PrePopulateFromManifest` ran,
			// causing vscode.git's `Model.openRepository` to short-circuit
			// on `enabled !== true`. Treat empty-keys as a no-op: existing
			// cached values remain valid (Mountain's merge never *removes*
			// a default, only adds user/workspace overrides on top), and
			// listeners can drive their own re-read on the next access.
			//
			// If a real wipe is ever required, the producer must send the
			// affected keys explicitly, or use `"*"` as a sentinel.
			return;
		}
		// `"*"` sentinel: producer signals a full model rebuild (e.g. after a
		// settings.json write that changes many keys at once). Wipe and re-prime
		// only the keys already in the cache - manifest defaults are preserved
		// because they are not in `ConfigCache` (they're always re-read from
		// Mountain on first access), so we don't destroy them here.
		if (Keys.length === 1 && Keys[0] === "*") {
			const CachedKeys = [...ConfigCache.keys()];
			ConfigCache.clear();
			for (const Key of CachedKeys) {
				PrimeConfig(Key);
			}
			return;
		}
		for (const Key of Keys) {
			ConfigCache.delete(Key);
			FireConfigChange(Key);
			PrimeConfig(Key);
		}
	});

	return {
		ConfigCache,
		ConfigInFlight,
		ConfigListeners,
		FireConfigChange,
		PrimeConfig,
		PrePopulateFromManifest,
	};
};

/**
 * Synthesise a nested configuration object from the cache for callers
 * that ask for a branch rather than a leaf. Example: with
 * `gitlens.blame.format` and `gitlens.blame.enabled` in the cache,
 * `SynthesiseSubtree(Cache, "gitlens.blame")` returns
 * `{ format: "...", enabled: true }`. Returns `undefined` when no
 * sub-keys exist so callers can fall back to `DefaultValue`. This is
 * what stock VS Code's ConfigurationService does internally via its
 * `ConfigurationModel` tree; we re-derive it on demand from the flat
 * cache.
 */
const SynthesiseSubtree = (
	Cache: Map<string, unknown>,

	Full: string,
): Record<string, unknown> | undefined => {
	const Prefix = `${Full}.`;
	const Subtree: Record<string, unknown> = {};
	let Matched = false;
	for (const [CachedKey, CachedValue] of Cache.entries()) {
		if (!CachedKey.startsWith(Prefix)) continue;
		Matched = true;
		const Local = CachedKey.slice(Prefix.length);
		const Parts = Local.split(".");
		let Current: Record<string, unknown> = Subtree;
		for (let I = 0; I < Parts.length - 1; I++) {
			const Segment = Parts[I]!;
			const Existing = Current[Segment];
			if (
				Existing === undefined ||
				Existing === null ||
				typeof Existing !== "object"
			) {
				Current[Segment] = {};
			}
			Current = Current[Segment] as Record<string, unknown>;
		}
		Current[Parts[Parts.length - 1]!] = CachedValue;
	}
	return Matched ? Subtree : undefined;
};

export const BuildGetConfiguration =
	(Context: HandlerContext, State: ConfigurationState) =>
	(Section?: string, Scope?: unknown) => ({
		get: <T>(Key: string, DefaultValue?: T): T | undefined => {
			const Full = Section ? `${Section}.${Key}` : Key;
			// Check language-scoped override first when a scope with languageId is provided.
			// VS Code stores language overrides as `[rust]`, `[typescript]` top-level keys
			// in settings.json. When the extension accesses a scoped configuration, we
			// check the `[<language>].<section>.<key>` path in the cache first.
			const LangId: string | undefined =
				typeof (Scope as any)?.languageId === "string"
					? (Scope as any).languageId
					: typeof (Scope as any)?.language === "string"
						? (Scope as any).language
						: undefined;
			if (LangId) {
				const LangFull = `[${LangId}].${Full}`;
				if (State.ConfigCache.has(LangFull)) {
					return State.ConfigCache.get(LangFull) as T;
				}
				// Also check the scope directly in the `[language]` block if Section matches
				const LangSection = `[${LangId}].${Section ?? ""}`;
				const LangSubtree = SynthesiseSubtree(
					State.ConfigCache,
					LangSection,
				);
				if (LangSubtree !== undefined) {
					const Parts = Key.split(".");
					let Cur: unknown = LangSubtree;
					for (const Part of Parts) {
						Cur = (Cur as Record<string, unknown>)?.[Part];
						if (Cur === undefined) {
							Cur = undefined;
							break;
						}
					}
					if (Cur !== undefined) return Cur as T;
				}
				// Trigger a background prime for the language-scoped key
				if (!State.ConfigCache.has(Full)) {
					State.PrimeConfig(Full);
				}
			}
			if (State.ConfigCache.has(Full)) {
				const Cached = State.ConfigCache.get(Full);
				// When Mountain's inspector reports a branch key as
				// `null`/`undefined` (no user override), prefer the
				// synthesised object built from cached leaves. Without this
				// guard, a cached `null` for `gitlens.codeLens` would
				// shadow the leaf defaults and the extension's
				// `cfg.codeLens.enabled` read would throw on `null`.
				if (Cached === null || Cached === undefined) {
					const Subtree = SynthesiseSubtree(State.ConfigCache, Full);
					if (Subtree !== undefined) {
						CocoonDevLog(
							"config-prime",

							`[ConfigPrime] synthesise key=${Full} source=null-shadowed`,
						);
						return Subtree as T;
					}
				}
				return Cached as T;
			}
			// Branch key (`getConfiguration('gitlens').get('blame')`) -
			// synthesise `{ format, enabled, ... }` from cached leaves so
			// extensions that do `cfg.blame.format` get the expected shape
			// rather than `TypeError: Cannot read properties of undefined`.
			const Subtree = SynthesiseSubtree(State.ConfigCache, Full);
			if (Subtree !== undefined) {
				CocoonDevLog(
					"config-prime",

					`[ConfigPrime] synthesise key=${Full} source=miss`,
				);
				return Subtree as T;
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
			// Branch key: treat as present if any cached leaf lives under it.
			if (SynthesiseSubtree(State.ConfigCache, Full) !== undefined) {
				return true;
			}
			State.PrimeConfig(Full);
			return false;
		},
		inspect: <T>(Key: string) => {
			const Full = Section ? `${Section}.${Key}` : Key;
			let Cached: T | undefined;
			if (State.ConfigCache.has(Full)) {
				Cached = State.ConfigCache.get(Full) as T;
			} else {
				const Subtree = SynthesiseSubtree(State.ConfigCache, Full);
				if (Subtree === undefined) {
					State.PrimeConfig(Full);
					return undefined;
				}
				Cached = Subtree as T;
			}
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

export const BuildOnDidChangeConfiguration =
	(State: ConfigurationState) =>
	(
		Listener: (Event: ConfigurationChangeEvent) => void,

		ThisArg?: unknown,

		Disposables?: { push: (D: { dispose: () => void }) => unknown },
	) => {
		// VS Code's event contract is `(listener, thisArg?, disposables?)` -
		// ours ignored both. rust-analyzer passes `this` as ThisArg and
		// relies on the bound callback, so
		// `this.onDidChangeConfiguration(evt)` accesses its own class members.
		// Without the bind, `this` is undefined in the callback and
		// `this.refreshLogging()` throws.
		const Bound = ThisArg === undefined ? Listener : Listener.bind(ThisArg);
		State.ConfigListeners.add(Bound);
		const Subscription = {
			dispose: () => {
				State.ConfigListeners.delete(Bound);
			},
		};
		if (Disposables && typeof Disposables.push === "function") {
			Disposables.push(Subscription);
		}
		return Subscription;
	};
