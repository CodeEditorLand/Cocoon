/**
 * @module WebviewPanel
 * @description Defines the service for creating and managing `vscode.WebviewPanel` instances.
 */

import { generateUuid } from "@codeeditorland/output/vs/base/common/uuid.js";
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect, Ref } from "effect";
import {
	Disposable,
	type ViewColumn,
	type WebviewPanel as VSCodeWebviewPanel,
	type WebviewOptions,
	type WebviewPanelOptions,
	type WebviewPanelSerializer,
} from "vscode";

import { IPCService } from "./IPC.js";
import { ConvertContentOptionToDTO } from "./TypeConverter/Webview/ConvertContentOptionToDTO.js";
import { ConvertPanelOptionToDTO } from "./TypeConverter/Webview/ConvertPanelOptionToDTO.js";
import { ConvertShowOptionToDTO } from "./TypeConverter/Webview/ConvertShowOptionToDTO.js";
import { WebviewPanelImplementation } from "./WebviewPanel/WebviewPanelImplementation.js";

/**
 * @interface WebviewPanel
 * @description The contract for the WebviewPanel service.
 */
export interface WebviewPanel {
	readonly CreateWebviewPanel: (
		Extension: IExtensionDescription,
		ViewType: string,
		Title: string,
		ShowOptions:
			| ViewColumn
			| { viewColumn: ViewColumn; preserveFocus?: boolean },
		Options?: WebviewPanelOptions & WebviewOptions,
	) => Effect.Effect<VSCodeWebviewPanel, Error>;
	readonly RegisterWebviewPanelSerializer: (
		Extension: IExtensionDescription,
		ViewType: string,
		Serializer: WebviewPanelSerializer,
	) => Effect.Effect<Disposable, never>;
}

/**
 * @class WebviewPanel
 * @description The `Effect.Service` for managing webview panels.
 */
export class WebviewPanelService extends Effect.Service<WebviewPanelService>()(
	"Service/WebviewPanel",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const ActivePanelsRef = yield* Ref.make(
				new Map<string, WebviewPanelImplementation>(),
			);

			// --- RPC Handlers ---
			const OnDidDisposeWebview = (Handle: string) =>
				Effect.gen(function* () {
					const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
					if (Panel) Panel.dispose();
				});

			const OnDidReceiveMessage = (Handle: string, Message: any) =>
				Effect.gen(function* () {
					const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
					Panel?.fireDidReceiveMessage(Message);
				});

			const OnDidChangeViewState = (Handle: string, NewState: any) =>
				Effect.gen(function* () {
					const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
					Panel?.updateViewState(NewState);
				});

			IPC.RegisterInvokeHandler("$onDidDisposeWebview", ([Handle]) =>
				Effect.runPromise(OnDidDisposeWebview(Handle)),
			);
			IPC.RegisterInvokeHandler(
				"$onDidReceiveMessage",
				([Handle, Message]) =>
					Effect.runPromise(OnDidReceiveMessage(Handle, Message)),
			);
			IPC.RegisterInvokeHandler(
				"$onDidChangeWebviewPanelViewState",
				([Handle, NewState]) =>
					Effect.runPromise(OnDidChangeViewState(Handle, NewState)),
			);
			IPC.RegisterInvokeHandler("$deserializeWebviewPanel", () =>
				Effect.runPromise(Effect.succeed(undefined)),
			); // Stubbed

			return {
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
						const Panel = new WebviewPanelImplementation(
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
					_Extension: IExtensionDescription,
					ViewType: string,
					_Serializer: WebviewPanelSerializer,
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
