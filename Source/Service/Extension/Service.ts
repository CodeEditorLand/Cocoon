/**
 * @module Service (Extension)
 * @description Defines the interface and Context.Tag for the Extension service.
 * This service implements the `vscode.extensions` API.
 */

import { Context, Option, type Effect } from "effect";
import type { Event, Extension } from "vscode";

export default class ExtensionService extends Context.Tag("Service/Extension")<
	ExtensionService,
	{
		/** An event which fires when `extensions.all` changes. */
		readonly onDidChange: Event<void>;

		/**
		 * Get an extension by its full identifier.
		 * @param extensionId An extension identifier.
		 * @returns An `Effect` that resolves to the extension `T` or `undefined`.
		 */
		readonly GetExtension: <T>(
			extensionId: string,
		) => Effect.Effect<Option.Option<Extension<T>>>;

		/**
		 * Get all known extensions.
		 * @returns An `Effect` resolving to a readonly array of all extensions.
		 */
		readonly GetAll: () => Effect.Effect<readonly Extension<any>[]>;

		/**
		 * Activate an extension.
		 * @param extensionId The identifier of the extension to activate.
		 * @returns An `Effect` that resolves with the activated extension's public API.
		 */
		readonly Activate: <T>(
			extensionId: string,
		) => Effect.Effect<Extension<T>, Error>;
	}
>() {}
