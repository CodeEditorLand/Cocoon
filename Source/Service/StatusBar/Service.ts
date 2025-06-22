/*
 * File: Cocoon/Source/Service/StatusBar/Service.ts
 * Role: Defines the interface and Context.Tag for the StatusBar service.
 * Responsibilities:
 *   1. Declare the contract for the StatusBar service, which provides access to
 *      creating status bar items and showing temporary messages.
 *   2. This is the public API surface consumed by other services or the API factory.
 */

import { Context, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Disposable, StatusBarAlignment, StatusBarItem } from "vscode";

export default class StatusBarService extends Context.Tag("Service/StatusBar")<
	StatusBarService,
	{
		/**
		 * Creates a new status bar item.
		 * @param Extension The extension creating the item.
		 * @param Id An optional identifier for the item.
		 * @param Alignment Optional alignment for the item.
		 * @param Priority Optional priority for the item.
		 * @returns An `Effect` that synchronously resolves to a `StatusBarItem`.
		 */
		readonly CreateStatusBarItem: (
			Extension: IExtensionDescription,
			Id?: string,
			Alignment?: StatusBarAlignment,
			Priority?: number,
		) => Effect.Effect<StatusBarItem, never>;

		/**
		 * Sets a temporary message in the status bar.
		 * @param Text The message to show.
		 * @param HideOrPromise Either a timeout in ms or a Promise that resolves when the message should be hidden.
		 * @returns A `Disposable` that can be used to hide the message prematurely.
		 */
		readonly SetStatusBarMessage: (
			Text: string,
			HideOrPromise?: number | Promise<any>,
		) => Disposable;
	}
>() {}
