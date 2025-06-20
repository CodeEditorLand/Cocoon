

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
 * The `Context.Tag` for the `APIFactory` service.
 */
export default class APIFactoryService extends Context.Tag("Core/APIFactory")<
	APIFactoryService,
	{
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
	}
>() {}
