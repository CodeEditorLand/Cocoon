/*
 * File: Cocoon/Source/Service/Window/Definition.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:09 UTC
 * Dependency: ../../TypeConverter/Main/Range.js, ../../TypeConverter/Main/URI.js, ../../TypeConverter/Main/ViewColumn.js, ../../Utility/CreateEventStream.js, ../IPC/Service.js, ../WorkSpace/Service.js, ./Service.js, effect
 */

/**
 * @module Definition (Window)
 * @description The live implementation of the core Window service.
 */

import { Effect, Ref } from "effect";
import type {
	TextDocumentShowOptions,
	Uri,
	WindowState,
} from "vscode";

import RangeConverter from "../../TypeConverter/Main/Range.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import ViewColumnConverter from "../../TypeConverter/Main/ViewColumn.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import WorkSpaceService from "../WorkSpace/Service.js"; // Import WorkSpace service
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the Window service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const WorkSpace = yield* G(WorkSpaceService); // Get workspace service

	const WindowStateRef = yield* G(
		Ref.make<WindowState>({ focused: true, active: true }),
	);

	const OnDidChangeWindowStateStream = CreateEventStream<WindowState>();

	const AcceptWindowStateChangedEffect = (isFocused: boolean) => {
		const NewState = { focused: isFocused, active: isFocused };
		return Ref.set(WindowStateRef, NewState).pipe(
			Effect.andThen(OnDidChangeWindowStateStream.Fire(NewState)),
		);
	};

	yield* G(
		Effect.sync(() => {
			IPC.RegisterInvokeHandler(
				"$acceptWindowStateChanged",
				([isFocused]) =>
					Effect.runPromise(
						AcceptWindowStateChangedEffect(isFocused),
					),
			);
		}),
	);

	const ServiceImplementation: Service["Type"] = {
		get state() {
			return Effect.runSync(Ref.get(WindowStateRef));
		},
		onDidChangeWindowState: OnDidChangeWindowStateStream.event,

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

				// Now that WorkSpace manages the editor map, we need to get the editor from there.
				// This assumes an IPC call will eventually update the WorkSpace service's editor map.
				// A more robust implementation would wait for an event.
				const editor = WorkSpace.visibleTextEditors.find(
					(e) => (e as any).id === editorId,
				);

				if (!editor) {
					return yield* G(
						Effect.fail(
							new Error(
								`Could not find text editor with ID ${editorId} after showing it.`,
							),
						),
					);
				}
				return editor;
			}),
	};

	return ServiceImplementation;
});
