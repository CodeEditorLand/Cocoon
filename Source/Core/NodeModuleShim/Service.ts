/*
 * File: Cocoon/Source/Core/NodeModuleShim/Service.ts
 * Responsibility: Defines the interface for intercepting and shimming Node.js module requests.
 * Modified: 2025-06-17 10:52:55 UTC
 */

/**
 * @module Service (NodeModuleShim)
 * @description Defines the interface and Context.Tag for the NodeModuleShim service.
 * This service is responsible for intercepting requests for built-in Node.js
 * modules, blocking some and providing safe shims for others.
 */

import { Context, Result } from "effect";
import type { Uri } from "vscode";

import type { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";

export default class NodeModuleShimService extends Context.Tag(
	"Core/NodeModuleShim",
)<
	NodeModuleShimService,
	{
		/**
		 * Synchronously loads a shim for a requested built-in Node.js module.
		 * This method must be synchronous to be compatible with `require`.
		 *
		 * @param Request The name of the module being requested (e.g., 'fs', 'node:os').
		 * @param ParentURI The URI of the file that made the `require` call.
		 * @returns A `Result` that contains the shimmed module on success, or a
		 *   `ModuleBlockedError` or `ModuleNotShimmedError` on failure.
		 */
		readonly Load: (
			Request: string,
			ParentURI?: Uri,
		) => Result.Result<any, ModuleBlockedError | ModuleNotShimmedError>;
	}
>() {}
