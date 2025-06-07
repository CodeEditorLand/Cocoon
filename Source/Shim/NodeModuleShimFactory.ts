/*
 * File: Cocoon/Source/Shim/NodeModuleShimFactory.ts
 * Responsibility: Implements a factory to intercept and provide shims for Node.js built-in modules in the Cocoon sidecar, ensuring controlled behavior and blocking direct file system access to enforce use of vscode.workspace.fs.
 * Modified: 2025-06-07 00:57:39 UTC
 * Dependency: ${request}, ./_baseShim, ./crypto-shim, ./fs-shim, ./os-shim, ./process-shim, fs, vscode
 * Export: INodeModuleFactory, NodeModuleShimFactory
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js Built-in Modules Shim Factory
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface, designed to work seamlessly with the
 * `NodeRequireInterceptor`.
 *
 * This factory intercepts `require()` calls for a predefined list of built-in
 * Node.js modules. When such a call is intercepted:
 * - For 'os', 'crypto', 'process': It substitutes the native module with a Cocoon-specific
 *   shim implementation, providing controlled or proxied behavior.
 * - For 'fs': It **blocks** the native 'fs' module and throws an error, directing
 *   extensions to use the `vscode.workspace.fs` API instead. This is a key aspect of
 *   Cocoon's sandboxing and resource management strategy.
 *
 * Responsibilities:
 * - Maintaining a list of Node.js module names it handles ('fs', 'os', 'crypto', 'process').
 * - Implementing `load(request, parentUri, originalLoad)`:
 *   - Returns shims for 'os', 'crypto', 'process'.
 *   - Throws an error for 'fs', preventing its use and guiding developers to `vscode.workspace.fs`.
 *   - Defensively delegates to `originalLoad` for unhandled (but listed) modules,
 *     though this scenario should be rare with correct configuration.
 *
 * Key Interactions:
 * - An instance of `NodeModuleShimFactory` is registered with the `NodeRequireInterceptor`
 *   during Cocoon's initialization (typically in `Cocoon/index.ts`).
 * - Provides shims from `./os-shim.ts`, `./crypto-shim.ts`, `./process-shim.ts`.
 * - Actively blocks direct `require('fs')` calls.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import type { Uri as VscodeUri } from "vscode"; // From API shim, for parentUri type

import cryptoShimInstance from "./crypto-shim";
// fs-shim.ts is obsolete and will be removed. require('fs') will be blocked.
// import fsShimInstanceFromFile from "./fs-shim"; // This import is intentionally removed/commented.
import osShimInstance from "./os-shim";
import processShimInstance from "./process-shim";

// BaseCocoonShim for logging (if NodeModuleShimFactory were to extend it, but it's a simple factory)
// For now, using console directly for logging within this factory for simplicity,
// as it's instantiated very early and might not have a DI-injected logger.
// import { BaseCocoonShim } from "./_baseShim";

// --- Type Definitions ---

/**
 * Interface for a factory that can provide modules, typically shims,
 * for Node.js built-in module names when intercepted by `NodeRequireInterceptor`.
 */
export interface INodeModuleFactory {
	/**
	 * The name (string) or array of names of the Node.js module(s) this factory is responsible for.
	 */
	readonly nodeModuleName: string | readonly string[];

	/**
	 * Called by the `NodeRequireInterceptor` when a `require()` call matches
	 * one of the `nodeModuleName`s declared by this factory.
	 *
	 * @param request The exact string passed to `require()` (e.g., "fs", "os").
	 * @param parentUri The `vscode.Uri` of the module that initiated the `require()` call, if available.
	 * @param originalLoad A function provided by the interceptor that allows calling the original
	 *                     Node.js `require` mechanism.
	 * @returns The shimmed module instance, or the result of `originalLoad(request)`.
	 * @throws Error if the module is explicitly blocked (e.g., 'fs').
	 */
	load(
		request: string,
		parentUri: VscodeUri | undefined,
		originalLoad: (request: string) => any,
	): any;

	/**
	 * Optional: Suggests an alternative module name if the factory handles a module
	 * under a different canonical name than what might have been requested.
	 * @param requestedName The module name as originally requested.
	 * @returns An alternative module name this factory handles, or `undefined`.
	 */
	alternativeModuleName?(requestedName: string): string | undefined;
}

/**
 * Factory providing Cocoon shims for selected Node.js built-ins.
 * Notably, it blocks `require('fs')` and directs extensions to use `vscode.workspace.fs`.
 */
export class NodeModuleShimFactory implements INodeModuleFactory {
	/**
	 * The list of Node.js built-in module names that this factory will provide shims for or block.
	 */
	public readonly nodeModuleName: readonly string[] = [
		"fs", // Explicitly blocked; extensions must use vscode.workspace.fs.
		"os", // Handled by osShimInstance from ./os-shim.ts
		"crypto", // Handled by cryptoShimInstance from ./crypto-shim.ts
		"process", // Handled by processShimInstance from ./process-shim.ts
		// TODO: Evaluate other built-ins (e.g., 'path', 'child_process', 'http') for shimming, blocking, or pass-through.
		// For each, decide: 1. Shim (list here), 2. Delegate (don't list), 3. Block (list and throw).
	];

	// Direct console logging for this early-initialized factory.
	// If BaseCocoonShim were used, this would be `this._logService?.trace(...)` or `this._logDebug(...)`.
	private _logDebug(message: string, ...args: any[]): void {
		console.debug(`[NodeModuleShimFactory] ${message}`, ...args);
	}
	private _logWarn(message: string, ...args: any[]): void {
		console.warn(`[NodeModuleShimFactory] ${message}`, ...args);
	}
	private _logError(message: string, ...args: any[]): void {
		console.error(`[NodeModuleShimFactory] ${message}`, ...args);
	}

	/**
	 * Loads the appropriate shim or blocks the module when a `require()` call
	 * for a handled Node.js module is intercepted.
	 */
	public load(
		request: string,
		parentUri: VscodeUri | undefined,
		originalLoad: (request: string) => any,
	): any {
		const requesterModulePath = parentUri
			? parentUri.fsPath || parentUri.toString() // Prefer fsPath for local readability
			: "an unknown module";

		this._logDebug(
			`Intercepted require('${request}') from '${requesterModulePath}'.`,
		);

		switch (request) {
			case "fs":
				const errorMsg = `[Cocoon Node Shim Factory] require('fs') from '${requesterModulePath}' is DISALLOWED. Extensions MUST use 'vscode.workspace.fs' for all filesystem operations in Cocoon. The native 'fs' module is not available for direct use.`;
				this._logError(errorMsg); // Log as an error because this is an intentional block.
				throw new Error(errorMsg); // Prevent native 'fs' from loading and fail the require() call.

			case "process":
				this._logDebug(
					`Providing 'process' shim for require('${request}') from '${requesterModulePath}'.`,
				);
				return processShimInstance;
			case "os":
				this._logDebug(
					`Providing 'os' shim for require('${request}') from '${requesterModulePath}'.`,
				);
				return osShimInstance;
			case "crypto":
				this._logDebug(
					`Providing 'crypto' shim for require('${request}') from '${requesterModulePath}'.`,
				);
				return cryptoShimInstance;

			default:
				// This case should ideally not be reached if NodeRequireInterceptor
				// only calls this factory for modules listed in `this.nodeModuleName`.
				this._logWarn(
					`WARNING: Module '${request}' was routed to this factory but no specific shim or block is defined. ` +
						`Attempting to load via original Node.js loader. This may indicate a configuration mismatch in NodeRequireInterceptor or nodeModuleName.`,
				);
				try {
					// Attempt to load using the original Node.js require mechanism.
					// Prefer using the `node:` prefix for clarity and to ensure it's a built-in.
					const prefixedRequest = request.startsWith("node:")
						? request
						: `node:${request}`;
					return originalLoad(prefixedRequest);
				} catch (e: any) {
					this._logError(
						`CRITICAL: Original loader failed for module '${request}', which was listed in nodeModuleName ` +
							`but not explicitly handled by this factory. Module will not be available to '${requesterModulePath}'. Error:`,
						e.message,
						e.stack,
					);
					throw e; // Rethrow to fail the require() call as it would in a standard Node environment.
				}
		}
	}

	// Optional:
	// public alternativeModuleName(requestedName: string): string | undefined {
	//    if (requestedName === "node:fs" && this.nodeModuleName.includes("fs")) return "fs";
	//    // ... other aliases if needed
	//    return undefined;
	// }
}
