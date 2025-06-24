/*
 * File: Cocoon/Source/Service/FileSystemInformation/Service.ts
 * Role: Defines the service interface and Effect.Service for the FileSystemInformation service.
 * Responsibilities:
 *   - Declare the contract for a service that provides metadata about available
 *     filesystem providers, such as their capabilities (e.g., case-sensitivity).
 *   - Provide the `Effect.Service` class that acts as the dependency injection tag.
 */

import { Effect } from "effect";
import type { IExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import type { Event, FileChangeEvent } from "vscode";

/**
 * The `Effect.Service` for the FileSystemInformation service.
 */
export class FileSystemInformation extends Effect.Service<FileSystemInformation>(
	"Service/FileSystemInformation",
)<
	FileSystemInformation,
	{
		/**
		 * An instance of `ExtUri` configured with the correct case-sensitivity
		 * information for all registered filesystems. This should be used for all
		 * URI comparisons and manipulations to ensure platform-correct behavior.
		 */
		readonly ExtURI: IExtUri;

		/** An event that fires on file changes. */
		readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;

		/**
		 * Checks if a filesystem for a given scheme is writable.
		 * @returns `true` if writable, `false` if readonly, `undefined` if unknown.
		 */
		readonly IsWritableFileSystem: (Scheme: string) => boolean | undefined;

		/**
		 * Gets the capabilities of a filesystem provider for a given URI scheme.
		 * @returns An `Effect` that resolves to the provider's capabilities or `undefined`.
		 */
		readonly GetCapabilities: (
			Scheme: string,
		) => Effect.Effect<FileSystemProviderCapabilities | undefined, never>;
	}
>() {}
