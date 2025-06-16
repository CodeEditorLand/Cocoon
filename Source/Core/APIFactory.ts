/*
 * File: Cocoon/Source/Core/APIFactory.ts
 * Responsibility: Provides the core factory implementation for creating sandboxed vscode API instances within the Cocoon sidecar, enabling VS Code extension compatibility in Land's MVP Path A architecture.
 * Modified: 2025-06-16 14:56:03 UTC
 * Dependency: ./APIFactory/Live.js, ./APIFactory/Service.js
 * Export: Live, Service
 */

/**
 * @module APIFactory (Core)
 * @description The main module for the `APIFactory` service, which is
 * responsible for creating sandboxed `vscode` API objects for extensions.
 */

import Live from "./APIFactory/Live.js";
import Service from "./APIFactory/Service.js";

export { Service, Live };
