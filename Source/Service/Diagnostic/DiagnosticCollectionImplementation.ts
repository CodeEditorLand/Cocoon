/*
 * File: Cocoon/Source/Service/Diagnostic/DiagnosticCollectionImplementation.ts
 *
 * This file contains the concrete implementation of the `vscode.DiagnosticCollection` interface.
 * It maintains a local cache of diagnostics for synchronous access (`get`, `has`, `forEach`)
 * and proxies all state-changing operations (`set`, `clear`, `delete`, `dispose`)
 * to the Mountain host process via IPC notifications.
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
		// An internal ID for this collection
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
			this.set([[uriOrEntries, diagnostics]]);
			return;
		}

		const EntriesToUpdate = uriOrEntries as ReadonlyArray<
			[Uri, readonly Diagnostic[] | undefined]
		>;
		if (EntriesToUpdate.length === 0) {
			return;
		}

		// Update the local cache.
		for (const [URI, Diagnostics] of EntriesToUpdate) {
			const URIString = URI.toString();
			if (Diagnostics && Diagnostics.length > 0) {
				this.DiagnosticsCache.set(URIString, Diagnostics);
			} else {
				this.DiagnosticsCache.delete(URIString);
			}
		}

		// Convert all URI and Diagnostic objects to their DTOs for IPC.
		const ConvertedEntries = EntriesToUpdate.map(([URI, Diags]) => [
			URIConverter.FromAPI(URI),
			Diags ? DiagnosticConverter.FromAPIArray(Diags) : undefined,
		]);

		// Send the batch update notification to the host.
		Effect.runFork(
			this.IPC.SendNotification("$changeMany", [
				this.Owner,
				ConvertedEntries,
			]),
		);
	}

	delete(uri: Uri): void {
		if (this.IsDisposed) {
			return;
		}
		if (this.DiagnosticsCache.has(uri.toString())) {
			this.set(uri, undefined);
		}
	}

	clear(): void {
		if (this.IsDisposed) {
			return;
		}
		this.DiagnosticsCache.clear();
		Effect.runFork(this.IPC.SendNotification("$clear", [this.Owner]));
	}

	dispose(): void {
		if (this.IsDisposed) {
			return;
		}
		this.IsDisposed = true;
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
