/**
 * @module Handler/VscodeAPI/WorkspaceNamespace
 * @description
 * Factory for the vscode.workspace namespace shim. Filesystem and
 * configuration operations proxy to Mountain over the reverse gRPC channel
 * via `Context.MountainClient.sendRequest`. Document lifecycle events fire
 * off `Context.WorkspaceEventEmitter`, which Mountain populates via
 * document-change notifications.
 */

import type { HandlerContext } from "../../HandlerContext.js";
import { FindFilesLocal } from "./FindFiles.js";
import { CreateFileSystemWatcher } from "./FileSystemWatcher.js";
import {
	CreateConfigurationState,
	BuildGetConfiguration,
	BuildOnDidChangeConfiguration,
} from "./Configuration.js";
import {
	BuildOpenTextDocument,
	BuildSaveAll,
	BuildApplyEdit,
	BuildUpdateWorkspaceFolders,
	BuildDocumentEventMembers,
} from "./TextDocument.js";
import {
	BuildRegisterTextDocumentContentProvider,
	BuildRegisterFileSystemProvider,
	BuildRegisterTaskProvider,
	BuildRegisterNotebookContentProvider,
	BuildRegisterNotebookSerializer,
	BuildRegisterRemoteAuthorityResolver,
	BuildRegisterResourceLabelFormatter,
} from "./Providers.js";
import { BuildFileSystemNamespace } from "./FileSystemNamespace.js";

const CreateWorkspaceNamespace = (Context: HandlerContext) => {
	const InitWorkspace = (Context.ExtensionHostInitData?.workspace ??
		Context.ExtensionHostInitData?.workspaceData ??
		{}) as {
		folders?: Array<{ uri: unknown; name: string; index: number }>;
		name?: string;
	};

	// `workspace.workspaceFolders` must reflect Mountain's current state
	// across `$deltaWorkspaceFolders` mutations without extensions needing to
	// re-read the namespace. `Context.ExtensionHostInitData.workspace.folders`
	// is updated in place by NotificationHandler when a delta arrives, so a
	// live getter on the returned shim always returns the latest array.
	const ReadFolders = (): Array<{
		uri: unknown;
		name: string;
		index: number;
	}> => {
		const Live = (Context.ExtensionHostInitData?.workspace ??
			Context.ExtensionHostInitData?.workspaceData ??
			{}) as {
			folders?: Array<{ uri: unknown; name: string; index: number }>;
		};
		return Live.folders ?? [];
	};

	const ReadName = (): string | undefined => {
		const Live = (Context.ExtensionHostInitData?.workspace ??
			Context.ExtensionHostInitData?.workspaceData ??
			{}) as { name?: string };
		return Live.name ?? InitWorkspace.name;
	};

	const ConfigState = CreateConfigurationState(Context);
	// Expose the shared Configuration cache + priming helpers on the
	// globalThis so `ExtensionHostHandler.ActivateExtension` can seed
	// `contributes.configuration.properties` defaults before the
	// extension's `activate()` synchronously reaches into nested config
	// paths (GitLens, rust-analyzer, vscodevim all do this). One state
	// instance per process, same as the shim itself.
	(globalThis as { __cocoonConfigState?: typeof ConfigState }).__cocoonConfigState =
		ConfigState;

	return {
		get workspaceFolders() {
			return ReadFolders();
		},
		get name() {
			return ReadName();
		},
		workspaceFile: undefined,
		rootPath: undefined,
		textDocuments: [] as unknown[],
		notebookDocuments: [] as unknown[],

		getConfiguration: BuildGetConfiguration(Context, ConfigState),

		findFiles: async (
			Include: unknown,
			Exclude?: unknown,
			MaxResults?: number,
		): Promise<unknown[]> =>
			FindFilesLocal(Context, ReadFolders(), Include, Exclude, MaxResults),

		// `findFiles2` - VS Code 1.90+ multi-pattern search API. Extensions
		// (copilot, vim, markdown-language-features) upgraded to this
		// signature. Map the first pattern through the same FindFilesLocal
		// glob engine the legacy `findFiles` uses so behaviour matches.
		findFiles2: async (
			FilePatterns: readonly unknown[],
			Options?: { exclude?: unknown; maxResults?: number },
		): Promise<unknown[]> => {
			const Include = Array.isArray(FilePatterns)
				? FilePatterns[0]
				: FilePatterns;
			return FindFilesLocal(
				Context,
				ReadFolders(),
				Include,
				Options?.exclude,
				Options?.maxResults,
			);
		},

		// `findTextInFiles` / `findTextInFiles2` - ripgrep-backed text
		// search. Mountain has `Search.TextSearch` in Track/Effect but no
		// Cocoon caller today. Stub with an empty Progress + Promise until
		// the text-search round-trip is wired; matches VS Code's "no hits"
		// return shape so callers (eslint, search-extensions) don't crash.
		findTextInFiles: async (
			_Query: unknown,
			_Options?: unknown,
			_Callback?: (Result: unknown) => void,
			_Token?: unknown,
		): Promise<{ limitHit: boolean }> => ({ limitHit: false }),
		findTextInFiles2: async (
			_Query: unknown,
			_Options?: unknown,
			_Callback?: (Result: unknown) => void,
			_Token?: unknown,
		): Promise<{ limitHit: boolean }> => ({ limitHit: false }),

		openTextDocument: BuildOpenTextDocument(Context),

		// `openNotebookDocument` - notebook renderer support. Land has no
		// notebook editor yet; return a minimal NotebookDocument shape so
		// callers that immediately read `.uri` / `.cellCount` don't crash.
		openNotebookDocument: async (_UriOrContent: unknown, _Content?: unknown) => ({
			uri: undefined,
			version: 1,
			notebookType: "jupyter-notebook",
			isUntitled: false,
			isDirty: false,
			isClosed: false,
			metadata: {},
			cellCount: 0,
			cellAt: () => null,
			getCells: () => [],
			save: async () => false,
		}),

		saveAll: BuildSaveAll(Context),
		applyEdit: BuildApplyEdit(Context),
		asRelativePath: (PathOrUri: unknown, IncludeWorkspaceFolder?: boolean) => {
			const Raw =
				typeof PathOrUri === "string"
					? PathOrUri
					: (PathOrUri as { fsPath?: string; path?: string })?.fsPath ??
						(PathOrUri as { fsPath?: string; path?: string })?.path ??
						String(PathOrUri);
			const Folders = ReadFolders();
			for (const Folder of Folders) {
				const FolderPath =
					(Folder.uri as { fsPath?: string; path?: string })?.fsPath ??
					(Folder.uri as { fsPath?: string; path?: string })?.path ??
					"";
				if (FolderPath && Raw.startsWith(FolderPath)) {
					const Relative = Raw.slice(FolderPath.length).replace(
						/^\/+/,
						"",
					);
					if (IncludeWorkspaceFolder && Folders.length > 1) {
						return `${Folder.name}/${Relative}`;
					}
					return Relative;
				}
			}
			return Raw;
		},

		// `getWorkspaceFolder(uri)` - single-folder lookup. THE most-called
		// workspace API: every extension that handles a URI does
		// `workspace.getWorkspaceFolder(uri).name` / `.uri` / `.index` to
		// find the containing folder. Missing this crashes any URI-handling
		// extension with `cannot read 'name' of undefined`. Delegates to
		// prefix match on folder URIs - exactly what VS Code does before
		// calling its `resolveWorkspaceFolder` RPC.
		getWorkspaceFolder: (
			Uri: unknown,
		): { uri: unknown; name: string; index: number } | undefined => {
			const Raw =
				typeof Uri === "string"
					? Uri
					: (Uri as { fsPath?: string; path?: string })?.fsPath ??
						(Uri as { fsPath?: string; path?: string })?.path ??
						"";
			if (!Raw) return undefined;
			for (const Folder of ReadFolders()) {
				const FolderPath =
					(Folder.uri as { fsPath?: string; path?: string })?.fsPath ??
					(Folder.uri as { fsPath?: string; path?: string })?.path ??
					"";
				if (FolderPath && Raw.startsWith(FolderPath)) {
					return Folder;
				}
			}
			return undefined;
		},

		// `resolveProxy` - Land has no network proxy intercept; let the
		// extension fall back to direct connections by returning undefined.
		// Stock VS Code's `extHostWorkspace.resolveProxy` routes through
		// the main process's `IRequestService`.
		resolveProxy: async (_Url: string): Promise<string | undefined> =>
			undefined,

		// Text codec helpers - VS Code 1.98+ exposes these on
		// `vscode.workspace`. TextEncoder/Decoder are globals in Node 16+,
		// so direct delegation is safe.
		encode: (Value: string, _Encoding?: string): Uint8Array =>
			new TextEncoder().encode(Value),
		decode: (Buffer: Uint8Array, Encoding?: string): string =>
			new TextDecoder(Encoding ?? "utf-8").decode(Buffer),

		// BATCH-14 follow-up: forwards through Mountain's `$updateWorkspaceFolders`
		// which mutates ApplicationState.Workspace and fires `$deltaWorkspaceFolders`
		// back - the listener wiring from BATCH-14 does the rest.
		updateWorkspaceFolders: BuildUpdateWorkspaceFolders(
			Context,
			ReadFolders,
		),

		...BuildDocumentEventMembers(Context),

		onDidChangeConfiguration: BuildOnDidChangeConfiguration(ConfigState),

		onDidChangeWorkspaceFolders: (
			Listener: (Event: {
				added: readonly unknown[];
				removed: readonly unknown[];
			}) => any,
		) => {
			// NotificationHandler emits this on the WorkspaceEventEmitter
			// whenever Mountain dispatches `$deltaWorkspaceFolders`.
			Context.WorkspaceEventEmitter.on(
				"didChangeWorkspaceFolders",
				Listener,
			);
			return {
				dispose: () => {
					Context.WorkspaceEventEmitter.removeListener(
						"didChangeWorkspaceFolders",
						Listener,
					);
				},
			};
		},

		// Provider registrations - each backed by a Mountain round-trip.
		registerTextDocumentContentProvider:
			BuildRegisterTextDocumentContentProvider(Context),
		registerFileSystemProvider: BuildRegisterFileSystemProvider(Context),
		registerTaskProvider: BuildRegisterTaskProvider(Context),
		registerNotebookContentProvider:
			BuildRegisterNotebookContentProvider(Context),
		registerNotebookSerializer: BuildRegisterNotebookSerializer(Context),
		registerRemoteAuthorityResolver:
			BuildRegisterRemoteAuthorityResolver(Context),
		registerResourceLabelFormatter:
			BuildRegisterResourceLabelFormatter(Context),

		// Stub-only registrations (no Mountain route yet).
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
		// `vscode.git`'s activate() subscribes to this at
		// `extensions/git/out/main.js:init`. Land has no workspace-trust
		// enforcement yet (every workspace is treated as trusted), so the
		// "trusted folders set changed" event can never fire. Expose a
		// real no-op subscription whose disposable is safe to call - any
		// missing property here crashes git activation with
		// `TypeError: …onDidChangeWorkspaceTrustedFolders is not a function`
		// and the Source Control panel then shows "No source control
		// providers registered" because `vscode.git.createSourceControl`
		// never runs. Added for parity with
		// `vs/workbench/api/common/extHostWorkspace.ts::onDidChangeWorkspaceTrustedFolders`.
		onDidChangeWorkspaceTrustedFolders: () => ({ dispose: () => {} }),
		// Same family; kept stubbed for symmetry so any other extension
		// that subscribes to the non-folder-scoped variant doesn't fail
		// at activation time.
		onDidChangeWorkspaceTrust: () => ({ dispose: () => {} }),
		workspaceTrustedFolders: [] as unknown[],
		isTrusted: true,
		trusted: true,
		requestWorkspaceTrust: async () => true,
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

		// createFileSystemWatcher is tier-gated - see FileSystemWatcher.ts.
		createFileSystemWatcher: (
			Pattern: unknown,
			IgnoreCreateEvents?: boolean,
			IgnoreChangeEvents?: boolean,
			IgnoreDeleteEvents?: boolean,
		) =>
			CreateFileSystemWatcher(
				Context,
				Pattern,
				IgnoreCreateEvents,
				IgnoreChangeEvents,
				IgnoreDeleteEvents,
			),

		fs: BuildFileSystemNamespace(Context),
	};
};

export default CreateWorkspaceNamespace;
