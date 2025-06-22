/*
 * File: Cocoon/Source/Service/Diagnostic/Service.ts
 * Role: Defines the interface and Context.Tag for the Diagnostic service.
 * Responsibilities:
 *   1. Declare the contract for the Diagnostic service, which provides access to
 *      creating diagnostic collections and listening for changes.
 *   2. This is the public API surface consumed by other services or the API factory.
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
