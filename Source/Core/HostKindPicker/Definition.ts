/**
 * @module Definition (HostKindPicker)
 * @description The live implementation of the HostKindPicker service.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";

import { LogProvider } from "../../Service/Log.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const Log = yield* _(LogProvider.Tag);

	const PickHostKindEffect = (Extension: IExtensionDescription) =>
		Effect.gen(function* (_) {
			// The `extensionKinds` property in package.json can be an array or a single string.
			// Default to ['workspace'] if it's not present.
			const DeclaredKinds = new Set(
				Array.isArray(Extension.extensionKinds)
					? Extension.extensionKinds
					: Extension.extensionKinds
						? [Extension.extensionKinds]
						: ["workspace"],
			);

			// An extension is considered to need a Node.js environment if it targets
			// the 'workspace' or if it's a 'ui' extension that does *not* have a
			// browser-specific entry point.
			const HasNodeRequirement =
				DeclaredKinds.has("workspace") ||
				(DeclaredKinds.has("ui") && !Extension.browser);

			if (HasNodeRequirement) {
				yield* _(
					Log.Trace(
						`HostKindPicker: Selecting LocalProcess for extension '${Extension.identifier.value}'.`,
					),
				);
				return ExtensionHostKind.LocalProcess;
			}

			// If it's explicitly a 'web' extension and has no Node.js requirement,
			// it cannot run in our Node.js-based Cocoon host.
			if (DeclaredKinds.has("web") && !HasNodeRequirement) {
				yield* _(
					Log.Trace(
						`HostKindPicker: Extension '${Extension.identifier.value}' is Web-only and not suitable for Cocoon.`,
					),
				);
				return null;
			}

			// Fallback for any other unusual configuration.
			yield* _(
				Log.Warn(
					`HostKindPicker: No suitable host kind found for extension '${Extension.identifier.value}'.`,
				),
			);
			return null;
		});

	const ServiceImplementation: Interface = {
		PickHostKind: PickHostKindEffect,
	};

	return ServiceImplementation;
});
