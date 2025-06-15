/**
 * @module DiagnosticCollectionImplementation
 * @description The concrete implementation of the `vscode.DiagnosticCollection` interface.
 * Each instance of this class represents a single, named collection of diagnostics
 * created by an extension.
 */

import { Effect } from "effect";
import type { Diagnostic, DiagnosticCollection, Uri } from "vscode";

import { default as DiagnosticConverter } from "../../TypeConverter/Diagnostic.js";
import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import type IPCService from "../IPC/Service.js";

export default class implements DiagnosticCollection {
	private IsDisposed = false;
	private readonly OnDidDispose = CreateEventStream<void>();

	constructor(
		public readonly name: string,
		private readonly Owner: string, // An internal ID for this collection
		private readonly IPC: IPCService["Type"],
	) {}

	private CreateSetEffect(
		this: this,
		uri: Uri,
		diagnostics: readonly Diagnostic[] | undefined,
	) {
		if (this.IsDisposed) {
			return Effect.void;
		}

		const DiagnosticsDTO = diagnostics
			? DiagnosticConverter.FromAPIArray(diagnostics)
			: undefined;
		const UriDTO = TypeConverter.URI.FromAPI(uri);

		return this.IPC.SendNotification("$changeMany", [
			this.Owner,
			[[UriDTO, DiagnosticsDTO]],
		]);
	}

	set(uri: Uri, diagnostics: readonly Diagnostic[] | undefined): void;
	set(entries: ReadonlyArray<[Uri, readonly Diagnostic[] | undefined]>): void;
	set(
		this: this,
		uriOrEntries:
			| Uri
			| ReadonlyArray<[Uri, readonly Diagnostic[] | undefined]>,
		diagnostics?: readonly Diagnostic[],
	): void {
		if (this.IsDisposed) {
			return;
		}
		if (Array.isArray(uriOrEntries)) {
			const ConvertedEntries = uriOrEntries.map(([uri, diags]) => [
				TypeConverter.URI.FromAPI(uri),
				diags ? DiagnosticConverter.FromAPIArray(diags) : undefined,
			]);
			Effect.runFork(
				this.IPC.SendNotification("$changeMany", [
					this.Owner,
					ConvertedEntries,
				]),
			);
		} else {
			Effect.runFork(this.CreateSetEffect(uriOrEntries, diagnostics));
		}
	}

	delete(uri: Uri): void {
		this.set(uri, undefined);
	}

	clear(this: this): void {
		if (this.IsDisposed) {
			return;
		}
		Effect.runFork(this.IPC.SendNotification("$clear", [this.Owner]));
	}

	dispose(this: this): void {
		if (this.IsDisposed) {
			return;
		}
		this.IsDisposed = true;
		this.clear();
		Effect.runFork(this.OnDidDispose.Fire());
	}

	forEach(): void {
		// No-op: The extension host does not hold the state.
	}

	get(_uri: Uri): readonly Diagnostic[] | undefined {
		// No-op: The extension host does not hold the state.
		return undefined;
	}

	has(_uri: Uri): boolean {
		// No-op: The extension host does not hold the state.
		return false;
	}

	[Symbol.iterator](): Iterator<[Uri, readonly Diagnostic[]]> {
		// No-op: The extension host does not hold the state.
		return [][Symbol.iterator]();
	}
}
