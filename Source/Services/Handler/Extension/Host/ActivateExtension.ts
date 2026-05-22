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
	const FiddeeRootPath = FiddeeRoot();
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
		NodeFS.mkdirSync(ExtStoragePath, { recursive: true });
		NodeFS.mkdirSync(GlobalStoragePath, { recursive: true });
		NodeFS.mkdirSync(LogPath, { recursive: true });
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
		);
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
			return VsCodeUri.file(Path);
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
			const Trimmed = RelativePath.replace(/^\.?\//, "");
			return `${ExtensionPath}/${Trimmed}`;
		},
		storagePath: ExtStoragePath,
		globalStoragePath: GlobalStoragePath,
		logPath: LogPath,
		storageUri: MakeUri(ExtStoragePath),
		globalStorageUri: MakeUri(GlobalStoragePath),
		logUri: MakeUri(LogPath),
		environmentVariableCollection: {
			persistent: false,
			description: undefined,
			replace: () => {},
			append: () => {},
			prepend: () => {},
			get: () => undefined,
			forEach: () => {},
			delete: () => {},
			clear: () => {},
			getScoped: () => ({
				persistent: false,
				description: undefined,
				replace: () => {},
				append: () => {},
				prepend: () => {},
				get: () => undefined,
				forEach: () => {},
				delete: () => {},
				clear: () => {},
				getScoped: () => ({}),
				[Symbol.iterator]: function* () {},
			}),
			[Symbol.iterator]: function* () {},
		},
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
							);
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
						);
						for (const L of Listeners) {
							try {
								L({ key: Key });
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
						);
						for (const L of Listeners) {
							try {
								L({ key: Key });
							} catch {}
						}
					} catch {}
				},
				onDidChange: (Listener: (Event: { key: string }) => void) => {
					Listeners.push(Listener);
					return {
						dispose: () => {
							const I = Listeners.indexOf(Listener);
							if (I !== -1) Listeners.splice(I, 1);
						},
					};
				},
			};
		})(),
		// Real workspace/global state backed by Mountain's storage.
		workspaceState: (() => {
			const ExtIdCached = ExtId;
			const Cache = new Map<string, unknown>();
			return {
				get: (Key: string, DefaultValue?: unknown): unknown => {
					if (Cache.has(Key)) return Cache.get(Key);
					// async prime - first sync read returns default
					void Context.MountainClient?.sendRequest("Storage.Get", [
						`${ExtIdCached}:workspace:${Key}`,
					])
						.then((V) => {
							if (V !== undefined) Cache.set(Key, V);
						})
						.catch(() => {});
					return DefaultValue;
				},
				update: async (Key: string, Value: unknown): Promise<void> => {
					Cache.set(Key, Value);
					await Context.MountainClient?.sendRequest("Storage.Set", [
						`${ExtIdCached}:workspace:${Key}`,
						Value,
					]).catch(() => {});
				},
				keys: () => [...Cache.keys()],
			};
		})(),
		globalState: (() => {
			const ExtIdCached = ExtId;
			const Cache = new Map<string, unknown>();
			return {
				get: (Key: string, DefaultValue?: unknown): unknown => {
					if (Cache.has(Key)) return Cache.get(Key);
					void Context.MountainClient?.sendRequest("Storage.Get", [
						`${ExtIdCached}:global:${Key}`,
					])
						.then((V) => {
							if (V !== undefined) Cache.set(Key, V);
						})
						.catch(() => {});
					return DefaultValue;
				},
				update: async (Key: string, Value: unknown): Promise<void> => {
					Cache.set(Key, Value);
					await Context.MountainClient?.sendRequest("Storage.Set", [
						`${ExtIdCached}:global:${Key}`,
						Value,
					]).catch(() => {});
				},
				keys: () => [...Cache.keys()],
				setKeysForSync: (_Keys: string[]) => {},
			};
		})(),
		extensionMode: 1,
		extension: {
			id: ExtId,
			extensionUri: {
				scheme: "file",
				path: ExtensionPath,
				fsPath: ExtensionPath,
			},
			extensionPath: ExtensionPath,
			isActive: true,
			packageJSON: FullPackageJSON,
			extensionKind: 1,
			exports: undefined,
			activate: async () => {},
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
	// Guard: only activate once
	if (Context.ActivatedExtensions.has(ExtensionId)) return;
	Context.ActivatedExtensions.add(ExtensionId);

	const StartMs = Date.now();
	CocoonDevLog(
		"ext-activate",
		`[ExtActivate] start ext=${ExtensionId} event=${ActivationEvent}`,
	);

	const Extension = Context.ExtensionRegistry.get(ExtensionId);
	if (!Extension) {
		CocoonDevLog(
			"ext-activate",
			`[ExtActivate] skip-missing ext=${ExtensionId} (not in registry)`,
		);
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
		return;
	}

	// Convert file:// URL to filesystem path
	let ExtensionPath: string;
	try {
		ExtensionPath = new URL(String(LocationRaw)).pathname.replace(
			/\/$/,
			"",
		);
	} catch {
		ExtensionPath = String(LocationRaw)
			.replace(/^file:\/\//, "")
			.replace(/\/$/, "");
	}

	const ModulePath = `${ExtensionPath}/${MainFile}`;

	// Preflight: if the declared main file is absent on disk (e.g. Copilot's
	// `dist/extension.js` is not shipped in the source-tree checkout), skip
	// activation with a clean message instead of letting Node throw a
	// `Cannot find module` ERR_MODULE_NOT_FOUND stack. Tolerate both the raw
	// path and the common `.js` extension VS Code omits from `main`.
	try {
		const { access } = await import("node:fs/promises");
		let Exists = false;
		let Resolved = ModulePath;
		for (const Candidate of [ModulePath, `${ModulePath}.js`]) {
			try {
				await access(Candidate);
				Exists = true;
				Resolved = Candidate;
				break;
			} catch {}
		}
		if (!Exists) {
			// Skipping-an-extension is a real event; always log.
			process.stdout.write(
				`[LandFix:Preflight] Skipping ${ExtensionId}: main file not found on disk (${ModulePath})\n`,
			);
			return;
		}
		// Successful-resolve runs per extension (~40 lines per boot) and
		// is only useful when actively debugging module resolution. Gate.
		if (process.env["Trace"]?.includes("preflight")) {
			process.stdout.write(
				`[LandFix:Preflight] ${ExtensionId}: resolved to ${Resolved}\n`,
			);
		}
	} catch (Err) {
		// If `node:fs/promises` is unavailable for any reason, fall through
		// to the normal require/import path and let it surface the error.
		process.stdout.write(
			`[LandFix:Preflight] preflight disabled for ${ExtensionId}: ${Err instanceof Error ? Err.message : String(Err)}\n`,
		);
	}

	// Inspect package.json to determine CJS vs ESM. If type === "module" OR
	// the main file has an .mjs extension, we must use dynamic import(). CJS
	// require() would throw ERR_REQUIRE_ESM for ESM modules.
	const ModuleType: string | undefined = Extension?.type ?? Extension?.Type;
	const IsESM =
		ModuleType === "module" ||
		/\.mjs$/i.test(MainFile) ||
		/\.mts$/i.test(MainFile);

	CocoonDevLog(
		"ext-activate",
		`[ExtensionHostHandler] Loading ${ExtensionId} (${IsESM ? "ESM" : "CJS"}) from ${ModulePath}`,
	);

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
				const { readFile } = await import("node:fs/promises");
				const Raw = await readFile(
					`${ExtensionPath}/package.json`,
					"utf8",
				);
				return JSON.parse(Raw) as unknown;
			} catch {
				return Extension as unknown;
			}
		})();
		const ConfigState = (
			globalThis as {
				__cocoonConfigState?: {
					PrePopulateFromManifest: (Manifest: unknown) => void;
				};
			}
		).__cocoonConfigState;
		ConfigState?.PrePopulateFromManifest(Manifest);
	} catch {
		// PrePopulate is best-effort; never block activation on it.
	}

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
			const { createRequire } = await import("module");
			const Require = createRequire(import.meta.url);
			try {
				// Module._load is patched above - require('vscode') returns our API shim.
				ExtModule = Require(ModulePath) as typeof ExtModule;
			} catch (RequireErr: unknown) {
				// Fallback for extensions whose main is actually ESM despite
				// no `"type": "module"` field - try dynamic import().
				const Msg =
					RequireErr instanceof Error
						? RequireErr.message
						: String(RequireErr);
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
			);
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
					}).join(" | ");
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
					);
					const Enabled =
						ConfigState?.ConfigCache?.get?.("git.enabled");
					const AutoDetectShape = `${typeof AutoDetect}=${
						typeof AutoDetect === "object"
							? JSON.stringify(AutoDetect).slice(0, 80)
							: String(AutoDetect)
					}`;
					CocoonDevLog(
						"ext-preactivate",
						`[ExtensionHostHandler] ${Phase} ${ExtensionId} folders.length=${InitFolders.length} | git.enabled=${Enabled} | git.autoRepositoryDetection=${AutoDetectShape} | ${FolderShape}`,
					);
				} catch (Err) {
					CocoonDevLog(
						"ext-preactivate",
						`[ExtensionHostHandler] ${Phase} ${ExtensionId} snapshot failed: ${
							(Err as { message?: string })?.message ??
							String(Err)
						}`,
					);
				}
			};
			if (InstrumentedExtensions.includes(ExtensionId)) {
				SnapshotInitState("PRE-ACTIVATE");
			}
			const ExtActivateResult = await ActivateFn(ExtContext);
			// CRITICAL: backfill the activate() return value into the
			// extension's registry entry so `vscode.extensions.getExtension(id).exports`
			// resolves correctly. Extensions that expose an API (e.g. Roo-Code
			// exposing its agent, Claude extension exposing its client, test runners
			// exposing their controller) rely on consumers being able to read
			// `.exports` on the `Extension<T>` object returned by `getExtension()`.
			// Previously always `undefined`; now set to the real return value.
			const RegEntry = Context.ExtensionRegistry.get(ExtensionId);
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
			);
			if (InstrumentedExtensions.includes(ExtensionId)) {
				// Post-activate snapshot - vscode.git's `Model.doInitialScan`
				// runs in `.finally(...)` (background) *after* `_activate`
				// returns. Capture state right after activate() resolves so
				// we can compare the pre/post difference - if folders or
				// autoRepositoryDetection differ between the two ticks, the
				// extension is reading a different snapshot than we instrumented.
				SnapshotInitState("POST-ACTIVATE");
				// Schedule one more snapshot 1s later to catch any state that
				// landed via $deltaWorkspaceFolders during activation.
				setTimeout(() => SnapshotInitState("DEFERRED-1S"), 1000);
			}
			CocoonDevLog(
				"ext-activate",
				`[ExtActivate] ok ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`,
			);
		} else {
			CocoonDevLog(
				"ext-activate",
				`[ExtensionHostHandler] ${ExtensionId} loaded but no activate() function found`,
			);
			CocoonDevLog(
				"ext-activate",
				`[ExtActivate] no-activate-fn ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`,
			);
		}
	} catch (Err: unknown) {
		// Remove from set so a retry is possible
		Context.ActivatedExtensions.delete(ExtensionId);
		const Message = Err instanceof Error ? Err.message : String(Err);
		CocoonDevLog(
			"ext-activate",
			`[ExtActivate] fail ext=${ExtensionId} duration_ms=${Date.now() - StartMs} error=${Message.replace(/\n/g, " | ")}`,
		);
		throw Err;
	}
};

export default ActivateExtension;
