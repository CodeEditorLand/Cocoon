/*
 * File: Cocoon/Source/Service/Diagnostic/DiagnosticCollectionImplementation.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:53:21 UTC
 * Dependency: ../../TypeConverter/Diagnostic.js, ../../TypeConverter/Main.js, ../IPC/Service.js, effect, vscode
 * Export: implements
 */

/**
 * @module DiagnosticCollectionImplementation (Service)
 * @description The concrete implementation of the `vscode.DiagnosticCollection` interface.
 * Each instance of this class represents a single, named collection of diagnostics
 * created by an extension.
 */

import { Effect } from "effect";
import type { Diagnostic, DiagnosticCollection, Uri } from "vscode";

import { default as DiagnosticConverter } from "../../TypeConverter/Diagnostic.js";
import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream, {
	type EventStream,
} from "../../Utility/CreateEventStream.js";
import type IPCService from "../IPC/Service.js";

/**
 * A class that implements the `vscode.DiagnosticCollection` interface, providing a
 * proxy for managing diagnostics that are ultimately stored in the Mountain host process.
 */
export default class implements DiagnosticCollection {
	private IsDisposed = false;
	private readonly OnDidDisposeStream: EventStream<void> =
		CreateEventStream<void>();

	constructor(
		public readonly name: string,
		private readonly Owner: string, // An internal ID for this collection, linking it to its creator.
		private readonly IPC: IPCService["Type"],
	) {}

	private CreateSetEffect(
		Uri: Uri,
		Diagnostics: readonly Diagnostic[] | undefined,
	) {
		// If the collection has been disposed, do nothing.
		if (this.IsDisposed) {
			return Effect.void;
		}

		// Convert the API-level diagnostics to their DTO representation for IPC.
		const DiagnosticsDTO = Diagnostics
			? DiagnosticConverter.FromAPIArray(Diagnostics)
			: undefined;
		const UriDTO = TypeConverter.URI.FromAPI(Uri);

		// Send the notification to the host process to update the diagnostics.
		return this.IPC.SendNotification("$changeMany", [
			this.Owner,
			[[UriDTO, DiagnosticsDTO]],
		]);
	}

	set(uri: Uri, diagnostics: readonly Diagnostic[] | undefined): void;
	set(entries: ReadonlyArray<[Uri, readonly Diagnostic[] | undefined]>): void;
	set(
		uriOrEntries:
			| Uri
			| ReadonlyArray<[Uri, readonly Diagnostic[] | undefined]>,
		diagnostics?: readonly Diagnostic[],
	): void {
		if (this.IsDisposed) {
			return;
		}

		// Handle the case where an array of entries is provided.
		if (Array.isArray(uriOrEntries)) {
			// Step 1: Convert all URI and Diagnostic objects to their DTOs.
			const ConvertedEntries = uriOrEntries.map(([Uri, Diags]) => [
				TypeConverter.URI.FromAPI(Uri),
				Diags ? DiagnosticConverter.FromAPIArray(Diags) : undefined,
			]);
			// Step 2: Send the batch update notification.
			Effect.runFork(
				this.IPC.SendNotification("$changeMany", [
					this.Owner,
					ConvertedEntries,
				]),
			);
		} else {
			// Handle the case where a single URI and diagnostics are provided.
			// The `if` condition ensures `uriOrEntries` is a `Uri` here. We assert it for the compiler.
			Effect.runFork(
				this.CreateSetEffect(uriOrEntries as Uri, diagnostics),
			);
		}
	}

	delete(uri: Uri): void {
		// Deleting is equivalent to setting the diagnostics for a URI to undefined.
		this.set(uri, undefined);
	}

	clear(): void {
		if (this.IsDisposed) {
			return;
		}
		// Send a notification to clear all diagnostics for this collection in the host.
		Effect.runFork(this.IPC.SendNotification("$clear", [this.Owner]));
	}

	dispose(): void {
		if (this.IsDisposed) {
			return;
		}
		this.IsDisposed = true;
		this.clear();
		// Notify listeners that this collection has been disposed.
		Effect.runFork(this.OnDidDisposeStream.Fire());
	}

	forEach(): void {
		// This is a no-op because the extension host does not hold the diagnostic state.
		// The state is managed by the Mountain process.
	}

	get(_uri: Uri): readonly Diagnostic[] | undefined {
		// This is a no-op because the extension host does not hold the state.
		return undefined;
	}

	has(_uri: Uri): boolean {
		// This is a no-op because the extension host does not hold the state.
		return false;
	}

	[Symbol.iterator](): Iterator<[Uri, readonly Diagnostic[]]> {
		// This is a no-op because the extension host does not hold the state.
		return [][Symbol.iterator]();
	}
}
