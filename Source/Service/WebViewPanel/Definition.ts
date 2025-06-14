/**
 * @module Definition (WebViewPanel)
 * @description The live implementation of the WebViewPanel service factory.
 */

import { Context, Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	type ViewColumn,
	type WebviewOptions,
	type WebviewPanelOptions,
	type WebviewPanelSerializer,
} from "vscode";

import * as TypeConverter from "../../TypeConverter/WebView.js";
import IPCService from "../IPC/Service.js";
import WebViewPanelImplementation from "./WebViewPanelImplementation.js";

export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const ActivePanels = yield* Ref.make(
		new Map<string, WebViewPanelImplementation>(),
	);

	IPC.RegisterInvokeHandler("$onDidDisposeWebview", ([handle]) =>
		Effect.gen(function* () {
			const panel = (yield* Ref.get(ActivePanels)).get(handle);
			if (panel) {
				panel.dispose();
			}
		}),
	);

	IPC.RegisterInvokeHandler("$onDidReceiveMessage", ([handle, message]) =>
		Effect.gen(function* () {
			const panel = (yield* Ref.get(ActivePanels)).get(handle);
			if (panel) {
				(panel.webview as any).fireDidReceiveMessage(message);
			}
		}),
	);

	IPC.RegisterInvokeHandler(
		"$onDidChangeWebviewPanelViewState",
		([handle, newState]) =>
			Effect.gen(function* () {
				const panel = (yield* Ref.get(ActivePanels)).get(handle);
				if (panel) {
					panel._updateViewState(newState);
				}
			}),
	);

	IPC.RegisterInvokeHandler(
		"$deserializeWebviewPanel",
		([handle, viewType, title, state, options, contentOptions]) =>
			Effect.succeed(undefined), // Stubbed
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
		CreateWebviewPanel: (
			Extension: IExtensionDescription,
			ViewType: string,
			Title: string,
			ShowOptions:
				| ViewColumn
				| { viewColumn: ViewColumn; preserveFocus?: boolean },
			Options: WebviewPanelOptions & WebviewOptions = {},
		) =>
			Effect.gen(function* () {
				const handle = generateUuid();
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
					handle,
					ViewType,
					Title,
					ShowOptionsDTO,
					PanelOptionsDTO,
					ContentOptionsDTO,
				]);

				const onDispose = () => {
					Effect.runFork(
						Ref.update(
							ActivePanels,
							(map) => (map.delete(handle), map),
						),
					);
				};

				const Panel = new WebViewPanelImplementation(
					handle,
					IPC,
					Extension,
					onDispose,
					ViewType,
					Title,
					Options,
					ViewColumnValue,
				);
				yield* Ref.update(ActivePanels, (map) =>
					map.set(handle, Panel),
				);
				return Panel;
			}),

		RegisterWebviewPanelSerializer: (
			Extension: IExtensionDescription,
			ViewType: string,
			Serializer: WebviewPanelSerializer,
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

	return ServiceImplementation;
});
