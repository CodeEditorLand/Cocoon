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

		openTextDocument: BuildOpenTextDocument(Context),
		saveAll: BuildSaveAll(Context),
		applyEdit: BuildApplyEdit(Context),
		asRelativePath: (PathOrUri: unknown) => String(PathOrUri),

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
