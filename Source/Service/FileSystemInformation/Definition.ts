/**
 * @module Definition (FileSystemInformation)
 * @description The live implementation of the FileSystemInformation service.
 */

import { Context, Effect, HashMap, Ref } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri, type IExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const Log = yield* _(LogService);
	const CapabilitiesMap = yield* _(
		Ref.make(HashMap.empty<string, FileSystemProviderCapabilities>()),
	);
	const OnDidChangeFileEvent = CreateEventStream<any[]>();

	const GetCapabilities = (Scheme: string) =>
		Ref.get(CapabilitiesMap).pipe(
			Effect.map(HashMap.get(Scheme)),
			Effect.map((maybeCaps) => {
				if (maybeCaps._tag === "Some") {
					return maybeCaps.value;
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

	const ExtURIInstance: IExtUri = new ExtUri((uri) => {
		// This callback must be synchronous, so we must use runSync here.
		const caps = Effect.runSync(GetCapabilities(uri.scheme));
		const ignoreCase = caps
			? !(caps & FileSystemProviderCapabilities.PathCaseSensitive)
			: isWindows; // Default to OS case-sensitivity
		Log.Trace(
			`ExtURI check for scheme '${uri.scheme}', ignoring case: ${ignoreCase}`,
		);
		return ignoreCase;
	});

	// --- RPC Handler ---
	const AcceptProviderCapabilities = (
		Scheme: string,
		Capabilities: FileSystemProviderCapabilities | null,
	) =>
		Effect.gen(function* (_) {
			if (Capabilities === null) {
				yield* _(Ref.update(CapabilitiesMap, HashMap.remove(Scheme)));
				yield* _(
					Log.Trace(`Cleared capabilities for scheme '${Scheme}'.`),
				);
			} else {
				yield* _(
					Ref.update(
						CapabilitiesMap,
						HashMap.set(Scheme, Capabilities),
					),
				);
				yield* _(
					Log.Trace(
						`Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`,
					),
				);
			}
		});

	IPC.RegisterInvokeHandler("$acceptProviderInfos", ([scheme, caps]) =>
		Effect.runPromise(AcceptProviderCapabilities(scheme, caps)),
	);
	IPC.RegisterInvokeHandler("$onFileEvent", ([events]) =>
		OnDidChangeFileEvent.Fire(
			events.map((e: any) => ({
				type: e.type,
				uri: TypeConverter.URI.ToAPI(e.uri),
			})),
		).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
		ExtURI: ExtURIInstance,
		GetCapabilities,
		onDidChangeFile: OnDidChangeFileEvent.event,
		isWritableFileSystem: (scheme) => {
			const caps = Effect.runSync(GetCapabilities(scheme));
			return caps
				? !(caps & FileSystemProviderCapabilities.Readonly)
				: true; // Assume writable if not specified
		},
	};

	return ServiceImplementation;
});
