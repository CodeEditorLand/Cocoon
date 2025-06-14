/**
 * @module Definition (WorkSpace)
 * @description The live implementation of the WorkSpace service.
 */

import { Context, Effect, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { TextEditor, Uri, WorkspaceEdit } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import * as WorkSpaceEditConverter from "../../TypeConverter/WorkSpaceEdit.js";
import ConfigurationService from "../Configuration/Service.js";
import DocumentService from "../Document/Service.js";
import FileSystemService from "../FileSystem/Service.js";
import IPCService from "../IPC/Service.js";
import InternalWorkSpace from "./State.js";
import FindFilesEffect from "./Support/FindFiles.js";
import OpenTextDocumentEffect from "./Support/OpenTextDocument.js";

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const Document = yield* _(DocumentService);
	const Fs = yield* _(FileSystemService);
	const Configuration = yield* _(ConfigurationService);

	const InternalWorkSpaceRef = yield* _(
		Ref.make<InternalWorkSpace | undefined>(undefined),
	);
	const OnDidChangeFoldersEvent = new Emitter<any>();

	const TextEditorsMap = yield* _(Ref.make(new Map<string, TextEditor>()));
	const ActiveTextEditorRef = yield* _(
		Ref.make<TextEditor | undefined>(undefined),
	);
	const VisibleTextEditorsRef = yield* _(Ref.make<readonly TextEditor[]>([]));

	const onDidChangeActiveTextEditorEmitter = new Emitter<
		TextEditor | undefined
	>();
	const onDidChangeVisibleTextEditorsEmitter = new Emitter<
		readonly TextEditor[]
	>();

	IPC.RegisterInvokeHandler("$acceptWorkspaceData", ([data]) =>
		Effect.gen(function* (_) {
			const OldWorkSpace = yield* _(Ref.get(InternalWorkSpaceRef));
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
			yield* _(Ref.set(InternalWorkSpaceRef, NewWorkSpace));

			const oldFolders = OldWorkSpace?.Folders ?? [];
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
		}),
	);

	IPC.RegisterInvokeHandler(
		"$acceptEditorState",
		([activeEditorId, visibleEditorIds]) =>
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

				onDidChangeActiveTextEditorEmitter.fire(newActive);
				onDidChangeVisibleTextEditorsEmitter.fire(
					newVisible as TextEditor[],
				);
			}),
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
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
		onDidChangeActiveTextEditor: onDidChangeActiveTextEditorEmitter.event,
		onDidChangeVisibleTextEditors:
			onDidChangeVisibleTextEditorsEmitter.event,
		findTextEditorById: (id: string) =>
			Effect.runSync(
				Ref.get(TextEditorsMap).pipe(Effect.map((m) => m.get(id))),
			),
	};

	return ServiceImplementation;
});
