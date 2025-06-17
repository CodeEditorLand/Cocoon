/*
 * File: Cocoon/Source/Service/WorkSpace/Definition.ts
 * Responsibility: The live implementation of the WorkSpace service.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../TypeConverter/Main.js, ../../TypeConverter/WorkSpaceEdit.js, ../Configuration/Service.js, ../Document/Service.js, ../FileSystem/Service.js, ../IPC/Service.js, ./Service.js, ./State.js, ./Support/FindFiles.js, ./Support/OpenTextDocument.js, effect, vs/base/common/event.js, vscode
 */

/**
 * @module Definition (WorkSpace)
 * @description The live implementation of the WorkSpace service.
 */

import { Effect, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { Uri, WorkspaceEdit, WorkspaceFolder } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import { default as WorkSpaceEditConverter } from "../../TypeConverter/WorkSpaceEdit.js";
import ConfigurationService from "../Configuration/Service.js";
import DocumentService from "../Document/Service.js";
import FileSystemService from "../FileSystem/Service.js";
import IPCService from "../IPC/Service.js";
import type WorkSpaceService from "./Service.js";
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

	// This IPC handler is correctly part of the WorkSpace service.
	yield* Effect.sync(() =>
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
		),
	);

	// REMOVED: The "$acceptEditorState" IPC handler and all related Refs
	// and EventEmitters. They belong in a dedicated Editor service.

	const ServiceImplementation: WorkSpaceService["Type"] = {
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
		// FIXED: This now returns a composable Effect instead of executing a Promise.
		applyEdit: (edit: WorkspaceEdit) =>
			IPC.SendRequest<boolean>("$applyWorkspaceEdit", [
				WorkSpaceEditConverter.FromAPI(edit),
			]).pipe(Effect.mapError((e) => new Error(String(e)))),
		fs: Fs,

		// REMOVED: All properties related to textDocuments and textEditors.
	};

	return ServiceImplementation;
});
