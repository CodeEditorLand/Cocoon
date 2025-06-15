/**
 * @module Definition (HostKindPicker)
 * @description The live implementation of the HostKindPicker service.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";

import LogService from "../../Service/Log/Service.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the HostKindPicker service.
 */
export default Effect.gen(function* () {
	const Log = yield* LogService;

	const PickHostKind = (
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
				(DeclaredKinds.has("ui") && !ExtensionDescription.browser);

			if (HasNodeRequirement) {
				yield* Log.Trace(
					`HostKindPicker: Selecting LocalProcess for extension '${ExtensionDescription.identifier.value}'.`,
				);
				return ExtensionHostKind.LocalProcess;
			}

			// If it's explicitly a 'web' extension and has no Node.js requirement,
			// it cannot run in our Node.js-based Cocoon host.
			if (DeclaredKinds.has("web") && !HasNodeRequirement) {
				yield* Log.Trace(
					`HostKindPicker: Extension '${ExtensionDescription.identifier.value}' is Web-only and not suitable for Cocoon.`,
				);
				return null;
			}

			// Fallback for any other unusual configuration.
			yield* Log.Warn(
				`HostKindPicker: No suitable host kind found for extension '${ExtensionDescription.identifier.value}'. Defaulting to 'null'.`,
			);
			return null;
		});

	const HostKindPickerImplementation: Service = {
		PickHostKind,
	};

	return HostKindPickerImplementation;
});
