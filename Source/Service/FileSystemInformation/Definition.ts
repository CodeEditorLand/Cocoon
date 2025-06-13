/**
 * @module Definition (FileSystemInformation)
 * @description The live implementation of the FileSystemInformation service.
 */

import { Effect, HashMap, Ref, Stream } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri, type IExtUri } from "vs/base/common/resources.js";
import type { UriComponents } from "vs/base/common/uri.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const LogService = yield* _(Log.Tag);
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
		LogService.Trace(
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
					LogService.Trace(
						`Cleared capabilities for scheme '${Scheme}'.`,
					),
				);
			} else {
				yield* _(
					Ref.update(
						CapabilitiesMap,
						HashMap.set(Scheme, Capabilities),
					),
				);
				yield* _(
					LogService.Trace(
						`Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`,
					),
				);
			}
		});

	IPCService.RegisterInvokeHandler("$acceptProviderInfos", ([scheme, caps]) =>
		Effect.runPromise(AcceptProviderCapabilities(scheme, caps)),
	);
	IPCService.RegisterInvokeHandler("$onFileEvent", ([events]) =>
		OnDidChangeFileEvent.Fire(
			events.map((e: any) => ({
				type: e.type,
				uri: TypeConverter.URIConverter.ToAPI(e.uri),
			})),
		).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Interface = {
		ExtURI: ExtURIInstance,
		GetCapabilities,
		onDidChangeFile: OnDidChangeFileEvent.Stream.pipe(Stream.toEvent),
		isWritableFileSystem: (scheme) => {
			const caps = Effect.runSync(GetCapabilities(scheme));
			return caps
				? !(caps & FileSystemProviderCapabilities.Readonly)
				: true; // Assume writable if not specified
		},
	};

	return ServiceImplementation;
});
