/*
 * File: Cocoon/Source/Service/Cancellation.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:15 UTC
 * Dependency: ./Cancellation/Definition.js, ./Cancellation/Error/InvalidTokenIDError.js, ./Cancellation/Service.js, ./Cancellation/Type/TokenAndScope.js, effect
 * Export: CancellationLive, InvalidTokenIDError, default, type TokenAndScope
 */

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

export { default as Service } from "./Cancellation/Service.js";

/**
 * The live implementation Layer for the CancellationTokenProvider service.
 * This is a self-contained layer with no external dependencies.
 */
export const CancellationLive = Layer.effect(Service, Definition);
