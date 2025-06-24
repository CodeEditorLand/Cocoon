/*
 * File: Cocoon/Source/Core/HostKindPicker/Service.ts
 * Role: Defines the interface and Effect.Service for the HostKindPicker service.
 * Responsibilities:
 *   - Declare the contract for the service that determines if an extension is
 *     compatible with the Cocoon (Node.js) extension host environment.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";

/**
 * The `Effect.Service` for the `HostKindPicker`.
 * This service is used during extension activation to decide whether an extension
 * can and should run in the current (Cocoon) host.
 */
export class HostKindPicker extends Effect.Service<HostKindPicker>(
	"Core/HostKindPicker",
)<{
	/**
	 * Determines the appropriate extension host kind for a given extension based
	 * on its manifest properties (`extensionKind`).
	 *
	 * @param ExtensionDescription - The description of the extension to analyze.
	 * @returns An `Effect` that resolves to an `ExtensionHostKind` or `null` if no
	 *   suitable host is found for the Cocoon environment.
	 */
	readonly PickHostKind: (
		ExtensionDescription: IExtensionDescription,
	) => Effect.Effect<ExtensionHostKind | null, never>;
}>() {}
