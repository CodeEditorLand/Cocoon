/*
 * File: Cocoon/Source/Core/APIFactory/Service.ts
 * Role: Defines the interface and Effect.Service for the APIFactory service.
 * Responsibilities:
 *   - Declare the contract for the service that creates sandboxed `vscode` API
 *     objects for each individual extension.
 *   - Provide the `Effect.Service` class that acts as the dependency injection tag.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

/**
 * The `Effect.Service` for the `APIFactory`.
 *
 * This service is responsible for constructing a high-fidelity, sandboxed
 * `vscode` API object tailored for a specific extension. This ensures that each
 * extension receives an API surface that is appropriate for its context and
 * permissions, and that its interactions are properly managed.
 */
export class APIFactory extends Effect.Service<APIFactory>("Core/APIFactory")<{
	/**
	 * Creates a new, sandboxed `vscode` API object for a specific extension.
	 * This object is a frozen, high-fidelity replica of the `vscode` module.
	 *
	 * @param ExtensionDescription The full description of the extension requesting the API.
	 * @returns A frozen `vscode` API object tailored for the extension.
	 */
	readonly CreateAPI: (
		ExtensionDescription: IExtensionDescription,
	) => typeof VSCode;
}>() {}
