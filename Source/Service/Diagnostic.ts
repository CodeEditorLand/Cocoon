/*
 * File: Cocoon/Source/Service/Diagnostic.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:09 UTC
 * Dependency: ./Diagnostic/Definition.js, ./Diagnostic/Service.js, ./IPC.js, ./IPC/Configuration.js, effect, vscode
 * Export: Live, default
 */

/**
 * @module Diagnostic
 * @description This module provides the `vscode.languages.createDiagnosticCollection`
 * API, allowing extensions to report problems in the workspace.
 */

import { Layer } from "effect";
import type { DiagnosticCollection } from "vscode";

import Definition from "./Diagnostic/Definition.js";
import Service from "./Diagnostic/Service.js";
import { Live as IPCLive } from "./IPC.js";
import type { IPCConfiguration } from "./IPC/Configuration.js";

export { default as Service } from "./Diagnostic/Service.js";
export type { DiagnosticCollection };

/**
 * The live implementation Layer for the Diagnostics service.
 * It depends on the IPC service for communication.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config)));
