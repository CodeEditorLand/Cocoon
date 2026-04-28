/**
 * @module Handler/VscodeAPI/WorkspaceNamespace
 * @description
 * Factory for the vscode.workspace namespace shim. Filesystem and
 * configuration operations proxy to Mountain over the reverse gRPC channel
 * via `Context.MountainClient.sendRequest`. Document lifecycle events fire
 * off `Context.WorkspaceEventEmitter`, which Mountain populates via
 * document-change notifications.
 */

import { TryMountainWithEmptyFallback } from "../../../DualTrack.js";
import type { HandlerContext } from "../../HandlerContext.js";
import {
	IsEqualOrParent as StockIsEqualOrParent,
	RelativePath as StockRelativePath,
	ToUri as StockToUri,
	Uri as StockUri,
} from "../StockLift.js";
import {
	BuildGetConfiguration,
	BuildOnDidChangeConfiguration,
	CreateConfigurationState,
} from "./Configuration.js";
import { BuildFileSystemNamespace } from "./FileSystemNamespace.js";
import { CreateFileSystemWatcher } from "./FileSystemWatcher.js";
import { FindFilesLocal } from "./FindFiles.js";
import { FindTextInFilesNodeFallback } from "./FindTextInFilesFallback.js";
import {
	BuildRegisterFileSystemProvider,
	BuildRegisterNotebookContentProvider,
	BuildRegisterNotebookSerializer,
	BuildRegisterRemoteAuthorityResolver,
	BuildRegisterResourceLabelFormatter,
	BuildRegisterTaskProvider,
	BuildRegisterTextDocumentContentProvider,
} from "./Providers.js";
import {
	BuildApplyEdit,
	BuildDocumentEventMembers,
	BuildOpenTextDocument,
	BuildSaveAll,
	BuildUpdateWorkspaceFolders,
} from "./TextDocument.js";
import WrapWorkspaceNamespace from "./WrapWorkspaceNamespace.js";

/**
 * Hydrate URI results coming back from Mountain (string URLs) or the
 * Cocoon-local `FindFilesLocal` (already-real `vscode.Uri` instances)
 * into a uniform array of real `vscode.Uri` objects. Extensions
 * dispatched from the workbench expect `result[i].fsPath` / `.scheme`
 * / `.with(...)` / `.toString()` to work; raw strings have none of
 * these. Stock VS Code's `URI.parse(s)` returns a value with the full
 * mangler-safe getter set.
 *
 * Keeps anything that already looks like a Uri (has `scheme` and
 * `path` properties) intact - hydrating an already-hydrated value is
 * a no-op via `URI.from()`.
 */
const HydrateUriResults = (Raw: unknown[]): unknown[] => {
	if (!Array.isArray(Raw)) return [];
	return Raw.map((Item) => {
		if (typeof Item === "string") {
			try {
				return StockUri.parse(Item);
			} catch {
				return Item;
			}
		}
		if (Item && typeof Item === "object") {
			const Hydrated = StockToUri(Item);
			if (Hydrated) return Hydrated;
		}
		return Item;
	});
};

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
	//
	// Each folder's `uri` must be a real `vscode.Uri` instance (with the
	// `fsPath` / `toString` getters), not the raw `UriComponents` wire
	// object. The stock built-in extensions (`git`, `gulp`, `grunt`, `jake`,
	// `npm`, `merge-conflict`, most task detectors) call `folder.uri.fsPath`
	// straight into `path.join(…)` or `Uri.file(…)`. Without hydration
	// `fsPath` is `undefined` and the call throws:
	//
	//   TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of
	//   type string. Received undefined
	//     at Object.join (node:path)
	//     at findGulpCommand / findGruntCommand / findJakeCommand / …
	//
	// or, for git specifically:
	//
	//   TypeError: Cannot read properties of undefined (reading '0')
	//     at URI.file (…/CocoonMain.js)
	//     at Model.openRepository (…/git/out/model.js:532)
	//
	// Hydrate per read via `StockLift.ToUri` (which handles both
	// UriComponents objects and pre-hydrated Uri instances, returning the
	// same instance in the latter case). The same hydration runs inside
	// `NotificationHandler.$deltaWorkspaceFolders`; doing it here too
	// covers the initial-boot read that fires before any delta arrives.
	const HydrateFolder = (
		Raw: { uri: unknown; name?: string; index?: number },
		FallbackIndex: number,
	): { uri: unknown; name: string; index: number } | null => {
		const Hydrated = StockToUri(Raw?.uri);
		if (!Hydrated) return null;
		const Name =
			typeof Raw?.name === "string" && Raw.name.length > 0
				? Raw.name
				: (Hydrated.fsPath.split(/[\\/]/).pop() ?? "");
		const Index =
			typeof Raw?.index === "number" ? Raw.index : FallbackIndex;
		return { uri: Hydrated, name: Name, index: Index };
	};
	const ReadFolders = (): Array<{
		uri: unknown;
		name: string;
		index: number;
	}> => {
		const Live = (Context.ExtensionHostInitData?.workspace ??
			Context.ExtensionHostInitData?.workspaceData ??
			{}) as {
			folders?: Array<{ uri: unknown; name?: string; index?: number }>;
		};
		const Raw = Live.folders ?? [];
		const Out: Array<{ uri: unknown; name: string; index: number }> = [];
		for (let I = 0; I < Raw.length; I++) {
			const Hydrated = HydrateFolder(Raw[I] as any, I);
			if (Hydrated) Out.push(Hydrated);
		}
		return Out;
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
	(
		globalThis as { __cocoonConfigState?: typeof ConfigState }
	).__cocoonConfigState = ConfigState;

	const Concrete = {
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

		// `findFiles` / `findFiles2` now follow the same Mountain-first
		// dual-track as `findTextInFiles`, AND additionally fall back to
		// the Node walker when Mountain succeeds with an empty result.
		// The empty-result fallback covers the case where Mountain's
		// `WorkspaceFolders` state diverges from the renderer's URL
		// (e.g. binary launched from `Target/debug/` so Mountain walks
		// build artifacts) - users were seeing search return zero
		// without any error to diagnose. Node always walks the same
		// `ExtensionHostInitData.workspace.folders` Cocoon already has
		// from the workbench, so it's resilient to that drift.
		findFiles: async (
			Include: unknown,
			Exclude?: unknown,
			MaxResults?: number,
		): Promise<unknown[]> => {
			const Raw = await TryMountainWithEmptyFallback<unknown[]>(
				Context,
				"findFiles",
				[
					Include,
					{
						exclude: Exclude,
						maxResults: MaxResults,
					},
				],
				async (Args) => {
					const [I, _O] = Args;
					const Opts = _O as
						| { exclude?: unknown; maxResults?: number }
						| undefined;
					return FindFilesLocal(
						Context,
						ReadFolders(),
						I,
						Opts?.exclude,
						Opts?.maxResults,
					);
				},
				(R) => !Array.isArray(R) || R.length === 0,
			);
			return HydrateUriResults(Raw);
		},

		// `findFiles2` - VS Code 1.90+ multi-pattern signature.
		// Extensions (copilot, vim, markdown-language-features) use
		// this. We forward the first pattern through the same Mountain
		// dual-track as `findFiles`; multi-pattern semantics fold to
		// the union, which Mountain's globset matcher already supports
		// natively via comma-separated brace patterns.
		findFiles2: async (
			FilePatterns: readonly unknown[],
			Options?: { exclude?: unknown; maxResults?: number },
		): Promise<unknown[]> => {
			const Include = Array.isArray(FilePatterns)
				? FilePatterns[0]
				: FilePatterns;
			const Raw = await TryMountainWithEmptyFallback<unknown[]>(
				Context,
				"findFiles",
				[
					Include,
					{
						exclude: Options?.exclude,
						maxResults: Options?.maxResults,
					},
				],
				async (Args) => {
					const [I, _O] = Args;
					const Opts = _O as
						| { exclude?: unknown; maxResults?: number }
						| undefined;
					return FindFilesLocal(
						Context,
						ReadFolders(),
						I,
						Opts?.exclude,
						Opts?.maxResults,
					);
				},
				(R) => !Array.isArray(R) || R.length === 0,
			);
			return HydrateUriResults(Raw);
		},

		// `findTextInFiles` / `findTextInFiles2` - dual-track Mountain
		// (ripgrep-backed via `grep-searcher` + `ignore`) first, Node
		// fallback second. The method name `findTextInFiles` is the
		// canonical entry in `RouteManifest::MountainMethods`; the
		// previous `Workspace.FindTextInFiles` form was missing from
		// the manifest, so the manifest short-circuit always routed
		// to the Node fallback - the Mountain ripgrep path was dead.
		// Same empty-result shadowing as `findFiles`: Mountain's
		// ripgrep returning zero matches when the workspace folder is
		// misconfigured falls through to Node so the search panel
		// always shows real results.
		findTextInFiles: async (
			Query: unknown,
			Options?: unknown,
			Callback?: (Result: unknown) => void,
			_Token?: unknown,
		) =>
			TryMountainWithEmptyFallback<unknown>(
				Context,
				"findTextInFiles",
				[Query, Options],
				async (Args) => {
					const [Q, O] = Args;
					return FindTextInFilesNodeFallback(
						Context,
						ReadFolders(),
						Q,
						O,
						Callback,
					);
				},
				(R) => {
					// Mountain text-search shape: `{ matches: TextSearchMatch[], complete: boolean }`
					// or a bare array depending on the path. Treat both
					// undefined and zero-match as empty so the Node
					// fallback can shadow.
					if (R == null) return true;
					if (Array.isArray(R)) return R.length === 0;
					const Matches = (R as { matches?: unknown[] }).matches;
					return !Array.isArray(Matches) || Matches.length === 0;
				},
			),
		findTextInFiles2: async (
			Query: unknown,
			Options?: unknown,
			Callback?: (Result: unknown) => void,
			_Token?: unknown,
		) =>
			TryMountainWithEmptyFallback<unknown>(
				Context,
				"findTextInFiles",
				[Query, Options],
				async (Args) => {
					const [Q, O] = Args;
					return FindTextInFilesNodeFallback(
						Context,
						ReadFolders(),
						Q,
						O,
						Callback,
					);
				},
				(R) => {
					if (R == null) return true;
					if (Array.isArray(R)) return R.length === 0;
					const Matches = (R as { matches?: unknown[] }).matches;
					return !Array.isArray(Matches) || Matches.length === 0;
				},
			),

		openTextDocument: BuildOpenTextDocument(Context),

		// `openNotebookDocument` - notebook renderer support. Land has no
		// notebook editor yet; return a minimal NotebookDocument shape so
		// callers that immediately read `.uri` / `.cellCount` don't crash.
		openNotebookDocument: async (
			_UriOrContent: unknown,
			_Content?: unknown,
		) => ({
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
		// `save(uri)` / `saveAs(uri)` - VS Code 1.86+ per-URI save API.
		// Stock `extHostWorkspace.save` forwards to
		// `MainThreadWorkspace.$save` / `$saveAs`. Mountain has no
		// single-URI save handler wired yet; fall back to `saveAll`'s
		// behaviour by routing through the workbench command so dirty
		// documents still flush. Returns the URI on success to match the
		// stable signature.
		save: async (Uri: unknown): Promise<unknown | undefined> => {
			try {
				await Context.MountainClient?.sendRequest("Workspace.Save", {
					uri: Uri,
				});
				return Uri;
			} catch {
				return undefined;
			}
		},
		saveAs: async (Uri: unknown): Promise<unknown | undefined> => {
			try {
				const Result = await Context.MountainClient?.sendRequest(
					"Workspace.SaveAs",
					{ uri: Uri },
				);
				return (Result as { uri?: unknown })?.uri ?? Uri;
			} catch {
				return undefined;
			}
		},
		applyEdit: BuildApplyEdit(Context),
		// `asRelativePath` - lifts stock VS Code's `resources.relativePath`
		// from `@codeeditorland/output/vs/base/common/resources.js`
		// rather than hand-rolling prefix matching. Stock handles Windows
		// drive-letter casing, authority comparison, and trailing-slash
		// normalisation that our previous `.startsWith()` missed. Falls
		// back to the raw input when the URI can't be coerced (matches
		// stock VS Code's own behaviour at the workspace boundary).
		asRelativePath: (
			PathOrUri: unknown,
			IncludeWorkspaceFolder?: boolean,
		) => {
			const Raw =
				typeof PathOrUri === "string"
					? PathOrUri
					: ((PathOrUri as { fsPath?: string; path?: string })
							?.fsPath ??
						(PathOrUri as { fsPath?: string; path?: string })
							?.path ??
						String(PathOrUri));

			const Folders = ReadFolders();
			for (const Folder of Folders) {
				const Relative = StockRelativePath(Folder.uri, PathOrUri);
				if (Relative !== undefined) {
					if (IncludeWorkspaceFolder && Folders.length > 1) {
						return `${Folder.name}/${Relative}`;
					}
					return Relative;
				}
			}
			return Raw;
		},

		// `getWorkspaceFolder(uri)` - THE most-called workspace API:
		// every URI-handling extension does
		// `workspace.getWorkspaceFolder(uri).name/uri/index`. Lifts
		// stock `resources.isEqualOrParent` (from
		// `@codeeditorland/output/vs/base/common/resources.js`) which
		// handles URI authority, casing, and path-separator edge cases
		// correctly - our previous `.startsWith()` missed e.g. Windows
		// case-insensitive file URIs and URIs with query/fragment parts.
		getWorkspaceFolder: (
			Uri: unknown,
		): { uri: unknown; name: string; index: number } | undefined => {
			if (Uri == null) return undefined;
			for (const Folder of ReadFolders()) {
				if (StockIsEqualOrParent(Uri, Folder.uri)) {
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
		// `vscode.git`'s activate() subscribes to both of these during boot
		// via `extensions/git/out/main.js`. Missing either crashes the git
		// extension with `TypeError: …onWillCreateEditSessionIdentity is
		// not a function`, which then cascades into "No source control
		// providers registered" because `vscode.git.createSourceControl`
		// never runs. Stub-as-subscription is safe: Land has no edit-
		// session-identity provider yet so the events can never fire.
		onWillCreateEditSessionIdentity: () => ({ dispose: () => {} }),
		onDidCreateEditSessionIdentity: () => ({ dispose: () => {} }),
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

		// Proposed API provider registrations. Each returns a no-op
		// disposable so extensions that opt-in (via
		// `enabledApiProposals`) can still activate; wiring each into
		// Mountain is deferred until a concrete consumer shows up.
		//
		// - `registerTimelineProvider` - git / github-pull-requests.
		// - `registerFileSearchProvider[2]` - remote FS providers.
		// - `registerTextSearchProvider[2]` - grep-for-X extensions.
		// - `registerAITextSearchProvider` - AI search (copilot).
		registerTimelineProvider: (_Scheme: unknown, _Provider: unknown) => ({
			dispose: () => {},
		}),
		registerFileSearchProvider: (_Scheme: string, _Provider: unknown) => ({
			dispose: () => {},
		}),
		registerFileSearchProvider2: (_Scheme: string, _Provider: unknown) => ({
			dispose: () => {},
		}),
		registerTextSearchProvider: (_Scheme: string, _Provider: unknown) => ({
			dispose: () => {},
		}),
		registerTextSearchProvider2: (_Scheme: string, _Provider: unknown) => ({
			dispose: () => {},
		}),
		registerAITextSearchProvider: (
			_Scheme: string,
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
	return WrapWorkspaceNamespace(Concrete);
};

export default CreateWorkspaceNamespace;
