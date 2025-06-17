/*
 * File: Cocoon/Source/Service/Cancellation.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 11:06:30 UTC
 * Dependency: ./Cancellation/Error/InvalidTokenIDError.js, ./Cancellation/Live.js, ./Cancellation/Service.js, ./Cancellation/Type/TokenAndScope.js
 * Export: InvalidTokenIDError, Live, Service, type TokenAndScope
 */

/**
 * @module Cancellation
 * @description This module provides the CancellationTokenProvider service, which is
 * responsible for creating and managing cancellation tokens for long-running
 * RPC operations that can be cancelled by the Mountain host.
 */

import InvalidTokenIDError from "./Cancellation/Error/InvalidTokenIDError.js";
import Live from "./Cancellation/Live.js";
import Service from "./Cancellation/Service.js";
import type TokenAndScope from "./Cancellation/Type/TokenAndScope.js";

export { Service, Live, InvalidTokenIDError, type TokenAndScope };
