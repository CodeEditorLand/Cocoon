/*
 * File: Cocoon/Source/Service/StoragePath/Service.ts
 * Role: Defines the StoragePath service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Resolve filesystem URIs for extension-specific storage locations.
 */

import { Effect } from "effect";
import * as Path from "node:path";
import { type IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";
import { FileSystem } from "../FileSystem/Service.js";
import { InitData } from "../InitData/Service.js";
import { Logger } from "../Log/Service.js";

// --- Internal Helper ---
const EnsureDirectory = (
	DirectoryURI: Uri | undefined,
	ScopeName: string,
): Effect.Effect<boolean, never, FileSystem | Logger> =>
	Effect.if(DirectoryURI !== undefined, {
		onTrue: () =>
			Effect.gen(function* (Generator) {
				const URI = DirectoryURI!;
				const Fs = yield* Generator(FileSystem);
				const LogService = yield* Generator(Logger);
				yield* Generator(
					Effect.tryPromise(() => Fs.createDirectory(URI)).pipe(
						Effect.catchAll((Error) =>
							LogService.Error(
								`Failed to ensure ${ScopeName} storage directory exists at ${URI.toString()}`,
								Error,
							),
						),
					),
				);
				yield* Generator(
					LogService.Trace(
						`${ScopeName} storage directory ensured at: ${URI.fsPath}`,
					),
				);
				return true;
			}),
		onFalse: () =>
			Logger.pipe(
				Effect.flatMap((Log) =>
					Log.Trace(
						`${ScopeName} storage URI is not defined; skipping creation.`,
					),
				),
				Effect.as(false),
			),
	});

// --- Service Definition ---
export class StoragePath extends Effect.Service<StoragePath>()(
	"Service/StoragePath",
	{
		effect: Effect.gen(function* (Generator) {
			const InitDataService = yield* Generator(InitData);
			const LogService = yield* Generator(Logger);

			const GlobalStorageURI = InitDataService.environment
				.globalStorageHome as Uri;
			const WorkSpaceStorageURI = InitDataService.environment
				.workspaceStorageHome as Uri;

			yield* Generator(EnsureDirectory(GlobalStorageURI, "Global"));
			yield* Generator(EnsureDirectory(WorkSpaceStorageURI, "WorkSpace"));

			const GetPathForExtension = (
				BaseURI: Uri | undefined,
				Extension: IExtensionDescription,
			): Uri | undefined => {
				if (!BaseURI || !Extension?.identifier?.value) return undefined;
				const ExtensionSubdirectory = Extension.identifier.value
					.replace(/[^a-z0-9-]/gi, "_")
					.toLowerCase();
				return Uri.joinPath(BaseURI, ExtensionSubdirectory);
			};

			const ServiceImplementation = {
				GetWorkSpaceStorageURI: (Extension: IExtensionDescription) =>
					GetPathForExtension(WorkSpaceStorageURI, Extension),
				GetGlobalStorageURI: (
					Extension: IExtensionDescription,
				): Uri => {
					const URI = GetPathForExtension(
						GlobalStorageURI,
						Extension,
					);
					if (!URI) {
						const EmergencyPath = Path.join(
							process.cwd(),
							".cocoon-data/global",
							Extension.identifier.value.toLowerCase(),
						);
						Effect.runSync(
							LogService.Error(
								`FATAL: Could not resolve global storage path for ${Extension.identifier.value}. Falling back to ${EmergencyPath}`,
							),
						);
						return Uri.file(EmergencyPath);
					}
					return URI;
				},
			};
			return ServiceImplementation;
		}),
	},
) {}
