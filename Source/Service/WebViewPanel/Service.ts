/**
 * @module Service (WebViewPanel)
 * @description Defines the interface and Context.Tag for the WebViewPanel service.
 */

import { Context, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Disposable,
	ViewColumn,
	WebviewOptions,
	WebviewPanel,
	WebviewPanelOptions,
	WebviewPanelSerializer,
} from "vscode";

export default class WebViewPanelService extends Context.Tag(
	"Service/WebViewPanel",
)<
	WebViewPanelService,
	{
		/**
		 * Creates a new webview panel.
		 */
		readonly CreateWebviewPanel: (
			Extension: IExtensionDescription,

			ViewType: string,

			Title: string,

			ShowOptions:
				| ViewColumn
				| {
						readonly viewColumn: ViewColumn;

						readonly preserveFocus?: boolean;
				  },

			Options?: WebviewPanelOptions & WebviewOptions,
		) => Effect.Effect<WebviewPanel, Error>;

		/**
		 * Registers a webview panel serializer.
		 */
		readonly RegisterWebviewPanelSerializer: (
			Extension: IExtensionDescription,

			ViewType: string,

			Serializer: WebviewPanelSerializer,
		) => Effect.Effect<Disposable, Error>;
	}
>() {}
