/**
 * @module Definition (ExtensionPath)
 * @description The class implementation for the ExtensionPath service. This
 * service is responsible for mapping file URIs to their owner extension.
 */

import { path } from "vs/base/common/path.js";
import { URI } from "vs/base/common/uri.js";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";

interface ExtensionPathEntry {
	readonly Path: string;
	readonly Identifier: ExtensionIdentifier;
}

/**
 * A service that maintains an index of installed extension paths, allowing for
 * quick, synchronous lookups from a file URI to its owner extension.
 * This is a critical dependency for the `RequireInterceptor`.
 */
export class Definition {
	private readonly Paths: readonly ExtensionPathEntry[];

	constructor(Extensions: readonly IExtensionDescription[]) {
		const mutablePaths: ExtensionPathEntry[] = [];
		for (const Extension of Extensions) {
			if (Extension.extensionLocation) {
				mutablePaths.push({
					Path: URI.revive(Extension.extensionLocation).fsPath,
					Identifier: Extension.identifier,
				});
			}
		}

		// Sort by path length, longest first. This is crucial to ensure that if
		// one extension's folder is inside another's, the more specific
		// (longer) path is matched first.
		mutablePaths.sort((a, b) => b.Path.length - a.Path.length);
		this.Paths = mutablePaths;
	}

	/**
	 * Finds the extension description that corresponds to a given file URI by
	 * checking if the URI's path is a child of any known extension path.
	 *
	 * @param URI The file URI to look up.
	 * @returns The `IExtensionDescription` containing the identifier if a
	 *   match is found, otherwise `undefined`.
	 */
	public FindSubstr(uri: URI): IExtensionDescription | undefined {
		const FilePath = uri.fsPath;
		for (const Entry of this.Paths) {
			// Use a path-aware comparison to ensure we are not just matching a prefix.
			// e.g., `/path/to/ext-foo-bar` should not match `/path/to/ext-foo`.
			if (
				FilePath.startsWith(Entry.Path + path.sep) ||
				FilePath === Entry.Path
			) {
				// Return a minimal description, as this is all the interceptor needs.
				return {
					identifier: Entry.Identifier,
					extensionLocation: URI.file(Entry.Path),
				} as IExtensionDescription;
			}
		}
		return undefined;
	}
}
