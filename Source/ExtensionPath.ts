/**
 * @module ExtensionPath
 * @description Defines the service for mapping a file URI to its owner extension.
 * This is a critical utility for interceptors that need to determine which
 * extension is making a request.
 */

import { Effect } from "effect";
import * as Path from "node:path";
import { URI } from "vs/base/common/uri.js";
import type {
	IExtensionDescription,
	ExtensionIdentifier,
} from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";
import { InitData } from "./InitData.js";

/**
 * @interface ExtensionPathEntry
 * @description An internal type to store the path and identifier for an extension.
 */
interface ExtensionPathEntry {
	readonly Path: string;
	readonly Identifier: ExtensionIdentifier;
}

/**
 * @interface ExtensionPath
 * @description The contract for the ExtensionPath service.
 */
export interface ExtensionPath {
	readonly FindSubstr: (PathUri: Uri) => IExtensionDescription | undefined;
}

/**
 * @class ExtensionPath
 * @description The `Effect.Service` for mapping file paths to extensions.
 * It builds an in-memory index of all extension paths on initialization for
 * fast, synchronous lookups.
 */
export class ExtensionPath extends Effect.Service<ExtensionPath>()(
	"Service/ExtensionPath",
	{
		effect: Effect.gen(function* () {
			const InitDataService = yield* InitData;
			const Extensions = InitDataService.extensions.allExtensions;
			const MutablePaths: ExtensionPathEntry[] = [];

			for (const Extension of Extensions) {
				if (Extension.extensionLocation) {
					MutablePaths.push({
						Path: URI.revive(Extension.extensionLocation).fsPath,
						Identifier: Extension.identifier,
					});
				}
			}

			// Sort by path length, longest first, for correct matching.
			MutablePaths.sort((a, b) => b.Path.length - a.Path.length);
			const Paths = MutablePaths as readonly ExtensionPathEntry[];

			return {
				FindSubstr: (
					PathUri: Uri,
				): IExtensionDescription | undefined => {
					const FilePath = PathUri.fsPath;
					for (const Entry of Paths) {
						if (
							FilePath.startsWith(Entry.Path + Path.sep) ||
							FilePath === Entry.Path
						) {
							return {
								identifier: Entry.Identifier,
								extensionLocation: URI.file(Entry.Path),
							} as IExtensionDescription;
						}
					}
					return undefined;
				},
			};
		}),
	},
) {}
