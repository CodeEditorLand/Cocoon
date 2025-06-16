/*
 * File: Cocoon/Source/Service/Cancellation/Type/TokenAndScope.ts
 * Responsibility: Defines a TypeScript interface combining a VS Code CancellationToken with an Effect Scope to manage resource cleanup in the Cocoon Node.js sidecar process.
 * Modified: 2025-06-15 19:17:15 UTC
 * Dependency: effect, vs/base/common/cancellation.js
 * Export: Interface
 */

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
