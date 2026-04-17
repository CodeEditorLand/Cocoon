/**
 * @module Handler/VscodeAPI/WorkspaceNamespace
 * @description
 * Factory for the vscode.workspace namespace shim. Filesystem and
 * configuration operations proxy to Mountain over the reverse gRPC channel
 * via `Context.MountainClient.sendRequest`. Document lifecycle events fire
 * off `Context.WorkspaceEventEmitter`, which Mountain populates via
 * document-change notifications.
 */

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
 * Convert a VS Code glob (tolerates `**`, `*`, `?`, `{a,b}`, char classes) to
 * an anchored regex. This is not a full minimatch — we support the subset the
 * built-in extensions use on activate: `**\/package.json`, `**\/*.ts`,
 * `{**\/tsconfig.json,**\/tsconfig.*.json}`. Unknown constructs fall through
 * as literal characters so worst case a stricter pattern just matches nothing.
 */
const GlobToRegex = (Glob: string): RegExp => {
	let Expression = "^";
	let CurlyDepth = 0;
	for (let I = 0; I < Glob.length; I++) {
		const Character = Glob[I]!;
		const Next = Glob[I + 1];
		if (Character === "*" && Next === "*") {
			// `**/` or `**` — match anything including `/`
			Expression += ".*";
			I++;
			if (Glob[I + 1] === "/") I++;
		} else if (Character === "*") {
			Expression += "[^/]*";
		} else if (Character === "?") {
			Expression += "[^/]";
		} else if (Character === "{") {
			Expression += "(?:";
			CurlyDepth++;
		} else if (Character === "}") {
			if (CurlyDepth > 0) {
				Expression += ")";
				CurlyDepth--;
			} else {
				Expression += "\\}";
			}
		} else if (Character === "," && CurlyDepth > 0) {
			Expression += "|";
		} else if (/[.+^$()|\[\]\\]/.test(Character)) {
			Expression += "\\" + Character;
		} else {
			Expression += Character;
		}
	}
	Expression += "$";
	return new RegExp(Expression);
};

/**
 * Normalise VS Code's GlobPattern overloads to a plain string. Accepts a raw
 * string, a RelativePattern-shaped object, or a Uri-shaped object. We only
 * need the pattern — base resolution is handled by the workspace walk.
 */
const ExtractGlobPattern = (Raw: unknown): string | undefined => {
	if (typeof Raw === "string" && Raw.length > 0) return Raw;
	if (Raw && typeof Raw === "object") {
		const Obj = Raw as Record<string, unknown>;
		if (typeof Obj["pattern"] === "string")
			return Obj["pattern"] as string;
		if (typeof Obj["glob"] === "string") return Obj["glob"] as string;
	}
	return undefined;
};

/**
 * Strip `file://` from a workspace-folder URI (string or UriComponents-ish
 * object) to get a filesystem path we can walk with `fs.readdir`.
 */
const FolderToFsPath = (FolderUri: unknown): string | undefined => {
	const Raw =
		typeof FolderUri === "string"
			? FolderUri
			: (FolderUri as Record<string, unknown>)?.["fsPath"] ??
				(FolderUri as Record<string, unknown>)?.["path"] ??
				(FolderUri as Record<string, unknown>)?.["external"];
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
		typeof MaxResults === "number" && MaxResults > 0
			? MaxResults
			: 10_000;

	console.log(
		`[LandFix:WsNs] findFiles include=${IncludePattern ?? "<any>"} exclude=${ExcludePattern ?? "<none>"} cap=${Cap} folders=${Folders.length}`,
	);

	if (!IncludePattern) {
		console.warn("[LandFix:WsNs] findFiles: no include pattern → []");
		return [];
	}

	let IncludeRegex: RegExp;
	try {
		IncludeRegex = GlobToRegex(IncludePattern);
	} catch (Error: unknown) {
		console.warn(
			`[LandFix:WsNs] findFiles: glob compile failed for ${IncludePattern}: ${
				Error instanceof Error ? Error.message : String(Error)
			}`,
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

	const Walk = async (Root: string, Current: string): Promise<void> => {
		if (Results.length >= Cap) return;
		let Entries: Array<{ name: string; isDirectory(): boolean }>;
		try {
			Entries = (await readdir(Current, {
				withFileTypes: true,
			})) as unknown as Array<{
				name: string;
				isDirectory(): boolean;
			}>;
		} catch {
			return;
		}
		for (const Entry of Entries) {
			if (Results.length >= Cap) return;
			const Name = Entry.name;
			if (DefaultExcludeSegments.has(Name)) continue;
			const Full = join(Current, Name);
			const RelativeFromRoot = relative(Root, Full).split(sep).join("/");
			if (Entry.isDirectory()) {
				await Walk(Root, Full);
				continue;
			}
			if (ExcludeRegex && ExcludeRegex.test(RelativeFromRoot)) continue;
			if (!IncludeRegex.test(RelativeFromRoot)) continue;
			Results.push({ scheme: "file", path: Full, fsPath: Full });
		}
	};

	for (const Folder of Folders) {
		const FsPath = FolderToFsPath(Folder?.uri);
		if (!FsPath) {
			console.warn(
				`[LandFix:WsNs] findFiles: folder has no fsPath (name=${Folder?.name})`,
			);
			continue;
		}
		await Walk(FsPath, FsPath);
	}

	console.log(
		`[LandFix:WsNs] findFiles: matched ${Results.length} file(s) for include=${IncludePattern}`,
	);
	return Results;
};

const CreateWorkspaceNamespace = (Context: HandlerContext) => {
	const InitWorkspace = (Context.ExtensionHostInitData?.workspace ??
		Context.ExtensionHostInitData?.workspaceData ??
		{}) as {
		folders?: Array<{ uri: unknown; name: string; index: number }>;
		name?: string;
	};

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
				// Fire-and-forget; synchronous VS Code API forces default-return.
				// Real data would require a pre-populated cache primed by Mountain.
				void Call<T>(Context, "Configuration.Inspect", [Full]);
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
			},
			has: (Key: string): boolean => {
				void Key;
				return false;
			},
			inspect: () => undefined,
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
		onDidChangeConfiguration: () => ({ dispose: () => {} }),
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
		createFileSystemWatcher: () => ({
			ignoreCreateEvents: false,
			ignoreChangeEvents: false,
			ignoreDeleteEvents: false,
			onDidCreate: () => ({ dispose: () => {} }),
			onDidChange: () => ({ dispose: () => {} }),
			onDidDelete: () => ({ dispose: () => {} }),
			dispose: () => {},
		}),

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
					const LooksLike404 = /resource not found|ENOENT|not found/i.test(
						Message,
					);
					if (LooksLike404) {
						console.log(
							`[LandFix:FsRead] 404 → FileNotFound for ${UriString}`,
						);
						const Api = (globalThis as any).__cocoonVscodeAPI;
						const FileNotFound =
							Api?.FileSystemError?.FileNotFound;
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
					console.warn(
						`[LandFix:FsRead] non-404 failure for ${UriString}: ${Message}`,
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
