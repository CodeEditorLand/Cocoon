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
.
 * provided at the application level.
 */
export default Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));
