/**
 * @module Service (ESMInterceptor)
 * @description Defines the interface and Context.Tag for the ESMInterceptor service.
 * This service is responsible for installing the Node.js loader hook that
 * intercepts `import 'vscode'` statements.
 */

import { Context, type Effect, type Scope } from "effect";

/**
 * The Context.Tag for the ESMInterceptor service.
 */
export default class ESMInterceptorService extends Context.Tag(
	"Core/ESMInterceptor",
)<
	ESMInterceptorService,
	{
		/**
		 * An Effect that, when executed within a Scope, installs the ESM loader hook
		 * and registers finalizers to clean up all resources (MessagePorts, globals)
		 * when the scope is closed. This action is idempotent.
		 */
		readonly Install: () => Effect.Effect<void, Error, Scope.Scope>;
	}
>() {}
