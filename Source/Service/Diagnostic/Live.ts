/**
 * @module Live (Diagnostic)
 * @description The live implementation Layer for the Diagnostics service.
 */

import { Layer } from "effect";
import type { DiagnosticCollection } from "vscode";

import Definition from "./Definition.js";
import Service from "./Service.js";

export type { DiagnosticCollection };

/**
 * The live implementation Layer for the Diagnostics service.
 * It depends on the IPC service for communication.
 */
export default Layer.effect(Service, Definition);
