/**
 * @module Service (Diagnostic)
 * @description Defines the interface and Context.Tag for the Diagnostic service.
 * This service allows extensions to report problems in the workspace.
 */

import { Context } from "effect";
import type { DiagnosticCollection, Event, Uri } from "vscode";

export default class DiagnosticService extends Context.Tag(
	"Service/Diagnostic",
)<
	DiagnosticService,
	{
		/**
		 * An event that fires when the diagnostics for a resource have changed.
		 */
		readonly onDidChangeDiagnostics: Event<readonly Uri[]>;

		/**
		 * Creates a new diagnostic collection.
		 * @param Name An optional name for the collection, e.g., 'typescript'.
		 * @returns A new `DiagnosticCollection` instance.
		 */
		readonly CreateDiagnosticCollection: (
			Name?: string,
		) => DiagnosticCollection;
	}
>() {}
