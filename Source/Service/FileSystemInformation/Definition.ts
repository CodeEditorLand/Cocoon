/**
 * @module Definition (FileSystemInformation)
 * @description The live implementation of the FileSystemInformation service.
 */

import { Effect, HashMap, Ref } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri, type IExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";

import { URI as URIConverter } from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the FileSystemInformation service.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const Log = yield* LogService;
	const CapabilitiesMap = yield* Ref.make(
		HashMap.empty<string, FileSystemProviderCapabilities>(),
	);
	const OnDidChangeFileEvent = CreateEventStream<any[]>();

	const GetCapabilities = (Scheme: string) =>
		Ref.get(CapabilitiesMap).pipe(
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
		// This callback must be synchronous, so we must use runSync here.
		const Capabilities = Effect.runSync(GetCapabilities(Uri.scheme));
		const IgnoreCase = Capabilities
			? !(Capabilities & FileSystemProviderCapabilities.PathCaseSensitive)
			: isWindows; // Default to OS case-sensitivity
		Log.Trace(
			`ExtURI check for scheme '${Uri.scheme}', ignoring case: ${IgnoreCase}`,
		);
		return IgnoreCase;
	});

	// --- RPC Handler ---
	const AcceptProviderCapabilities = (
		Scheme: string,
		Capabilities: FileSystemProviderCapabilities | null,
	) =>
		Effect.gen(function* () {
			if (Capabilities === null) {
				yield* Ref.update(CapabilitiesMap, HashMap.remove(Scheme));
				yield* Log.Trace(
					`Cleared capabilities for scheme '${Scheme}'.`,
				);
			} else {
				yield* Ref.update(
					CapabilitiesMap,
					HashMap.set(Scheme, Capabilities),
				);
				yield* Log.Trace(
					`Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`,
				);
			}
		});

	IPC.RegisterInvokeHandler(
		"$acceptProviderInfos",
		([Scheme, Capabilities]) =>
			Effect.runPromise(AcceptProviderCapabilities(Scheme, Capabilities)),
	);
	IPC.RegisterInvokeHandler("$onFileEvent", ([Events]) =>
		OnDidChangeFileEvent.Fire(
			Events.map((Event: any) => ({
				type: Event.type,
				uri: URIConverter.ToAPI(Event.uri),
			})),
		).pipe(Effect.runPromise),
	);

	const FileSystemInformationImplementation: Service = {
		ExtURI: ExtURIInstance,
		GetCapabilities,
		onDidChangeFile: OnDidChangeFileEvent.event,
		isWritableFileSystem: (Scheme) => {
			const Capabilities = Effect.runSync(GetCapabilities(Scheme));
			return Capabilities
				? !(Capabilities & FileSystemProviderCapabilities.Readonly)
				: true; // Assume writable if not specified
		},
	};

	return FileSystemInformationImplementation;
});
