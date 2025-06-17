/*
 * File: Cocoon/Source/Core/ExtensionHost.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:53 UTC
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
