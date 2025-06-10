/**
 * @module Service (Extension)
 * @description Defines the interface and Context.Tag for the Extension service.
 */

import { Context, Stream } from "effect";
import type { Event, Extension } from "vscode";

/**
 * The service interface for the `vscode.extensions` API.
 */
export interface Interface {
	/** An event which fires when `extensions` have been changed. */
	readonly onDidChange: Event<void>;

	/**
	 * Get an extension by its full identifier in the form of: `publisher.name`.
	 * @param extensionId - The extension identifier.
	 * @returns The extension or `undefined`.
	 */
	readonly getExtension: <T>(extensionId: string) => Extension<T> | undefined;

	/**
	 * All extensions are listed in this array.
	 */
	readonly all: readonly Extension<any>[];
}

export const Tag = Context.Tag<Interface>("Service/Extension");
