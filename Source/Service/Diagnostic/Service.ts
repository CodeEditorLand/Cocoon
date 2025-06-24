/*
 * File: Cocoon/Source/Service/Diagnostic/Service.ts
 * Role: Defines the Diagnostic service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Provide the `createDiagnosticCollection` factory method.
 *   - Manage the `onDidChangeDiagnostics` event.
 */

import { Effect } from "effect";
import { URI } from "vscode-uri";
import {
	type Diagnostic,
	type DiagnosticCollection,
	type Event,
	type Uri,
} from "vscode";
import URIConverter from "../../TypeConverter/Main/URI.js";
import DiagnosticConverter from "../../TypeConverter/Diagnostic.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC as IPCService } from "../IPC/Service.js";

// --- Internal Implementation of vscode.DiagnosticCollection ---
class DiagnosticCollectionImplementation implements DiagnosticCollection {
	private IsDisposed = false;
	private readonly DiagnosticsCache = new Map<
		string,
		readonly Diagnostic[]
	>();

	constructor(
		public readonly name: string,
		private readonly Owner: string,
		private readonly IPC: IPCService,
	) {}

	set(uri: Uri, diagnostics: readonly Diagnostic[] | undefined): void;
	set(entries: ReadonlyArray<[Uri, readonly Diagnostic[] | undefined]>): void;
	set(
		uriOrEntries:
			| Uri
			| ReadonlyArray<[Uri, readonly Diagnostic[] | undefined]>,
		diagnostics?: readonly Diagnostic[],
	): void {
		if (this.IsDisposed) return;
		if (!Array.isArray(uriOrEntries)) {
			this.set([[uriOrEntries, diagnostics]]);
			return;
		}
		const EntriesToUpdate = uriOrEntries as ReadonlyArray<
			[Uri, readonly Diagnostic[] | undefined]
		>;
		if (EntriesToUpdate.length === 0) return;

		for (const [URI, Diagnostics] of EntriesToUpdate) {
			const URIString = URI.toString();
			if (Diagnostics && Diagnostics.length > 0)
				this.DiagnosticsCache.set(URIString, Diagnostics);
			else this.DiagnosticsCache.delete(URIString);
		}

		const ConvertedEntries = EntriesToUpdate.map(([URI, Diags]) => [
			URIConverter.FromAPI(URI),
			Diags ? DiagnosticConverter.FromAPIArray(Diags) : undefined,
		]);
		Effect.runFork(
			this.IPC.SendNotification("$changeMany", [
				this.Owner,
				ConvertedEntries,
			]),
		);
	}

	delete(uri: Uri): void {
		if (this.IsDisposed) return;
		if (this.DiagnosticsCache.has(uri.toString())) this.set(uri, undefined);
	}

	clear(): void {
		if (this.IsDisposed) return;
		this.DiagnosticsCache.clear();
		Effect.runFork(this.IPC.SendNotification("$clear", [this.Owner]));
	}

	dispose(): void {
		if (this.IsDisposed) return;
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
				if (Next.done) return { value: undefined, done: true };
				const [URIString, Diagnostics] = Next.value;
				return {
					value: [URI.parse(URIString), Diagnostics],
					done: false,
				};
			},
		};
	}
}

// --- Service Definition ---
export class Diagnostic extends Effect.Service<Diagnostic>()(
	"Service/Diagnostic",
	{
		effect: Effect.gen(function* (Generator) {
			const IPC = yield* Generator(IPCService);
			let OwnerCounter = 0;
			const {
				event: OnDidChangeDiagnosticsEvent,
				Fire: FireDidChangeDiagnostics,
			} = CreateEventStream<readonly Uri[]>();

			IPC.RegisterInvokeHandler(
				"$acceptMarkerData",
				([URIComponentsArray]): Promise<void> => {
					const RevivedURIs = URIComponentsArray.map((DTO: any) =>
						URIConverter.ToAPI(DTO),
					);
					return Effect.runPromise(
						FireDidChangeDiagnostics(RevivedURIs),
					);
				},
			);

			const ServiceImplementation = {
				OnDidChangeDiagnostics: OnDidChangeDiagnosticsEvent,
				CreateDiagnosticCollection: (Name?: string) => {
					const Owner = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
					return new DiagnosticCollectionImplementation(
						Name ?? "",
						Owner,
						IPC,
					);
				},
			};

			return ServiceImplementation;
		}),
	},
) {}
