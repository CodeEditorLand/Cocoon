/*
 * File: Cocoon/Source/Core/NodeModuleShim.ts
 * Responsibility: Provides the NodeModuleShim service to intercept and manage Node.js module requests in the Cocoon sidecar, blocking unsafe built-ins while allowing controlled access through secure shims.
 * Modified: 2025-06-15 19:17:21 UTC
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
