/*
 * File: Cocoon/Source/Core/NodeModuleShim/Service.ts
 * Role: Defines the interface and Effect.Service for the NodeModuleShim service.
 * Responsibilities:
 *   - Declare the contract for the service that intercepts requests for built-in
 *     Node.js modules, blocking some and providing safe shims for others.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Exit } from "effect";
import type { Uri } from "vscode";
import type { ModuleBlockedProblem } from "./Error.js";
import type { ModuleNotShimmedProblem } from "./Error.js";

/**
 * The `Effect.Service` for the `NodeModuleShim`.
 *
 * This service is a critical part of the sandbox, ensuring that extensions cannot
 * access sensitive Node.js APIs directly, forcing them to use the provided
 * `vscode.*` APIs instead.
 */
export class NodeModuleShim extends Effect.Service<NodeModuleShim>(
	"Core/NodeModuleShim",
)<{
	/**
	 * Synchronously loads a shim for a requested built-in Node.js module.
	 * This method must be synchronous to be compatible with `require`.
	 *
	 * @param Request - The name of the module being requested (e.g., 'fs', 'node:os').
	 * @param ParentURI - The URI of the file that made the `require` call.
	 * @returns An `Exit` that contains the shimmed module on success, or a
	 *   `ModuleBlockedProblem` or `ModuleNotShimmedProblem` on failure.
	 */
	readonly Load: (
		Request: string,
		ParentURI?: Uri,
	) => Exit.Exit<any, ModuleBlockedProblem | ModuleNotShimmedProblem>;
}>() {}
