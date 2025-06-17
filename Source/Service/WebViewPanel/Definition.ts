/*
 * File: Cocoon/Source/Service/WebViewPanel/Definition.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:10 UTC
 * Dependency: ../../TypeConverter/WebView/ConvertContentOptionToDTO.js, ../../TypeConverter/WebView/ConvertPanelOptionToDTO.js, ../../TypeConverter/WebView/ConvertShowOptionToDTO.js, ../IPC/Service.js, ./Service.js, ./WebViewPanelImplementation.js, effect, vs/base/common/uuid.js, vs/platform/extensions/common/extensions.js, vscode
 */

/**
 * @module Definition (WebViewPanel)
 * @description The live implementation of the WebViewPanel service factory.
 */

import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, type WebviewPanelSerializer } from "vscode";

import ConvertContentOptionToDTO from "../../TypeConverter/WebView/ConvertContentOptionToDTO.js";
import ConvertPanelOptionToDTO from "../../TypeConverter/WebView/ConvertPanelOptionToDTO.js";
import ConvertShowOptionToDTO from "../../TypeConverter/WebView/ConvertShowOptionToDTO.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import WebViewPanelImplementation from "./WebViewPanelImplementation.js";

/**
 * An Effect that builds the live implementation of the WebViewPanel service factory.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const ActivePanelsRef = yield* G(
		Ref.make(new Map<string, WebViewPanelImplementation>()),
	);

	// --- RPC Handler Effects ---
	const OnDidDisposeWebviewEffect = (Handle: string) =>
		Effect.gen(function* (G) {
			const Panel = (yield* G(Ref.get(ActivePanelsRef))).get(Handle);
			if (Panel) {
				Panel.dispose();
			}
		});

	const OnDidReceiveMessageEffect = (Handle: string, Message: any) =>
		Effect.gen(function* (G) {
			const Panel = (yield* G(Ref.get(ActivePanelsRef))).get(Handle);
			Panel?.fireDidReceiveMessage(Message);
		});

	const OnDidChangeViewStateEffect = (Handle: string, NewState: any) =>
		Effect.gen(function* (G) {
			const Panel = (yield* G(Ref.get(ActivePanelsRef))).get(Handle);
			Panel?.updateViewState(NewState);
		});

	// --- Register Handlers ---
	yield* G(
		Effect.sync(() => {
			IPC.RegisterInvokeHandler("$onDidDisposeWebview", ([Handle]) =>
				Effect.runPromise(OnDidDisposeWebviewEffect(Handle)),
			);
			IPC.RegisterInvokeHandler(
				"$onDidReceiveMessage",
				([Handle, Message]) =>
					Effect.runPromise(
						OnDidReceiveMessageEffect(Handle, Message),
					),
			);
			IPC.RegisterInvokeHandler(
				"$onDidChangeWebviewPanelViewState",
				([Handle, NewState]) =>
					Effect.runPromise(
						OnDidChangeViewStateEffect(Handle, NewState),
					),
			);
			IPC.RegisterInvokeHandler(
				"$deserializeWebviewPanel",
				() => Effect.runPromise(Effect.succeed(undefined)), // Stubbed
			);
		}),
	);

	const WebViewPanelFactory: Service["Type"] = {
		CreateWebviewPanel: (
			Extension,
			ViewType,
			Title,
			ShowOptions,
			Options = {},
		) =>
			Effect.gen(function* (G) {
				const Handle = generateUuid();
				const ViewColumnValue =
					typeof ShowOptions === "object"
						? ShowOptions.viewColumn
						: ShowOptions;
				const PreserveFocus =
					typeof ShowOptions === "object"
						? !!ShowOptions.preserveFocus
						: false;

				const ShowOptionsDTO = ConvertShowOptionToDTO(
					ViewColumnValue,
					PreserveFocus,
				);
				const PanelOptionsDTO = ConvertPanelOptionToDTO(Options);
				const ContentOptionsDTO = ConvertContentOptionToDTO(
					Extension,
					Options,
				);

				yield* G(
					IPC.SendRequest<string>("$createWebviewPanel", [
						Handle,
						ViewType,
						Title,
						ShowOptionsDTO,
						PanelOptionsDTO,
						ContentOptionsDTO,
					]),
				);

				const OnDispose = () =>
					Effect.runFork(
						Ref.update(
							ActivePanelsRef,
							(Map) => (Map.delete(Handle), Map),
						),
					);

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
				yield* G(
					Ref.update(ActivePanelsRef, (Map) =>
						Map.set(Handle, Panel),
					),
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

	return WebViewPanelFactory;
});
