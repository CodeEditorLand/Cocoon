/**
 * @module Definition (Diagnostic)
 * @description The live implementation of the Diagnostic service.
 */

import { Effect, Stream } from "effect";
import type { Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { DiagnosticCollectionImplementation } from "./DiagnosticCollectionImplementation.js";
import type { Interface } from "./Service.js";

let OwnerCounter = 0;

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const OnDidChangeDiagnosticsEvent = CreateEventStream<readonly Uri[]>();

	// Register the RPC handler for when Mountain pushes diagnostic changes.
	// This is for extensions that want to *read* diagnostics from other sources.
	IPCService.RegisterInvokeHandler(
		"$acceptMarkerData",
		([uriComponentsArray]) => {
			const revivedUris = uriComponentsArray.map((dto: any) =>
				TypeConverter.URIConverter.ToAPI(dto),
			);
			return OnDidChangeDiagnosticsEvent.Fire(revivedUris).pipe(
				Effect.runPromise,
			);
		},
	);

	const ServiceImplementation: Interface = {
		onDidChangeDiagnostics: OnDidChangeDiagnosticsEvent.Stream.pipe(
			Stream.toEvent,
		),

		CreateDiagnosticCollection: (Name?: string) => {
			const Owner = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
			return new DiagnosticCollectionImplementation(
				Name,
				Owner,
				IPCService,
			);
		},
	};

	return ServiceImplementation;
});
