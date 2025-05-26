/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js Built-in Modules Shim Factory (node-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface, designed to work with the
 * `NodeRequireInterceptor` (from VS Code's `extHostExtensionService.ts` or a similar
 * CJS `require` interception mechanism).
 *
 * This factory is responsible for intercepting `require()` calls made by extensions
 * for specific built-in Node.js modules. When such a call is intercepted, this factory
 * provides a Cocoon-specific shim implementation for that module, instead of the
 * native Node.js module. This allows Cocoon to control, proxy, or modify the behavior
 * of these built-in modules as seen by extensions.
 *
 * Responsibilities:
 * - Declaring the list of Node.js module names it handles (e.g., 'fs', 'os', 'crypto', 'process').
 * - Implementing the `load` method, which is invoked by the `NodeRequireInterceptor`
 *   when a `require()` call targets one of the handled module names.
 * - Returning the appropriate Cocoon shim module instance (e.g., from `fs-shim.ts`,
 * 
 *   `os-shim.ts`, etc.) for the requested module.
 * - For modules not explicitly handled by this factory, it delegates to the original
 *   Node.js `require` mechanism via the `originalLoad` function provided by the interceptor.
 *
 * Key Interactions:
 * - Registered with the `NodeRequireInterceptor` instance in `Cocoon/index.ts`.
 * - Provides shimmed versions of 'fs', 'os', 'crypto', and 'process' Node.js modules.
 * - Relies on individual shim files (e.g., `fs-shim.ts`, `os-shim.ts`) to provide the
 *   actual shim implementations.
 *

 *--------------------------------------------------------------------------------------------*/

// Import the shims for Node.js built-in modules.
// These are typically default exports from their respective shim files.

// For parentUri type in INodeModuleFactory, assuming from vscode API shim or VS Code internals.
// If using the actual vscode.Uri from the `vscode` module shim, ensure it's compatible.
// Or `../Shim/out/vscode`
import type { Uri as VscodeUri } from "vscode";

import cryptoShimInstance from "./crypto-shim";
// Default export from fs-shim.ts
import fsShimInstanceFromFile from "./fs-shim";
import osShimInstance from "./os-shim";
import processShimInstance from "./process-shim";

// --- Type Definitions ---

/**
 * Interface for a factory that can provide modules, typically shims,
 *
 * for Node.js built-in module names when intercepted by `NodeRequireInterceptor`.
 *
 * TODO: This interface should ideally be defined in a central location (e.g.,
 *
 * alongside `NodeRequireInterceptor`'s definition or in a shared `types.ts`)
 * if it's used by multiple module factories within the Cocoon project.
 */
export interface INodeModuleFactory {
	/**
	 * The name or array of names of the Node.js module(s) this factory can provide.
	 * The `NodeRequireInterceptor` will call this factory's `load` method if a
	 * `require()` call matches one of these names.
	 */
	readonly nodeModuleName: string | readonly string[];

	/**
	 * Called by the `NodeRequireInterceptor` when a `require()` call matches
	 * one of the `nodeModuleName`s declared by this factory.
	 *
	 * @param request The exact string passed to `require()` (e.g., "fs", "os").
	 * @param parentUri The URI of the module that made the `require()` call, if available.
	 *                This can be used for logging or context-specific shimming.
	 * @param originalLoad A function to call the original Node.js `require` mechanism.
	 *                   This should be used if the factory decides not to shim the
	 *                   request or for unhandled sub-paths of a module (e.g., `require('fs/promises')`
	 *                   might first load 'fs' via shim, then the shim handles the 'promises' property).
	 * @returns The shimmed module instance, or the result of `originalLoad(request)` if
	 *          the request is delegated to the original loader.
	 */
	load(
		request: string,

		parentUri: VscodeUri | undefined,

		originalLoad: (request: string) => any,
	): any;

	/**
	 * Optional method to suggest an alternative module name if the factory handles
	 * a module under a different canonical name than what might have been requested.
	 * For example, if an alias like 'node:fs' was used but the factory is registered for 'fs'.
	 *
	 * @param name The module name requested.
	 * @returns An alternative module name that this factory handles, or `undefined`.
	 */
	alternativeModuleName?(name: string): string | undefined;
}

/**
 * A factory that provides shims for various built-in Node.js modules
 * like 'fs', 'os', 'crypto', and 'process'.
 */
export class NodeModuleShimFactory implements INodeModuleFactory {
	/**
	 * The list of Node.js built-in module names that this factory will provide shims for.
	 */
	public readonly nodeModuleName: readonly string[] = [
		"fs",

		"os",

		"crypto",

		"process",

		// TODO: Consider adding other Node.js built-ins if they require shimming or controlled access:
		// 'path', 'child_process', 'http', 'https', 'url', 'util', 'assert', 'stream', 'zlib', 'vm', 'worker_threads'.
		// For each, a decision must be made:
		// 1. Provide a full shim.
		// 2. Provide a partial shim, delegating safe parts to `originalLoad`.
		// 3. Always delegate to `originalLoad` (i.e., don't list it here if no shimming is needed).
		// 4. Block it by throwing an error if it's deemed unsafe or unsupported.
	];

	/**
	 * Loads the appropriate shim when a `require()` call for a handled Node.js module is intercepted.
	 *
	 * @param request The module name being required (e.g., "fs").
	 * @param parentUri The URI of the module making the `require()` call.
	 * @param originalLoad A function to delegate to the original Node.js `require`.
	 * @returns The shimmed module instance or throws if loading fails.
	 */
	public load(
		request: string,

		parentUri: VscodeUri | undefined,

		originalLoad: (request: string) => any,
	): any {
		const requesterPath = parentUri
			? // Prefer fsPath for readability
				parentUri.fsPath || parentUri.toString()
			: "an unknown module";

		// Log sparingly, or make this a trace log, as it can be very frequent.
		console.log(
			`[Cocoon Node Shim Factory] Intercepted require('${request}') from '${requesterPath}'.`,
		);

		switch (request) {
			case "fs":
				// Note: `fsShimInstanceFromFile` is the default export from `./fs-shim.ts`
				return fsShimInstanceFromFile;

			case "process":
				return processShimInstance;

			case "os":
				return osShimInstance;

			case "crypto":
				return cryptoShimInstance;

			// Example: How 'path' might be handled if direct pass-through is acceptable.
			// case "path":
			//   console.log(`[Cocoon Node Shim Factory] Delegating require('path') to original Node.js loader.`);

			// Prefer `node:` prefix for built-ins if using originalLoad
			//   return originalLoad("node:path");

			default:
				// This case should ideally not be hit if `NodeRequireInterceptor` only calls this factory
				// for modules listed in `this.nodeModuleName`.
				// However, if it could be called for other modules, or if a listed module
				// isn't handled in the switch, this default behavior is important.
				console.warn(
					`[Cocoon Node Shim Factory] Module '${request}' was expected to be handled but no specific shim is defined in the factory. Attempting original load. This might indicate a configuration mismatch.`,
				);

				try {
					// Attempt to load using the original Node.js require mechanism.
					// Prefer using the `node:` prefix for clarity if `request` doesn't already have it.
					const prefixedRequest = request.startsWith("node:")
						? request
						: `node:${request}`;

					return originalLoad(prefixedRequest);
				} catch (e: any) {
					console.error(
						`[Cocoon Node Shim Factory] Original loader failed for unshimmed module '${request}':`,

						e.message,
					);

					// Rethrow the error so the `require()` call fails as it would in a standard Node environment.
					throw e;
				}
		}
	}

	// `alternativeModuleName` is optional and not typically needed if `nodeModuleName` lists exact names.
	// It could be useful if, for example, an extension requires 'node:fs' but the factory is
	// registered only for 'fs'. In such a case, this method could return 'fs'.
	// public alternativeModuleName(requestedName: string): string | undefined {

	//    if (requestedName === "node:fs" && this.nodeModuleName.includes("fs")) return "fs";

	// ... other aliases
	//
	//    return undefined;

	// }
}
