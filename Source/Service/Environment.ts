/*
 * File: Cocoon/Source/Service/Environment.ts
 * Responsibility: Aggregates the Environment service modules for the Cocoon sidecar, implementing the vscode.env API to expose host environment information to VS Code extensions in the Land editor.
 * Modified: 2025-06-17 11:14:29 UTC
 * Dependency: ./Environment/Live.js, ./Environment/Service.js
 * Export: Live, Service
 */

/**
 * @module Environment
 * @description This module provides the `vscode.env` API implementation,
 * exposing information about the application and host environment.
 */

import Live from "./Environment/Live.js";
import Service from "./Environment/Service.js";

export { Service, Live };
