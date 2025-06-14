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

export const Definition = Effect.gen(function* () {
	const IPCService = yield* IPC.Tag;
	const OnDidChangeDiagnosticsEvent = CreateEventStream<readonly Uri[]>();

	// Register the RPC handler for when Mountain pushes a diagnostic changes.
	IPCService.RegisterInvokeHandler(
		"$acceptMarkerData",
		([uriComponentsArray]) => {
			const revivedUris = uriComponentsArray.map((dto: any) =>
				TypeConverter.URIConverter.ToAPI(dto),
			);
			return OnDidChangeDiagnosticsEvent.Fire(revivedUris);
		},
	);

	const ServiceImplementation: Interface = {
		onDidChangeDiagnostics: OnDidChangeDiagnosticsEvent.event,

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
