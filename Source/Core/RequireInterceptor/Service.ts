/*
 * File: Cocoon/Source/Core/RequireInterceptor/Service.ts
 *
 * This file defines the interface and Context.Tag for the RequireInterceptor service.
 * This service is responsible for patching Node.js's `require` to provide sandboxed
 * APIs to extensions.
 */

import { Context, type Effect } from "effect";

export default class RequireInterceptorService extends Context.Tag(
	"Core/RequireInterceptor",
)<
	RequireInterceptorService,
	{
		/**
		 * An Effect that, when executed, patches the global `Module.prototype.require`
		 * function to enable interception. This should be run once at startup and is
		 * idempotent.
		 */
		readonly Install: () => Effect.Effect<void, never>;
	}
>() {}
