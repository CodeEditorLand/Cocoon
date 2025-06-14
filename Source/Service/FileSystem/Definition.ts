/**
 * @module Definition (FileSystem)
 * @description The live implementation of the FileSystem service.
 */

import { Effect } from "effect";
import { FileSystemError as VscFileSystemError } from "vscode";

import { FileSystemInformation } from "../FileSystemInformation.js";
import { CreateStatEffect } from "./CreateStatEffect.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const FsInfo = yield* _(FileSystemInformation.Tag);

	const ServiceImplementation: Interface = {
		stat: (uri) => CreateStatEffect(uri),
		readDirectory: (uri) =>
			Effect.fail(
				new VscFileSystemError(
					`readDirectory not implemented for ${uri}`,
				),
			),
		createDirectory: (uri) =>
			Effect.fail(
				new VscFileSystemError(
					`createDirectory not implemented for ${uri}`,
				),
			),
		readFile: (uri) =>
			Effect.fail(
				new VscFileSystemError(`readFile not implemented for ${uri}`),
			),
		writeFile: (uri, content) =>
			Effect.fail(
				new VscFileSystemError(`writeFile not implemented for ${uri}`),
			),
		delete: (uri, options) =>
			Effect.fail(
				new VscFileSystemError(`delete not implemented for ${uri}`),
			),
		rename: (source, target, options) =>
			Effect.fail(
				new VscFileSystemError(`rename not implemented for ${source}`),
			),
		copy: (source, target, options) =>
			Effect.fail(
				new VscFileSystemError(`copy not implemented for ${source}`),
			),
		isWritableFileSystem: FsInfo.isWritableFileSystem,
		onDidChangeFile: FsInfo.onDidChangeFile,
	};

	return ServiceImplementation;
});
