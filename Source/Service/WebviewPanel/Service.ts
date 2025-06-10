/**
 * @module Service (WebviewPanel)
 * @description Defines the interface and Context.Tag for the WebviewPanel service.
 */

import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	ViewColumn,
	WebviewOptions,
	WebviewPanel,
	WebviewPanelOptions,
} from "vscode";

export interface Interface {
	/**
	 * Creates a new webview panel.
	 */
	readonly CreateWebviewPanel: (
		Extension: IExtensionDescription,
		ViewType: string,
		Title: string,
		ShowOptions:
			| ViewColumn
			| { viewColumn: ViewColumn; preserveFocus?: boolean },
		Options?: WebviewPanelOptions & WebviewOptions,
	) => Effect.Effect<WebviewPanel, Error>;
}

export const Tag = Context.Tag<Interface>("Service/WebviewPanel");
