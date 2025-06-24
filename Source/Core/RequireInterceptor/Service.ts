/*
 * File: Cocoon/Source/Core/RequireInterceptor/Service.ts
 * Role: Defines the service interface and Effect.Service for the RequireInterceptor.
 * Responsibilities:
 *   - Declare the contract for the service that patches Node.js's `require`
 *     to provide sandboxed APIs (like `'vscode'`) to extensions.
 *   - Provide the `Effect.Service` for dependency injection.
 */

import { Effect } from "effect";

/**
 * The `Effect.Service` for the `RequireInterceptor`.
 * This service is responsible for installing a patch on `Module.prototype.require`
 * to intercept and handle module loading for extensions.
 */
export class RequireInterceptor extends Effect.Service<RequireInterceptor>(
	"Core/RequireInterceptor",
)<{
	/**
	 * An `Effect` that, when executed, patches the global `Module.prototype.require`
	 * function to enable interception. This should be run once at startup and is
	 * idempotent. It returns a `never` error channel as failures are considered
	 * fatal and are logged internally.
	 */
	readonly Install: () => Effect.Effect<void, never>;
}>() {}
