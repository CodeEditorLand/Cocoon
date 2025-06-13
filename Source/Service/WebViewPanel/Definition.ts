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

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const LogService = yield* _(Log.Tag);
	const ActivePanels = yield* _(
		Ref.make(new Map<string, WebViewPanelImplementation>()),
	);

	// --- RPC Handlers for events FROM Mountain ---
	IPCService.RegisterInvokeHandler("$onDidDisposeWebview", ([handle]) => {
		const panel = Ref.get(ActivePanels).pipe(
			Effect.map((m) => m.get(handle)),
			Effect.runSync,
		);
		if (panel) {
			panel.dispose();
		}
		return Promise.resolve(undefined);
	});
	IPCService.RegisterInvokeHandler(
		"$onDidReceiveMessage",
		([handle, message]) => {
			const panel = Ref.get(ActivePanels).pipe(
				Effect.map((m) => m.get(handle)),
				Effect.runSync,
			);
			if (panel) {
				(panel.webview as any).fireDidReceiveMessage(message);
			}
			return Promise.resolve(undefined);
		},
	);
	IPCService.RegisterInvokeHandler(
		"$onDidChangeWebviewPanelViewState",
		([handle, newState]) => {
			const panel = Ref.get(ActivePanels).pipe(
				Effect.map((m) => m.get(handle)),
				Effect.runSync,
			);
			if (panel) {
				panel._updateViewState(newState);
			}
			return Promise.resolve(undefined);
		},
	);
	IPCService.RegisterInvokeHandler(
		"$deserializeWebviewPanel",
		([handle, viewType, title, state, options, contentOptions]) => {
			// This requires looking up the correct serializer and calling it.
			// This is a complex flow that is stubbed for now.
			return Promise.resolve(undefined);
		},
	);

	const ServiceImplementation: Interface = {
		CreateWebviewPanel: (
			Extension,
			ViewType,
			Title,
			ShowOptions,
			Options: WebviewPanelOptions & WebviewOptions = {},
		) =>
			Effect.gen(function* (_) {
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

				yield* _(
					IPCService.SendRequest<string>("$createWebviewPanel", [
						handle,
						ViewType,
						Title,
						ShowOptionsDTO,
						PanelOptionsDTO,
						ContentOptionsDTO,
					]),
				);

				const onDispose = () => {
					Ref.update(
						ActivePanels,
						(map) => (map.delete(handle), map),
					).pipe(Effect.runSync);
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
				yield* _(
					Ref.update(ActivePanels, (map) => map.set(handle, Panel)),
				);

				return Panel;
			}),

		RegisterWebviewPanelSerializer: (Extension, ViewType, Serializer) =>
			Effect.sync(() => {
				IPCService.SendNotification("$registerWebviewPanelSerializer", [
					ViewType,
					{
						// options for the serializer
					},
				]);
				// The actual registration would be stored and used by the $deserializeWebviewPanel handler
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
