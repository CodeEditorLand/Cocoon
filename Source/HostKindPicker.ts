/**
 * @module HostKindPicker
 * @description Defines the service for determining the appropriate runtime host
 * (e.g., Node.js-based local process) for a given VS Code extension based on its
 * manifest properties (`extensionKind`).
 */

import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostKind.js";
import { Effect } from "effect";

import { LoggerService } from "./Logger.js";

/**
 * @interface HostKindPicker
 * @description The contract for the HostKindPicker service.
 */
export interface HostKindPicker {
	/**
	 * Determines the appropriate `ExtensionHostKind` for a given extension.
	 * @param ExtensionDescription The manifest description of the extension.
	 * @returns An `Effect` that resolves to the determined `ExtensionHostKind`
	 * or `null` if the extension is not compatible with this host.
	 */
	readonly Pick: (
		ExtensionDescription: IExtensionDescription,
	) => Effect.Effect<ExtensionHostKind | null, never>;
}

/**
 * @class HostKindPicker
 * @description The `Effect.Service` for determining an extension's host kind.
 * It analyzes an extension's `package.json` to decide if it can run in the
 * Cocoon (Node.js) environment.
 */
export class HostKindPickerService extends Effect.Service<HostKindPickerService>()(
	"Service/HostKindPicker",
	{
		effect: Effect.gen(function* () {
			const Logger = yield* LoggerService;

			const Pick = (
				ExtensionDescription: IExtensionDescription,
			): Effect.Effect<ExtensionHostKind | null, never> =>
				Effect.gen(function* () {
					// The `extensionKind` property in package.json can be an array or a single string.
					// Default to ['workspace'] if it's not present, as this is the traditional Node.js host.
					const DeclaredKinds = new Set(
						Array.isArray(ExtensionDescription.extensionKind)
							? ExtensionDescription.extensionKind
							: ExtensionDescription.extensionKind
								? [ExtensionDescription.extensionKind]
								: ["workspace"],
					);

					// An extension is considered to need a Node.js environment if it targets
					// the 'workspace' or if it's a 'ui' extension that does *not* have a
					// browser-specific entry point, implying it needs Node.js APIs.
					const HasNodeRequirement =
						DeclaredKinds.has("workspace") ||
						(DeclaredKinds.has("ui") &&
							!ExtensionDescription.browser);

					if (HasNodeRequirement) {
						yield* Logger.Trace(
							`HostKindPicker: Selecting LocalProcess for extension '${ExtensionDescription.identifier.value}'.`,
						);
						return ExtensionHostKind.LocalProcess;
					}

					// If it's explicitly a 'web' extension and has no Node.js requirement,
					// it cannot run in our Node.js-based Cocoon host.
					if (DeclaredKinds.has("web") && !HasNodeRequirement) {
						yield* Logger.Trace(
							`HostKindPicker: Extension '${ExtensionDescription.identifier.value}' is Web-only and not suitable for Cocoon.`,
						);
						return null;
					}

					// Fallback for any other unusual configuration.
					yield* Logger.Warn(
						`HostKindPicker: No suitable host kind found for extension '${ExtensionDescription.identifier.value}'. Defaulting to 'null'.`,
					);
					return null;
				});

			return { Pick };
		}),
	},
) {}
