/**
 * @module Cancellation
 * @description This module provides the CancellationTokenProvider service, which is
 * responsible for creating and managing cancellation tokens for long-running
 * RPC operations that can be cancelled by the Mountain host.
 */

import { Layer } from "effect";

import Definition from "./Cancellation/Definition.js";
import InvalidTokenIDError from "./Cancellation/Error/InvalidTokenIDError.js";
import Service from "./Cancellation/Service.js";
import type TokenAndScope from "./Cancellation/Type/TokenAndScope.js";

export { InvalidTokenIDError, type TokenAndScope };

export const CancellationService = Service;
export type CancellationService = Service;

/**
 * The live implementation Layer for the CancellationTokenProvider service.
 * This is a self-contained layer with no external dependencies.
 */
export const CancellationLive = Layer.effect(Service, Definition);
