/**
 * @module Service (WebViewPanel)
 * @description Defines the interface and Context.Tag for the WebViewPanel service.
 */

import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	ViewColumn,
	WebViewOption,
	WebViewPanel,
	WebViewPanelOption,
} from "vscode";

export interface Interface {
	/**
	 * Creates a new webview panel.
	 */
	readonly CreateWebViewPanel: (
		Extension: IExtensionDescription,
		ViewType: string,
		Title: string,
		ShowOption:
			| ViewColumn
			| { viewColumn: ViewColumn; preserveFocus?: boolean },
		Option?: WebViewPanelOption & WebViewOption,
	) => Effect.Effect<WebViewPanel, Error>;
}

export const Tag = Context.Tag<Interface>("Service/WebViewPanel");
