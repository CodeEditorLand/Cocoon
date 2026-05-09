/**
 * @module Window (ARCHIVED)
 * @description
 * ARCHIVED - This file has been adapted and moved to Source/Services/Window.ts
 *
 * Patterns borrowed from this file:
 * - Window state tracking with Ref
 * - Text document display coordination
 * - Event stream pattern for state changes
 *
 * New implementation in Source/Services/Window.ts includes:
 * - Mountain gRPC integration (replaced IPC.SendRequest)
 * - Enhanced show* methods (InformationMessage, WarningMessage, etc.)
 * - Comprehensive TODOs for all window operations
 * - StatusBar, OutputChannel, WebviewPanel integration hooks
 * - TypeConverter integration points
 *
 * Archive kept for reference during further implementation work.
 *
 * Original description: Defines the service for managing window-level state and orchestrating
 * calls to show documents in the editor, delegating to the host process via IPC.
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
} from "vscode";

import { IPCService } from "./IPC.js";
import { FromAPI as RangeFromAPI } from "./TypeConverter/Main/Range.js";
import { FromAPI as ViewColumnFromAPI } from "./TypeConverter/Main/ViewColumn.js";
import { CreateEventStream } from "./Utility/EventStream.js";
import { WorkspaceService } from "./Workspace.js";

/**
 * @interface Window
 * @description The contract for the Window service.
 */
export interface Window {
	readonly state: WindowState;

	readonly onDidChangeWindowState: Event<WindowState>;

	readonly activeTextEditor: TextEditor | undefined;

	readonly ShowTextDocument: (
		documentOrUri: Uri | TextDocument,

		columnOrOptions?: ViewColumn | TextDocumentShowOptions,

		preserveFocus?: boolean,
	) => Effect.Effect<TextEditor, Error>;
}

/**
 * @class WindowService
 * @description The `Effect.Service` for the Window service.
 */
export class WindowService extends Effect.Service<WindowService>()(
	"Service/Window",

	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Workspace = yield* WorkspaceService;

			const WindowStateRef = yield* Ref.make<WindowState>({
				focused: true,
				active: true,
			});
			const { event: OnDidChangeWindowState, Fire: FireWindowState } =
				CreateEventStream<WindowState>();

			const AcceptWindowStateChanged = (IsFocused: boolean) => {
				const NewState = { focused: IsFocused, active: IsFocused };
				return Ref.set(WindowStateRef, NewState).pipe(
					Effect.andThen(FireWindowState(NewState)),
				);
			};

			IPC.RegisterInvokeHandler(
				"$acceptWindowStateChanged",

				([IsFocused]) =>
					Effect.runPromise(AcceptWindowStateChanged(IsFocused)),
			);

			const ShowTextDocument = (
				documentOrUri: Uri | TextDocument,

				columnOrOptions?: ViewColumn | TextDocumentShowOptions,

				preserveFocus?: boolean,
			): Effect.Effect<TextEditor, Error> =>
				Effect.gen(function* () {
					const TheUri: Uri =
						"uri" in documentOrUri
							? documentOrUri.uri
							: documentOrUri;
					const Options =
						typeof columnOrOptions === "object"
							? (columnOrOptions as TextDocumentShowOptions)
							: undefined;
					const OptionsDTO = Options
						? {
								preserveFocus:
									preserveFocus ?? Options.preserveFocus,
								selection: Options.selection
									? RangeFromAPI(Options.selection)
									: undefined,
							}
						: { preserveFocus: preserveFocus ?? false };
					const ViewColumnDTO =
						typeof columnOrOptions === "number"
							? ViewColumnFromAPI(columnOrOptions)
							: undefined;

					const EditorId = yield* IPC.SendRequest<string>(
						"$showTextDocument",

						[TheUri.toJSON(), ViewColumnDTO, OptionsDTO],
					);

					const Editor = Workspace.visibleTextEditors.find(
						(e) => (e as any).id === EditorId,
					);

					if (!Editor) {
						return yield* Effect.fail(
							new Error(
								`Could not find text editor with ID ${EditorId} after host confirmation.`,
							),
						);
					}
					return Editor;
				});

			const service: Window = {
				get state() {
					return Effect.runSync(Ref.get(WindowStateRef));
				},
				onDidChangeWindowState: OnDidChangeWindowState,
				get activeTextEditor() {
					return Workspace.activeTextEditor;
				},
				ShowTextDocument,
			};
			return service;
		}),
	},
) {}
