/**
 * @module Cancellation
 * @description This module provides the CancellationTokenProvider service, which is
 * responsible for creating and managing cancellation tokens for long-running
 * RPC operations that can be cancelled by the Mountain host.
 */

import { Layer } from "effect";

import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { type InvalidTokenIdError } from "./Error.js";
export { Tag, type Interface } from "./Service.js";
export type { TokenAndScope } from "./Type.js";

/**
 * The live implementation Layer for the CancellationTokenProvider service.
 * This is a self-contained layer with no external dependencies.
 */
export const Live = Layer.effect(Tag, Definition);
