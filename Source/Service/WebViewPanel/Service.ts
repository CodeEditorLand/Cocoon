/*
 * File: Cocoon/Source/Service/WebViewPanel/Service.ts
 * Role: Defines the WebViewPanel service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for creating and managing webview panels using Effect.Service.
 *   - Provide the default Layer (`WebViewPanel.Default`) for dependency injection.
 */

import { Effect, Layer, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	type ViewColumn,
	type WebviewOptions,
	type WebviewPanel,
	type WebviewPanelOptions,
	type WebviewPanelSerializer,
} from "vscode";

import ConvertContentOptionToDTO from "../../TypeConverter/WebView/ConvertContentOptionToDTO.js";
import ConvertPanelOptionToDTO from "../../TypeConverter/WebView/ConvertPanelOptionToDTO.js";
import ConvertShowOptionToDTO from "../../TypeConverter/WebView/ConvertShowOptionToDTO.js";
import { IPCService } from "../IPC/Service.js";
import WebViewPanelImplementation from "./WebViewPanelImplementation.js";

export class WebViewPanel extends Effect.Service<WebViewPanel>()(
	"Service/WebViewPanel",
	{
		// The `effect` property defines how to construct the service.
		// This logic comes from your `Definition.ts` file.
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
			// Run this setup logic synchronously during service construction.
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
