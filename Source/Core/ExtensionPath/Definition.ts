/*
 * File: Cocoon/Source/Core/ExtensionPath/Definition.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:24 UTC
 * Dependency: node:path, vs/base/common/uri.js, vscode
 */

/**
 * @module Definition (ExtensionPath)
 * @description The class implementation for the ExtensionPath service. This
 * service is responsible for mapping file URIs to their owner extension.
 */

import * as Path from "node:path";
import { URI } from "vs/base/common/uri.js";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

interface ExtensionPathEntry {
	readonly Path: string;
	readonly Identifier: ExtensionIdentifier;
}

/**
 * A service that maintains an index of installed extension paths, allowing for
 * quick, synchronous lookups from a file URI to its owner extension.
 * This is a critical dependency for the `RequireInterceptor`.
 */
export default class {
	private readonly Paths: readonly ExtensionPathEntry[];

	constructor(Extensions: readonly IExtensionDescription[]) {
		const MutablePaths: ExtensionPathEntry[] = [];
		for (const Extension of Extensions) {
			if (Extension.extensionLocation) {
				MutablePaths.push({
					Path: URI.revive(Extension.extensionLocation).fsPath,
					Identifier: Extension.identifier,
				});
			}
		}

		// Sort by path length, longest first. This is crucial to ensure that if
		// one extension's folder is inside another's, the more specific
		// (longer) path is matched first.
		MutablePaths.sort((a, b) => b.Path.length - a.Path.length);
		this.Paths = MutablePaths;
	}

	/**
	 * Finds the extension description that corresponds to a given file URI by
	 * checking if the URI's path is a child of any known extension path.
	 *
	 * @param PathURI The file URI to look up.
	 * @returns The `IExtensionDescription` containing the identifier if a
	 *   match is found, otherwise `undefined`.
	 */
	public FindSubstr(PathURI: VSCode.Uri): IExtensionDescription | undefined {
		const FilePath = PathURI.fsPath;
		for (const Entry of this.Paths) {
			// Use a path-aware comparison to ensure we are not just matching a prefix.
			// e.g., `/path/to/ext-foo-bar` should not match `/path/to/ext-foo`.
			if (
				FilePath.startsWith(Entry.Path + Path.sep) ||
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
