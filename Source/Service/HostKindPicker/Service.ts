/*
 * File: Cocoon/Source/Service/HostKindPicker/Service.ts
 * Role: Defines the HostKindPicker service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for determining if an extension is compatible with the Cocoon host.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";
import { Logger } from "../Log/Service.js";

export class HostKindPicker extends Effect.Service<HostKindPicker>()(
	"Service/HostKindPicker",
	{
		effect: Effect.gen(function* (Generator) {
			const LogService = yield* Generator(Logger);

			const PickHostKind = (
				ExtensionDescription: IExtensionDescription,
			): Effect.Effect<ExtensionHostKind | null, never> =>
				Effect.gen(function* (Generator) {
					const DeclaredKinds = new Set(
						Array.isArray(ExtensionDescription.extensionKind)
							? ExtensionDescription.extensionKind
							: ExtensionDescription.extensionKind
								? [ExtensionDescription.extensionKind]
								: ["workspace"],
					);

					const HasNodeRequirement =
						DeclaredKinds.has("workspace") ||
						(DeclaredKinds.has("ui") &&
							!ExtensionDescription.browser);

					if (HasNodeRequirement) {
						yield* Generator(
							LogService.Trace(
								`HostKindPicker: Selecting LocalProcess for extension '${ExtensionDescription.identifier.value}'.`,
							),
						);
						return ExtensionHostKind.LocalProcess;
					}

					if (DeclaredKinds.has("web") && !HasNodeRequirement) {
						yield* Generator(
							LogService.Trace(
								`HostKindPicker: Extension '${ExtensionDescription.identifier.value}' is Web-only and not suitable for Cocoon.`,
							),
						);
						return null;
					}

					yield* Generator(
						LogService.Warn(
							`HostKindPicker: No suitable host kind found for extension '${ExtensionDescription.identifier.value}'. Defaulting to 'null'.`,
						),
					);
					return null;
				});

			const ServiceImplementation = {
				PickHostKind,
			};

			return ServiceImplementation;
		}),
	},
) {}
