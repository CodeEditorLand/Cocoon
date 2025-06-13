/**
 * @module Cancellation
 * @description This module provides the CancellationTokenProvider service, which is
 * responsible for creating and managing cancellation tokens for long-running
 * RPC operations that can be cancelled by the Mountain host.
 */

import { Layer } from "effect";

import { Definition } from "./Cancellation/Definition.js";
import { Tag } from "./Cancellation/Service.js";

export { type InvalidTokenIDError } from "./Cancellation/Error.js";
export { Tag, type Interface } from "./Cancellation/Service.js";
export type { TokenAndScope } from "./Cancellation/Type.js";

/**
 * The live implementation Layer for the CancellationTokenProvider service.
 * This is a self-contained layer with no external dependencies.
 */
export const Live = Layer.effect(Tag, Definition);
