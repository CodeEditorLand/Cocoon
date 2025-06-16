/*
 * File: Cocoon/Source/Service/Diagnostic/Definition.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:10 UTC
 * Dependency: ../../TypeConverter/Main.js, ../../Utility/CreateEventStream.js, ../IPC/Service.js, ./DiagnosticCollectionImplementation.js, ./Service.js, effect, vscode
 */

/**
 * @module Definition (Diagnostic)
 * @description The live implementation of the Diagnostic service.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import DiagnosticCollectionImplementation from "./DiagnosticCollectionImplementation.js";
import type Service from "./Service.js";

let OwnerCounter = 0;

export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const { event, Fire } = CreateEventStream<readonly Uri[]>();

	// Register the RPC handler for when Mountain pushes a diagnostic changes.
	yield* Effect.sync(() =>
		IPC.RegisterInvokeHandler(
			"$acceptMarkerData",
			([uriComponentsArray]): Promise<void> => {
				const RevivedUris = uriComponentsArray.map((DTO: any) =>
					TypeConverter.URI.ToAPI(DTO),
				);
				return Effect.runPromise(Fire(RevivedUris));
			},
		),
	);

	const ServiceImplementation: Service["Type"] = {
		onDidChangeDiagnostics: event,

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
});
