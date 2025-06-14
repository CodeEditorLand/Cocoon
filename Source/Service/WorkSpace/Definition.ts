/**
 * @module Definition (WorkSpace)
 * @description The live implementation of the WorkSpace service.
 */

import { Effect, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { TextEditor, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { Configuration } from "../Configuration/Service.js";
import { Document } from "../Document/Service.js";
import { FileSystem } from "../FileSystem/Service.js";
import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";
import { InternalWorkSpace } from "./State.js";
import { FindFiles as FindFilesEffect } from "./Support/FindFiles.js";
import { OpenTextDocument as OpenTextDocumentEffect } from "./Support/OpenTextDocument.js";

export const Definition = Effect.gen(function* () {
	const IPCService = yield* IPC.Tag;
	const DocumentService = yield* Document.Tag;
	const FsService = yield* FileSystem.Tag;
	const ConfigurationService = yield* Configuration.Tag;

	const InternalWorkSpaceRef = yield* Ref.make<InternalWorkSpace | undefined>(
		undefined,
	);
	const OnDidChangeFoldersEvent = new Emitter<any>();

	const TextEditorsMap = yield* Ref.make(new Map<string, TextEditor>());
	const ActiveTextEditorRef = yield* Ref.make<TextEditor | undefined>(
		undefined,
	);
	const VisibleTextEditorsRef = yield* Ref.make<readonly TextEditor[]>([]);

	const onDidChangeActiveTextEditorEmitter = new Emitter<
		TextEditor | undefined
	>();
	const onDidChangeVisibleTextEditorsEmitter = new Emitter<
		readonly TextEditor[]
	>();

	IPCService.RegisterInvokeHandler("$acceptWorkspaceData", ([data]) =>
		Effect.gen(function* () {
			const OldWorkSpace = yield* Ref.get(InternalWorkSpaceRef);
			const NewWorkSpace = new InternalWorkSpace(
				data.id,
				data.name,
				data.folders.map((f: any) =>
					TypeConverter.Main.WorkspaceFolder.fromDTO(f),
				),
				data.configuration
					? TypeConverter.URIConverter.ToAPI(data.configuration)
					: undefined,
			);
			yield* Ref.set(InternalWorkSpaceRef, NewWorkSpace);

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

	IPCService.RegisterInvokeHandler(
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

	const ServiceImplementation: Interface = {
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
			FindFilesEffect(IPCService, include, exclude, max, token).pipe(
				Effect.mapError((e) => new Error(String(e))),
			),
		openTextDocument: (options) =>
			OpenTextDocumentEffect(IPCService, DocumentService, options).pipe(
				Effect.mapError((e) => new Error(String(e))),
			),
		getConfiguration: ConfigurationService.GetConfiguration,
		applyEdit: (edit) =>
			Effect.runPromise(
				IPCService.SendRequest<boolean>("$applyWorkspaceEdit", [
					TypeConverter.WorkSpaceEdit.FromAPI(edit),
				]),
			),
		fs: FsService,
		textDocuments: DocumentService.TextDocuments,
		onDidOpenTextDocument: DocumentService.onDidOpenTextDocument,
		onDidCloseTextDocument: DocumentService.onDidCloseTextDocument,
		onDidChangeTextDocument: DocumentService.onDidChangeTextDocument,
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
