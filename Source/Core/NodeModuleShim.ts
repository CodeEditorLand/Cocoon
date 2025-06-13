/**
 * @module NodeModuleShim (Core)
 * @description Provides the NodeModuleShim service, which intercepts requests for
 * built-in Node.js modules, blocking some and providing safe shims for others.
 */

import { Layer } from "effect";

import { Live as LiveLog } from "../../Service/Log.js";
import { Definition } from "./NodeModuleShim/Definition.js";
import { Tag } from "./NodeModuleShim/Service.js";

export { Tag, type Interface } from "./NodeModuleShim/Service.js";
export * from "./NodeModuleShim/Error.js";

/**
 * The live implementation Layer for the NodeModuleShim service.
 * It depends on the Log service for reporting interception events. The InitData
 * service is also an indirect dependency via the Definition, and must be
.
 * provided at the application level.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
