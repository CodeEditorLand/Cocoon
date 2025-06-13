/**
 * @module Diagnostic
 * @description This module provides the `vscode.languages.createDiagnosticCollection`
 * API, allowing extensions to report problems in the workspace.
 */

import { Layer } from "effect";

import { Definition } from "./Diagnostic/Definition.js";
import { Tag } from "./Diagnostic/Service.js";
import { Live as LiveIPC } from "./IPC.js";

export { Tag, type Interface } from "./Diagnostic/Service.js";
export type { DiagnosticCollection } from "vscode";

/**
 * The live implementation Layer for the Diagnostics service.
 * It depends on the IPC service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
