/**
 * @module Service (ExtensionPath)
 * @description Defines the interface and Context.Tag for the ExtensionPath service.
 * This service is responsible for mapping file URIs to their owner extension.
 */

import { Context } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";

export default class extends Context.Tag("Core/ExtensionPath")<
	any,
	{
		/**
		 * Synchronously finds the extension that a given file URI belongs to.
		 * @param path The URI to check.
		 * @returns An `IExtensionDescription` if a match is found, otherwise `undefined`.
		 */
		readonly FindSubstr: (path: Uri) => IExtensionDescription | undefined;
	}
>() {}
