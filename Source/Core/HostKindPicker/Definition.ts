/**
 * @module Definition (HostKindPicker)
 * @description The live implementation of the HostKindPicker service.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";

import { Log } from "../../Service/Log.js";

export const Definition = Effect.gen(function* (_) {
	const LogService = yield* _(Log.Tag);

	const PickHostKind = (Extension: IExtensionDescription) =>
		Effect.gen(function* (_) {
			// The `extensionKind` property in package.json can be an array or a single string.
			// Default to ['workspace'] if it's not present, as this is the traditional Node.js host.
			const DeclaredKinds = new Set(
				Array.isArray(Extension.extensionKind)
					? Extension.extensionKind
					: Extension.extensionKind
						? [Extension.extensionKind]
						: ["workspace"],
			);

			// An extension is considered to need a Node.js environment if it targets
			// the 'workspace' or if it's a 'ui' extension that does *not* have a
			// browser-specific entry point, implying it needs Node.js APIs.
			const HasNodeRequirement =
				DeclaredKinds.has("workspace") ||
				(DeclaredKinds.has("ui") && !Extension.browser);

			if (HasNodeRequirement) {
				yield* _(
					LogService.Trace(
						`HostKindPicker: Selecting LocalProcess for extension '${Extension.identifier.value}'.`,
					),
				);
				return ExtensionHostKind.LocalProcess;
			}

			// If it's explicitly a 'web' extension and has no Node.js requirement,
			// it cannot run in our Node.js-based Cocoon host.
			if (DeclaredKinds.has("web") && !HasNodeRequirement) {
				yield* _(
					LogService.Trace(
						`HostKindPicker: Extension '${Extension.identifier.value}' is Web-only and not suitable for Cocoon.`,
					),
				);
				return null;
			}

			// Fallback for any other unusual configuration.
			yield* _(
				LogService.Warn(
					`HostKindPicker: No suitable host kind found for extension '${Extension.identifier.value}'. Defaulting to 'null'.`,
				),
			);
			return null;
		});

	return {
		PickHostKind,
	};
});
