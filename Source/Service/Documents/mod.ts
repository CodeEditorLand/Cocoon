/**
 * @module Documents
 * @description This module provides the Document service, which is the single
 * source of truth for the state of all open text documents in the extension host.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export * from "./Type.js"; // For TextDocument, TextDocumentChangeEvent

/**
 * The live implementation Layer for the Document service.
 * It depends on the Ipc service to receive updates from the host.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIpc));
