/*
 * File: Cocoon/Source/Core/APIFactory.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
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
