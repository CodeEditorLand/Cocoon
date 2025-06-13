/**
 * @module Service (Diagnostics)
 * @description Defines the interface and Context.Tag for the Diagnostics service.
 */

import { Context, Stream } from "effect";
import type { DiagnosticCollection, Event, Uri } from "vscode";

export interface Interface {
	/**
	 * An event that fires when the diagnostics collection for a resource has changed.
	 */
	readonly onDidChangeDiagnostics: Event<readonly Uri[]>;

	/**
	 * Creates a new diagnostic collection.
	 * @param name - An optional name for the collection.
	 */
	readonly CreateDiagnosticCollection: (
		name?: string,
	) => DiagnosticCollection;
}

export const Tag = Context.Tag<Interface>("Service/Diagnostics");
