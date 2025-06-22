/*
 * File: Cocoon/Source/Service/Diagnostic/Service.ts
 *
 * This file defines the interface and Context.Tag for the Diagnostic service. Its
 * responsibilities are to declare the contract for providing access to creating
 * diagnostic collections and listening for changes.
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
		readonly OnDidChangeDiagnostics: Event<readonly Uri[]>;

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
