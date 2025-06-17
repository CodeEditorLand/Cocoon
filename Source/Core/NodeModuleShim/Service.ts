/*
 * File: Cocoon/Source/Core/NodeModuleShim/Service.ts
 * Responsibility: Implements a service in the Cocoon sidecar to intercept and shim requests for built-in Node.js modules, blocking unsafe APIs and providing controlled alternatives to ensure secure execution of VS Code extensions.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./Error.js, effect, vscode
 * Export: NodeModuleShimService
 */

/**
 * @module Service (NodeModuleShim)
 * @description Defines the interface and Context.Tag for the NodeModuleShim service.
 * This service is responsible for intercepting requests for built-in Node.js
 * modules, blocking some and providing safe shims for others.
 */

import { Context, type Effect } from "effect";
import type { Uri } from "vscode";

import type { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";

export default class NodeModuleShimService extends Context.Tag(
	"Core/NodeModuleShim",
)<
	NodeModuleShimService,
	{
		/**
		 * Loads a shim for a requested built-in Node.js module.
		 * This method acts as a gatekeeper. It will either return a safe, shimmed
		 * version of the module, or fail with a specific error if the module is
		 * disallowed or not yet implemented.
		 *
		 * @param Request The name of the module being requested (e.g., 'fs', 'node:os').
		 * @param ParentURI The URI of the file that made the `require` call.
		 * @returns An `Effect` that resolves with the shimmed module object or fails
		 *   with a `ModuleBlockedError` or `ModuleNotShimmedError`.
		 */
		readonly Load: (
			Request: string,
			ParentURI?: Uri,
		) => Effect.Effect<any, ModuleBlockedError | ModuleNotShimmedError>;
	}
>() {}
