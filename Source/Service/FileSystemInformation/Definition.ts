/*
 * File: Cocoon/Source/Service/FileSystemInformation/Definition.ts
 *
 * This file contains the live implementation of the FileSystemInformation service.
 */

import { Effect, HashMap, Ref } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri, type IExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import type { FileChangeEvent } from "vscode";

import URIConverter from "../../TypeConverter/Main/URI.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the FileSystemInformation service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Log = yield* G(LogService);

	const CapabilitiesMapRef = yield* G(
		Ref.make(HashMap.empty<string, FileSystemProviderCapabilities>()),
	);

	const { event: OnDidChangeFileEvent, Fire: FireFileChangeEvent } =
		CreateEventStream<readonly FileChangeEvent[]>();

	const GetCapabilitiesEffect = (Scheme: string) =>
		Ref.get(CapabilitiesMapRef).pipe(
			Effect.map(HashMap.get(Scheme)),
			Effect.map((MaybeCapabilities) => {
				if (MaybeCapabilities._tag === "Some") {
					return MaybeCapabilities.value;
				}
				if (Scheme === "file") {
					return isWindows
						? FileSystemProviderCapabilities.FileReadWrite
						: FileSystemProviderCapabilities.FileReadWrite |
								FileSystemProviderCapabilities.PathCaseSensitive;
				}
				return undefined;
			}),
		);

	const ExtURIInstance: IExtUri = new ExtUri((Uri) => {
		const Capabilities = Effect.runSync(GetCapabilitiesEffect(Uri.scheme));
		const IgnoreCase = Capabilities
			? !(Capabilities & FileSystemProviderCapabilities.PathCaseSensitive)
			: isWindows;
		Effect.runFork(
			Log.Trace(
				`ExtURI check for scheme '${Uri.scheme}', ignoring case: ${IgnoreCase}`,
			),
		);
		return IgnoreCase;
	});

	// --- RPC Handler ---
	const AcceptProviderCapabilitiesEffect = (
		Scheme: string,
		Capabilities: FileSystemProviderCapabilities | null,
	) =>
		Effect.gen(function* (G) {
			if (Capabilities === null) {
				yield* G(
					Ref.update(CapabilitiesMapRef, HashMap.remove(Scheme)),
				);
				yield* G(
					Log.Trace(`Cleared capabilities for scheme '${Scheme}'.`),
				);
			} else {
				yield* G(
					Ref.update(
						CapabilitiesMapRef,
						HashMap.set(Scheme, Capabilities),
					),
				);
				yield* G(
					Log.Trace(
						`Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`,
					),
				);
			}
		});

	IPC.RegisterInvokeHandler(
		"$acceptProviderInfos",
		([Scheme, Capabilities]) =>
			Effect.runPromise(
				AcceptProviderCapabilitiesEffect(Scheme, Capabilities),
			),
	);

	IPC.RegisterInvokeHandler("$onFileEvent", ([Events]) =>
		Effect.runPromise(
			FireFileChangeEvent(
				Events.map((Event: any) => ({
					type: Event.type,
					uri: URIConverter.ToAPI(Event.uri),
				})),
			),
		),
	);

	const ServiceImplementation: Service = {
		ExtURI: ExtURIInstance,
		GetCapabilities: GetCapabilitiesEffect,
		onDidChangeFile: OnDidChangeFileEvent,
		isWritableFileSystem: (Scheme) => {
			const Capabilities = Effect.runSync(GetCapabilitiesEffect(Scheme));
			return Capabilities
				? !(Capabilities & FileSystemProviderCapabilities.Readonly)
				: true;
		},
	};

	return ServiceImplementation;
});
