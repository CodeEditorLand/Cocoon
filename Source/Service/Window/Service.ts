/*
 * File: Cocoon/Source/Service/Window/Service.ts
 * Role: Defines the Window service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Manage window-level state (e.g., focus).
 *   - Orchestrate calls to show documents, delegating to the host.
 */

import { Effect, Ref } from "effect";
import type {
	Event,
	TextDocument,
	TextDocumentShowOptions,
	TextEditor,
	Uri,
	ViewColumn,
	WindowState,
	TextEditorSelectionChangeEvent,
	TextEditorVisibleRangesChangeEvent,
	TextEditorOptionsChangeEvent,
	TextEditorViewColumnChangeEvent,
} from "vscode";
import { Emitter } from "vs/base/common/event.js";
import RangeConverter from "../../TypeConverter/Main/Range.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import ViewColumnConverter from "../../TypeConverter/Main/ViewColumn.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC/Service.js";

export class Window extends Effect.Service<Window>()("Service/Window", {
	effect: Effect.gen(function* (Generator) {
		const IPCService = yield* Generator(IPC);

		// Note: TextEditor state is now managed by the Workspace service.
		// This service only manages window-level state.
		const WindowStateRef = yield* Generator(
			Ref.make<WindowState>({ focused: true, active: true }),
		);
		const OnDidChangeWindowStateStream = CreateEventStream<WindowState>();

		const AcceptWindowStateChangedEffect = (IsFocused: boolean) => {
			const NewState = { focused: IsFocused, active: IsFocused };
			return Ref.set(WindowStateRef, NewState).pipe(
				Effect.andThen(OnDidChangeWindowStateStream.Fire(NewState)),
			);
		};

		IPCService.RegisterInvokeHandler(
			"$acceptWindowStateChanged",
			([IsFocused]) =>
				Effect.runPromise(AcceptWindowStateChangedEffect(IsFocused)),
		);

		const ServiceImplementation = {
			get state() {
				return Effect.runSync(Ref.get(WindowStateRef));
			},
			onDidChangeWindowState: OnDidChangeWindowStateStream.event,

			ShowTextDocument: (
				documentOrURI: Uri | TextDocument,
				columnOrOptions?: ViewColumn | TextDocumentShowOptions,
				preserveFocus?: boolean,
			): Effect.Effect<TextEditor, Error> =>
				Effect.gen(function* (Generator) {
					// This method would depend on the Workspace service to get the editor instance
					// after the IPC call. For this refactoring, we keep the original logic,
					// but a full architectural review might move this to the Workspace service.
					const TheUri: Uri =
						"uri" in documentOrURI
							? documentOrURI.uri
							: documentOrURI;
					const Options =
						typeof columnOrOptions === "object"
							? (columnOrOptions as TextDocumentShowOptions)
							: undefined;
					const OptionsDTO = Options
						? {
								preserveFocus:
									preserveFocus ?? Options.preserveFocus,
								selection: Options.selection
									? RangeConverter.FromAPI(Options.selection)
									: undefined,
							}
						: undefined;
					const ViewColumnDTO =
						typeof columnOrOptions === "number"
							? ViewColumnConverter.FromAPI(columnOrOptions)
							: undefined;

					// This is a simplification. A full implementation would need to get the editor object
					// from the Workspace service after the host confirms it's shown.
					const EditorId = yield* Generator(
						IPCService.SendRequest<string>("$showTextDocument", [
							URIConverter.FromAPI(TheUri),
							ViewColumnDTO,
							OptionsDTO,
						]),
					);
					return yield* Generator(
						Effect.fail(
							new Error(
								`Editor lookup for ID '${EditorId}' is not implemented in this refactored service. This logic belongs in the Workspace service.`,
							),
						),
					);
				}),
		};

		return ServiceImplementation;
	}),
}) {}
