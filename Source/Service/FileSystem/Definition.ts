/**
 * @module Definition (FileSystem)
 * @description The live implementation of the FileSystem service.
 */

import { Effect } from "effect";
import {
	FileSystemError as VscFileSystemError,
	type FileStat,
	type Uri,
} from "vscode";

import URIConverter from "../../TypeConverter/Main/URI.js";
import FileSystemInformationService from "../FileSystemInformation/Service.js";
import IPCService from "../IPC/Service.js";
import type { FileSystemServiceType } from "./Service.js";

/**
 * An Effect that builds the live implementation of the FileSystem service.
 */
export default Effect.gen(function* (G) {
	const FsInfo = yield* G(FileSystemInformationService);

	const IPC = yield* G(IPCService);

	// --- Internal Helper Effects ---
	const StatEffect = (uri: Uri): Effect.Effect<FileStat, Error> =>
		Effect.gen(function* (G) {
			const UriDTO = URIConverter.FromAPI(uri);

			const StatDTO = yield* G(IPC.SendRequest<any>("$stat", [UriDTO]));

			const FileStat: FileStat = {
				type: StatDTO.type,

				ctime: StatDTO.ctime,

				mtime: StatDTO.mtime,

				size: StatDTO.size,

				permissions: StatDTO.permissions,
			};

			return FileStat;
		}).pipe(Effect.mapError((cause) => new Error(String(cause))));

	// --- Service Implementation ---
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
				new VscFileSystemError(`readFile not implemented for ${uri}`),
			),

		writeFile: (uri: Uri, _Content: Uint8Array) =>
			Promise.reject(
				new VscFileSystemError(`writeFile not implemented for ${uri}`),
			),

		delete: (uri: Uri, _Options) =>
			Promise.reject(
				new VscFileSystemError(`delete not implemented for ${uri}`),
			),

		rename: (source: Uri, _Target: Uri, _Options) =>
			Promise.reject(
				new VscFileSystemError(`rename not implemented for ${source}`),
			),

		copy: (source: Uri, _Target: Uri, _Options) =>
			Promise.reject(
				new VscFileSystemError(`copy not implemented for ${source}`),
			),

		isWritableFileSystem: (scheme: string): boolean | undefined => {
			return FsInfo.isWritableFileSystem(scheme);
		},

		onDidChangeFile: FsInfo.onDidChangeFile,
	};

	return ServiceImplementation;
});
