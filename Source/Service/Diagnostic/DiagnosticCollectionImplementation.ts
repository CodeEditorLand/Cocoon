/**
 * @module DiagnosticCollectionImplementation
 * @description The concrete implementation of the `vscode.DiagnosticCollection` interface.
 * Each instance of this class represents a single, named collection of diagnostics
 * created by an extension.
 */

import { Effect } from "effect";
import type {
	Diagnostic,
	DiagnosticCollection,
	Event,
	Range,
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
			return Effect.unit;
		}

		// Convert vscode.Diagnostic[] to MarkerDataDTO[] for the host
		const DiagnosticsDTO = diagnostics
			? TypeConverter.Diagnostic.FromAPIArray(diagnostics)
			: undefined;
		const UriDTO = TypeConverter.URIConverter.FromAPI(uri);

		// Send notification to Mountain to update the markers
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
			// Handle batch update
			const convertedEntries = uriOrEntries.map(([uri, diags]) => [
				TypeConverter.URIConverter.FromAPI(uri),
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
			// Handle single URI update
			Effect.runFork(this.createSetEffect(uriOrEntries, diagnostics));
		}
	}

	delete(uri: Uri): void {
		// `delete` is just a special case of `set`
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
		this.clear(); // Clear all diagnostics owned by this collection
		this.onDidDispose.Fire(); // Signal internal disposal
	}

	// The following methods are not typically implemented on the ext host side,
	// as the source of truth for diagnostics lives in the main/host process.
	// They could be implemented with RPC calls if needed.

	forEach(
		callback: (
			uri: Uri,
			diagnostics: readonly Diagnostic[],
			collection: DiagnosticCollection,
		) => any,
		thisArg?: any,
	): void {
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
