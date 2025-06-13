/**
 * @module Definition (FileSystem)
 * @description The live implementation of the FileSystem service.
 */

import { Effect } from "effect";

import { FileSystemInfoProvider } from "../FileSystemInfo.js";
import { CreateStatEffect } from "./CreateStatEffect.js";
import type { Interface } from "./Service.js";

// ... import other effect creators ...

export const Definition = Effect.gen(function* (_) {
	const FsInfo = yield* _(FileSystemInfoProvider.Tag);

	const ServiceImplementation: Interface = {
		// Each method builds and runs the corresponding Effect.
		stat: (uri) => Effect.runPromise(CreateStatEffect(uri)),
		// ... readFile, writeFile, delete, rename, copy, createDirectory ...
		// ... would all be implemented by calling their respective Effect creators ...

		// These are delegated from the FileSystemInfoProvider
		isWritableFileSystem: FsInfo.isWritableFileSystem,
		onDidChangeFile: FsInfo.onDidChangeFile,
	};

	return ServiceImplementation;
});
