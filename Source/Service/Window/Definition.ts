/**
 * @module Definition (Window)
 * @description The live implementation of the core Window service.
 */

import { Context, Effect, Ref, Stream } from "effect";
import type { TextEditor, Uri, WindowState } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import WorkSpaceService from "../WorkSpace/Service.js";

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const WorkSpace = yield* _(WorkSpaceService);

	// State and events are managed by Refs and Hubs, updated by host messages.
	const WindowStateRef = yield* _(
		Ref.make<WindowState>({ focused: true, active: true }),
	);
	const OnDidChangeWindowState = CreateEventStream<WindowState>();

	// Register RPC handlers from Mountain
	IPC.RegisterInvokeHandler("$acceptWindowStateChanged", ([isFocused]) => {
		const newState = { focused: isFocused, active: isFocused };
		return Ref.set(WindowStateRef, newState).pipe(
			Effect.flatMap(() => OnDidChangeWindowState.Fire(newState)),
			Effect.runPromise,
		);
	});

	const ServiceImplementation: Context.Tag.Service<any> = {
		get state() {
			return Ref.get(WindowStateRef).pipe(Effect.runSync);
		},
		onDidChangeWindowState: Stream.toEvent(OnDidChangeWindowState.Stream),

		// These properties are delegated from the WorkSpace service, which is the
		// source of truth for editor states.
		get activeTextEditor() {
			return WorkSpace.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkSpace.visibleTextEditors;
		},
		onDidChangeActiveTextEditor: WorkSpace.onDidChangeActiveTextEditor,
		onDidChangeVisibleTextEditors: WorkSpace.onDidChangeVisibleTextEditors,

		ShowTextDocument: (documentOrURI, columnOrOptions, preserveFocus) =>
			Effect.gen(function* (_) {
				let uri: Uri;
				if ("uri" in documentOrURI) {
					// It's a TextDocument
					uri = documentOrURI.uri;
				} else {
					// It's a URI
					uri = documentOrURI;
				}

				const optionsDTO = columnOrOptions
					? {
							// Convert TextDocumentShowOptions to DTO
							preserveFocus:
								preserveFocus ??
								(columnOrOptions as any).preserveFocus,
							selection: (columnOrOptions as any).selection
								? TypeConverter.Range.FromAPI(
										(columnOrOptions as any).selection,
									)
								: undefined,
						}
					: undefined;

				const viewColumnDTO =
					typeof columnOrOptions === "number"
						? TypeConverter.ViewColumn.FromAPI(columnOrOptions)
						: undefined;

				// The RPC call returns an editor ID, which we would use to find the TextEditor object
				const editorId = yield* _(
					IPC.SendRequest<string>("$showTextDocument", [
						TypeConverter.URI.FromAPI(uri),
						viewColumnDTO,
						optionsDTO,
					]),
				);

				// The WorkSpaceService would have a map of editor IDs to TextEditor objects
				const editor = WorkSpace.findTextEditorById(editorId);
				if (!editor) {
					return yield* _(
						Effect.fail(
							new Error(
								`Could not find text editor with ID ${editorId}`,
							),
						),
					);
				}
				return editor;
			}),
	};

	return ServiceImplementation;
});
