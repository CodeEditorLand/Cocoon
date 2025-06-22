/**
 * @module Definition (WorkSpace)
 * @description The live implementation of the WorkSpace service. This service is now
 * responsible for both workspace-level concerns and editor state.
 */

import { Effect, Ref } from "effect";
import CreateEventStream from "Source/Utility/CreateEventStream.js";
import { Emitter } from "vs/base/common/event.js";
import {
	Disposable,
	type TextEditor,
	type Uri,
	type WorkspaceEdit,
	type WorkspaceFolder,
} from "vscode";

import URIConverter from "../../TypeConverter/Main/URI.js";
import WorkSpaceFolderConverter from "../../TypeConverter/Main/WorkspaceFolder.js";
import { default as WorkSpaceEditConverter } from "../../TypeConverter/WorkSpaceEdit.js";
import ConfigurationService from "../Configuration/Service.js";
import DocumentService from "../Document/Service.js";
import FileSystemService from "../FileSystem/Service.js";
import IPCService from "../IPC/Service.js";
import type WorkSpaceService from "./Service.js";
import InternalWorkSpace from "./State.js";
import FindFilesEffect from "./Support/FindFiles.js";
import OpenTextDocumentEffect from "./Support/OpenTextDocument.js";

/**
 * An Effect that builds the live implementation of the WorkSpace service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);

	const Document = yield* G(DocumentService);

	const Fs = yield* G(FileSystemService);

	const Configuration = yield* G(ConfigurationService);

	const InternalWorkSpaceRef = yield* G(
		Ref.make<InternalWorkSpace | undefined>(undefined),
	);

	const TextEditorsMapRef = yield* G(Ref.make(new Map<string, TextEditor>()));

	const ActiveTextEditorRef = yield* G(
		Ref.make<TextEditor | undefined>(undefined),
	);

	const VisibleTextEditorsRef = yield* G(Ref.make<readonly TextEditor[]>([]));

	const OnDidChangeFoldersEvent = new Emitter<any>();

	const { event: OnDidChangeActiveTextEditorEvent, Fire: FireActiveEditor } =
		CreateEventStream<TextEditor | undefined>();

	const {
		event: OnDidChangeVisibleTextEditorsEvent,

		Fire: FireVisibleEditors,
	} = CreateEventStream<readonly TextEditor[]>();

	const AcceptWorkspaceDataEffect = (data: any) =>
		Effect.gen(function* (G) {
			const OldWorkSpace = yield* G(Ref.get(InternalWorkSpaceRef));

			const NewWorkSpace = new InternalWorkSpace(
				data.id,

				data.name,

				data.folders.map((f: any) =>
					WorkSpaceFolderConverter.FromDTO(f),
				),

				data.configuration
					? URIConverter.ToAPI(data.configuration)
					: undefined,
			);

			yield* G(Ref.set(InternalWorkSpaceRef, NewWorkSpace));

			const OldFolders: readonly WorkspaceFolder[] =
				OldWorkSpace?.Folders ?? [];

			const NewFolders = NewWorkSpace.Folders;

			const Added = NewFolders.filter(
				(f) =>
					!OldFolders.some(
						(of) => of.uri.toString() === f.uri.toString(),
					),
			);

			const Removed = OldFolders.filter(
				(f) =>
					!NewFolders.some(
						(nf) => nf.uri.toString() === f.uri.toString(),
					),
			);

			if (Added.length > 0 || Removed.length > 0) {
				OnDidChangeFoldersEvent.fire({
					added: Added,

					removed: Removed,
				});
			}
		});

	const AcceptEditorStateEffect = (
		activeEditorId: string | undefined,

		visibleEditorIds: string[],
	) =>
		Effect.gen(function* (G) {
			const Editors = yield* G(Ref.get(TextEditorsMapRef));

			const NewActive = activeEditorId
				? Editors.get(activeEditorId)
				: undefined;

			const NewVisible = visibleEditorIds
				.map((id) => Editors.get(id))
				.filter(Boolean);

			yield* G(Ref.set(ActiveTextEditorRef, NewActive));

			yield* G(
				Ref.set(VisibleTextEditorsRef, NewVisible as TextEditor[]),
			);

			yield* G(FireActiveEditor(NewActive));

			yield* G(FireVisibleEditors(NewVisible as TextEditor[]));
		});

	yield* G(
		Effect.sync(() => {
			IPC.RegisterInvokeHandler("$acceptWorkspaceData", ([data]) =>
				Effect.runPromise(AcceptWorkspaceDataEffect(data)),
			);

			IPC.RegisterInvokeHandler(
				"$acceptEditorState",

				([activeId, visibleIds]) =>
					Effect.runPromise(
						AcceptEditorStateEffect(activeId, visibleIds),
					),
			);
		}),
	);

	const ServiceImplementation: WorkSpaceService["Type"] = {
		// Workspace properties
		get name() {
			return Effect.runSync(
				Ref.get(InternalWorkSpaceRef).pipe(
					Effect.map((ws) => ws?.Name),
				),
			);
		},

		get workspaceFile() {
			return Effect.runSync(
				Ref.get(InternalWorkSpaceRef).pipe(
					Effect.map((ws) => ws?.Configuration),
				),
			);
		},

		get workspaceFolders() {
			return Effect.runSync(
				Ref.get(InternalWorkSpaceRef).pipe(
					Effect.map((ws) => ws?.Folders),
				),
			);
		},

		get isTrusted() {
			// Stubbed value
			return true;
		},

		onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,

		// Editor State Properties
		get activeTextEditor() {
			return Effect.runSync(Ref.get(ActiveTextEditorRef));
		},

		get visibleTextEditors() {
			return Effect.runSync(Ref.get(VisibleTextEditorsRef));
		},

		// Editor State Events
		onDidChangeActiveTextEditor: OnDidChangeActiveTextEditorEvent,

		onDidChangeVisibleTextEditors: OnDidChangeVisibleTextEditorsEvent,

		onDidChangeTextEditorSelection: new Emitter<any>().event,

		onDidChangeTextEditorVisibleRanges: new Emitter<any>().event,

		onDidChangeTextEditorOptions: new Emitter<any>().event,

		onDidChangeTextEditorViewColumn: new Emitter<any>().event,

		// Methods
		getWorkspaceFolder: (uri: Uri) => {
			const folders =
				Effect.runSync(
					Ref.get(InternalWorkSpaceRef).pipe(
						Effect.map((ws) => ws?.Folders),
					),
				) ?? [];

			return folders.find((f) => uri.fsPath.startsWith(f.uri.fsPath));
		},

		findFiles: (include, exclude, max, token) =>
			FindFilesEffect(IPC, include, exclude, max, token).pipe(
				Effect.mapError((e) => new Error(String(e))),
			),

		openTextDocument: (options) =>
			OpenTextDocumentEffect(IPC, Document, options).pipe(
				Effect.mapError((e) => new Error(String(e))),
			),

		getConfiguration: Configuration.GetConfiguration,

		applyEdit: (edit: WorkspaceEdit) =>
			IPC.SendRequest<boolean>("$applyWorkspaceEdit", [
				WorkSpaceEditConverter.FromAPI(edit),
			]).pipe(Effect.mapError((e) => new Error(String(e)))),

		fs: Fs,

		registerTextDocumentContentProvider: (_scheme, _provider) =>
			// Stub
			new Disposable(() => {}),
	};

	return ServiceImplementation;
});
