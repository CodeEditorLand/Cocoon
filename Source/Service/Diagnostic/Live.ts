/*
 * File: Cocoon/Source/Service/Diagnostic/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:28 UTC
 * Dependency: ./Definition.js, ./Service.js, effect, vscode
 */

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
