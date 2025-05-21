/*---------------------------------------------------------------------------------------------
 * Cocoon Node Built-ins Shim Factory (node-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface for the `NodeRequireInterceptor`.
 * It intercepts calls to `require()` for various built-in Node.js modules (like 'os',
 *
 * 'crypto', 'process', 'fs') that might need partial shimming or proxying within Cocoon.
 *
 * Responsibilities:
 * - Declaring the list of Node.js module names it handles.
 * - Implementing the `load` method, called by `NodeRequireInterceptor`.
 * - Returning the corresponding shim module (e.g., `os-shim.ts`, `crypto-shim.ts`)
 *   when a handled module is required.
 * - Falling back to the original Node.js `require` for unhandled modules.
 *
 * Key Interactions:
 * - Registered with the `NodeRequireInterceptor` instance in `index.ts`.
 * - Provides shims for 'fs', 'os', 'crypto', 'process'.
 *--------------------------------------------------------------------------------------------*/

// Import the shims for Node built-in modules using default imports,

// assuming each shim file has an `export default ...` statement.
// For parentUri type, assuming from vscode API
import type { Uri as VscodeUri } from "vscode";

import cryptoShimInstance from "./crypto-shim";
import fsShimInstance from "./fs-shim";
import osShimInstance from "./os-shim";
import processShimInstance from "./process-shim";

// --- Type Definitions ---

// INodeModuleFactory interface should be defined centrally if used by multiple factories.
// TODO: Move INodeModuleFactory to a shared types file (e.g., `types.ts` or alongside NodeRequireInterceptor definition).
export interface INodeModuleFactory {
	/**
	 * The name or names of the Node.js module this factory can provide.
	 */
	readonly nodeModuleName: string | readonly string[];

	/**
	 * Called by the NodeRequireInterceptor when a listed `nodeModuleName` is required.
	 * @param request The exact string passed to `require()` (e.g., "fs", "fs/promises").
	 * @param parentUri The URI of the module that made the `require()` call.
	 * @param originalLoad A function to call the original Node.js `require` mechanism.
	 * @returns The shimmed module, or the result of `originalLoad(request)`.
	 */
	load(
		request: string,

		parentUri: VscodeUri | undefined,

		originalLoad: (request: string) => any,
	): any;

	/**
	 * Optional method to suggest an alternative module name if the factory
	 * handles a module under a different name than requested.
	 */
	alternativeModuleName?(name: string): string | undefined;
}

export class NodeModuleShimFactory implements INodeModuleFactory {
	// List all Node.js modules this factory intends to shim.
	public readonly nodeModuleName: readonly string[] = [
		"fs",

		"os",

		"crypto",

		"process",
	];

	public load(
		request: string,

		parentUri: VscodeUri | undefined,

		originalLoad: (request: string) => any,
	): any {
		const requester = parentUri
			? parentUri.fsPath || parentUri.toString()
			: "unknown module";

		console.log(
			`[Cocoon Node Factory] Intercepted require('${request}') from ${requester}.`,
		);

		switch (request) {
			case "fs":
				return fsShimInstance;

			case "process":
				return processShimInstance;

			case "os":
				return osShimInstance;

			case "crypto":
				return cryptoShimInstance;

			// TODO: Add cases for other Node.js built-ins if they need shimming
			// e.g., 'path', 'child_process', 'http', 'https', 'url', 'util', 'assert', 'stream', 'zlib', 'vm', 'worker_threads'.
			// For each, decide if a shim is needed or if `originalLoad` is acceptable.
			// Example:
			// case "path":
			// Or a path-shim if path manipulation needs to be controlled/logged
			//   return require("node:path");

			default:
				// If the module name is not explicitly handled by this factory,

				// attempt to load it using the original Node.js require mechanism.
				// This allows extensions to use other built-in modules that don't require shimming.
				console.warn(
					`[Cocoon Node Factory] Module '${request}' not explicitly shimmed. Attempting original load.`,
				);

				try {
					return originalLoad(request);
				} catch (e: any) {
					console.error(
						`[Cocoon Node Factory] Original loader failed for unshimmed module '${request}':`,

						// Log only message for brevity
						e.message,
					);

					// Rethrow the error so the `require()` call fails as it would in a standard Node environment.
					throw e;
				}
		}
	}

	// alternativeModuleName is optional and not typically needed if nodeModuleName lists exact names.
	// public alternativeModuleName(name: string): string | undefined { return undefined; }
}
