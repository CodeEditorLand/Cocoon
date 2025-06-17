/*
 * File: Cocoon/Source/Core/ExtensionPath/Service.ts
 * Responsibility: Implements the ExtensionPath service in the Cocoon sidecar to map file URIs to their originating VS Code extensions, enabling proper resource resolution for extensions within the Land editor.
 * Modified: 2025-06-17 10:32:54 UTC
 * Dependency: effect, vs/platform/extensions/common/extensions.js, vscode
 * Export: ExtensionPathService
 */

/**
 * @module Service (ExtensionPath)
 * @description Defines the interface and Context.Tag for the ExtensionPath service.
 * This service is responsible for mapping file URIs to their owner extension.
 */

import { Context } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";

export default class ExtensionPathService extends Context.Tag(
	"Core/ExtensionPath",
)<
	ExtensionPathService,
	{
		/**
		 * Synchronously finds the extension that a given file URI belongs to.
		 * @param path The URI to check.
		 * @returns An `IExtensionDescription` if a match is found, otherwise `undefined`.
		 */
		readonly FindSubstr: (path: Uri) => IExtensionDescription | undefined;
	}
>() {}
