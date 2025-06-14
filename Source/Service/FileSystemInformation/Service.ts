/**
 * @module Service (FileSystemInformation)
 * @description Defines the interface and Context.Tag for the FileSystemInformation service.
 */

import { Context, type Effect } from "effect";
import type { IExtUri } from "vs/base/common/resources.js";
import type {
	Event,
	FileChangeEvent,
	FileSystemProviderCapabilities,
} from "vscode";

/**
 * The `Context.Tag` for the FileSystemInformation service.
 */
export default class extends Context.Tag("Service/FileSystemInformation")<
	any,
	{
		/**
		 * An instance of `ExtUri` configured with the correct case-sensitivity
		 * information for all registered filesystems. This should be used for all
		 * URI comparisons and manipulations.
		 */
		readonly ExtURI: IExtUri;

		/** An event that fires on file changes. */
		readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;

		/** Checks if a filesystem for a given scheme is writable. */
		readonly isWritableFileSystem: (Scheme: string) => boolean | undefined;

		/**
		 * Gets the capabilities of a filesystem provider for a given URI scheme.
		 */
		readonly GetCapabilities: (
			Scheme: string,
		) => Effect.Effect<FileSystemProviderCapabilities | undefined, never>;
	}
>() {}
