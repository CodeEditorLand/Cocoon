/**
 * @module Definition (WorkSpace)
 * @description The live implementation of the WorkSpace service.
 */

import { Context, Effect, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { TextEditor, Uri, WorkspaceEdit, WorkspaceFolder } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import * as WorkSpaceEditConverter from "../../TypeConverter/WorkSpaceEdit.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import ConfigurationService from "../Configuration/Service.js";
import DocumentService from "../Document/Service.js";
import FileSystemService from "../FileSystem/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import InternalWorkSpace from "./State.js";
import FindFilesEffect from "./Support/FindFiles.js";
import OpenTextDocumentEffect from "./Support/OpenTextDocument.js";

export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const Document = yield* DocumentService;
	const Fs = yield* FileSystemService;
	const Configuration = yield* ConfigurationService;

	const InternalWorkSpaceRef = yield* Ref.make<InternalWorkSpace | undefined>(
		undefined,
	);
	const OnDidChangeFoldersEvent = new Emitter<any>();

	const TextEditorsMap = yield* Ref.make(new Map<string, TextEditor>());
	const ActiveTextEditorRef = yield* Ref.make<TextEditor | undefined>(
		undefined,
	);
	const VisibleTextEditorsRef = yield* Ref.make<readonly TextEditor[]>([]);

	const { event: onDidChangeActiveTextEditor, Fire: fireActive } =
		CreateEventStream<TextEditor | undefined>();
	const { event: onDidChangeVisibleTextEditors, Fire: fireVisible } =
		CreateEventStream<readonly TextEditor[]>();

	IPC.RegisterInvokeHandler(
		"$acceptWorkspaceData",
		([data]): Promise<void> =>
			Effect.gen(function* () {
				const OldWorkSpace = yield* Ref.get(InternalWorkSpaceRef);
				const NewWorkSpace = new InternalWorkSpace(
					data.id,
					data.name,
					data.folders.map((f: any) =>
						TypeConverter.WorkspaceFolder.fromDTO(f),
					),
					data.configuration
						? TypeConverter.URI.ToAPI(data.configuration)
						: undefined,
				);
				yield* Ref.set(InternalWorkSpaceRef, NewWorkSpace);

				const oldFolders: readonly WorkspaceFolder[] =
					OldWorkSpace?.Folders ?? [];
				const newFolders = NewWorkSpace.Folders;

				const added = newFolders.filter(
					(f) =>
						!oldFolders.some(
							(of) => of.uri.toString() === f.uri.toString(),
						),
				);
				const removed = oldFolders.filter(
					(f) =>
						!newFolders.some(
							(nf) => nf.uri.toString() === f.uri.toString(),
						),
				);

				if (added.length > 0 || removed.length > 0) {
					OnDidChangeFoldersEvent.fire({ added, removed });
				}
			}).pipe(Effect.runPromise),
	);

	IPC.RegisterInvokeHandler(
		"$acceptEditorState",
		([activeEditorId, visibleEditorIds]): Promise<void> =>
			Effect.gen(function* () {
				const editors = yield* Ref.get(TextEditorsMap);
				const newActive = activeEditorId
					? editors.get(activeEditorId)
					: undefined;
				const newVisible = visibleEditorIds
					.map((id: string) => editors.get(id))
					.filter(Boolean);

				yield* Ref.set(ActiveTextEditorRef, newActive);
				yield* Ref.set(
					VisibleTextEditorsRef,
					newVisible as TextEditor[],
				);

				yield* fireActive(newActive);
				yield* fireVisible(newVisible as TextEditor[]);
			}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Service = {
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
			return true;
		},
		onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,
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
			Effect.runPromise(
				IPC.SendRequest<boolean>("$applyWorkspaceEdit", [
					WorkSpaceEditConverter.FromAPI(edit),
				]),
			),
		fs: Fs,
		textDocuments: Document.TextDocuments,
		onDidOpenTextDocument: Document.onDidOpenTextDocument,
		onDidCloseTextDocument: Document.onDidCloseTextDocument,
		onDidChangeTextDocument: Document.onDidChangeTextDocument,
		get activeTextEditor() {
			return Effect.runSync(Ref.get(ActiveTextEditorRef));
		},
		get visibleTextEditors() {
			return Effect.runSync(Ref.get(VisibleTextEditorsRef));
		},
		onDidChangeActiveTextEditor: onDidChangeActiveTextEditor,
		onDidChangeVisibleTextEditors: onDidChangeVisibleTextEditors,
		findTextEditorById: (id: string) =>
			Effect.runSync(
				Ref.get(TextEditorsMap).pipe(Effect.map((m) => m.get(id))),
			),
	};

	return ServiceImplementation;
});
