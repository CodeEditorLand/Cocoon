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
import Live from "./Diagnostic/Live.js";
import Service from "./Diagnostic/Service.js";

export { Service, Live };
