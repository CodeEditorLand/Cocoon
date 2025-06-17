/*
 * File: Cocoon/Source/Service/WebViewPanel/Definition.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:18 UTC
 * Dependency: ../../TypeConverter/WebView.js, ../IPC/Service.js, ./Service.js, ./WebViewPanelImplementation.js, effect, vs/base/common/uuid.js, vs/platform/extensions/common/extensions.js
 */

/**
 * @module Definition (WebViewPanel)
 * @description The live implementation of the WebViewPanel service factory.
 */

import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	type ViewColumn,
	type WebviewOptions,
	type WebviewPanelOptions,
	type WebviewPanelSerializer,
} from "vscode";

import { WebView as TypeConverter } from "../../TypeConverter/WebView.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import WebViewPanelImplementation from "./WebViewPanelImplementation.js";

/**
 * An Effect that builds the live implementation of the WebViewPanel service factory.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const ActivePanels = yield* Ref.make(
		new Map<string, WebViewPanelImplementation>(),
	);

	// --- RPC Handlers ---
	IPC.RegisterInvokeHandler("$onDidDisposeWebview", ([Handle]) =>
		Effect.gen(function* () {
			const Panel = (yield* Ref.get(ActivePanels)).get(Handle);
			if (Panel) {
				Panel.dispose();
			}
		}).pipe(Effect.runPromise),
	);

	IPC.RegisterInvokeHandler("$onDidReceiveMessage", ([Handle, Message]) =>
		Effect.gen(function* () {
			const Panel = (yield* Ref.get(ActivePanels)).get(Handle);
			if (Panel) {
				// The implementation panel, not the webview property, is responsible for firing events.
				Panel.fireDidReceiveMessage(Message);
			}
		}).pipe(Effect.runPromise),
	);

	IPC.RegisterInvokeHandler(
		"$onDidChangeWebviewPanelViewState",
		([Handle, NewState]) =>
			Effect.gen(function* () {
				const Panel = (yield* Ref.get(ActivePanels)).get(Handle);
				if (Panel) {
					// The method should be public to be called from here.
					Panel.updateViewState(NewState);
				}
			}).pipe(Effect.runPromise),
	);

	IPC.RegisterInvokeHandler(
		"$deserializeWebviewPanel",
		([_Handle, _ViewType, _Title, _State, _Options, _ContentOptions]) =>
			Effect.succeed(undefined).pipe(Effect.runPromise), // Stubbed
	);

	const WebViewPanelImplementationFactory: Service["Type"] = {
		CreateWebviewPanel: (
			Extension: IExtensionDescription,
			ViewType: string,
			Title: string,
			ShowOptions:
				| ViewColumn
				| {
						readonly viewColumn: ViewColumn;
						readonly preserveFocus?: boolean;
				  },
			Options: WebviewPanelOptions & WebviewOptions = {},
		) =>
			Effect.gen(function* () {
				const Handle = generateUuid();
				const ViewColumnValue =
					typeof ShowOptions === "object"
						? ShowOptions.viewColumn
						: ShowOptions;
				const PreserveFocus =
					typeof ShowOptions === "object"
						? !!ShowOptions.preserveFocus
						: false;

				const ShowOptionsDTO = TypeConverter.ConvertShowOptionToDTO(
					ViewColumnValue,
					PreserveFocus,
				);
				const PanelOptionsDTO =
					TypeConverter.ConvertPanelOptionToDTO(Options);
				const ContentOptionsDTO =
					TypeConverter.ConvertContentOptionToDTO(Extension, Options);

				yield* IPC.SendRequest<string>("$createWebviewPanel", [
					Handle,
					ViewType,
					Title,
					ShowOptionsDTO,
					PanelOptionsDTO,
					ContentOptionsDTO,
				]);

				const OnDispose = () => {
					Effect.runFork(
						Ref.update(
							ActivePanels,
							(Map) => (Map.delete(Handle), Map),
						),
					);
				};

				const Panel = new WebViewPanelImplementation(
					Handle,
					IPC,
					Extension,
					OnDispose,
					ViewType,
					Title,
					Options,
					ViewColumnValue,
				);
				yield* Ref.update(ActivePanels, (Map) =>
					Map.set(Handle, Panel),
				);
				return Panel;
			}),

		RegisterWebviewPanelSerializer: (
			_Extension: IExtensionDescription,
			ViewType: string,
			_Serializer: WebviewPanelSerializer,
		) =>
			Effect.sync(() => {
				IPC.SendNotification("$registerWebviewPanelSerializer", [
					ViewType,
					{},
				]);
				return new Disposable(() => {
					IPC.SendNotification("$unregisterWebviewPanelSerializer", [
						ViewType,
					]);
				});
			}),
	};

	return WebViewPanelImplementationFactory;
});
