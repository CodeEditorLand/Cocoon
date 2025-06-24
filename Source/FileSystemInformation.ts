/**
 * @module FileSystemInformation
 * @description Defines the service responsible for providing metadata about
 * available filesystem providers, such as their capabilities (e.g., case-sensitivity,
 * read-only status) and for firing file change events.
 */

import { Effect, HashMap, Ref } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { type IExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import type { Event, FileChangeEvent } from "vscode";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { ToAPI } from "./TypeConverter/Main/URI.js";

/**
 * @interface FileSystemInformation
 * @description The contract for the FileSystemInformation service.
 */
export interface FileSystemInformation {
	readonly ExtURI: IExtUri;
	readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;
	readonly GetCapabilities: (
		Scheme: string,
	) => Effect.Effect<FileSystemProviderCapabilities | undefined, never>;
	readonly IsWritableFileSystem: (Scheme: string) => boolean | undefined;
}

/**
 * @class FileSystemInformation
 * @description The `Effect.Service` for providing filesystem metadata.
 */
export class FileSystemInformationService extends Effect.Service<FileSystemInformationService>()(
	"Service/FileSystemInformation",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Logger = yield* LoggerService;

			const CapabilitiesMapRef = yield* Ref.make(
				HashMap.empty<string, FileSystemProviderCapabilities>(),
			);
			const { event: OnDidChangeFileEvent, Fire: FireFileChangeEvent } =
				CreateEventStream<readonly FileChangeEvent[]>();

			const GetCapabilities = (Scheme: string) =>
				Ref.get(CapabilitiesMapRef).pipe(
					Effect.map(HashMap.get(Scheme)),
					Effect.map((MaybeCapabilities) => {
						if (MaybeCapabilities._tag === "Some")
							return MaybeCapabilities.value;
						if (Scheme === "file") {
							return isWindows
								? FileSystemProviderCapabilities.FileReadWrite
								: FileSystemProviderCapabilities.FileReadWrite |
										FileSystemProviderCapabilities.PathCaseSensitive;
						}
						return undefined;
					}),
				);

			const ExtUri: IExtUri = new ExtUri((Uri) => {
				const Capabilities = Effect.runSync(
					GetCapabilities(Uri.scheme),
				);
				const IgnoreCase = Capabilities
					? !(
							Capabilities &
							FileSystemProviderCapabilities.PathCaseSensitive
						)
					: isWindows;
				Effect.runFork(
					Logger.Trace(
						`ExtURI check for scheme '${Uri.scheme}', ignoring case: ${IgnoreCase}`,
					),
				);
				return IgnoreCase;
			});

			const AcceptProviderCapabilities = (
				Scheme: string,
				Capabilities: FileSystemProviderCapabilities | null,
			) =>
				Effect.gen(function* () {
					if (Capabilities === null) {
						yield* Ref.update(
							CapabilitiesMapRef,
							HashMap.remove(Scheme),
						);
						yield* Logger.Trace(
							`Cleared capabilities for scheme '${Scheme}'.`,
						);
					} else {
						yield* Ref.update(
							CapabilitiesMapRef,
							HashMap.set(Scheme, Capabilities),
						);
						yield* Logger.Trace(
							`Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`,
						);
					}
				});

			// Register RPC handlers
			IPC.RegisterInvokeHandler(
				"$acceptProviderInfos",
				([Scheme, Capabilities]) =>
					Effect.runPromise(
						AcceptProviderCapabilities(Scheme, Capabilities),
					),
			);
			IPC.RegisterInvokeHandler("$onFileEvent", ([Events]) =>
				Effect.runPromise(
					FireFileChangeEvent(
						Events.map((Event: any) => ({
							type: Event.type,
							uri: ToAPI(Event.uri),
						})),
					),
				),
			);

			return {
				ExtURI: ExtUri,
				GetCapabilities,
				onDidChangeFile: OnDidChangeFileEvent,
				IsWritableFileSystem: (Scheme: string) => {
					const Capabilities = Effect.runSync(
						GetCapabilities(Scheme),
					);
					return Capabilities
						? !(
								Capabilities &
								FileSystemProviderCapabilities.Readonly
							)
						: true;
				},
			};
		}),
	},
) {}
