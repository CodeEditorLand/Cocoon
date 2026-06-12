/**
 * @module Handler/ExtensionHost/ActivateExtension
 * @description
 * Loads and activates a single VS Code extension from disk. Guards against
 * double-activation, performs an fs preflight check before attempting to
 * import the main bundle, pre-populates the workspace configuration cache
 * with the extension's declared defaults, and builds a minimal
 * `ExtensionContext` (including real storage paths under `~/.fiddee/`).
 *
 * `CreateExtensionContext` is co-located here because it is only called
 * from `ActivateExtension` and both depend on `NodeFS` and `FiddeeRoot`.
 */

import * as NodeFS from "node:fs";

import FiddeeRoot from "../../../../Platform/FiddeeRoot.js";
import { CocoonDevLog } from "../../../Dev/Log.js";
import type { HandlerContext } from "../../Handler/Context.js";

/**
 * Extension ids whose `activate()` has been entered but not yet settled.
 * Ids are promoted to `Context.ActivatedExtensions` only after `activate()`
 * resolves, so a throw leaves both sets clean and a retry is possible while
 * concurrent callers still skip duplicate starts.
 */
const ActivatingExtensions = new Set<string>(;

export const IsExtensionActivating = (ExtensionId: string): boolean =>
	ActivatingExtensions.has(ExtensionId;

/**
 * Live `ExtensionContext` per activated extension id. Entries are added when
 * an activation promotes to activated and removed on activation failure or
 * disposal, so host shutdown / re-init can dispose every
 * `context.subscriptions` an extension registered.
 */
export const ActiveExtensionContexts = new Map<string, unknown>(;

/**
 * Dispose every disposable an extension pushed onto its
 * `context.subscriptions` and drop the stored context. Safe to call for ids
 * that never registered a context (declarative extensions, failed
 * activations).
 */
export const DisposeExtensionContext = (ExtensionId: string): void => {
	const ExtContext = ActiveExtensionContexts.get(ExtensionId;

	ActiveExtensionContexts.delete(ExtensionId;

	const Subscriptions = (
		ExtContext as
			| { subscriptions?: Array<{ dispose?: () => unknown }> }
			| undefined
	)?.subscriptions;

	if (!Array.isArray(Subscriptions) || Subscriptions.length === 0) return;

	let Disposed = 0;

	for (const Subscription of Subscriptions) {
		try {
			Subscription?.dispose?.(;

			Disposed++;
		} catch {
			// One throwing disposable must not abort the rest of the sweep.
		}
	}

	Subscriptions.length = 0;

	CocoonDevLog(
		"ext-host",

		`[ExtensionHostHandler] Disposed ${Disposed} subscriptions for ${ExtensionId}`,
	;
};

/**
 * Coalesced `Storage.GetItems` full dump shared by every activation in a
 * boot cycle. Reset on extension-host (re)start and on fetch rejection.
 */
let StoragePrimePromise: Promise<unknown> | null = null;

export const ResetStoragePrime = (): void => {
	StoragePrimePromise = null;
};

/**
 * Build a minimal VS Code ExtensionContext for activating an extension.
 */
const CreateExtensionContext = (
	Context: HandlerContext,

	Extension: any,

	ExtensionPath: string,
): unknown => {
	const ExtId: string =
		Extension?.identifier?.value ??
		Extension?.identifier?.id ??
		Extension?.identifier ??
		"";

	// Resolve real storage paths for the extension. Storage roots live
	// under `~/.fiddee/...` via the `FiddeeRoot` atom, kept OUT of
	// `~/.fiddee/extensions/` so the user-extension scanner in Mountain's
	// `ScanPathConfigure.rs` doesn't warn on non-extension siblings like
	// `storage/`.
	const FiddeeRootPath = FiddeeRoot(;

	const StorageBase = `${FiddeeRootPath}/extensionStorage`;

	const GlobalStorageBase = `${FiddeeRootPath}/globalStorage`;

	const LogBase = `${FiddeeRootPath}/logs`;

	const ExtStoragePath = `${StorageBase}/${ExtId}`;

	const GlobalStoragePath = `${GlobalStorageBase}/${ExtId}`;

	const LogPath = `${LogBase}/${ExtId}`;

	// Ensure directories exist (fire-and-forget). Cocoon runs as an ESM
	// bundle, so bare `require("node:fs")` throws "Dynamic require of
	// 'node:fs' is not supported" - use the static `NodeFS` import.
	try {
		NodeFS.mkdirSync(ExtStoragePath, { recursive: true };

		NodeFS.mkdirSync(GlobalStoragePath, { recursive: true };

		NodeFS.mkdirSync(LogPath, { recursive: true };
	} catch {}

	// Mountain's scanner keeps only a subset of package.json fields. VS
	// Code extensions expect the FULL manifest on
	// `context.extension.packageJSON` - notably `aiKey`, which
	// `@vscode/extension-telemetry` reads at constructor time and calls
	// `aiKey.length` on. A missing aiKey throws `Cannot read properties of
	// undefined (reading 'length')` and the whole activate fails.
	// Read the real package.json from disk and merge it over the scanned
	// descriptor so every published field is present.
	let FullPackageJSON: Record<string, unknown> = Extension as Record<
		string,
		unknown
	>;

	try {
		const Contents = NodeFS.readFileSync(
			`${ExtensionPath}/package.json`,

			"utf8",
		;

		const Parsed = JSON.parse(Contents) as Record<string, unknown>;

		FullPackageJSON = {
			...Parsed,
			...(Extension as Record<string, unknown>),
		};
	} catch {
		// If we can't read it, fall back to the scanner payload. Extensions
		// that rely on manifest-only fields will fail at activate time and
		// surface a clear error on the next pass.
	}

	// VS Code's `URI.joinPath(uri, ...)` throws `[UriError]: cannot call
	// joinPath on URI without path` when handed a plain-object URI stub.
	// `EnsureVscodeAPIRegistered` has already stashed the real URI class on
	// `globalThis.__cocoonVscodeAPI.Uri`; use it when available so
	// `URI.file(Path).with(...)` behaves like the real thing.
	const VsCodeUri = (globalThis as any).__cocoonVscodeAPI?.Uri;

	const MakeUri = (Path: string): unknown => {
		if (VsCodeUri && typeof VsCodeUri.file === "function") {
			return VsCodeUri.file(Path;
		}

		return {
			scheme: "file",

			path: Path,

			fsPath: Path,

			authority: "",

			query: "",

			fragment: "",

			with: function (this: any, Change: any) {
				return { ...this, ...Change };
			},

			toString: () => `file://${Path}`,
		};
	};

	return {
		subscriptions: [] as { dispose(): unknown }[],

		extensionPath: ExtensionPath,

		extensionUri: MakeUri(ExtensionPath),

		// VS Code API: `context.asAbsolutePath(relative)` returns the
		// extension path joined with a relative path. The 4 language-
		// features extensions all call this immediately in their activate
		// function to resolve server bundle locations; without it, they
		// fail before vscode-languageclient even constructs.
		asAbsolutePath: (RelativePath: string) => {
			const Trimmed = RelativePath.replace(/^\.?\//, "";
			return `${ExtensionPath}/${Trimmed}`;
		},
		storagePath: ExtStoragePath,
		globalStoragePath: GlobalStoragePath,
		logPath: LogPath,
		storageUri: MakeUri(ExtStoragePath),
		globalStorageUri: MakeUri(GlobalStoragePath),
		logUri: MakeUri(LogPath),
		environmentVariableCollection: (() => {
			// Real `EnvironmentVariableCollection`: extensions (Copilot,
			// GitHub PR, Pyright) call `context.environmentVariableCollection
			// .replace("PATH", "/extra:" + process.env.PATH)` to inject env
			// vars into every NEW terminal created after activation. A pure
			// no-op stub silently dropped these, leaving terminals without
			// the auth tokens / shims those extensions need to function.
			//
			// Implementation tracks mutations in an in-memory map and
			// forwards every mutation to Mountain's
			// `terminal.envCollection.<op>` notifications so the PTY
			// spawn path picks them up. Cross-session persistence is
			// handled by Mountain (it survives across reloads via the
			// global memento under `__envCollection:<extensionId>`).
			const ExtIdCached = ExtId;

			type EnvMutator = {
				readonly value: string;

				readonly type: 1 | 2 | 3; // Replace | Append | Prepend

				readonly options?: {
					applyAtProcessCreation?: boolean;

					applyAtShellIntegration?: boolean;
				};
			};

			const Entries = new Map<string, EnvMutator>(;

			const Forward = (Op: string, Extra: Record<string, unknown>) => {
				Context.SendToMountain("terminal.envCollection." + Op, {
					extensionId: ExtIdCached,
					persistent: Persistent,
					description: Description,
					...Extra,
				}).catch(() => {};
			};

			let Persistent = false;

			let Description: string | undefined = undefined;

			const Collection = {
				get persistent() {
					return Persistent;
				},
				set persistent(Value: boolean) {
					Persistent = !!Value;

					Forward("setPersistent", { persistent: Persistent };
				},
				get description() {
					return Description;
				},
				set description(Value: string | undefined) {
					Description = Value;

					Forward("setDescription", { description: Value };
				},
				replace: (
					Variable: string,

					Value: string,

					Options?: EnvMutator["options"],
				) => {
					Entries.set(Variable, {
						value: Value,
						type: 1,
						options: Options,
					};

					Forward("replace", {
						variable: Variable,
						value: Value,
						options: Options,
					};
				},
				append: (
					Variable: string,

					Value: string,

					Options?: EnvMutator["options"],
				) => {
					Entries.set(Variable, {
						value: Value,
						type: 2,
						options: Options,
					};

					Forward("append", {
						variable: Variable,
						value: Value,
						options: Options,
					};
				},
				prepend: (
					Variable: string,

					Value: string,

					Options?: EnvMutator["options"],
				) => {
					Entries.set(Variable, {
						value: Value,
						type: 3,
						options: Options,
					};

					Forward("prepend", {
						variable: Variable,
						value: Value,
						options: Options,
					};
				},
				get: (Variable: string): EnvMutator | undefined => {
					return Entries.get(Variable;
				},
				forEach: (
					Callback: (
						variable: string,

						mutator: EnvMutator,

						collection: unknown,
					) => unknown,

					_ThisArg?: unknown,
				) => {
					for (const [Key, Value] of Entries) {
						try {
							Callback(Key, Value, Collection;
						} catch {
							/* swallow */
						}
					}
				},
				delete: (Variable: string) => {
					Entries.delete(Variable;

					Forward("delete", { variable: Variable };
				},
				clear: () => {
					Entries.clear(;

					Forward("clear", {};
				},
				// `getScoped({ workspaceFolder })` returns a scoped sub-collection.
				// Currently we don't track per-scope mutations server-side, so
				// scoped operations behave identically to the global collection.
				// Extensions that depend on strict per-folder scoping will see
				// global behaviour - acceptable degradation for v1; flag in
				// the followup if any extension is observed broken by this.
				getScoped: (_Scope: unknown) => Collection,
				[Symbol.iterator]: function* () {
					for (const Entry of Entries) yield Entry;
				},
			};

			return Collection;
		})(),
		// Real secrets - routes to Mountain's AES-256-GCM encrypted storage.
		secrets: (() => {
			const ExtIdCached = ExtId;

			const Listeners: Array<(Event: { key: string }) => void> = [];

			return {
				get: async (Key: string): Promise<string | undefined> => {
					try {
						const Result =
							await Context.MountainClient?.sendRequest(
								"secrets.get",

								{ key: Key, extensionId: ExtIdCached },
							;

						return typeof Result === "string" ? Result : undefined;
					} catch {
						return undefined;
					}
				},
				store: async (Key: string, Value: string): Promise<void> => {
					try {
						await Context.MountainClient?.sendRequest(
							"secrets.store",

							{
								key: Key,
								value: Value,
								extensionId: ExtIdCached,
							},
						;

						for (const L of Listeners) {
							try {
								L({ key: Key };
							} catch {}
						}
					} catch {}
				},
				delete: async (Key: string): Promise<void> => {
					try {
						await Context.MountainClient?.sendRequest(
							"secrets.delete",

							{
								key: Key,
								extensionId: ExtIdCached,
							},
						;

						for (const L of Listeners) {
							try {
								L({ key: Key };
							} catch {}
						}
					} catch {}
				},
				onDidChange: (Listener: (Event: { key: string }) => void) => {
					Listeners.push(Listener;

					return {
						dispose: () => {
							const I = Listeners.indexOf(Listener;

							if (I !== -1) Listeners.splice(I, 1;
						},
					};
				},
			};
		})(),
		// Real workspace/global state backed by Mountain's storage.
		// Caches must be pre-populated by `PrimeStorageCaches` BEFORE the
		// extension's `activate()` runs (see ActivateExtension below).
		// VS Code's `ExtensionContext.workspaceState.get(key, default)`
		// is a SYNCHRONOUS API - extensions read it during activate to
		// drive control flow (Roo Code reads `taskHistory`, GitHub
		// Copilot reads `signInDismissed`, GitLens reads
		// `views.welcome.dismissed`). Without prime, the first sync
		// read returns the default, the cache fills later, and the
		// extension's UI ends up in the wrong state.
		workspaceState: ((): unknown => {
			const ExtIdCached = ExtId;

			const Cache = new Map<string, unknown>(;

			const State = {
				get: (Key: string, DefaultValue?: unknown): unknown => {
					if (Cache.has(Key)) {
						const Cached = Cache.get(Key;

						return Cached === undefined ? DefaultValue : Cached;
					}

					// Schedule prime so the next sync read sees the real
					// value. Stays best-effort; missing or absent keys
					// stay at default forever (matches VS Code semantics).
					void Context.MountainClient?.sendRequest("Storage.Get", [
						`${ExtIdCached}:workspace:${Key}`,
					])
						.then((V) => {
							if (V !== undefined) Cache.set(Key, V;
						})
						.catch(() => {};

					return DefaultValue;
				},
				update: async (Key: string, Value: unknown): Promise<void> => {
					Cache.set(Key, Value;

					await Context.MountainClient?.sendRequest("Storage.Set", [
						`${ExtIdCached}:workspace:${Key}`,

						Value,
					]).catch(() => {};
				},
				keys: () => [...Cache.keys()],
				// Exposed for `PrimeStorageCaches` below so the boot path
				// can bulk-load every existing key before activate runs.
				__primeCache: (
					Entries: Iterable<readonly [string, unknown]>,
				) => {
					for (const [K, V] of Entries) {
						if (V !== undefined) Cache.set(K, V;
					}
				},
			};

			return State;
		})(),
		globalState: ((): unknown => {
			const ExtIdCached = ExtId;

			const Cache = new Map<string, unknown>(;

			const State = {
				get: (Key: string, DefaultValue?: unknown): unknown => {
					if (Cache.has(Key)) {
						const Cached = Cache.get(Key;

						return Cached === undefined ? DefaultValue : Cached;
					}

					void Context.MountainClient?.sendRequest("Storage.Get", [
						`${ExtIdCached}:global:${Key}`,
					])
						.then((V) => {
							if (V !== undefined) Cache.set(Key, V;
						})
						.catch(() => {};

					return DefaultValue;
				},
				update: async (Key: string, Value: unknown): Promise<void> => {
					Cache.set(Key, Value;

					await Context.MountainClient?.sendRequest("Storage.Set", [
						`${ExtIdCached}:global:${Key}`,

						Value,
					]).catch(() => {};
				},
				keys: () => [...Cache.keys()],
				setKeysForSync: (_Keys: string[]) => {},
				__primeCache: (
					Entries: Iterable<readonly [string, unknown]>,
				) => {
					for (const [K, V] of Entries) {
						if (V !== undefined) Cache.set(K, V;
					}
				},
			};

			return State;
		})(),
		extensionMode: 1,
		extension: {
			id: ExtId,

			// Use the SAME `MakeUri()` helper as `context.extensionUri`
			// above. Plain-object URI stubs without `.with()` / `.toString()`
			// crash any extension that does:
			//   const scriptUri = context.extension.extensionUri.with({
			//       path: '/dist/extension.js'
			//   })
			// which is the standard pattern for resolving bundled assets
			// (Roo Code, Continue, Claude, every webview-based extension
			// does this on activate or first command invocation).
			extensionUri: MakeUri(ExtensionPath),

			extensionPath: ExtensionPath,

			isActive: true,

			packageJSON: FullPackageJSON,

			// 1 = UI, 2 = Workspace. Most desktop extensions ship as UI
			// kind so `vscode.extensions.getExtension(id).extensionKind`
			// returns the right value when extensions branch on it.
			extensionKind: 1,

			// `exports` is mutated by the host after `activate()` resolves
			// (see VS Code's `ExtensionHostManager`); set to `undefined`
			// now and the activation post-processing updates it once the
			// extension's `activate` function returns a value.
			exports: undefined,

			// Real `Extension.activate()` returns a Promise<T> that
			// resolves once the extension's main module has been loaded
			// and its `activate()` has been called. Code that checks
			// `extension.isActive` and then calls `extension.activate()`
			// (vscode-languageclient does this when re-launching a
			// language server after a config change) must observe the
			// promise settling. We're already active by construction at
			// the point this descriptor is built, so resolve immediately
			// with the current `exports` value.
			activate: async () => {
				return undefined;
			},
		},
		languageModelAccessInformation: {
			canSendRequest: (_Model: unknown) => false,

			onDidChange: (_Listener: unknown) => ({ dispose: () => {} }),
		},
	};
};

/**
 * Load and activate a single extension from disk.
 * Expects extensionRegistry entries from Mountain's InitializeExtensionHost.
 */
const ActivateExtension = async (
	Context: HandlerContext,

	ExtensionId: string,

	ActivationEvent: string,
): Promise<void> => {
	// Guard: skip when already activated or an activation is in flight.
	if (
		Context.ActivatedExtensions.has(ExtensionId) ||
		ActivatingExtensions.has(ExtensionId)
	)
		return;

	ActivatingExtensions.add(ExtensionId;

	const PromoteToActivated = (ExtContext?: unknown): void => {
		ActivatingExtensions.delete(ExtensionId;

		Context.ActivatedExtensions.add(ExtensionId;

		if (ExtContext !== undefined) {
			ActiveExtensionContexts.set(ExtensionId, ExtContext;
		}
	};

	const StartMs = Date.now(;
	CocoonDevLog(
		"ext-activate",

		`[ExtActivate] start ext=${ExtensionId} event=${ActivationEvent}`,
	;

	const Extension = Context.ExtensionRegistry.get(ExtensionId;
	if (!Extension) {
		CocoonDevLog(
			"ext-activate",

			`[ExtActivate] skip-missing ext=${ExtensionId} (not in registry)`,
		;

		PromoteToActivated(;

		return;
	}

	// Mountain sends ExtensionLocation as a file:// URL (from url::Url::from_directory_path)
	const LocationRaw: unknown =
		Extension?.ExtensionLocation ??
		Extension?.extensionLocation ??
		Extension?.location?.path ??
		Extension?.location;
	const MainFile: string | undefined = Extension?.main ?? Extension?.Main;

	// Declarative extensions (themes, grammars) have no main - mark activated and return.
	if (!LocationRaw || !MainFile) {
		PromoteToActivated(;

		return;
	}

	// Convert file:// URL to filesystem path
	let ExtensionPath: string;
	try {
		ExtensionPath = new URL(String(LocationRaw)).pathname.replace(
			/\/$/,

			"",
		;
	} catch {
		ExtensionPath = String(LocationRaw)
			.replace(/^file:\/\//, "")
			.replace(/\/$/, "";
	}

	const ModulePath = `${ExtensionPath}/${MainFile}`;

	// Preflight: if the declared main file is absent on disk (e.g. Copilot's
	// `dist/extension.js` is not shipped in the source-tree checkout), skip
	// activation with a clean message instead of letting Node throw a
	// `Cannot find module` ERR_MODULE_NOT_FOUND stack. Tolerate both the raw
	// path and the common `.js` extension VS Code omits from `main`.
	try {
		const { access } = await import("node:fs/promises";
		let Exists = false;
		let Resolved = ModulePath;
		for (const Candidate of [ModulePath, `${ModulePath}.js`]) {
			try {
				await access(Candidate;

				Exists = true;

				Resolved = Candidate;

				break;
			} catch {}
		}
		if (!Exists) {
			// Skipping-an-extension is a real event; always log.
			process.stdout.write(
				`[LandFix:Preflight] Skipping ${ExtensionId}: main file not found on disk (${ModulePath})\n`,
			;

			PromoteToActivated(;

			return;
		}
		// Successful-resolve runs per extension (~40 lines per boot) and
		// is only useful when actively debugging module resolution. Gate.
		if (process.env["Trace"]?.includes("preflight")) {
			process.stdout.write(
				`[LandFix:Preflight] ${ExtensionId}: resolved to ${Resolved}\n`,
			;
		}
	} catch (Err) {
		// If `node:fs/promises` is unavailable for any reason, fall through
		// to the normal require/import path and let it surface the error.
		process.stdout.write(
			`[LandFix:Preflight] preflight disabled for ${ExtensionId}: ${Err instanceof Error ? Err.message : String(Err)}\n`,
		;
	}

	// Inspect package.json to determine CJS vs ESM. If type === "module" OR
	// the main file has an .mjs extension, we must use dynamic import(). CJS
	// require() would throw ERR_REQUIRE_ESM for ESM modules.
	const ModuleType: string | undefined = Extension?.type ?? Extension?.Type;
	const IsESM =
		ModuleType === "module" ||
		/\.mjs$/i.test(MainFile) ||
		/\.mts$/i.test(MainFile;

	CocoonDevLog(
		"ext-activate",

		`[ExtensionHostHandler] Loading ${ExtensionId} (${IsESM ? "ESM" : "CJS"}) from ${ModulePath}`,
	;

	// Seed the workspace configuration cache with this extension's declared
	// `contributes.configuration.properties` defaults BEFORE its `activate()`
	// runs. Extensions like GitLens read `workspace.getConfiguration('gitlens')
	// .blame.format` synchronously at activation; if the cache is empty they
	// get `undefined` and throw `TypeError: Cannot read properties of undefined
	// (reading 'format')`. Priming from the manifest ensures the declared
	// defaults are already in the cache, so nested access succeeds from the
	// first call. `WorkspaceNamespace/Index.ts` stashes the ConfigurationState
	// on `globalThis.__cocoonConfigState` for exactly this hook.
	try {
		const Manifest = await (async () => {
			try {
				const { readFile } = await import("node:fs/promises";

				const Raw = await readFile(
					`${ExtensionPath}/package.json`,

					"utf8",
				;

				return JSON.parse(Raw) as unknown;
			} catch {
				return Extension as unknown;
			}
		})(;
		const ConfigState = (
			globalThis as {
				__cocoonConfigState?: {
					PrePopulateFromManifest: (Manifest: unknown) => void;
				};
			}
		).__cocoonConfigState;
		ConfigState?.PrePopulateFromManifest(Manifest;
	} catch {
		// PrePopulate is best-effort; never block activation on it.
	}

	// Context handed to `activate()`; registered in
	// `ActiveExtensionContexts` at the promote step so deactivation can
	// dispose its `subscriptions`.
	let RegisteredContext: unknown;

	try {
		let ExtModule: { activate?: (ctx: unknown) => unknown };

		if (IsESM) {
			// Dynamic import resolves file extensions and handles ESM natively.
			// Prefer file:// URL to avoid Windows drive-letter quirks.
			const ImportURL = ModulePath.startsWith("/")
				? `file://${ModulePath}`
				: ModulePath;

			ExtModule = (await import(ImportURL)) as typeof ExtModule;
		} else {
			const { createRequire } = await import("module";

			const Require = createRequire(import.meta.url;

			try {
				// Module._load is patched above - require('vscode') returns our API shim.
				ExtModule = Require(ModulePath) as typeof ExtModule;
			} catch (RequireErr: unknown) {
				// Fallback for extensions whose main is actually ESM despite
				// no `"type": "module"` field - try dynamic import().
				const Msg =
					RequireErr instanceof Error
						? RequireErr.message
						: String(RequireErr;

				if (/ERR_REQUIRE_ESM|Cannot use import statement/i.test(Msg)) {
					const ImportURL = ModulePath.startsWith("/")
						? `file://${ModulePath}`
						: ModulePath;

					ExtModule = (await import(ImportURL)) as typeof ExtModule;
				} else {
					throw RequireErr;
				}
			}
		}

		// ESM default export may wrap the activate function.
		const ActivateFn =
			typeof ExtModule?.activate === "function"
				? ExtModule.activate
				: typeof (ExtModule as any)?.default?.activate === "function"
					? (ExtModule as any).default.activate
					: undefined;

		if (typeof ActivateFn === "function") {
			const ExtContext = CreateExtensionContext(
				Context,

				Extension,

				ExtensionPath,
			;

			RegisteredContext = ExtContext;

			// Pre-populate workspaceState/globalState caches BEFORE activate
			// runs. Extensions read `context.workspaceState.get(key)`
			// synchronously inside their `activate()` to decide UI state
			// (welcome banners, sign-in prompts, task history, prior
			// session context). Without a primed cache the first read
			// returns the default, the cache fills async, and the
			// extension settles into the wrong state - then the second
			// activation (after reload) suddenly works "by accident".
			//
			// Pull every key with the extension prefix from Mountain's
			// global storage and seed both maps. This is a single
			// Storage.GetAllStorage round-trip, regardless of how many
			// keys the extension has stored.
			try {
				const PrimeStart = Date.now(;

				// Coalesce: concurrent activations share ONE full-dump
				// fetch instead of N identical round-trips at boot. A
				// rejected fetch resets the promise so the next caller
				// retries fresh.
				const PrimeClient = Context.MountainClient;

				if (StoragePrimePromise === null && PrimeClient) {
					StoragePrimePromise = PrimeClient.sendRequest(
						"Storage.GetItems",

						[],
					).catch((PrimeFetchErr: unknown) => {
						StoragePrimePromise = null;

						throw PrimeFetchErr;
					};
				}

				const AllRaw = StoragePrimePromise
					? await StoragePrimePromise
					: undefined;

				const AllArray = Array.isArray(AllRaw) ? AllRaw : [];

				const WorkspacePrefix = `${ExtensionId}:workspace:`;

				const GlobalPrefix = `${ExtensionId}:global:`;

				const WorkspaceEntries: Array<[string, unknown]> = [];

				const GlobalEntries: Array<[string, unknown]> = [];

				for (const Pair of AllArray) {
					if (!Array.isArray(Pair) || Pair.length < 2) continue;

					const RawKey = String(Pair[0] ?? "";

					const RawValue = Pair[1];

					let Value: unknown = RawValue;

					if (typeof RawValue === "string") {
						try {
							Value = JSON.parse(RawValue;
						} catch {
							// Keep as string when not valid JSON - matches
							// VS Code's `Memento` deserialiser semantics
							// (string-typed values flow through verbatim).
						}
					}

					if (RawKey.startsWith(WorkspacePrefix)) {
						WorkspaceEntries.push([
							RawKey.slice(WorkspacePrefix.length),

							Value,
						];
					} else if (RawKey.startsWith(GlobalPrefix)) {
						GlobalEntries.push([
							RawKey.slice(GlobalPrefix.length),

							Value,
						];
					}
				}

				const WorkspaceState = (ExtContext as any)?.workspaceState as
					| {
							__primeCache?: (
								entries: Iterable<readonly [string, unknown]>,
							) => void;
					  }
					| undefined;

				const GlobalState = (ExtContext as any)?.globalState as
					| {
							__primeCache?: (
								entries: Iterable<readonly [string, unknown]>,
							) => void;
					  }
					| undefined;

				WorkspaceState?.__primeCache?.(WorkspaceEntries;

				GlobalState?.__primeCache?.(GlobalEntries;

				if (process.env["Trace"]?.includes("ext-prime")) {
					process.stdout.write(
						`[LandFix:StoragePrime] ${ExtensionId} workspace=${WorkspaceEntries.length} global=${GlobalEntries.length} elapsed=${Date.now() - PrimeStart}ms\n`,
					;
				}
			} catch (PrimeErr) {
				// Prime is best-effort; never block activation on it. If
				// Mountain hasn't initialised the storage backing yet
				// (cold boot race) the cache stays empty and the existing
				// async-prime-on-first-read fallback handles fills.
				if (process.env["Trace"]?.includes("ext-prime")) {
					process.stdout.write(
						`[LandFix:StoragePrime] ${ExtensionId} prime failed: ${PrimeErr instanceof Error ? PrimeErr.message : String(PrimeErr)}\n`,
					;
				}
			}

			// Pre-activation snapshot - surfaces what `vscode.workspace.workspaceFolders`
			// actually exposes to the extension at the moment its `activate(context)`
			// is invoked. The git extension's `Model.doInitialScan()` reads this list
			// and bails when empty, which is exactly the F6 mystery (vscode.git
			// activates ok but never reaches `vscode.scm.createSourceControl`).
			// Gated to specific extension IDs so the log doesn't spam for the 113
			// scanned extensions; covers the Git family + npm/gulp/jake which all
			// take the same shortcut. Fires under `Trace=ext-preactivate` or
			// the implicit `=short` (we always emit on stdout via console.log).
			const InstrumentedExtensions = [
				"vscode.git",
				"vscode.git-base",
				"vscode.npm",
				"vscode.gulp",
				"vscode.grunt",
				"vscode.jake",
				"vscode.merge-conflict",
			];

			const SnapshotInitState = (Phase: string): void => {
				try {
					const InitWorkspace =
						(Context.ExtensionHostInitData as any)?.workspace ??
						(Context.ExtensionHostInitData as any)?.workspaceData ??
						{};

					const InitFolders = Array.isArray(InitWorkspace.folders)
						? InitWorkspace.folders
						: [];

					const FolderShape = InitFolders.map((F: any, I: number) => {
						const UriField = F?.uri;

						const UriShape =
							typeof UriField === "string"
								? `string("${UriField.slice(0, 80)}")`
								: typeof UriField === "object" &&
									  UriField !== null
									? `object(scheme=${UriField.scheme ?? "<missing>"} fsPath=${
											typeof UriField.fsPath === "string"
												? UriField.fsPath.slice(0, 80)
												: "<not-a-string>"
										})`
									: typeof UriField;

						return `[${I}] name=${F?.name ?? "?"} uri=${UriShape}`;
					}).join(" | ";

					// Surface the typed value the extension will read from
					// `config.get('git.autoRepositoryDetection')` - vscode.git's
					// `model.js:340` bails on `!== true && !== 'subFolders'`,
					// so a value that arrives as `1` or `"true"` or wrapped in
					// an object would silently kill the SCM scan even when
					// the merge says the key is present.
					const ConfigState = (
						globalThis as {
							__cocoonConfigState?: {
								ConfigCache?: Map<string, unknown>;
							};
						}
					).__cocoonConfigState;

					const AutoDetect = ConfigState?.ConfigCache?.get?.(
						"git.autoRepositoryDetection",
					;

					const Enabled =
						ConfigState?.ConfigCache?.get?.("git.enabled";

					const AutoDetectShape = `${typeof AutoDetect}=${
						typeof AutoDetect === "object"
							? JSON.stringify(AutoDetect).slice(0, 80)
							: String(AutoDetect)
					}`;

					CocoonDevLog(
						"ext-preactivate",

						`[ExtensionHostHandler] ${Phase} ${ExtensionId} folders.length=${InitFolders.length} | git.enabled=${Enabled} | git.autoRepositoryDetection=${AutoDetectShape} | ${FolderShape}`,
					;
				} catch (Err) {
					CocoonDevLog(
						"ext-preactivate",

						`[ExtensionHostHandler] ${Phase} ${ExtensionId} snapshot failed: ${
							(Err as { message?: string })?.message ??
							String(Err)
						}`,
					;
				}
			};

			if (InstrumentedExtensions.includes(ExtensionId)) {
				SnapshotInitState("PRE-ACTIVATE";
			}

			const ExtActivateResult = await ActivateFn(ExtContext;

			// CRITICAL: backfill the activate() return value into the
			// extension's registry entry so `vscode.extensions.getExtension(id).exports`
			// resolves correctly. Extensions that expose an API (e.g. Roo-Code
			// exposing its agent, Claude extension exposing its client, test runners
			// exposing their controller) rely on consumers being able to read
			// `.exports` on the `Extension<T>` object returned by `getExtension()`.
			// Previously always `undefined`; now set to the real return value.
			const RegEntry = Context.ExtensionRegistry.get(ExtensionId;

			if (RegEntry && ExtActivateResult !== undefined) {
				(RegEntry as any).__exports = ExtActivateResult;

				(RegEntry as any).exports = ExtActivateResult;
			}

			// Also update the context's own extension.exports so
			// `context.extension.exports` returns the activation result.
			if (ExtActivateResult !== undefined && ExtContext) {
				try {
					(ExtContext as any).extension.exports = ExtActivateResult;
				} catch {
					/* read-only property - skip */
				}
			}

			process.stdout.write(
				`[ExtensionHostHandler] ${ExtensionId} activated (event: ${ActivationEvent})\n`,
			;

			if (InstrumentedExtensions.includes(ExtensionId)) {
				// Post-activate snapshot - vscode.git's `Model.doInitialScan`
				// runs in `.finally(...)` (background) *after* `_activate`
				// returns. Capture state right after activate() resolves so
				// we can compare the pre/post difference - if folders or
				// autoRepositoryDetection differ between the two ticks, the
				// extension is reading a different snapshot than we instrumented.
				SnapshotInitState("POST-ACTIVATE";

				// Schedule one more snapshot 1s later to catch any state that
				// landed via $deltaWorkspaceFolders during activation.
				setTimeout(() => SnapshotInitState("DEFERRED-1S"), 1000;
			}

			CocoonDevLog(
				"ext-activate",

				`[ExtActivate] ok ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`,
			;
		} else {
			CocoonDevLog(
				"ext-activate",

				`[ExtensionHostHandler] ${ExtensionId} loaded but no activate() function found`,
			;

			CocoonDevLog(
				"ext-activate",

				`[ExtActivate] no-activate-fn ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`,
			;
		}

		PromoteToActivated(RegisteredContext;
	} catch (Err: unknown) {
		// Remove from both sets so a retry is possible
		ActivatingExtensions.delete(ExtensionId;

		Context.ActivatedExtensions.delete(ExtensionId;

		// A failed activate() may have pushed disposables onto its context
		// before throwing; register the partial context so the shared sweep
		// disposes them and clears the map entry.
		if (RegisteredContext !== undefined) {
			ActiveExtensionContexts.set(ExtensionId, RegisteredContext;
		}

		DisposeExtensionContext(ExtensionId;
		const Message = Err instanceof Error ? Err.message : String(Err;
		CocoonDevLog(
			"ext-activate",

			`[ExtActivate] fail ext=${ExtensionId} duration_ms=${Date.now() - StartMs} error=${Message.replace(/\n/g, " | ")}`,
		;
		throw Err;
	}
};

export default ActivateExtension;
