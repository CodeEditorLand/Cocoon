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
			// Dispatcher has Search.TextSearch — closest existing route. Real
			// findFiles would need a dedicated Search.FindFiles handler.
			// Mountain expects a TextSearchQuery struct, not positional args.
			const Pattern =
				typeof Include === "string"
					? Include
					: ((Include as { pattern?: string })?.pattern ?? "");
			const ExcludePattern =
				typeof Exclude === "string"
					? Exclude
					: (Exclude as { pattern?: string })?.pattern;
			const Results = await Call<unknown[]>(
				Context,
				"Search.TextSearch",
				{
					pattern: Pattern,
					include: Pattern,
					exclude: ExcludePattern,
					maxResults: MaxResults,
					isRegExp: false,
					isCaseSensitive: false,
					isWordMatch: false,
				},
			);
			return Results ?? [];
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
				const Text =
					(await Call<string>(Context, "FileSystem.ReadFile", [
						String(Uri),
					])) ?? "";
				return new TextEncoder().encode(Text);
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
