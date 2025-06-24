/*
 * File: Cocoon/Source/Service/FileSystem/Service.ts
 * Role: Defines the FileSystem service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for the service that implements the `vscode.workspace.fs` API.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, Runtime } from "effect";
import {
	FileSystemError as VscFileSystemError,
	type Event,
	type FileChangeEvent,
	type FileStat,
	type FileSystem as VscFileSystem,
	type Uri,
} from "vscode";
import URIConverter from "../../TypeConverter/Main/URI.js";
import { FileSystemInformation } from "../FileSystemInformation/Service.js";
import { IPC } from "../IPC/Service.js";

export interface FileSystemServiceType extends VscFileSystem {
	readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;
}

export class FileSystem extends Effect.Service<FileSystemServiceType>()(
	"Service/FileSystem",
	{
		effect: Effect.gen(function* (Generator) {
			const FsInfo = yield* Generator(FileSystemInformation);
			const IPCService = yield* Generator(IPC);

			const StatEffect = (uri: Uri): Effect.Effect<FileStat, Error> =>
				Effect.gen(function* (Generator) {
					const UriDTO = URIConverter.FromAPI(uri);
					const StatDTO = yield* Generator(
						IPCService.SendRequest<any>("$stat", [UriDTO]),
					);
					return {
						type: StatDTO.type,
						ctime: StatDTO.ctime,
						mtime: StatDTO.mtime,
						size: StatDTO.size,
						permissions: StatDTO.permissions,
					};
				}).pipe(Effect.mapError((cause) => new Error(String(cause))));

			const ServiceImplementation: FileSystemServiceType = {
				stat: (uri: Uri): Promise<FileStat> =>
					Effect.runPromise(StatEffect(uri)),
				readDirectory: (uri: Uri) =>
					Promise.reject(
						new VscFileSystemError(
							`readDirectory not implemented for ${uri}`,
						),
					),
				createDirectory: (uri: Uri) =>
					Promise.reject(
						new VscFileSystemError(
							`createDirectory not implemented for ${uri}`,
						),
					),
				readFile: (uri: Uri) =>
					Promise.reject(
						new VscFileSystemError(
							`readFile not implemented for ${uri}`,
						),
					),
				writeFile: (uri: Uri, _Content: Uint8Array) =>
					Promise.reject(
						new VscFileSystemError(
							`writeFile not implemented for ${uri}`,
						),
					),
				delete: (uri: Uri, _Options) =>
					Promise.reject(
						new VscFileSystemError(
							`delete not implemented for ${uri}`,
						),
					),
				rename: (source: Uri, _Target: Uri, _Options) =>
					Promise.reject(
						new VscFileSystemError(
							`rename not implemented for ${source}`,
						),
					),
				copy: (source: Uri, _Target: Uri, _Options) =>
					Promise.reject(
						new VscFileSystemError(
							`copy not implemented for ${source}`,
						),
					),
				isWritableFileSystem: (scheme: string): boolean | undefined =>
					FsInfo.IsWritableFileSystem(scheme),
				onDidChangeFile: FsInfo.onDidChangeFile,
			};
			return ServiceImplementation;
		}),
	},
) {}
