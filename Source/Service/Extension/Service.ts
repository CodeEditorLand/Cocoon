/**
 * @module Service (Extension)
 * @description Defines the interface and Context.Tag for the Extension service.
 * This service implements the `vscode.extensions` API, allowing extensions to
 * introspect and activate other extensions.
 */

import { Context } from "effect";
import type { Event, Extension } from "vscode";

/**
 * The `Context.Tag` for the `vscode.extensions` API service.
 */
export default class ExtensionService extends Context.Tag("Service/Extension")<
	ExtensionService,
	{
		/** An event which fires when `extensions` have been changed (i.e., installed or uninstalled). */
		readonly onDidChange: Event<void>;

		/**
		 * Get an extension by its full identifier in the form of: `publisher.name`.
		 * @param extensionId The extension identifier.
		 * @returns The `Extension` object or `undefined` if the extension is not found.
		 */
		readonly getExtension: <T>(
			extensionId: string,
		) => Extension<T> | undefined;

		/**
		 * All extensions are listed in this array.
		 */
		readonly all: readonly Extension<any>[];

		/**
		 * Activate an extension.
		 * @param extensionId The extension identifier.
		 * @returns A promise that resolves to the extension's exports.
		 */
		readonly activate: <T>(extensionId: string) => Promise<Extension<T>>;
	}
>() {}
