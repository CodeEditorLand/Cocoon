/**
 * @module Definition (Workspace)
 * @description The live implementation of the Workspace service.
 */

import { Effect, Ref } from "effect";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { ConfigurationProvider } from "../Configuration.js";
import { DocumentsProvider } from "../Document.js";
import { FileSystemProvider } from "../FileSystem.js";
import { IpcProvider } from "../Ipc.js";
import type { Interface } from "./Service.js";
import { InternalWorkspace } from "./State.js";
import { FindFilesEffect } from "./Support/FindFiles.js";
import { OpenTextDocumentEffect } from "./Support/OpenTextDocument.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const Documents = yield* _(DocumentsProvider.Tag);
	const Fs = yield* _(FileSystemProvider.Tag);
	const Configuration = yield* _(ConfigurationProvider.Tag);
	const InternalWorkspaceRef = yield* _(
		Ref.make<InternalWorkspace | undefined>(undefined),
	);
	const OnDidChangeFoldersEvent = CreateEventStream<any>();

	// --- RPC Handler ---
	Ipc.RegisterInvokeHandler("$acceptWorkspaceData", ([data]) =>
		Effect.gen(function* (_) {
			const OldWorkspace = yield* _(Ref.get(InternalWorkspaceRef));
			const NewWorkspace = new InternalWorkspace(
				data.id,
				data.name,
				data.folders.map((f: any) =>
					TypeConverter.WorkspaceFolder.fromDto(f),
				),
				TypeConverter.Uri.fromDto(data.configuration),
			);
			yield* _(Ref.set(InternalWorkspaceRef, NewWorkspace));

			// A more robust diffing logic would be needed here.
			const Added = NewWorkspace.Folders.filter(
				(f) =>
					!OldWorkspace?.Folders.some(
						(of) => of.uri.toString() === f.uri.toString(),
					),
			);
			const Removed =
				OldWorkspace?.Folders.filter(
					(f) =>
						!NewWorkspace.Folders.some(
							(nf) => nf.uri.toString() === f.uri.toString(),
						),
				) ?? [];

			if (Added.length > 0 || Removed.length > 0) {
				yield* _(
					OnDidChangeFoldersEvent.Fire({
						added: Added,
						removed: Removed,
					}),
				);
			}
		}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Interface = {
		// --- Properties ---
		get name() {
			return Ref.get(InternalWorkspaceRef).pipe(
				Effect.map((ws) => ws?.Name),
				Effect.runSync,
			);
		},
		get workspaceFile() {
			return Ref.get(InternalWorkspaceRef).pipe(
				Effect.map((ws) => ws?.Configuration),
				Effect.runSync,
			);
		},
		get workspaceFolders() {
			return Ref.get(InternalWorkspaceRef).pipe(
				Effect.map((ws) => ws?.Folders),
				Effect.runSync,
			);
		},
		get isTrusted() {
			return true;
		}, // This would come from InitData

		// --- Events ---
		onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.Stream,

		// --- Methods ---
		getWorkspaceFolder: (uri) =>
			Ref.get(InternalWorkspaceRef).pipe(
				Effect.map((ws) =>
					ws?.Folders.find((f) =>
						uri.fsPath.startsWith(f.uri.fsPath),
					),
				),
			),
		findFiles: (include, exclude, max, token) =>
			FindFilesEffect(Ipc, include, exclude, max, token),
		openTextDocument: (options) =>
			OpenTextDocumentEffect(Ipc, Documents, options),

		// --- Delegated Services/Properties ---
		getConfiguration: Configuration.GetConfiguration,
		fs: Fs,
		textDocuments: Documents.TextDocuments,
		onDidOpenTextDocument: Documents.OnDidOpenTextDocument,
		onDidCloseTextDocument: Documents.OnDidCloseTextDocument,
		onDidChangeTextDocument: Documents.OnDidChangeTextDocument,
	};

	return ServiceImplementation;
});
