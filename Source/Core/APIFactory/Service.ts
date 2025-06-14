/**
 * @module Service (APIFactory)
 * @description Defines the interface and Context.Tag for the APIFactory service.
 * This service is responsible for creating sandboxed `vscode` API objects for
 * each individual extension.
 */

import { Context } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

/**
 * The service interface for the `APIFactory`.
 */
export interface Interface {
	/**
	 * Creates a new, sandboxed `vscode` API object for a specific extension.
	 * This object is a frozen, high-fidelity replica of the `vscode` module.
	 *
	 * @param Extension The full description of the extension requesting the API.
	 * @returns A frozen `vscode` API object tailored for the extension.
	 */
	readonly CreateAPI: (Extension: IExtensionDescription) => typeof VSCode;
}

/**
 * The `Context.Tag` for the `APIFactory` service.
 */
export class APIFactory extends Context.Tag("Core/APIFactory")<
	APIFactory,
	Interface
>() {}
