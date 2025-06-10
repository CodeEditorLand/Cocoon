/**
 * @module Type (Cancellation)
 * @description Defines custom types for the cancellation service.
 */

import type { Scope } from "effect";
import type { CancellationToken } from "vs/base/common/cancellation.js";

/**
 * A record representing the CancellationToken and its associated disposable Scope.
 */
export interface TokenAndScope {
	readonly Token: CancellationToken;
	readonly Scope: Scope.Scope;
}
