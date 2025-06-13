/**
 * @module DiagnosticCollectionImpl
 * @description The concrete implementation of the `vscode.DiagnosticCollection` interface.
 */

import { Effect } from "effect";
import type {
	Diagnostic,
	DiagnosticCollection,
	Range,
	Tuple,
	Uri,
} from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import type { Ipc } from "../Ipc.js";

export class DiagnosticCollectionImpl implements DiagnosticCollection {
	private _isDisposed = false;

	constructor(
		public readonly name: string | undefined,
		private readonly ownerId: string,
		private readonly ipc: Ipc.Interface,
	) {}

	private createSetEffect(
		uri: Uri,
		diagnostics: readonly Diagnostic[] | undefined,
	) {
		if (this._isDisposed) return Effect.unit;

		// Convert vscode.Diagnostic[] to MarkerDataDto[]
		const Dto = diagnostics
			? TypeConverter.Diagnostic.fromApiArray(diagnostics)
			: undefined;
		const UriDto = TypeConverter.Uri.fromApi(uri);

		// Send notification to Mountain
		return this.ipc.SendNotification("$changeMany", [
			this.ownerId,
			[[UriDto, Dto]],
		]);
	}

	set(uri: Uri, diagnostics: readonly Diagnostic[] | undefined): void;
	set(
		entries: ReadonlyArray<Tuple<Uri, readonly Diagnostic[] | undefined>>,
	): void;
	set(uriOrEntries: any, diagnostics?: any): void {
		if (Array.isArray(uriOrEntries)) {
			const effects = uriOrEntries.map(([uri, diags]) =>
				this.createSetEffect(uri, diags),
			);
			Effect.runFork(
				Effect.all(effects, {
					discard: true,
					concurrency: "unbounded",
				}),
			);
		} else {
			Effect.runFork(this.createSetEffect(uriOrEntries, diagnostics));
		}
	}

	delete(uri: Uri): void {
		this.set(uri, undefined);
	}

	clear(): void {
		if (this._isDisposed) return;
		Effect.runFork(this.ipc.SendNotification("$clear", [this.ownerId]));
	}

	dispose(): void {
		this.clear();
		this._isDisposed = true;
	}

	forEach(
		callback: (
			uri: Uri,
			diagnostics: readonly Diagnostic[],
			collection: DiagnosticCollection,
		) => any,
		thisArg?: any,
	): void {
		// This is a no-op as the source of truth is on the Mountain side.
	}

	get(uri: Uri): readonly Diagnostic[] | undefined {
		// This is a no-op.
		return undefined;
	}

	has(uri: Uri): boolean {
		// This is a no-op.
		return false;
	}
}
