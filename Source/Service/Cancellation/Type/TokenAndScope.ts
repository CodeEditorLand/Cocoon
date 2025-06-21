/**
 * @module TokenAndScope (Cancellation/Type)
 * @description Defines custom types for the cancellation service.
 */

import type { Scope } from "effect";
import type { CancellationToken } from "vs/base/common/cancellation.js";

/**
 * A record representing a `CancellationToken` and its associated disposable `Scope`.
 * When the scope is closed, the underlying resources for the token are released.
 */
export default interface Interface {
	readonly Token: CancellationToken;
	readonly Scope: Scope.Scope;
}
