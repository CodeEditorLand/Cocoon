/**
 * @module Definition (WebViewPanel)
 * @description The live implementation of the WebViewPanel service factory.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { ViewColumn, WebViewOption, WebViewPanelOption } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { IPCProvider } from "../IPC.js";
import type { Interface } from "./Service.js";
import { WebViewPanelImpl } from "./WebViewPanelImplementation.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const ActivePanels = yield* _(
		Ref.make(new Map<string, WebViewPanelImpl>()),
	);

	// --- RPC Handlers for events FROM Mountain ---
	IPC.RegisterInvokeHandler("$onDidDisposeWebView", ([handle]) => {
		// ... logic to find panel by handle and call its dispose() method ...
	});
	IPC.RegisterInvokeHandler("$onDidReceiveMessage", ([handle, message]) => {
		// ... logic to find panel and call webview.FireDidReceiveMessage(message) ...
	});

	const ServiceImplementation: Interface = {
		CreateWebViewPanel: (
			Extension,
			ViewType,
			Title,
			ShowOption,
			Option = {},
		) =>
			Effect.gen(function* (_) {
				const ViewColumnValue =
					typeof ShowOption === "object"
						? ShowOption.viewColumn
						: ShowOption;
				const PreserveFocus =
					typeof ShowOption === "object"
						? !!ShowOption.preserveFocus
						: false;

				const SerializedShowOption =
					TypeConverter.WebView.ConvertShowOptionToDTO(
						ViewColumnValue,
						PreserveFocus,
					);
				const SerializedPanelOption =
					TypeConverter.WebView.ConvertPanelOptionToDTO(Option);
				const SerializedContentOption =
					TypeConverter.WebView.ConvertContentOptionToDTO(
						Extension,
						Option,
					);

				const Handle = yield* _(
					IPC.SendRequest<string>("$createWebViewPanel", [
						TypeConverter.WebView.ConvertExtensionDataToDTO(
							Extension,
						),
						ViewType,
						Title,
						SerializedShowOption,
						SerializedPanelOption,
						SerializedContentOption,
						true,
					]),
				);

				const onDispose = () => {
					Ref.update(
						ActivePanels,
						(map) => (map.delete(Handle), map),
					).pipe(Effect.runSync);
				};

				const Panel = new WebViewPanelImpl(
					Handle,
					IPC,
					Extension,
					onDispose,
					Title,
					Option,
					ViewColumnValue,
				);
				yield* _(
					Ref.update(ActivePanels, (map) => map.set(Handle, Panel)),
				);

				return Panel;
			}),
	};

	return ServiceImplementation;
});
