/*
 * File: Cocoon/Source/Service/Cancellation/Live.ts
 *
 * This file provides the live implementation `Layer` for the CancellationTokenProvider service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the CancellationTokenProvider service.
 * This is a self-contained, scoped layer with no external dependencies that
 * manages its own lifecycle.
 */
export default Layer.scoped(Service, Definition);
