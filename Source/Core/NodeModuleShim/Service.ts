/*
 * File: Cocoon/Source/Core/NodeModuleShim/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:39 UTC
 * Dependency: ./Error/ModuleBlockedError.js, ./Error/ModuleNotShimmedError.js, effect, vscode
 * Export: NodeModuleShim, NodeModuleShimService
 */

/**
 * @module Service (NodeModuleShim)
 * @description Defines the interface and Context.Tag for the NodeModuleShim service.
 * This service is responsible for intercepting requests for built-in Node.js
 * modules, blocking some and providing safe shims for others.
 */

import { Context, Exit } from "effect";
import type { Uri } from "vscode";

import type ModuleBlockedError from "./Error/ModuleBlockedError.js";
import type ModuleNotShimmedError from "./Error/ModuleNotShimmedError.js";

// FIX: Define the service interface separately so the class can implement it directly.
export interface NodeModuleShim {
	/**
	 * Synchronously loads a shim for a requested built-in Node.js module.
	 * This method must be synchronous to be compatible with `require`.
	 *
	 * @param Request The name of the module being requested (e.g., 'fs', 'node:os').
	 * @param ParentURI The URI of the file that made the `require` call.
	 * @returns An `Exit` that contains the shimmed module on success, or a
	 *   `ModuleBlockedError` or `ModuleNotShimmedError` on failure.
	 */
	readonly Load: (
		Request: string,
		ParentURI?: Uri,
	) => Exit.Exit<any, ModuleBlockedError | ModuleNotShimmedError>;
}

export class NodeModuleShimService extends Context.Tag("Core/NodeModuleShim")<
	NodeModuleShimService,
	NodeModuleShim
>() {}

export default NodeModuleShimService;
