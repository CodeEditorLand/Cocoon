/**
 * @module Service (FileSystemInfo)
 * @description Defines the interface and Context.Tag for the FileSystemInfo service.
 */

import { Context, Effect, Stream } from "effect";
import type { IExtUri } from "vs/base/common/resources.js";
import type { FileChangeEvent, FileSystemProviderCapabilities } from "vscode";

/**
 * The service interface for filesystem information.
 * This is a partial re-implementation of `vs/workbench/api/common/extHostFileSystemInfo`.
 */
export interface Interface {
	/**
	 * An instance of `ExtUri` configured with the correct case-sensitivity
	 * information for all registered filesystems. This should be used for all
	 * URI comparisons and manipulations.
	 */
	readonly ExtUri: IExtUri;

	/** An event that fires on file changes. */
	readonly onDidChangeFile: Stream.Stream<FileChangeEvent[], never>;

	/** Checks if a filesystem for a given scheme is writable. */
	readonly isWritableFileSystem: (scheme: string) => boolean | undefined;

	/**
	 * Gets the capabilities of a filesystem provider for a given URI scheme.
	 */
	readonly GetCapabilities: (
		Scheme: string,
	) => Effect.Effect<FileSystemProviderCapabilities | undefined, never>;
}

export const Tag = Context.Tag<Interface>("Service/FileSystemInfo");
