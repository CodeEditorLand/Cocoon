/*
 * File: Cocoon/Source/Core/HostKindPicker/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:40 UTC
 * Dependency: effect, vs/platform/extensions/common/extensions.js, vs/workbench/services/extensions/common/extensionHostKind.js
 * Export: HostKindPickerService
 */

/**
 * @module Service (HostKindPicker)
 * @description Defines the interface and Context.Tag for the HostKindPicker service.
 * This service is responsible for determining if an extension is compatible with
 * the Cocoon (Node.js) extension host environment.
 */

import { Context, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";

export default class HostKindPickerService extends Context.Tag(
	"Core/HostKindPicker",
)<
	HostKindPickerService,
	{
		/**
		 * Determines the appropriate extension host kind for a given extension based
		 * on its manifest properties (`extensionKind`).
		 *
		 * @param ExtensionDescription The description of the extension to analyze.
		 * @returns An `Effect` that resolves to an `ExtensionHostKind` or `null` if no
		 *   suitable host is found for the Cocoon environment.
		 */
		readonly PickHostKind: (
			ExtensionDescription: IExtensionDescription,
		) => Effect.Effect<ExtensionHostKind | null, never>;
	}
>() {}
