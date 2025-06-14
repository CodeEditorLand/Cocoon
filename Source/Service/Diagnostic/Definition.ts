/**
 * @module Definition (Diagnostic)
 * @description The live implementation of the Diagnostic service.
 */

import { Context, Effect } from "effect";
import type { Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import DiagnosticCollectionImplementation from "./DiagnosticCollectionImplementation.js";

let OwnerCounter = 0;

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const OnDidChangeDiagnosticsEvent = CreateEventStream<readonly Uri[]>();

	// Register the RPC handler for when Mountain pushes a diagnostic changes.
	IPC.RegisterInvokeHandler("$acceptMarkerData", ([uriComponentsArray]) => {
		const RevivedUris = uriComponentsArray.map((DTO: any) =>
			TypeConverter.URI.ToAPI(DTO),
		);
		return OnDidChangeDiagnosticsEvent.Fire(RevivedUris);
	});

	const ServiceImplementation: Context.Tag.Service<any> = {
		onDidChangeDiagnostics: OnDidChangeDiagnosticsEvent.event,

		CreateDiagnosticCollection: (Name?: string) => {
			const Owner = `cocoon-diag-${OwnerCounter++}-${Name ?? "anon"}`;
			return new DiagnosticCollectionImplementation(Name, Owner, IPC);
		},
	};

	return ServiceImplementation;
});
