/**
 * @module FileSystem
 * @description Defines the service that implements the `vscode.workspace.fs` API,
 * proxying filesystem operations to the host process.
 */

import { Effect } from "effect";
import {
	FileSystemError as VSCodeFileSystemError,
	type Event,
	type FileChangeEvent,
	type FileStat,
	type FileSystem as VSCodeFileSystem,
	type Uri,
} from "vscode";
import { FileSystemInformationService } from "./FileSystemInformation.js";
import { IPCService } from "./IPC.js";

/**
 * @interface FileSystem
 * @description The contract for the FileSystem service, extending `vscode.FileSystem`.
 */
export interface FileSystem extends VSCodeFileSystem {
	readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;
}

/**
 * @class FileSystemService
 * @description The `Effect.Service` for the `vscode.workspace.fs` API.
 */
export class FileSystemService extends Effect.Service<FileSystemService>()(
	"Service/FileSystem",
	{
		effect: Effect.gen(function* () {
			const FileSystemInformation = yield* FileSystemInformationService;
			const IPC = yield* IPCService;

			const Stat = (uri: Uri): Effect.Effect<FileStat, Error> =>
				Effect.gen(function* () {
					const UriDTO = uri.toJSON();
					const StatDTO = yield* IPC.SendRequest<any>("$stat", [
						UriDTO,
					]);
					return {
						type: StatDTO.type,
						ctime: StatDTO.ctime,
						mtime: StatDTO.mtime,
						size: StatDTO.size,
						permissions: StatDTO.permissions,
					};
				}).pipe(Effect.mapError((cause) => new Error(String(cause))));

			const ServiceImplementation: FileSystem = {
				stat: (uri: Uri): Promise<FileStat> =>
					Effect.runPromise(Stat(uri)),
				readDirectory: (uri: Uri) =>
					Promise.reject(
						new VSCodeFileSystemError(
							`readDirectory not implemented for ${uri}`,
						),
					),
				createDirectory: (uri: Uri) =>
					Promise.reject(
						new VSCodeFileSystemError(
							`createDirectory not implemented for ${uri}`,
						),
					),
				readFile: (uri: Uri) =>
					Promise.reject(
						new VSCodeFileSystemError(
							`readFile not implemented for ${uri}`,
						),
					),
				writeFile: (uri: Uri, _Content: Uint8Array) =>
					Promise.reject(
						new VSCodeFileSystemError(
							`writeFile not implemented for ${uri}`,
						),
					),
				delete: (uri: Uri, _Options) =>
					Promise.reject(
						new VSCodeFileSystemError(
							`delete not implemented for ${uri}`,
						),
					),
				rename: (source: Uri, _Target: Uri, _Options) =>
					Promise.reject(
						new VSCodeFileSystemError(
							`rename not implemented for ${source}`,
						),
					),
				copy: (source: Uri, _Target: Uri, _Options) =>
					Promise.reject(
						new VSCodeFileSystemError(
							`copy not implemented for ${source}`,
						),
					),
				isWritableFileSystem: (scheme: string): boolean | undefined =>
					FileSystemInformation.IsWritableFileSystem(scheme),
				onDidChangeFile: FileSystemInformation.onDidChangeFile,
			};
			return ServiceImplementation;
		}),
	},
) {}
