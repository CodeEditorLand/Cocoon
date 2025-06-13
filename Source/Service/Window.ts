/**
 * @module Window
 * @description This module provides the core `vscode.window` API implementation,
 * managing properties like window state and orchestrating calls to sub-services
 * like dialogs, messages, and quick input.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./Window/Definition.js";
import { Tag } from "./Window/Service.js";
import { Live as LiveWorkSpace } from "./WorkSpace.js";

// Re-exporting from sub-services that are part of the `window` namespace
export { ShowInformationMessage } from "./Window/ShowInformationMessage.js";
// Re-export ShowWarningMessage, ShowErrorMessage in a similar way

export { Tag, type Interface } from "./Window/Service.js";

/**
 * The live implementation Layer for the Window service.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveWorkSpace)),
);
