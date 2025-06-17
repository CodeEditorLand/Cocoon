/*
 * File: Cocoon/Source/Service/Diagnostic.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Diagnostic/Live.js, ./Diagnostic/Service.js
 * Export: Live, Service
 */

/**
 * @module Diagnostic
 * @description This module provides the `vscode.languages.createDiagnosticCollection`
 * API, allowing extensions to report problems in the workspace.
 */
import Live from "./Diagnostic/Live.js";
import Service from "./Diagnostic/Service.js";

export { Service, Live };
