/*
 * File: Cocoon/Source/Core/ESMInterceptor/Service.ts
 * Responsibility: Implements the ESMInterceptor service using Effect's Context API to install a Node.js loader hook that intercepts 'import vscode' statements in the Cocoon sidecar, enabling VS Code extension compatibility while ensuring proper resource cleanup via Scope management.
 * Modified: 2025-06-15 19:17:27 UTC
 * Dependency: effect
 * Export: ESMInterceptorService
 */

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
