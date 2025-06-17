/*
 * File: Cocoon/Source/Service/Diagnostic/Live.ts
 * Responsibility: Implements the live diagnostics service layer for the Cocoon sidecar, leveraging the Vine IPC to relay VSCode extension diagnostics to the Mountain backend for display in the Sky frontend.
 * Modified: 2025-06-17 10:36:00 UTC
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
