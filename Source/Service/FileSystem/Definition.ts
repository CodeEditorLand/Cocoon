/*
 * File: Cocoon/Source/Service/FileSystem/Definition.ts
 * Responsibility:
 * Modified: 2025-06-16 14:42:01 UTC
 * Dependency: ../FileSystemInformation/Service.js, ../IPC/Service.js, ./CreateStatEffect.js, ./Service.js, effect, vscode
 */

/**
 * @module Definition (FileSystem)
 * @description The live implementation of the FileSystem service.
 */

import { Effect } from "effect";
import {
	FileSystemError as VscFileSystemError,
	type FileStat,
	type FileSystem,
	type Uri,
} from "vscode";

import FileSystemInformationService from "../FileSystemInformation/Service.js";
import IPCService from "../IPC/Service.js"; // Needed for CreateStatEffect
import CreateStatEffect from "./CreateStatEffect.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the FileSystem service.
 */
export default Effect.gen(function* () {
	const FsInfo = yield* FileSystemInformationService;
	const IPC = yield* IPCService;

	// This implementation matches the `vscode.FileSystem` interface from `vscode.d.ts`
	const FileSystemImplementation: FileSystem = {
		stat: (uri: Uri): Promise<FileStat> =>
			Effect.runPromise(CreateStatEffect(uri, IPC)),
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
			// The API contract is synchronous boolean|undefined, not a Thenable.
			// We must run the effect from the service synchronously.
			const isWritableEffect = FsInfo.isWritableFileSystem(scheme);
			return Effect.runSync(isWritableEffect);
		},
	};

	// Your custom service type appears to be a superset of vscode.FileSystem,
	// including the onDidChangeFile event.
	const ServiceImplementation: Service["Type"] = {
		...FileSystemImplementation,
		onDidChangeFile: FsInfo.onDidChangeFile,
	};

	return ServiceImplementation;
});
