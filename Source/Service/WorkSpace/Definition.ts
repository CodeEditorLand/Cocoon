/*
 * File: Cocoon/Source/Service/WorkSpace/Definition.ts
 * Responsibility: The live implementation of the WorkSpace service.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module Definition (WorkSpace)
 * @description The live implementation of the WorkSpace service. This service is now
 * strictly focused on workspace-level concerns and no longer manages editor state.
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
	const OnDidChangeFoldersEvent = new Emitter<any>();

	// This IPC handler correctly belongs to the WorkSpace service.
	yield* G(
		Effect.sync(() =>
			IPC.RegisterInvokeHandler(
				"$acceptWorkspaceData",
				([data]): Promise<void> =>
					Effect.runPromise(
						Effect.gen(function* (G) {
							const OldWorkSpace = yield* G(
								Ref.get(InternalWorkSpaceRef),
							);
							const NewWorkSpace = new InternalWorkSpace(
								data.id,
								data.name,
								data.folders.map((f: any) =>
									TypeConverter.WorkspaceFolder.fromDTO(f),
								),
								data.configuration
									? TypeConverter.URI.ToAPI(
											data.configuration,
										)
									: undefined,
							);
							yield* G(
								Ref.set(InternalWorkSpaceRef, NewWorkSpace),
							);

							const OldFolders: readonly WorkspaceFolder[] =
								OldWorkSpace?.Folders ?? [];
							const NewFolders = NewWorkSpace.Folders;

							const Added = NewFolders.filter(
								(f) =>
									!OldFolders.some(
										(of) =>
											of.uri.toString() ===
											f.uri.toString(),
									),
							);
							const Removed = OldFolders.filter(
								(f) =>
									!NewFolders.some(
										(nf) =>
											nf.uri.toString() ===
											f.uri.toString(),
									),
							);

							if (Added.length > 0 || Removed.length > 0) {
								OnDidChangeFoldersEvent.fire({
									added: Added,
									removed: Removed,
								});
							}
						}),
					),
			),
		),
	);

	// REMOVED: All state and IPC handlers related to TextEditor state
	// (e.g., ActiveTextEditorRef, $acceptEditorState) have been moved
	// to the WindowService definition where they correctly belong.

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
			return true; // Stubbed value
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
			IPC.SendRequest<boolean>("$applyWorkspaceEdit", [
				WorkSpaceEditConverter.FromAPI(edit),
			]).pipe(Effect.mapError((e) => new Error(String(e)))),
		fs: Fs,
	};

	return ServiceImplementation;
});
