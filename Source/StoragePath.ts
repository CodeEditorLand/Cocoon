/**
 * @module StoragePath
 * @description Defines the service for resolving filesystem URIs for extension-specific
 * storage locations (both global and workspace-scoped). It ensures that the
 * necessary directories exist before they are accessed.
 */

import { Effect } from "effect";
import * as Path from "node:path";
import { type IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";
import { FileSystem, FileSystemService } from "./FileSystem.js";
import { InitDataService } from "./InitData.js";
import { Logger, LoggerService } from "./Logger.js";

/**
 * @description An internal helper `Effect` to idempotently create a directory.
 * It ensures a directory exists, logging any errors gracefully without failing.
 * @param DirectoryUri The optional `URI` of the directory to create.
 * @param ScopeName A friendly name for the directory's purpose (e.g., "Global").
 * @returns An `Effect` resolving to `true` if ensured, `false` if URI was not provided.
 */
const EnsureDirectory = (
	DirectoryUri: Uri | undefined,
	ScopeName: string,
): Effect.Effect<boolean, never, FileSystem | Logger> =>
	Effect.if(DirectoryUri !== undefined, {
		onTrue: () =>
			Effect.gen(function* () {
				const Uri = DirectoryUri!;
				const FileSystem = yield* FileSystemService;
				const Logger = yield* LoggerService;
				yield* Effect.tryPromise(() =>
					FileSystem.createDirectory(Uri),
				).pipe(
					Effect.catchAll((Error) =>
						Logger.Error(
							`Failed to ensure ${ScopeName} storage directory exists at ${Uri.toString()}`,
							Error,
						),
					),
				);
				yield* Logger.Trace(
					`${ScopeName} storage directory ensured at: ${Uri.fsPath}`,
				);
				return true;
			}),
		onFalse: () =>
			Effect.flatMap(LoggerService, (Log) =>
				Log.Trace(
					`${ScopeName} storage URI is not defined; skipping creation.`,
				),
			).pipe(Effect.as(false)),
	});

/**
 * @interface StoragePath
 * @description The contract for the StoragePath service.
 */
export interface StoragePath {
	readonly GetWorkSpaceStorageUri: (
		Extension: IExtensionDescription,
	) => Uri | undefined;
	readonly GetGlobalStorageUri: (Extension: IExtensionDescription) => Uri;
}

/**
 * @class StoragePathService
 * @description The `Effect.Service` for resolving extension storage paths.
 */
export class StoragePathService extends Effect.Service<StoragePathService>()(
	"Service/StoragePath",
	{
		effect: Effect.gen(function* () {
			const InitData = yield* InitDataService;
			const Logger = yield* LoggerService;

			const GlobalStorageUri = InitData.environment
				.globalStorageHome as Uri;
			const WorkSpaceStorageUri = InitData.environment
				.workspaceStorageHome as Uri;

			yield* EnsureDirectory(GlobalStorageUri, "Global");
			yield* EnsureDirectory(WorkSpaceStorageUri, "WorkSpace");

			const GetPathForExtension = (
				BaseUri: Uri | undefined,
				Extension: IExtensionDescription,
			): Uri | undefined => {
				if (!BaseUri || !Extension?.identifier?.value) return undefined;
				const ExtensionSubdirectory = Extension.identifier.value
					.replace(/[^a-z0-9-]/gi, "_")
					.toLowerCase();
				return Uri.joinPath(BaseUri, ExtensionSubdirectory);
			};

			return {
				GetWorkSpaceStorageUri: (Extension: IExtensionDescription) =>
					GetPathForExtension(WorkSpaceStorageUri, Extension),
				GetGlobalStorageUri: (
					Extension: IExtensionDescription,
				): Uri => {
					const UriResult = GetPathForExtension(
						GlobalStorageUri,
						Extension,
					);
					if (!UriResult) {
						// This is a critical failure. Fallback to a local path to prevent crashes.
						const EmergencyPath = Path.join(
							process.cwd(),
							".cocoon-data/global",
							Extension.identifier.value.toLowerCase(),
						);
						Effect.runSync(
							Logger.Error(
								`FATAL: Could not resolve global storage path for ${Extension.identifier.value}. Falling back to ${EmergencyPath}`,
							),
						);
						return Uri.file(EmergencyPath);
					}
					return UriResult;
				},
			};
		}),
	},
) {}
