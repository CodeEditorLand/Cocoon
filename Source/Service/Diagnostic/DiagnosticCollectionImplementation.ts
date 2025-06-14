/**
 * @module DiagnosticCollectionImplementation
 * @description The concrete implementation of the `vscode.DiagnosticCollection` interface.
 * Each instance of this class represents a single, named collection of diagnostics
 * created by an extension.
 */

import { Effect, Stream } from "effect";
import type {
	Diagnostic,
	DiagnosticCollection,
	Memento,
	Tuple,
	Uri,
} from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { IPC } from "../IPC.js";

export class DiagnosticCollectionImplementation
	implements DiagnosticCollection
{
	private isDisposed = false;
	private readonly onDidDispose = CreateEventStream<void>(); // For internal use

	constructor(
		public readonly name: string | undefined,
		private readonly owner: string, // An internal ID for this collection
		private readonly ipc: IPC.Interface,
	) {}

	private createSetEffect(
		uri: Uri,
		diagnostics: readonly Diagnostic[] | undefined,
	) {
		if (this.isDisposed) {
			return Effect.void;
		}

		const DiagnosticsDTO = diagnostics
			? TypeConverter.Diagnostic.FromAPIArray(diagnostics)
			: undefined;
		const UriDTO = TypeConverter.URIConverter.fromAPI(uri);

		return this.ipc.SendNotification("$changeMany", [
			this.owner,
			[[UriDTO, DiagnosticsDTO]],
		]);
	}

	set(uri: Uri, diagnostics: readonly Diagnostic[] | undefined): void;
	set(
		entries: ReadonlyArray<Tuple<Uri, readonly Diagnostic[] | undefined>>,
	): void;
	set(
		uriOrEntries:
			| Uri
			| ReadonlyArray<Tuple<Uri, readonly Diagnostic[] | undefined>>,
		diagnostics?: readonly Diagnostic[],
	): void {
		if (this.isDisposed) {
			return;
		}
		if (Array.isArray(uriOrEntries)) {
			const convertedEntries = uriOrEntries.map(([uri, diags]) => [
				TypeConverter.URIConverter.fromAPI(uri),
				diags
					? TypeConverter.Diagnostic.FromAPIArray(diags)
					: undefined,
			]);
			Effect.runFork(
				this.ipc.SendNotification("$changeMany", [
					this.owner,
					convertedEntries,
				]),
			);
		} else {
			Effect.runFork(this.createSetEffect(uriOrEntries, diagnostics));
		}
	}

	delete(uri: Uri): void {
		this.set(uri, undefined);
	}

	clear(): void {
		if (this.isDisposed) {
			return;
		}
		Effect.runFork(this.ipc.SendNotification("$clear", [this.owner]));
	}

	dispose(): void {
		if (this.isDisposed) {
			return;
		}
		this.isDisposed = true;
		this.clear();
		this.onDidDispose.Fire();
	}

	forEach(): void {
		// No-op: The extension host does not hold the state.
	}

	get(uri: Uri): readonly Diagnostic[] | undefined {
		// No-op: The extension host does not hold the state.
		return undefined;
	}

	has(uri: Uri): boolean {
		// No-op: The extension host does not hold the state.
		return false;
	}
}
