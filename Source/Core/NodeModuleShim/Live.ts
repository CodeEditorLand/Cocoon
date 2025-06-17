/*
 * File: Cocoon/Source/Core/NodeModuleShim/Live.ts
 * Responsibility: Provides the live implementation layer for the NodeModuleShim service in Cocoon, intercepting Node.js module requires to enable VS Code extension compatibility, and depends on the Log service for event reporting.
 * Modified: 2025-06-17 10:32:50 UTC
 * Dependency: ../../Service/Log/Live.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (NodeModuleShim)
 * @description Provides the live implementation Layer for the NodeModuleShim service.
 */

import { Layer } from "effect";

import LogLive from "../../Service/Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the NodeModuleShim service.
 * It depends on the Log service for reporting interception events. The InitData
 * service is also an indirect dependency via the Definition, and must be
 * provided at the application level.
 */
export default Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));
