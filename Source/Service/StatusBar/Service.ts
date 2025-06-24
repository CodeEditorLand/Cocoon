/*
 * File: Cocoon/Source/Service/StatusBar/Service.ts
 * Role: Defines the service interface and Effect.Service for the StatusBar service.
 * Responsibilities:
 *   - Declare the contract for creating status bar items and showing temporary messages.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Disposable, StatusBarAlignment, StatusBarItem } from "vscode";

/**
 * The `Effect.Service` for the StatusBar service.
 * This service implements the `vscode.window.createStatusBarItem` and
 * related status bar message APIs.
 */
export class StatusBar extends Effect.Service<StatusBar>("Service/StatusBar")<{
	/**
	 * Creates a new status bar item.
	 * @param Extension - The extension creating the item.
	 * @param ID - An optional identifier for the item.
	 * @param Alignment - Optional alignment for the item (Left or Right).
	 * @param Priority - Optional priority to determine order.
	 * @returns An `Effect` that synchronously resolves to a `StatusBarItem`.
	 */
	readonly CreateStatusBarItem: (
		Extension: IExtensionDescription,
		ID?: string,
		Alignment?: StatusBarAlignment,
		Priority?: number,
	) => Effect.Effect<StatusBarItem, never>;

	/**
	 * Sets a temporary message in the status bar.
	 * @param Text - The message to show.
	 * @param HideOrPromise - A timeout in ms or a Promise that resolves when the message should be hidden.
	 * @returns A `Disposable` that can be used to hide the message prematurely.
	 */
	readonly SetStatusBarMessage: (
		Text: string,
		HideOrPromise?: number | Promise<any>,
	) => Disposable;
}>() {}
