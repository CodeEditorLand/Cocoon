/*
 * File: Cocoon/Source/Core/ExtensionHost.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:25 UTC
 * Dependency: ./ExtensionHost/Live.js, ./ExtensionHost/Service.js
 * Export: Live, Service
 */

/**
 * @module ExtensionHost (Core)
 * @description The main module for the Extension Host service, which manages the
 * entire lifecycle of extensions. It provides the `Live` implementation Layer
 * for the service.
 */

import Live from "./ExtensionHost/Live.js";
import Service from "./ExtensionHost/Service.js";

export { Service, Live };
