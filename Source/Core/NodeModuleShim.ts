/*
 * File: Cocoon/Source/Core/NodeModuleShim.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./NodeModuleShim/Error.js, ./NodeModuleShim/Live.js, ./NodeModuleShim/Service.js
 * Export: Error, Live, Service
 */

/**
 * @module NodeModuleShim (Core)
 * @description Provides the NodeModuleShim service, which intercepts requests for
 * built-in Node.js modules, blocking some and providing safe shims for others.
 */

import * as Error from "./NodeModuleShim/Error.js";
import Live from "./NodeModuleShim/Live.js";
import Service from "./NodeModuleShim/Service.js";

export { Service, Live, Error };
