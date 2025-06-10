/**
 * @module Definition (ExtensionPaths)
 * @description The class implementation for the ExtensionPaths service.
 */

import { URI } from "vs/base/common/uri.js";
import {
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";

interface ExtensionPathsEntry {
	readonly Path: string;
	readonly Identifier: ExtensionIdentifier;
}

/**
 * A service that maintains an index of installed extension paths, allowing for
 * quick, synchronous lookups from a file URI to its owner extension.
 * This is a critical dependency for the `RequireInterceptor`.
 */
export class Definition {
	private readonly Paths: readonly ExtensionPathsEntry[];

	constructor(Extensions: readonly IExtensionDescription[]) {
		const mutablePaths: ExtensionPathsEntry[] = [];
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
	 * checking if the URI's path is a substring of any known extension path.
	 *
	 * @param Uri - The file URI to look up.
	 * @returns A minimal `IExtensionDescription` containing the identifier if a
	 *   match is found, otherwise `undefined`.
	 */
	public FindSubstr(Uri: URI): IExtensionDescription | undefined {
		const FilePath = Uri.fsPath;
		for (const Entry of this.Paths) {
			if (FilePath.startsWith(Entry.Path)) {
				// Return a minimal description, as this is all the interceptor needs.
				return {
					identifier: Entry.Identifier,
				} as IExtensionDescription;
			}
		}
		return undefined;
	}
}
