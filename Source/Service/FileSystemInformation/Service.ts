/*
 * File: Cocoon/Source/Service/FileSystemInformation/Service.ts
 * Role: Defines the FileSystemInformation service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Provide metadata about available filesystem providers (e.g., case-sensitivity).
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, HashMap, Ref } from "effect";
import { isWindows } from "vs/base/common/platform.js";
import { ExtUri, type IExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import type { Event, FileChangeEvent } from "vscode";

import URIConverter from "../../TypeConverter/Main/URI.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC/Service.js";
import { Logger } from "../Log/Service.js";

export class FileSystemInformation extends Effect.Service<FileSystemInformation>()(
	"Service/FileSystemInformation",
	{
		effect: Effect.gen(function* (Generator) {
			const IPCService = yield* Generator(IPC);
			const LogService = yield* Generator(Logger);

			const CapabilitiesMapRef = yield* Generator(
				Ref.make(
					HashMap.empty<string, FileSystemProviderCapabilities>(),
				),
			);
			const { event: OnDidChangeFileEvent, Fire: FireFileChangeEvent } =
				CreateEventStream<readonly FileChangeEvent[]>();

			const GetCapabilitiesEffect = (Scheme: string) =>
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

			const ExtURIInstance: IExtUri = new ExtUri((Uri) => {
				const Capabilities = Effect.runSync(
					GetCapabilitiesEffect(Uri.scheme),
				);
				const IgnoreCase = Capabilities
					? !(
							Capabilities &
							FileSystemProviderCapabilities.PathCaseSensitive
						)
					: isWindows;
				Effect.runFork(
					LogService.Trace(
						`ExtURI check for scheme '${Uri.scheme}', ignoring case: ${IgnoreCase}`,
					),
				);
				return IgnoreCase;
			});

			const AcceptProviderCapabilitiesEffect = (
				Scheme: string,
				Capabilities: FileSystemProviderCapabilities | null,
			) =>
				Effect.gen(function* (Generator) {
					if (Capabilities === null) {
						yield* Generator(
							Ref.update(
								CapabilitiesMapRef,
								HashMap.remove(Scheme),
							),
						);
						yield* Generator(
							LogService.Trace(
								`Cleared capabilities for scheme '${Scheme}'.`,
							),
						);
					} else {
						yield* Generator(
							Ref.update(
								CapabilitiesMapRef,
								HashMap.set(Scheme, Capabilities),
							),
						);
						yield* Generator(
							LogService.Trace(
								`Updated capabilities for scheme '${Scheme}' to: ${Capabilities}`,
							),
						);
					}
				});

			IPCService.RegisterInvokeHandler(
				"$acceptProviderInfos",
				([Scheme, Capabilities]) =>
					Effect.runPromise(
						AcceptProviderCapabilitiesEffect(Scheme, Capabilities),
					),
			);
			IPCService.RegisterInvokeHandler("$onFileEvent", ([Events]) =>
				Effect.runPromise(
					FireFileChangeEvent(
						Events.map((Event: any) => ({
							type: Event.type,
							uri: URIConverter.ToAPI(Event.uri),
						})),
					),
				),
			);

			const ServiceImplementation = {
				ExtURI: ExtURIInstance,
				GetCapabilities: GetCapabilitiesEffect,
				onDidChangeFile: OnDidChangeFileEvent,
				IsWritableFileSystem: (Scheme: string) => {
					const Capabilities = Effect.runSync(
						GetCapabilitiesEffect(Scheme),
					);
					return Capabilities
						? !(
								Capabilities &
								FileSystemProviderCapabilities.Readonly
							)
						: true;
				},
			};
			return ServiceImplementation;
		}),
	},
) {}
