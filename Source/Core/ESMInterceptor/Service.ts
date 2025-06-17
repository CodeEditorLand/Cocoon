/*
 * File: Cocoon/Source/Core/ESMInterceptor/Service.ts
 * Responsibility: Defines the Context.Tag and interface for the ESMInterceptor service.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module Service (ESMInterceptor)
 * @description Defines the interface and Context.Tag for the ESMInterceptor service.
 * This service is responsible for installing the Node.js loader hook that
 * intercepts `import 'vscode'` statements.
 */

import { Context, type Effect } from "effect";

/**
 * The Context.Tag for the ESMInterceptor service.
 */
export default class ESMInterceptorService extends Context.Tag(
	"Core/ESMInterceptor",
)<
	ESMInterceptorService,
	{
		/**
		 * An Effect that, when executed, installs the ESM loader hook
		 * and handles cleanup of all resources (MessagePorts, globals).
		 * The scope is managed internally and not leaked to the caller.
		 */
		readonly Install: () => Effect.Effect<void, Error>;
	}
>() {}
