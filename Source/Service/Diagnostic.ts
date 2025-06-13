/**
 * @module Diagnostics
 * @description This module provides the `vscode.languages.createDiagnosticCollection`
 * API, allowing extensions to report problems in the workspace.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { DiagnosticCollection } from "vscode";

/**
 * The live implementation Layer for the Diagnostics service.
 * It depends on the Ipc service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIpc));
