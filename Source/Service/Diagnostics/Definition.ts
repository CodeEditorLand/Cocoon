/**
 * @module Definition (Diagnostics)
 * @description The live implementation of the Diagnostics service.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { DiagnosticCollectionImpl } from "./DiagnosticCollectionImpl.js";
import type { Interface } from "./Service.js";

let OwnerCounter = 0;

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const OnDidChangeEvent = CreateEventStream<readonly Uri[]>();

	// Register the RPC handler for when Mountain pushes diagnostic changes.
	Ipc.RegisterInvokeHandler("$acceptMarkerData", ([uris]) => {
		// Assuming uris is an array of UriComponents DTOs
		const revivedUris = uris.map((dto: any) =>
			TypeConverter.Uri.toApi(dto),
		);
		return OnDidChangeEvent.Fire(revivedUris).pipe(Effect.runPromise);
	});

	const ServiceImplementation: Interface = {
		onDidChangeDiagnostics: OnDidChangeEvent.Stream.pipe(Stream.toEvent),

		CreateDiagnosticCollection: (Name?: string) => {
			const OwnerId = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
			return new DiagnosticCollectionImpl(Name, OwnerId, Ipc);
		},
	};

	return ServiceImplementation;
});
