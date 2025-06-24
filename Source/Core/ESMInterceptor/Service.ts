/*
 * File: Cocoon/Source/Core/ESMInterceptor/Service.ts
 * Role: Defines the interface and Effect.Service for the ESMInterceptor service.
 * Responsibilities:
 *   - Declare the contract for the service that installs the Node.js loader hook
 *     to intercept `import 'vscode'` statements.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";

/**
 * The `Effect.Service` for the `ESMInterceptor`.
 * This service is responsible for setting up the necessary hooks to handle
 * ES Module imports for the `vscode` module within the extension host.
 */
export class ESMInterceptor extends Effect.Service<ESMInterceptor>(
	"Core/ESMInterceptor",
)<{
	/**
	 * An `Effect` that, when executed, installs the ESM loader hook
	 * and handles the cleanup of all associated resources (like MessagePorts and globals).
	 * The scope is managed internally, and the `Effect` fails with an `Error`
	 * if the `node:module.register` API is not available.
	 */
	readonly Install: () => Effect.Effect<void, Error>;
}>() {}
