/**
 * @module Definition (WebviewPanel)
 * @description The live implementation of the WebviewPanel service factory.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { ViewColumn, WebviewOptions, WebviewPanelOptions } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { IpcProvider } from "../Ipc.js";
import type { Interface } from "./Service.js";
import { WebviewPanelImpl } from "./WebviewPanelImpl.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const ActivePanels = yield* _(
		Ref.make(new Map<string, WebviewPanelImpl>()),
	);

	// --- RPC Handlers for events FROM Mountain ---
	Ipc.RegisterInvokeHandler("$onDidDisposeWebview", ([handle]) => {
		// ... logic to find panel by handle and call its dispose() method ...
	});
	Ipc.RegisterInvokeHandler("$onDidReceiveMessage", ([handle, message]) => {
		// ... logic to find panel and call webview.FireDidReceiveMessage(message) ...
	});

	const ServiceImplementation: Interface = {
		CreateWebviewPanel: (
			Extension,
			ViewType,
			Title,
			ShowOptions,
			Options = {},
		) =>
			Effect.gen(function* (_) {
				const ViewColumnValue =
					typeof ShowOptions === "object"
						? ShowOptions.viewColumn
						: ShowOptions;
				const PreserveFocus =
					typeof ShowOptions === "object"
						? !!ShowOptions.preserveFocus
						: false;

				const SerializedShowOptions =
					TypeConverter.Webview.ConvertShowOptionsToDto(
						ViewColumnValue,
						PreserveFocus,
					);
				const SerializedPanelOptions =
					TypeConverter.Webview.ConvertPanelOptionsToDto(Options);
				const SerializedContentOptions =
					TypeConverter.Webview.ConvertContentOptionsToDto(
						Extension,
						Options,
					);

				const Handle = yield* _(
					Ipc.SendRequest<string>("$createWebviewPanel", [
						TypeConverter.Webview.ConvertExtensionDataToDto(
							Extension,
						),
						ViewType,
						Title,
						SerializedShowOptions,
						SerializedPanelOptions,
						SerializedContentOptions,
						true,
					]),
				);

				const onDispose = () => {
					Ref.update(
						ActivePanels,
						(map) => (map.delete(Handle), map),
					).pipe(Effect.runSync);
				};

				const Panel = new WebviewPanelImpl(
					Handle,
					Ipc,
					Extension,
					onDispose,
					Title,
					Options,
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
