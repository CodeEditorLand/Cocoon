/**
 * @module Definition (WorkSpace)
 * @description The live implementation of the WorkSpace service.
 */

import { Effect, Ref } from "effect";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { ConfigurationProvider } from "../Configuration.js";
import { DocumentsProvider } from "../Document.js";
import { FileSystemProvider } from "../FileSystem.js";
import { IPCProvider } from "../IPC.js";
import type { Interface } from "./Service.js";
import { InternalWorkSpace } from "./State.js";
import { FindFilesEffect } from "./Support/FindFiles.js";
import { OpenTextDocumentEffect } from "./Support/OpenTextDocument.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const Documents = yield* _(DocumentsProvider.Tag);
	const Fs = yield* _(FileSystemProvider.Tag);
	const Configuration = yield* _(ConfigurationProvider.Tag);
	const InternalWorkSpaceRef = yield* _(
		Ref.make<InternalWorkSpace | undefined>(undefined),
	);
	const OnDidChangeFoldersEvent = CreateEventStream<any>();

	// --- RPC Handler ---
	IPC.RegisterInvokeHandler("$acceptWorkSpaceData", ([data]) =>
		Effect.gen(function* (_) {
			const OldWorkSpace = yield* _(Ref.get(InternalWorkSpaceRef));
			const NewWorkSpace = new InternalWorkSpace(
				data.id,
				data.name,
				data.folders.map((f: any) =>
					TypeConverter.WorkSpaceFolder.fromDTO(f),
				),
				TypeConverter.Uri.fromDTO(data.configuration),
			);
			yield* _(Ref.set(InternalWorkSpaceRef, NewWorkSpace));

			// A more robust diffing logic would be needed here.
			const Added = NewWorkSpace.Folders.filter(
				(f) =>
					!OldWorkSpace?.Folders.some(
						(of) => of.uri.toString() === f.uri.toString(),
					),
			);
			const Removed =
				OldWorkSpace?.Folders.filter(
					(f) =>
						!NewWorkSpace.Folders.some(
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
		onDidChangeWorkSpaceFolders: OnDidChangeFoldersEvent.Stream,

		// --- Methods ---
		getWorkSpaceFolder: (uri) =>
			Ref.get(InternalWorkSpaceRef).pipe(
				Effect.map((ws) =>
					ws?.Folders.find((f) =>
						uri.fsPath.startsWith(f.uri.fsPath),
					),
				),
			),
		findFiles: (include, exclude, max, token) =>
			FindFilesEffect(IPC, include, exclude, max, token),
		openTextDocument: (options) =>
			OpenTextDocumentEffect(IPC, Documents, options),

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
