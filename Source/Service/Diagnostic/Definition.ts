/**
 * @module Definition (Diagnostics)
 * @description The live implementation of the Diagnostics service.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPCProvider } from "../IPC.js";
import { DiagnosticCollectionImpl } from "./DiagnosticCollectionImpl.js";
import type { Interface } from "./Service.js";

let OwnerCounter = 0;

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const OnDidChangeEvent = CreateEventStream<readonly Uri[]>();

	// Register the RPC handler for when Mountain pushes diagnostic changes.
	IPC.RegisterInvokeHandler("$acceptMarkerData", ([uris]) => {
		// Assuming uris is an array of UriComponents DTOs
		const revivedUris = uris.map((dto: any) =>
			TypeConverter.Uri.toAPI(dto),
		);
		return OnDidChangeEvent.Fire(revivedUris).pipe(Effect.runPromise);
	});

	const ServiceImplementation: Interface = {
		onDidChangeDiagnostics: OnDidChangeEvent.Stream.pipe(Stream.toEvent),

		CreateDiagnosticCollection: (Name?: string) => {
			const OwnerId = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
			return new DiagnosticCollectionImpl(Name, OwnerId, IPC);
		},
	};

	return ServiceImplementation;
});
