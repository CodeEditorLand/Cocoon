/**
 * @module Window
 * @description This module provides the core `vscode.window` API implementation,
 * managing properties like window state and orchestrating calls to sub-services
 * like dialogs, messages, and quick input.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

// Re-exporting from sub-services that are part of the `window` namespace
export {
	ShowErrorMessage,
	ShowInformationMessage,
	ShowWarningMessage,
} from "./ShowInformationMessage.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the Window service.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIpc));
