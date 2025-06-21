/**
 * @module Live (Cancellation)
 * @description The live implementation `Layer` for the CancellationTokenProvider service.
 */

// CHANGED: Use Layer.scoped to indicate the service has a managed lifecycle.
import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the CancellationTokenProvider service.
 * This is a self-contained layer with no external dependencies.
 */
export default Layer.scoped(Service, Definition);
