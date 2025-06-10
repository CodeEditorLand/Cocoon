/**
 * @module Service (StatusBar)
 * @description Defines the interface and Context.Tag for the StatusBar service.
 */

import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Disposable, StatusBarAlignment, StatusBarItem } from "vscode";

export interface Interface {
	/**
	 * Creates a new status bar item.
	 * @param Extension - The extension creating the item.
	 * @param Id - An optional identifier for the item.
	 * @param Alignment - Optional alignment for the item.
	 * @param Priority - Optional priority for the item.
	 */
	readonly CreateStatusBarItem: (
		Extension: IExtensionDescription,
		Id?: string,
		Alignment?: StatusBarAlignment,
		Priority?: number,
	) => Effect.Effect<StatusBarItem, never>;

	/**
	 * Sets a temporary message in the status bar.
	 * @param Text - The message to show.
	 * @param HideOrPromise - Either a timeout in ms or a Promise that resolves when the message should be hidden.
	 */
	readonly SetStatusBarMessage: (
		Text: string,
		HideOrPromise?: number | Promise<any>,
	) => Disposable;
}

export const Tag = Context.Tag<Interface>("Service/StatusBar");
