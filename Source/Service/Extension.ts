/**
 * @module Extension
 * @description This module provides the `vscode.extensions` API implementation,
 * allowing extensions to introspect and activate other extensions.
 */

import { Layer } from "effect";

import { Live as LiveExtensionHost } from "../../Core/ExtensionHost.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { Extension } from "vscode";

/**
 * The live implementation Layer for the Extension service.
 * It depends on the core ExtensionHost service.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(LiveExtensionHost),
);
