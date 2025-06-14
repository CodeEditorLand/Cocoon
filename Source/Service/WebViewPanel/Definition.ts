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

import * as TypeConverter from "../../TypeConverter.js";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import type { Interface } from "./Service.js";
import { WebViewPanelImplementation } from "./WebViewPanelImplementation.js";

export const Definition = Effect.gen(function* () {
	const IPCService = yield* IPC.Tag;
	const ActivePanels = yield* Ref.make(
		new Map<string, WebViewPanelImplementation>(),
	);

	IPCService.RegisterInvokeHandler("$onDidDisposeWebview", ([handle]) =>
		Effect.gen(function* () {
			const panel = (yield* Ref.get(ActivePanels)).get(handle);
			if (panel) {
				panel.dispose();
			}
		}),
	);

	IPCService.RegisterInvokeHandler(
		"$onDidReceiveMessage",
		([handle, message]) =>
			Effect.gen(function* () {
				const panel = (yield* Ref.get(ActivePanels)).get(handle);
				if (panel) {
					(panel.webview as any).fireDidReceiveMessage(message);
				}
			}),
	);

	IPCService.RegisterInvokeHandler(
		"$onDidChangeWebviewPanelViewState",
		([handle, newState]) =>
			Effect.gen(function* () {
				const panel = (yield* Ref.get(ActivePanels)).get(handle);
				if (panel) {
					panel._updateViewState(newState);
				}
			}),
	);

	IPCService.RegisterInvokeHandler(
		"$deserializeWebviewPanel",
		([handle, viewType, title, state, options, contentOptions]) =>
			Effect.succeed(undefined), // Stubbed
	);

	const ServiceImplementation: Interface = {
		CreateWebviewPanel: (
			Extension,
			ViewType,
			Title,
			ShowOptions,
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

				const ShowOptionsDTO =
					TypeConverter.WebView.ConvertShowOptionToDTO(
						ViewColumnValue,
						PreserveFocus,
					);
				const PanelOptionsDTO =
					TypeConverter.WebView.ConvertPanelOptionToDTO(Options);
				const ContentOptionsDTO =
					TypeConverter.WebView.ConvertContentOptionToDTO(
						Extension,
						Options,
					);

				yield* IPCService.SendRequest<string>("$createWebviewPanel", [
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
					IPCService,
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

		RegisterWebviewPanelSerializer: (Extension, ViewType, Serializer) =>
			Effect.sync(() => {
				IPCService.SendNotification("$registerWebviewPanelSerializer", [
					ViewType,
					{},
				]);
				return new Disposable(() => {
					IPCService.SendNotification(
						"$unregisterWebviewPanelSerializer",
						[ViewType],
					);
				});
			}),
	};

	return ServiceImplementation;
});
