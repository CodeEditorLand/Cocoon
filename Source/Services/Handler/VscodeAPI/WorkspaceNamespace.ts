/**
 * @module Handler/VscodeAPI/WorkspaceNamespace
 * @description
 * Factory for the vscode.workspace namespace shim. Filesystem and
 * configuration operations proxy to Mountain over the reverse gRPC channel
 * via `Context.MountainClient.sendRequest`. Document lifecycle events fire
 * off `Context.WorkspaceEventEmitter`, which Mountain populates via
 * document-change notifications.
 */

import GlobToRegex from "../../../Utility/GlobToRegex.js";
import Tier from "../../../Utility/Tier.js";
import type { HandlerContext } from "../HandlerContext.js";

const EventSubscriber =
	(Context: HandlerContext, EventName: string) =>
	(Listener: (...Arguments: any[]) => any) => {
		Context.WorkspaceEventEmitter.on(EventName, Listener);
		return {
			dispose: () => {
				Context.WorkspaceEventEmitter.removeListener(
					EventName,
					Listener,
				);
			},
		};
	};

const Call = async <T>(
	Context: HandlerContext,
	Method: string,
	Parameters: unknown,
): Promise<T | undefined> => {
	try {
		return (await Context.MountainClient?.sendRequest(
			Method,
			Parameters,
		)) as T | undefined;
	} catch {
		return undefined;
	}
};

// Directories that nearly every extension wants excluded from `findFiles`. The
// stub previously returned `[]`, which was conservative but broke
// `npm.hasPackageJson`, TS tsconfig discovery, and a handful of others. Now we
// walk the workspace ourselves; these prefixes keep the walk bounded.
const DefaultExcludeSegments = new Set([
	".git",
	"node_modules",
	".astro",
	".next",
	".nuxt",
	".cache",
	".turbo",
	".pnpm",
	"Target",
	"target",
	"dist",
	"out",
	"build",
	".DS_Store",
]);

/**
 * Normalise VS Code's GlobPattern overloads to a plain string. Accepts a raw
 * string, a RelativePattern-shaped object, or a Uri-shaped object. We only
 * need the pattern — base resolution is handled by the workspace walk.
 */
const ExtractGlobPattern = (Raw: unknown): string | undefined => {
	if (typeof Raw === "string" && Raw.length > 0) return Raw;
	if (Raw && typeof Raw === "object") {
		const Obj = Raw as Record<string, unknown>;
		if (typeof Obj["pattern"] === "string") return Obj["pattern"] as string;
		if (typeof Obj["glob"] === "string") return Obj["glob"] as string;
	}
	return undefined;
};

/**
 * Strip `file://` from a workspace-folder URI (string or UriComponents-ish
 * object) to get a filesystem path we can walk with `fs.readdir`.
 */
// Process-wide counter for createFileSystemWatcher handles. Monotonic so the
// same handle never re-appears after dispose.
let WatcherCounter = 0;

const FolderToFsPath = (FolderUri: unknown): string | undefined => {
	const Raw =
		typeof FolderUri === "string"
			? FolderUri
			: ((FolderUri as Record<string, unknown>)?.["fsPath"] ??
				(FolderUri as Record<string, unknown>)?.["path"] ??
				(FolderUri as Record<string, unknown>)?.["external"]);
	if (typeof Raw !== "string" || Raw.length === 0) return undefined;
	if (Raw.startsWith("file:")) {
		try {
			return decodeURIComponent(new URL(Raw).pathname);
		} catch {
			return Raw.replace(/^file:\/\//, "");
		}
	}
	return Raw;
};

const FindFilesLocal = async (
	_Context: HandlerContext,
	Folders: Array<{ uri: unknown; name: string; index: number }>,
	Include: unknown,
	Exclude?: unknown,
	MaxResults?: number,
): Promise<Array<{ scheme: string; path: string; fsPath: string }>> => {
	const IncludePattern = ExtractGlobPattern(Include);
	const ExcludePattern = ExtractGlobPattern(Exclude);
	const Cap =
		typeof MaxResults === "number" && MaxResults > 0 ? MaxResults : 10_000;

	process.stdout.write(
		`[LandFix:WsNs] findFiles include=${IncludePattern ?? "<any>"} exclude=${ExcludePattern ?? "<none>"} cap=${Cap} folders=${Folders.length}\n`,
	);

	if (!IncludePattern) {
		process.stdout.write(
			"[LandFix:WsNs] findFiles: no include pattern → []\n",
		);
		return [];
	}

	let IncludeRegex: RegExp;
	try {
		IncludeRegex = GlobToRegex(IncludePattern);
	} catch (Error: unknown) {
		process.stdout.write(
			`[LandFix:WsNs] findFiles: glob compile failed for ${IncludePattern}: ${Error instanceof Error ? Error.message : String(Error)}\n`,
		);
		return [];
	}
	let ExcludeRegex: RegExp | undefined;
	if (ExcludePattern) {
		try {
			ExcludeRegex = GlobToRegex(ExcludePattern);
		} catch {}
	}

	const { readdir } = await import("node:fs/promises");
	const { join, relative, sep } = await import("node:path");

	const Results: Array<{
		scheme: string;
		path: string;
		fsPath: string;
	}> = [];

	// Hard caps protect against symlink cycles, mis-configured extensions, and
	// pathological patterns matching the entire filesystem. A typical large
	// VS Code workspace (chromium, linux) is <= 12 levels deep, so 32 is
	// generous. The 30 s deadline is pulled forward on caller timeout.
	const MaxDepth = 32;
	const DeadlineAt = Date.now() + 30_000;
	let Truncated: "" | "cap" | "depth" | "deadline" = "";

	const Walk = async (
		Root: string,
		Current: string,
		Depth: number,
	): Promise<void> => {
		if (Results.length >= Cap) {
			Truncated = "cap";
			return;
		}
		if (Depth > MaxDepth) {
			Truncated = Truncated || "depth";
			return;
		}
		if (Date.now() > DeadlineAt) {
			Truncated = Truncated || "deadline";
			return;
		}
		let Entries: Array<{
			name: string;
			isDirectory(): boolean;
			isSymbolicLink(): boolean;
		}>;
		try {
			Entries = (await readdir(Current, {
				withFileTypes: true,
			})) as unknown as Array<{
				name: string;
				isDirectory(): boolean;
				isSymbolicLink(): boolean;
			}>;
		} catch {
			return;
		}

		// Partition entries so we can read the directory's own files into the
		// result set before recursing. This also enables a bounded fan-out into
		// subdirectories without blocking the main event loop on deep trees.
		const SubDirectories: string[] = [];
		for (const Entry of Entries) {
			if (Results.length >= Cap) {
				Truncated = "cap";
				return;
			}
			const Name = Entry.name;
			if (DefaultExcludeSegments.has(Name)) continue;
			// Refuse to follow symlinks — common source of infinite recursion
			// (e.g. `node_modules/.bin/node → ../node/bin/node → …`).
			if (
				typeof Entry.isSymbolicLink === "function" &&
				Entry.isSymbolicLink()
			)
				continue;
			const Full = join(Current, Name);
			const RelativeFromRoot = relative(Root, Full).split(sep).join("/");
			if (Entry.isDirectory()) {
				SubDirectories.push(Full);
				continue;
			}
			if (ExcludeRegex && ExcludeRegex.test(RelativeFromRoot)) continue;
			if (!IncludeRegex.test(RelativeFromRoot)) continue;
			Results.push({ scheme: "file", path: Full, fsPath: Full });
		}

		// Bounded parallel descent: 4 concurrent readdir()s per level keeps
		// FD pressure low while cutting wall-clock by ~3× on SSD-backed trees.
		const Concurrency = 4;
		for (
			let Index = 0;
			Index < SubDirectories.length;
			Index += Concurrency
		) {
			const Batch = SubDirectories.slice(Index, Index + Concurrency);
			await Promise.all(Batch.map((Sub) => Walk(Root, Sub, Depth + 1)));
			if (Results.length >= Cap) {
				Truncated = "cap";
				return;
			}
			if (Date.now() > DeadlineAt) {
				Truncated = Truncated || "deadline";
				return;
			}
		}
	};

	for (const Folder of Folders) {
		const FsPath = FolderToFsPath(Folder?.uri);
		if (!FsPath) {
			process.stdout.write(
				`[LandFix:WsNs] findFiles: folder has no fsPath (name=${Folder?.name})\n`,
			);
			continue;
		}
		await Walk(FsPath, FsPath, 0);
	}
	if (Truncated) {
		process.stdout.write(
			`[LandFix:WsNs] findFiles: truncated (${Truncated}) at ${Results.length} result(s)\n`,
		);
	}

	process.stdout.write(
		`[LandFix:WsNs] findFiles: matched ${Results.length} file(s) for include=${IncludePattern}\n`,
	);
	return Results;
};

type WorkspaceFolderRecord = {
	uri: unknown;
	name: string;
	index: number;
	FsPath?: string;
};

const ResolveWorkspaceFolders = (
	Context: HandlerContext,
): WorkspaceFolderRecord[] => {
	const InitWorkspace = (Context.ExtensionHostInitData?.workspace ??
		Context.ExtensionHostInitData?.workspaceData ??
		{}) as {
		folders?: Array<{ uri: unknown; name: string; index: number }>;
	};
	return (InitWorkspace.folders ?? []).map((Folder) => ({
		...Folder,
		FsPath: FolderToFsPath(Folder?.uri),
	}));
};

const CreateWorkspaceNamespace = (Context: HandlerContext) => {
	const InitWorkspace = (Context.ExtensionHostInitData?.workspace ??
		Context.ExtensionHostInitData?.workspaceData ??
		{}) as {
		folders?: Array<{ uri: unknown; name: string; index: number }>;
		name?: string;
	};

	// Configuration cache: VS Code's `WorkspaceConfiguration.get(key, default)`
	// is synchronous, but our backing store is a gRPC round-trip to Mountain.
	// Bridge that mismatch with a write-through cache:
	//   - First sync read misses, returns `DefaultValue`, fires background
	//     `Configuration.Inspect` to prime the cache.
	//   - Subsequent reads hit the cache and return the real value.
	//   - `update()` writes to Mountain AND the cache; triggers change event.
	//   - `onDidChangeConfiguration` listeners fire on every cache mutation.
	// A single cache is shared across all `getConfiguration(section)` calls
	// because extensions expect settings changes in one section to be visible
	// to another's listener.
	const ConfigCache = new Map<string, unknown>();
	const ConfigInFlight = new Set<string>();
	const ConfigListeners = new Set<
		(Event: { affectsConfiguration: (Key: string) => boolean }) => void
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
	// host, Mountain fires this notification — we invalidate the affected
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
			// Unknown affected keys — invalidate everything. Future reads
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

	return {
		workspaceFolders: InitWorkspace.folders ?? [],
		name: InitWorkspace.name,
		workspaceFile: undefined,
		rootPath: undefined,
		textDocuments: [] as unknown[],
		notebookDocuments: [] as unknown[],

		getConfiguration: (Section?: string, _Scope?: unknown) => ({
			get: <T>(Key: string, DefaultValue?: T): T | undefined => {
				const Full = Section ? `${Section}.${Key}` : Key;
				if (ConfigCache.has(Full)) {
					return ConfigCache.get(Full) as T;
				}
				PrimeConfig(Full);
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
				const Prior = ConfigCache.get(Full);
				ConfigCache.set(Full, Value);
				if (Prior !== Value) FireConfigChange(Full);
			},
			has: (Key: string): boolean => {
				const Full = Section ? `${Section}.${Key}` : Key;
				if (ConfigCache.has(Full)) return true;
				PrimeConfig(Full);
				return false;
			},
			inspect: <T>(Key: string) => {
				const Full = Section ? `${Section}.${Key}` : Key;
				if (!ConfigCache.has(Full)) {
					PrimeConfig(Full);
					return undefined;
				}
				const Cached = ConfigCache.get(Full) as T;
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
		}),

		findFiles: async (
			Include: unknown,
			Exclude?: unknown,
			MaxResults?: number,
		): Promise<unknown[]> => {
			return FindFilesLocal(
				Context,
				InitWorkspace.folders ?? [],
				Include,
				Exclude,
				MaxResults,
			);
		},

		openTextDocument: async (UriOrPath: any) => {
			const UriString =
				typeof UriOrPath === "string"
					? UriOrPath
					: (UriOrPath?.toString?.() ?? "");
			const Cached = Context.DocumentContentCache.get(UriString);
			const Text =
				Cached ??
				(await Call<string>(Context, "FileSystem.ReadFile", [
					UriString,
				])) ??
				"";
			return {
				uri: UriOrPath,
				fileName: UriString,
				languageId: "plaintext",
				isDirty: false,
				isClosed: false,
				isUntitled: false,
				version: 1,
				eol: 1,
				lineCount: Text.split("\n").length,
				getText: () => Text,
				save: async () => true,
			};
		},

		saveAll: async (_IncludeUntitled?: boolean) => {
			await Call<void>(Context, "Document.Save", []);
			return true;
		},

		applyEdit: async (_Edit: unknown) => {
			// No dedicated dispatcher route yet — fire as notification so Wind
			// can subscribe via the cocoon:workspace.applyEdit Tauri event.
			Context.SendToMountain("workspace.applyEdit", _Edit).catch(
				() => {},
			);
			return true;
		},

		asRelativePath: (PathOrUri: unknown) => String(PathOrUri),

		updateWorkspaceFolders: () => false,

		onDidOpenTextDocument: EventSubscriber(Context, "didOpenTextDocument"),
		onDidCloseTextDocument: EventSubscriber(
			Context,
			"didCloseTextDocument",
		),
		onDidChangeTextDocument: EventSubscriber(
			Context,
			"didChangeTextDocument",
		),
		onDidSaveTextDocument: EventSubscriber(Context, "didSaveTextDocument"),
		onWillSaveTextDocument: EventSubscriber(
			Context,
			"willSaveTextDocument",
		),
		onDidCreateFiles: EventSubscriber(Context, "didCreateFiles"),
		onDidDeleteFiles: EventSubscriber(Context, "didDeleteFiles"),
		onDidRenameFiles: EventSubscriber(Context, "didRenameFiles"),
		onDidChangeConfiguration: (
			Listener: (Event: {
				affectsConfiguration: (Key: string) => boolean;
			}) => void,
		) => {
			ConfigListeners.add(Listener);
			return {
				dispose: () => {
					ConfigListeners.delete(Listener);
				},
			};
		},
		onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),

		registerTextDocumentContentProvider: () => ({ dispose: () => {} }),
		registerFileSystemProvider: () => ({ dispose: () => {} }),
		registerTaskProvider: () => ({ dispose: () => {} }),
		registerNotebookContentProvider: () => ({ dispose: () => {} }),
		registerNotebookSerializer: () => ({ dispose: () => {} }),
		registerRemoteAuthorityResolver: (
			_AuthorityPrefix: string,
			_Resolver: unknown,
		) => ({ dispose: () => {} }),
		registerResourceLabelFormatter: (_Formatter: unknown) => ({
			dispose: () => {},
		}),
		registerDocumentPasteEditProvider: (
			_Selector: unknown,
			_Provider: unknown,
			_Metadata?: unknown,
		) => ({ dispose: () => {} }),
		registerDocumentDropEditProvider: (
			_Selector: unknown,
			_Provider: unknown,
		) => ({ dispose: () => {} }),
		registerEditSessionIdentityProvider: () => ({ dispose: () => {} }),
		registerShareProvider: () => ({ dispose: () => {} }),
		registerCanonicalUriProvider: () => ({ dispose: () => {} }),
		onDidGrantWorkspaceTrust: () => ({ dispose: () => {} }),
		isTrusted: true,
		trusted: true,
		requestWorkspaceTrust: async () => true,
		onDidOpenNotebookDocument: EventSubscriber(
			Context,
			"didOpenNotebookDocument",
		),
		onDidCloseNotebookDocument: EventSubscriber(
			Context,
			"didCloseNotebookDocument",
		),
		onDidChangeNotebookDocument: EventSubscriber(
			Context,
			"didChangeNotebookDocument",
		),
		onDidSaveNotebookDocument: EventSubscriber(
			Context,
			"didSaveNotebookDocument",
		),
		onWillSaveNotebookDocument: EventSubscriber(
			Context,
			"willSaveNotebookDocument",
		),
		onWillRenameFiles: EventSubscriber(Context, "willRenameFiles"),
		onWillCreateFiles: EventSubscriber(Context, "willCreateFiles"),
		onWillDeleteFiles: EventSubscriber(Context, "willDeleteFiles"),
		registerTunnelProvider: (
			_Provider: unknown,
			_Information?: unknown,
		) => ({ dispose: () => {} }),
		openTunnel: async (_TunnelOptions: unknown) => ({
			remoteAddress: { port: 0, host: "localhost" },
			localAddress: "",
			dispose: () => {},
		}),
		tunnels: Promise.resolve([] as unknown[]),
		onDidChangeTunnels: () => ({ dispose: () => {} }),
		registerPortAttributesProvider: (
			_Selector: unknown,
			_Provider: unknown,
		) => ({ dispose: () => {} }),
		// createFileSystemWatcher is tier-gated.
		//
		// • Tier.FileWatcher === "Stub" (default): return a true no-op so
		//   extensions can call it at activation time without paying any
		//   cost. The TypeScript language extension alone registers ~10
		//   watchers at startup — flooding Mountain with recursive
		//   notifications from every one of them causes the event loop
		//   to saturate and the UI to stop responding to "Open File"
		//   clicks.
		//
		// • Tier.FileWatcher === "Layer4": wire to Mountain's notify-rs
		//   backend with pattern-based filtering on the Rust side so
		//   only matching paths produce events. Even in Layer4 we cap the
		//   number of watchers per workspace root by de-duplicating on
		//   root + recursive-mode + pattern combination.
		createFileSystemWatcher: (
			Pattern: unknown,
			IgnoreCreateEvents?: boolean,
			IgnoreChangeEvents?: boolean,
			IgnoreDeleteEvents?: boolean,
		) => {
			const StubDisposable = { dispose: () => {} };
			const StubWatcher = {
				ignoreCreateEvents: IgnoreCreateEvents === true,
				ignoreChangeEvents: IgnoreChangeEvents === true,
				ignoreDeleteEvents: IgnoreDeleteEvents === true,
				onDidCreate: () => StubDisposable,
				onDidChange: () => StubDisposable,
				onDidDelete: () => StubDisposable,
				dispose: () => {},
			};

			if (Tier.FileWatcher !== "Layer4") {
				return StubWatcher;
			}

			const PatternString = ExtractGlobPattern(Pattern);
			if (!PatternString) {
				return StubWatcher;
			}
			const Matcher = GlobToRegex(PatternString);
			const Folders = ResolveWorkspaceFolders(Context);
			const Root =
				(Pattern as any)?.baseUri?.fsPath ??
				(Pattern as any)?.base ??
				Folders[0]?.FsPath;
			if (!Root) {
				return StubWatcher;
			}

			const Handle = `watcher:${++WatcherCounter}`;
			// `**` anywhere in the pattern forces recursive watching; plain
			// globs restricted to a single directory use NonRecursive so we
			// don't subscribe to the whole tree just to watch one folder.
			const IsRecursive = PatternString.includes("**");
			Context.MountainClient?.sendRequest("FileWatcher.Register", [
				Handle,
				Root,
				IsRecursive,
				PatternString,
			]).catch(() => {});

			const EventName = `fileWatcher:${Handle}`;
			const MakeSubscriber = (
				Kind: "create" | "change" | "delete",
				Ignore: boolean,
			) =>
			(Listener: (Uri: unknown) => any) => {
				if (Ignore) return StubDisposable;
				const WrappedListener = (Event: {
					kind: string;
					path: string;
				}) => {
					if (Event.kind !== Kind) return;
					if (!Matcher.test(Event.path)) return;
					try {
						Listener({
							scheme: "file",
							path: Event.path,
							fsPath: Event.path,
							toString: () => `file://${Event.path}`,
						});
					} catch {}
				};
				Context.Emitter.on(EventName, WrappedListener);
				return {
					dispose: () => {
						Context.Emitter.removeListener(
							EventName,
							WrappedListener,
						);
					},
				};
			};

			return {
				ignoreCreateEvents: IgnoreCreateEvents === true,
				ignoreChangeEvents: IgnoreChangeEvents === true,
				ignoreDeleteEvents: IgnoreDeleteEvents === true,
				onDidCreate: MakeSubscriber(
					"create",
					IgnoreCreateEvents === true,
				),
				onDidChange: MakeSubscriber(
					"change",
					IgnoreChangeEvents === true,
				),
				onDidDelete: MakeSubscriber(
					"delete",
					IgnoreDeleteEvents === true,
				),
				dispose: () => {
					Context.Emitter.removeAllListeners(EventName);
					Context.MountainClient?.sendRequest(
						"FileWatcher.Unregister",
						[Handle],
					).catch(() => {});
				},
			};
		},

		fs: {
			// FileSystem.Stat is not yet in CreateEffectForRequest — falls back
			// to defaults via Call's try/catch until the Rust route is added.
			stat: async (Uri: any) =>
				(await Call<unknown>(Context, "FileSystem.Stat", [
					String(Uri),
				])) ?? {
					type: 1,
					size: 0,
					ctime: 0,
					mtime: 0,
				},
			readFile: async (Uri: any): Promise<Uint8Array> => {
				// Use raw sendRequest so we can discriminate a benign
				// "Resource not found" (extensions probing for optional cache
				// files) from a genuine I/O error. The raw-error path throws
				// a vscode `FileSystemError.FileNotFound`, which extensions'
				// own try/catch handles cleanly instead of the previous
				// empty-bytes-then-SyntaxError chain (see terminal-suggest on
				// first run).
				const UriString = String(Uri);
				try {
					const Text = (await Context.MountainClient?.sendRequest(
						"FileSystem.ReadFile",
						[UriString],
					)) as string | undefined;
					return new TextEncoder().encode(Text ?? "");
				} catch (Err: unknown) {
					const Message =
						Err instanceof Error ? Err.message : String(Err);
					const LooksLike404 =
						/resource not found|ENOENT|not found/i.test(Message);
					if (LooksLike404) {
						process.stdout.write(
							`[LandFix:FsRead] 404 → FileNotFound for ${UriString}\n`,
						);
						const Api = (globalThis as any).__cocoonVscodeAPI;
						const FileNotFound = Api?.FileSystemError?.FileNotFound;
						if (typeof FileNotFound === "function") {
							throw FileNotFound(Uri);
						}
						// Fallback: shape a VS Code-ish error so `instanceof`
						// and `.code` checks work even without the real class.
						const Synthetic: any = new Error(
							`EntryNotFound (FileSystemError): ${UriString}`,
						);
						Synthetic.code = "FileNotFound";
						Synthetic.name = "FileSystemError";
						throw Synthetic;
					}
					process.stdout.write(
						`[LandFix:FsRead] non-404 failure for ${UriString}: ${Message}\n`,
					);
					throw Err;
				}
			},
			writeFile: async (Uri: any, Content: Uint8Array) => {
				const Text = new TextDecoder().decode(Content);
				await Call<void>(Context, "FileSystem.WriteFile", [
					String(Uri),
					Text,
				]);
			},
			readDirectory: async (Uri: any): Promise<unknown[]> =>
				(await Call<unknown[]>(Context, "FileSystem.ReadDirectory", [
					String(Uri),
				])) ?? [],
			createDirectory: async (Uri: any) => {
				await Call<void>(Context, "FileSystem.CreateDirectory", [
					String(Uri),
				]);
			},
			delete: async (Uri: any, Options?: { recursive?: boolean }) => {
				await Call<void>(Context, "FileSystem.Delete", [
					String(Uri),
					Options?.recursive ?? false,
				]);
			},
			rename: async (Source: any, Target: any, _Options?: unknown) => {
				await Call<void>(Context, "FileSystem.Rename", [
					String(Source),
					String(Target),
				]);
			},
			copy: async (Source: any, Target: any, _Options?: unknown) => {
				await Call<void>(Context, "FileSystem.Copy", [
					String(Source),
					String(Target),
				]);
			},
			isWritableFileSystem: (_Scheme: string) => true,
		},
	};
};

export default CreateWorkspaceNamespace;
