/**
 * @module Definition (Window)
 * @description The live implementation of the core Window service.
 */

import { Effect, Ref, Stream } from "effect";
import type {
	TextDocumentShowOptions,
	Uri,
	ViewColumn,
	WindowState,
} from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { WorkSpace } from "../WorkSpace.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const WorkSpaceService = yield* _(WorkSpace.Tag);

	// State and events are managed by Refs and Hubs, updated by host messages.
	const WindowStateRef = yield* _(
		Ref.make<WindowState>({ focused: true }), // Initial optimistic state
	);
	const OnDidChangeWindowState = CreateEventStream<WindowState>();

	// Register RPC handlers from Mountain
	IPCService.RegisterInvokeHandler(
		"$acceptWindowStateChanged",
		([isFocused]) => {
			const newState = { focused: isFocused };
			return Ref.set(WindowStateRef, newState).pipe(
				Effect.flatMap(() => OnDidChangeWindowState.Fire(newState)),
				Effect.runPromise,
			);
		},
	);

	const ServiceImplementation: Interface = {
		get state() {
			return Ref.get(WindowStateRef).pipe(Effect.runSync);
		},
		onDidChangeWindowState: OnDidChangeWindowState.Stream.pipe(
			Stream.toEvent,
		),

		// These properties are delegated from the WorkSpace service, which is the
		// source of truth for editor states.
		get activeTextEditor() {
			return WorkSpaceService.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkSpaceService.visibleTextEditors;
		},
		onDidChangeActiveTextEditor:
			WorkSpaceService.onDidChangeActiveTextEditor,
		onDidChangeVisibleTextEditors:
			WorkSpaceService.onDidChangeVisibleTextEditors,

		ShowTextDocument: (documentOrURI, columnOrOptions, preserveFocus) =>
			Effect.gen(function* (_) {
				let uri: Uri;
				if (documentOrURI.uri) {
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
								? TypeConverter.RangeConverter.FromAPI(
										(columnOrOptions as any).selection,
									)
								: undefined,
						}
					: undefined;

				const viewColumnDTO =
					typeof columnOrOptions === "number"
						? TypeConverter.ViewColumnConverter.FromAPI(
								columnOrOptions,
							)
						: undefined;

				// The RPC call returns an editor ID, which we would use to find the TextEditor object
				const editorId = yield* _(
					IPCService.SendRequest<string>("$showTextDocument", [
						TypeConverter.URIConverter.FromAPI(uri),
						viewColumnDTO,
						optionsDTO,
					]),
				);

				// The WorkSpaceService would have a map of editor IDs to TextEditor objects
				const editor = WorkSpaceService.findTextEditorById(editorId);
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
