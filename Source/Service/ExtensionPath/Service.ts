/*
 * File: Cocoon/Source/Service/ExtensionPath/Service.ts
 * Role: Defines the ExtensionPath service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for mapping file URIs to their owning extension.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect } from "effect";
import * as Path from "node:path";
import { URI } from "vs/base/common/uri.js";
import type {
	IExtensionDescription,
	ExtensionIdentifier,
} from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";
import { InitData } from "../../Service/InitData/Service.js";

interface ExtensionPathEntry {
	readonly Path: string;
	readonly Identifier: ExtensionIdentifier;
}

export class ExtensionPath extends Effect.Service<ExtensionPath>()(
	"Service/ExtensionPath",
	{
		effect: Effect.gen(function* (Generator) {
			const InitDataService = yield* Generator(InitData);

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
			const Paths = MutablePaths;

			const ServiceImplementation = {
				FindSubstr: (
					PathURI: Uri,
				): IExtensionDescription | undefined => {
					const FilePath = PathURI.fsPath;
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

			return ServiceImplementation;
		}),
	},
) {}
