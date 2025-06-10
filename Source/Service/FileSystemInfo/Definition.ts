/**
 * @module Definition (FileSystemInfo)
 * @description The live implementation of the FileSystemInfo service.
 */

import { Effect, HashMap, Ref, Stream } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri, type IExtUri } from "vs/base/common/resources.js";
import type { UriComponents } from "vs/base/common/uri.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const Log = yield* _(LogProvider.Tag);
	const CapabilitiesMap = yield* _(
		Ref.make(HashMap.empty<string, FileSystemProviderCapabilities>()),
	);
	const OnDidChangeFileEvent = CreateEventStream<any[]>();

	const GetCapabilitiesEffect = (Scheme: string) =>
		Ref.get(CapabilitiesMap).pipe(
			Effect.map(HashMap.get(Scheme)),
			Effect.map((maybeCaps) => {
				if (maybeCaps.isSome()) {
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

	const ExtUriInstance: IExtUri = new ExtUri((uri) => {
		// This callback must be synchronous, so we must use runSync here.
		const caps = Effect.runSync(GetCapabilitiesEffect(uri.scheme));
		const ignoreCase = caps
			? !(caps & FileSystemProviderCapabilities.PathCaseSensitive)
			: false;
		Log.Trace(
			`ExtUri check for scheme '${uri.scheme}', ignoring case: ${ignoreCase}`,
		);
		return ignoreCase;
	});

	// --- RPC Handler ---
	const AcceptProviderCapabilities = (
		Uri: UriComponents,
		Capabilities: FileSystemProviderCapabilities | null,
	) =>
		Effect.gen(function* (_) {
			if (!Uri.scheme) {
				return yield* _(
					Log.Error(
						"Received provider capabilities info without a scheme.",
						Uri,
					),
				);
			}
			if (Capabilities === null) {
				yield* _(
					Ref.update(CapabilitiesMap, HashMap.remove(Uri.scheme)),
				);
				yield* _(
					Log.Trace(
						`Cleared capabilities for scheme '${Uri.scheme}'.`,
					),
				);
			} else {
				yield* _(
					Ref.update(
						CapabilitiesMap,
						HashMap.set(Uri.scheme, Capabilities),
					),
				);
				yield* _(
					Log.Trace(
						`Updated capabilities for scheme '${Uri.scheme}' to: ${Capabilities}`,
					),
				);
			}
		});

	Ipc.RegisterInvokeHandler("$acceptProviderInfos", ([uri, caps]) =>
		Effect.runPromise(AcceptProviderCapabilities(uri, caps)),
	);
	Ipc.RegisterInvokeHandler("$onFileEvent", ([events]) =>
		OnDidChangeFileEvent.Fire(events).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Interface = {
		ExtUri: ExtUriInstance,
		GetCapabilities: GetCapabilitiesEffect,
		onDidChangeFile: OnDidChangeFileEvent.Stream,
		isWritableFileSystem: (scheme) => {
			const caps = Effect.runSync(GetCapabilitiesEffect(scheme));
			return caps
				? !(caps & FileSystemProviderCapabilities.Readonly)
				: true;
		},
	};

	return ServiceImplementation;
});
