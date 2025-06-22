/*
 * File: Cocoon/Source/Service/Diagnostic/DiagnosticCollectionImplementation.ts
 * Role: The concrete implementation of the `vscode.DiagnosticCollection` interface.
 * Responsibilities:
 *   1. Maintains a local cache of diagnostics for synchronous access (`get`, `has`, `forEach`).
 *   2. Proxies all state-changing operations (`set`, `clear`, `delete`, `dispose`)
 *      to the Mountain host process via IPC notifications.
 *   3. Ensures that no operations are performed after the collection is disposed.
 */

import { Effect } from "effect";
import type { Diagnostic, DiagnosticCollection, Uri } from "vscode";
import { URI } from "vscode-uri";

import DiagnosticConverter from "../../TypeConverter/Diagnostic.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import type IPCService from "../IPC/Service.js";

/**
 * A class that implements the `vscode.DiagnosticCollection` interface. It caches
 * diagnostics locally for synchronous read operations while sending all write
 * operations to the Mountain host process, which remains the source of truth.
 */
export default class DiagnosticCollectionImplementation
	implements DiagnosticCollection
{
	private IsDisposed = false;

	private readonly DiagnosticsCache = new Map<
		string,
		readonly Diagnostic[]
	>();

	constructor(
		public readonly name: string,

		// An internal ID for this collection, linking it to its creator.
		private readonly Owner: string,

		private readonly IPC: IPCService["Type"],
	) {}

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

		if (!Array.isArray(uriOrEntries)) {
			// Handle the single entry case by converting it to the array case.
			this.set([[uriOrEntries, diagnostics]]);

			return;
		}

		// Handle the batch entry case.
		const EntriesToUpdate = uriOrEntries as ReadonlyArray<
			[Uri, readonly Diagnostic[] | undefined]
		>;

		if (EntriesToUpdate.length === 0) {
			return;
		}

		// Step 1: Update the local cache.
		for (const [URI, Diagnostics] of EntriesToUpdate) {
			const URIString = URI.toString();

			if (Diagnostics && Diagnostics.length > 0) {
				this.DiagnosticsCache.set(URIString, Diagnostics);
			} else {
				this.DiagnosticsCache.delete(URIString);
			}
		}

		// Step 2: Convert all URI and Diagnostic objects to their DTOs for IPC.
		const ConvertedEntries = EntriesToUpdate.map(([URI, Diags]) => [
			URIConverter.FromAPI(URI),

			Diags ? DiagnosticConverter.FromAPIArray(Diags) : undefined,
		]);

		// Step 3: Send the batch update notification to the host.
		Effect.runFork(
			this.IPC.SendNotification("$changeMany", [
				this.Owner,

				ConvertedEntries,
			]),
		);
	}

	delete(uri: Uri): void {
		// Deleting is equivalent to setting the diagnostics for a URI to undefined/empty.
		// We can reuse the `set` logic for this.
		if (this.IsDisposed) {
			return;
		}

		// Only send an update if the URI was actually in the cache.
		if (this.DiagnosticsCache.has(uri.toString())) {
			this.set(uri, undefined);
		}
	}

	clear(): void {
		if (this.IsDisposed) {
			return;
		}

		// Clear the local cache first.
		this.DiagnosticsCache.clear();

		// Send a notification to clear all diagnostics for this collection in the host.
		Effect.runFork(this.IPC.SendNotification("$clear", [this.Owner]));
	}

	dispose(): void {
		if (this.IsDisposed) {
			return;
		}

		this.IsDisposed = true;

		// Clear remote diagnostics and then the local cache.
		this.clear();
	}

	forEach(
		callback: (
			uri: Uri,

			diagnostics: readonly Diagnostic[],

			collection: DiagnosticCollection,
		) => any,

		thisArg?: any,
	): void {
		for (const [URIString, Diagnostics] of this.DiagnosticsCache) {
			callback.call(thisArg, URI.parse(URIString), Diagnostics, this);
		}
	}

	get(uri: Uri): readonly Diagnostic[] | undefined {
		return this.DiagnosticsCache.get(uri.toString());
	}

	has(uri: Uri): boolean {
		return this.DiagnosticsCache.has(uri.toString());
	}

	[Symbol.iterator](): Iterator<[Uri, readonly Diagnostic[]]> {
		const InnerIterator = this.DiagnosticsCache.entries();

		return {
			next: () => {
				const Next = InnerIterator.next();

				if (Next.done) {
					return { value: undefined, done: true };
				}

				const [URIString, Diagnostics] = Next.value;

				return {
					value: [URI.parse(URIString), Diagnostics],

					done: false,
				};
			},
		};
	}
}
