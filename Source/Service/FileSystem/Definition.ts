/**
 * @module Definition (FileSystem)
 * @description The live implementation of the FileSystem service.
 */

import { Effect } from "effect";

import { FileSystemInformation } from "../FileSystemInformation.js";
import { CreateStatEffect } from "./CreateStatEffect.js";
import type { Interface } from "./Service.js";

// Other effect creators would be imported here
// import { CreateReadFileEffect } from "./CreateReadFileEffect.js";
// import { CreateWriteFileEffect } from "./CreateWriteFileEffect.js";
// import { CreateDeleteEffect } from "./CreateDeleteEffect.js";
// etc.

export const Definition = Effect.gen(function* (_) {
	const FsInfo = yield* _(FileSystemInformation.Tag);

	const ServiceImplementation: Interface = {
		// Each method builds and runs the corresponding Effect.
		stat: (uri) => Effect.runPromise(CreateStatEffect(uri)),
		readDirectory: (uri) =>
			Promise.reject(new Error("readDirectory not implemented")),
		createDirectory: (uri) =>
			Promise.reject(new Error("createDirectory not implemented")),
		readFile: (uri) =>
			Promise.reject(new Error("readFile not implemented")),
		writeFile: (uri, content) =>
			Promise.reject(new Error("writeFile not implemented")),
		delete: (uri, options) =>
			Promise.reject(new Error("delete not implemented")),
		rename: (source, target, options) =>
			Promise.reject(new Error("rename not implemented")),
		copy: (source, target, options) =>
			Promise.reject(new Error("copy not implemented")),
		isWritableFileSystem: FsInfo.isWritableFileSystem,
		onDidChangeFile: FsInfo.onDidChangeFile,
	};

	return ServiceImplementation;
});
