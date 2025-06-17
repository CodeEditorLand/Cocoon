/*
 * File: Cocoon/Source/Service/Window/Definition.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:09 UTC
 * Dependency: ../../TypeConverter/Main/Range.js, ../../TypeConverter/Main/URI.js, ../../TypeConverter/Main/ViewColumn.js, ../../Utility/CreateEventStream.js, ../IPC/Service.js, ./Service.js, effect
 */

/**
 * @module Definition (Window)
 * @description The live implementation of the core Window service.
 */

import { Effect, Ref } from "effect";
import {
	EventEmitter,
	type TextDocumentShowOptions,
	type TextEditor,
	type TextEditorOptionsChangeEvent,
	type TextEditorSelectionChangeEvent,
	type TextEditorViewColumnChangeEvent,
	type TextEditorVisibleRangesChangeEvent,
	type Uri,
	type WindowState,
} from "vscode";

import RangeConverter from "../../TypeConverter/Main/Range.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import ViewColumnConverter from "../../TypeConverter/Main/ViewColumn.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the Window service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);

	const WindowStateRef = yield* G(
		Ref.make<WindowState>({ focused: true, active: true }),
	);
	const TextEditorsMapRef = yield* G(Ref.make(new Map<string, TextEditor>()));
	const ActiveTextEditorRef = yield* G(
		Ref.make<TextEditor | undefined>(undefined),
	);
	const VisibleTextEditorsRef = yield* G(Ref.make<readonly TextEditor[]>([]));

	const OnDidChangeWindowStateStream = CreateEventStream<WindowState>();
	const { event: OnDidChangeActiveTextEditorEvent, Fire: FireActiveEditor } =
		CreateEventStream<TextEditor | undefined>();
	const {
		event: OnDidChangeVisibleTextEditorsEvent,
		Fire: FireVisibleEditors,
	} = CreateEventStream<readonly TextEditor[]>();

	const AcceptWindowStateChangedEffect = (isFocused: boolean) => {
		const NewState = { focused: isFocused, active: isFocused };
		return Ref.set(WindowStateRef, NewState).pipe(
			Effect.andThen(OnDidChangeWindowStateStream.Fire(NewState)),
		);
	};

	const AcceptEditorStateEffect = (
		activeEditorId: string | undefined,
		visibleEditorIds: string[],
	) =>
		Effect.gen(function* (G) {
			const Editors = yield* G(Ref.get(TextEditorsMapRef));
			const NewActive = activeEditorId
				? Editors.get(activeEditorId)
				: undefined;
			const NewVisible = visibleEditorIds
				.map((id) => Editors.get(id))
				.filter(Boolean);

			yield* G(Ref.set(ActiveTextEditorRef, NewActive));
			yield* G(
				Ref.set(VisibleTextEditorsRef, NewVisible as TextEditor[]),
			);

			yield* G(FireActiveEditor(NewActive));
			yield* G(FireVisibleEditors(NewVisible as TextEditor[]));
		});

	yield* G(
		Effect.sync(() => {
			IPC.RegisterInvokeHandler(
				"$acceptWindowStateChanged",
				([isFocused]) =>
					Effect.runPromise(
						AcceptWindowStateChangedEffect(isFocused),
					),
			);
			IPC.RegisterInvokeHandler(
				"$acceptEditorState",
				([activeId, visibleIds]) =>
					Effect.runPromise(
						AcceptEditorStateEffect(activeId, visibleIds),
					),
			);
		}),
	);

	const ServiceImplementation: Service["Type"] = {
		get state() {
			return Effect.runSync(Ref.get(WindowStateRef));
		},
		onDidChangeWindowState: OnDidChangeWindowStateStream.event,
		get activeTextEditor() {
			return Effect.runSync(Ref.get(ActiveTextEditorRef));
		},
		get visibleTextEditors() {
			return Effect.runSync(Ref.get(VisibleTextEditorsRef));
		},
		onDidChangeActiveTextEditor: OnDidChangeActiveTextEditorEvent,
		onDidChangeVisibleTextEditors: OnDidChangeVisibleTextEditorsEvent,
		// Stubs for other events, a full implementation would use CreateEventStream
		onDidChangeTextEditorSelection:
			new EventEmitter<TextEditorSelectionChangeEvent>().event,
		onDidChangeTextEditorVisibleRanges:
			new EventEmitter<TextEditorVisibleRangesChangeEvent>().event,
		onDidChangeTextEditorOptions:
			new EventEmitter<TextEditorOptionsChangeEvent>().event,
		onDidChangeTextEditorViewColumn:
			new EventEmitter<TextEditorViewColumnChangeEvent>().event,
		ShowTextDocument: (documentOrURI, columnOrOptions, preserveFocus) =>
			Effect.gen(function* (G) {
				let uri: Uri;
				if ("uri" in documentOrURI) {
					uri = documentOrURI.uri;
				} else {
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
								? RangeConverter.FromAPI(options.selection)
								: undefined,
						}
					: undefined;
				const viewColumnDTO =
					typeof columnOrOptions === "number"
						? ViewColumnConverter.FromAPI(columnOrOptions)
						: undefined;

				const editorId = yield* G(
					IPC.SendRequest<string>("$showTextDocument", [
						URIConverter.FromAPI(uri),
						viewColumnDTO,
						optionsDTO,
					]),
				);

				const editor = (yield* G(Ref.get(TextEditorsMapRef))).get(
					editorId,
				);
				if (!editor) {
					return yield* G(
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
