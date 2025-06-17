/*
 * File: Cocoon/Source/Service/Window/Definition.ts
 * Responsibility: The live implementation of the core Window service.
 * Modified: 2025-06-17 10:52:55 UTC
 */

/**
 * @module Definition (Window)
 * @description The live implementation of the core Window service. This service
 * is now the source of truth for editor state and window focus.
 */

import { Effect, Ref } from "effect";
import type {
	TextDocumentShowOptions,
	TextEditor,
	Uri,
	WindowState,
} from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the Window service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);

	// --- State Management for Editors and Window Focus ---
	const WindowStateRef = yield* G(
		Ref.make<WindowState>({ focused: true, active: true }),
	);
	const TextEditorsMap = yield* G(Ref.make(new Map<string, TextEditor>()));
	const ActiveTextEditorRef = yield* G(
		Ref.make<TextEditor | undefined>(undefined),
	);
	const VisibleTextEditorsRef = yield* G(Ref.make<readonly TextEditor[]>([]));

	// --- Event Emitters ---
	const OnDidChangeWindowState = CreateEventStream<WindowState>();
	const { event: OnDidChangeActiveTextEditorEvent, Fire: FireActiveEditor } =
		CreateEventStream<TextEditor | undefined>();
	const {
		event: OnDidChangeVisibleTextEditorsEvent,
		Fire: FireVisibleEditors,
	} = CreateEventStream<readonly TextEditor[]>();

	// --- Register RPC Handlers from Mountain ---

	// Handles window focus changes
	yield* G(
		Effect.sync(() =>
			IPC.RegisterInvokeHandler(
				"$acceptWindowStateChanged",
				([isFocused]) => {
					const NewState = { focused: isFocused, active: isFocused };
					return Effect.runPromise(
						Ref.set(WindowStateRef, NewState).pipe(
							Effect.andThen(
								OnDidChangeWindowState.Fire(NewState),
							),
						),
					);
				},
			),
		),
	);

	// Handles changes to active/visible editors
	yield* G(
		Effect.sync(() =>
			IPC.RegisterInvokeHandler(
				"$acceptEditorState",
				([activeEditorId, visibleEditorIds]): Promise<void> =>
					Effect.runPromise(
						Effect.gen(function* (G) {
							const Editors = yield* G(Ref.get(TextEditorsMap));
							const NewActive = activeEditorId
								? Editors.get(activeEditorId)
								: undefined;
							const NewVisible = visibleEditorIds
								.map((id: string) => Editors.get(id))
								.filter(Boolean);

							yield* G(Ref.set(ActiveTextEditorRef, NewActive));
							yield* G(
								Ref.set(
									VisibleTextEditorsRef,
									NewVisible as TextEditor[],
								),
							);

							yield* G(FireActiveEditor(NewActive));
							yield* G(
								FireVisibleEditors(NewVisible as TextEditor[]),
							);
						}),
					),
			),
		),
	);

	const ServiceImplementation: Service["Type"] = {
		get state() {
			return Effect.runSync(Ref.get(WindowStateRef));
		},
		onDidChangeWindowState: OnDidChangeWindowState.event,

		get activeTextEditor() {
			return Effect.runSync(Ref.get(ActiveTextEditorRef));
		},
		get visibleTextEditors() {
			return Effect.runSync(Ref.get(VisibleTextEditorsRef));
		},
		onDidChangeActiveTextEditor: OnDidChangeActiveTextEditorEvent,
		onDidChangeVisibleTextEditors: OnDidChangeVisibleTextEditorsEvent,

		ShowTextDocument: (documentOrURI, columnOrOptions, preserveFocus) =>
			Effect.gen(function* (G) {
				let uri: Uri;
				if ("uri" in documentOrURI) {
					// It's a TextDocument
					uri = documentOrURI.uri;
				} else {
					// It's a URI
					uri = documentOrURI;
				}

				const options =
					typeof columnOrOptions === "object"
						? (columnOrOptions as TextDocumentShowOptions)
						: undefined;

				const optionsDTO = options
					? {
							preserveFocus:
								preserveFocus ?? options.preserveFocus,
							selection: options.selection
								? TypeConverter.Range.FromAPI(options.selection)
								: undefined,
						}
					: undefined;

				const viewColumnDTO =
					typeof columnOrOptions === "number"
						? TypeConverter.ViewColumn.FromAPI(columnOrOptions)
						: undefined;

				const editorId = yield* G(
					IPC.SendRequest<string>("$showTextDocument", [
						TypeConverter.URI.FromAPI(uri),
						viewColumnDTO,
						optionsDTO,
					]),
				);

				const editor = (yield* G(Ref.get(TextEditorsMap))).get(
					editorId,
				);
				if (!editor) {
					// This indicates a state synchronization issue.
					return yield* G(
						Effect.fail(
							new Error(
								`Could not find text editor with ID ${editorId} after showTextDocument call.`,
							),
						),
					);
				}
				return editor;
			}),

		// This method is now part of the WindowService's responsibility.
		findTextEditorById: (id: string) => {
			return Effect.runSync(
				Ref.get(TextEditorsMap).pipe(Effect.map((m) => m.get(id))),
			);
		},
	};

	return ServiceImplementation;
});
