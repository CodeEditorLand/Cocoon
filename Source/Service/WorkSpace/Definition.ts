/**
 * @module Definition (WorkSpace)
 * @description The live implementation of the WorkSpace service.
 */

import { Effect, Ref, Stream } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { TextEditor, Uri, WorkspaceFolder } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { Configuration } from "../Configuration/Service.js";
import { Document } from "../Document/Service.js";
import { FileSystem } from "../FileSystem/Service.js";
import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";
import { InternalWorkSpace } from "./State.js";
import { FindFiles as FindFilesEffect } from "./Support/FindFiles.js";
import { OpenTextDocument as OpenTextDocumentEffect } from "./Support/OpenTextDocument.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const DocumentService = yield* _(Document.Tag);
	const FsService = yield* _(FileSystem.Tag);
	const ConfigurationService = yield* _(Configuration.Tag);

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

	// --- RPC Handler ---
	IPCService.RegisterInvokeHandler("$acceptWorkspaceData", ([data]) =>
		Effect.gen(function* (_) {
			const OldWorkSpace = yield* _(Ref.get(InternalWorkSpaceRef));
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
		}).pipe(Effect.runPromise),
	);

	// Handler for active/visible editor changes
	IPCService.RegisterInvokeHandler(
		"$acceptEditorState",
		([activeEditorId, visibleEditorIds]) =>
			Effect.gen(function* (_) {
				// This is a simplified logic. A real impl would create/update TextEditor objects.
				const editors = yield* _(Ref.get(TextEditorsMap));
				const newActive = activeEditorId
					? editors.get(activeEditorId)
					: undefined;
				const newVisible = visibleEditorIds
					.map((id: string) => editors.get(id))
					.filter(Boolean);

				yield* _(Ref.set(ActiveTextEditorRef, newActive));
				yield* _(
					Ref.set(VisibleTextEditorsRef, newVisible as TextEditor[]),
				);

				onDidChangeActiveTextEditorEmitter.fire(newActive);
				onDidChangeVisibleTextEditorsEmitter.fire(
					newVisible as TextEditor[],
				);
			}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Interface = {
		// --- Properties ---
		get name() {
			return Ref.get(InternalWorkSpaceRef).pipe(
				Effect.map((ws) => ws?.Name),
				Effect.runSync,
			);
		},
		get workspaceFile() {
			return Ref.get(InternalWorkSpaceRef).pipe(
				Effect.map((ws) => ws?.Configuration),
				Effect.runSync,
			);
		},
		get workspaceFolders() {
			return Ref.get(InternalWorkSpaceRef).pipe(
				Effect.map((ws) => ws?.Folders),
				Effect.runSync,
			);
		},
		get isTrusted() {
			return true;
		}, // This would come from InitData

		// --- Events ---
		onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,

		// --- Methods ---
		getWorkspaceFolder: (uri: Uri) => {
			const folders =
				Ref.get(InternalWorkSpaceRef).pipe(
					Effect.map((ws) => ws?.Folders),
					Effect.runSync,
				) ?? [];
			return folders.find((f) => uri.fsPath.startsWith(f.uri.fsPath));
		},
		findFiles: (include, exclude, max, token) =>
			FindFilesEffect(IPCService, include, exclude, max, token),
		openTextDocument: (options) =>
			OpenTextDocumentEffect(IPCService, DocumentService, options),
		getConfiguration: ConfigurationService.GetConfiguration,
		applyEdit: (edit) =>
			IPCService.SendRequest<boolean>("$applyWorkspaceEdit", [
				TypeConverter.WorkSpaceEdit.fromAPI(edit),
			]).pipe(Effect.runPromise),

		// --- Delegated Properties & Events ---
		fs: FsService,
		textDocuments: DocumentService.TextDocuments,
		onDidOpenTextDocument: DocumentService.onDidOpenTextDocument,
		onDidCloseTextDocument: DocumentService.onDidCloseTextDocument,
		onDidChangeTextDocument: DocumentService.onDidChangeTextDocument,
		get activeTextEditor() {
			return Ref.get(ActiveTextEditorRef).pipe(Effect.runSync);
		},
		get visibleTextEditors() {
			return Ref.get(VisibleTextEditorsRef).pipe(Effect.runSync);
		},
		onDidChangeActiveTextEditor: onDidChangeActiveTextEditorEmitter.event,
		onDidChangeVisibleTextEditors:
			onDidChangeVisibleTextEditorsEmitter.event,
		findTextEditorById: (id: string) =>
			Ref.get(TextEditorsMap).pipe(
				Effect.map((m) => m.get(id)),
				Effect.runSync,
			),
	};

	return ServiceImplementation;
});
