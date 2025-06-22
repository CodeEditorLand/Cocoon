/*
 * File: Cocoon/Source/Service/Diagnostic/Definition.ts
 * Role: The live implementation of the Diagnostic service.
 * Responsibilities:
 *   1. Provide the `vscode.languages.createDiagnosticCollection` factory method.
 *   2. Manage the `vscode.languages.onDidChangeDiagnostics` event.
 *   3. Listen for diagnostic updates pushed from the Mountain host process.
 */

import { Effect } from "effect";
import URIConverter from "Source/TypeConverter/Main/URI.js";
import type { Uri } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import DiagnosticCollectionImplementation from "./DiagnosticCollectionImplementation.js";
import type Service from "./Service.js";

let OwnerCounter = 0;

export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);

	const {
		event: OnDidChangeDiagnosticsEvent,

		Fire: FireDidChangeDiagnostics,
	} = CreateEventStream<readonly Uri[]>();

	// Register the RPC handler for when Mountain pushes diagnostic changes.
	// This allows extensions within Cocoon to be notified of diagnostic updates
	// originating from the host or other extensions.
	yield* G(
		Effect.sync(() =>
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
			),
		),
	);

	const ServiceImplementation: Service["Type"] = {
		onDidChangeDiagnostics: OnDidChangeDiagnosticsEvent,

		CreateDiagnosticCollection: (Name?: string) => {
			// Each collection gets a unique owner ID to separate its diagnostics on the host.
			const Owner = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;

			return new DiagnosticCollectionImplementation(
				Name ?? "",

				Owner,

				IPC,
			);
		},
	};

	return ServiceImplementation;
});
