/*
 * File: Cocoon/Source/Service/WebViewPanel/Service.ts
 * Role: Defines the service interface and provides the default "live" implementation using Effect.Service.
 * Responsibilities:
 *   - Declare the contract for creating and managing webview panels.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	type WebviewPanelSerializer,
	type ViewColumn,
	type WebviewOptions,
	type WebviewPanel,
	type WebviewPanelOptions,
} from "vscode";

import ConvertContentOptionToDTO from "../../TypeConverter/WebView/ConvertContentOptionToDTO.js";
import ConvertPanelOptionToDTO from "../../TypeConverter/WebView/ConvertPanelOptionToDTO.js";
import ConvertShowOptionToDTO from "../../TypeConverter/WebView/ConvertShowOptionToDTO.js";
import { IPCService } from "../IPC/Service.js"; // Assuming IPCService is defined with Effect.Service or Context.Tag
import WebViewPanelImplementation from "./WebViewPanelImplementation.js";

/**
 * The `Effect.Service` for the WebViewPanel service.
 * This service implements the `vscode.window.createWebviewPanel` API, allowing
 * extensions to create custom, web-based views within the editor.
 *
 * This class definition combines the service interface, the implementation logic,
 * and the default layer (`WebViewPanel.Default`) into one.
 */
export class WebViewPanel extends Effect.Service<WebViewPanel>()(
	"Service/WebViewPanel", // The service tag
	{
		// The `effect` property defines how to construct the service.
		// This logic was previously in your Definition.ts file.
		effect: Effect.gen(function* () {
			// 1. Yield dependencies. Effect will provide them from the context.
			const IPC = yield* IPCService;
			const ActivePanelsRef = yield* Ref.make(
				new Map<string, WebViewPanelImplementation>(),
			);

			// --- RPC Handler Effects ---
			const OnDidDisposeWebviewEffect = (Handle: string) =>
				Effect.gen(function* () {
					const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
					if (Panel) {
						Panel.dispose();
					}
				});

			const OnDidReceiveMessageEffect = (Handle: string, Message: any) =>
				Effect.gen(function* () {
					const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
					Panel?.fireDidReceiveMessage(Message);
				});

			const OnDidChangeViewStateEffect = (
				Handle: string,
				NewState: any,
			) =>
				Effect.gen(function* () {
					const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
					Panel?.updateViewState(NewState);
				});

			// --- Register Handlers ---
			// We run this synchronously during the service construction.
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
				// Stubbed
				() => Effect.runPromise(Effect.succeed(undefined)),
			);

			// 2. Return the implementation object that matches the service interface.
			return {
				CreateWebviewPanel: (
					Extension,
					ViewType,
					Title,
					ShowOptions,
					Options = {},
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

						const ShowOptionsDTO = ConvertShowOptionToDTO(
							ViewColumnValue,
							PreserveFocus,
						);
						const PanelOptionsDTO =
							ConvertPanelOptionToDTO(Options);
						const ContentOptionsDTO = ConvertContentOptionToDTO(
							Extension,
							Options,
						);

						yield* IPC.SendRequest<string>("$createWebviewPanel", [
							Handle,
							ViewType,
							Title,
							ShowOptionsDTO,
							PanelOptionsDTO,
							ContentOptionsDTO,
						]);

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

						yield* Ref.update(ActivePanelsRef, (Map) =>
							Map.set(Handle, Panel),
						);

						return Panel;
					}),

				RegisterWebviewPanelSerializer: (
					_Extension,
					ViewType,
					_Serializer,
				) =>
					Effect.sync(() => {
						IPC.SendNotification(
							"$registerWebviewPanelSerializer",
							[ViewType, {}],
						);
						return new Disposable(() => {
							IPC.SendNotification(
								"$unregisterWebviewPanelSerializer",
								[ViewType],
							);
						});
					}),
			};
		}),
	},
) {}
