/*
 * File: Cocoon/Source/Service/FileSystem/Definition.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:42:01 UTC
 * Dependency: ../FileSystemInformation/Service.js, ../IPC/Service.js, ./CreateStatEffect.js, ./Service.js, effect
 */

/**
 * @module Definition (FileSystem)
 * @description The live implementation of the FileSystem service.
 */

import { Effect, Layer } from "effect";
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
	const IPC = yield* IPCService; // Dependency for CreateStatEffect

	const FileSystemImplementation: FileSystem = {
		// FIX: CreateStatEffect now needs IPC. We provide it from this scope.
		stat: (Uri): Promise<FileStat> =>
			Effect.runPromise(CreateStatEffect(Uri, IPC)),
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
		// FIX: The signature must match the `vscode.d.ts` interface.
		writeFile: (Uri: Uri, _Content: Uint8Array, _Options: any) =>
			Promise.reject(
				new VscFileSystemError(`writeFile not implemented for ${Uri}`),
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
		// FIX: isWritableFileSystem is a method that takes a scheme, not an effect.
		isWritableFileSystem: FsInfo.isWritableFileSystem,
		onDidChangeFile: FsInfo.onDidChangeFile,
	};

	// FIX: The service must be provided with its dependencies.
	return FileSystemImplementation as Service["Type"];
}).pipe(Effect.provide(Layer.succeed(IPCService, IPC)));
