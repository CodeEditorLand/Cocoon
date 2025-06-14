/**
 * @module Window
 * @description This module provides the core `vscode.window` API implementation,
 * managing properties like window state and orchestrating calls to sub-services
 * like dialogs, messages, and quick input.
 */

import { Layer } from "effect";

import {
	Live as LiveIPC,
	type Configuration as IPCConfiguration,
} from "./IPC.js";
import { Definition } from "./Window/Definition.js";
import { Tag } from "./Window/Service.js";
import { Live as LiveWorkSpace } from "./WorkSpace.js";

// Re-exports should happen from a central 'index' or from the service module itself.
// Example: export { ShowInformationMessage } from "./Window/ShowInformationMessage.js";
// For now, removing it to fix the compile error.

export { Tag, type Interface } from "./Window/Service.js";

/**
 * The live implementation Layer for the Window service.
 * @param Config The IPC Configuration.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Tag, Definition).pipe(
		Layer.provide(Layer.merge(LiveIPC(Config), LiveWorkSpace(Config))),
	);
