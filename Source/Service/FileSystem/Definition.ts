/**
 * @module Definition (FileSystem)
 * @description The live implementation of the FileSystem service.
 */

import { Effect } from "effect";
import { FileSystemError as VscFileSystemError, type FileSystem } from "vscode";

import FileSystemInformationService from "../FileSystemInformation/Service.js";
import CreateStatEffect from "./CreateStatEffect.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the FileSystem service.
 */
export default Effect.gen(function* () {
	const FsInfo = yield* FileSystemInformationService;

	const FileSystemImplementation: FileSystem = {
		stat: (Uri) => Effect.runPromise(CreateStatEffect(Uri)),
		readDirectory: (Uri) =>
			Promise.reject(
				new VscFileSystemError(
					`readDirectory not implemented for ${Uri}`,
				),
			),
		createDirectory: (Uri) =>
			Promise.reject(
				new VscFileSystemError(
					`createDirectory not implemented for ${Uri}`,
				),
			),
		readFile: (Uri) =>
			Promise.reject(
				new VscFileSystemError(`readFile not implemented for ${Uri}`),
			),
		writeFile: (_Uri, _Content, _Options) =>
			Promise.reject(
				new VscFileSystemError(`writeFile not implemented for ${_Uri}`),
			),
		delete: (Uri, _Options) =>
			Promise.reject(
				new VscFileSystemError(`delete not implemented for ${Uri}`),
			),
		rename: (Source, _Target, _Options) =>
			Promise.reject(
				new VscFileSystemError(`rename not implemented for ${Source}`),
			),
		copy: (Source, _Target, _Options) =>
			Promise.reject(
				new VscFileSystemError(`copy not implemented for ${Source}`),
			),
		isWritableFileSystem: FsInfo.isWritableFileSystem,
		onDidChangeFile: FsInfo.onDidChangeFile,
	};

	return FileSystemImplementation as Service["Type"];
});
