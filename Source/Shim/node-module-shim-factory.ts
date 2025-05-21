/*---------------------------------------------------------------------------------------------
 * Cocoon Node Built-ins Shim Factory (shims/node-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface for the `NodeRequireInterceptor`.
 * It intercepts calls to `require()` for various built-in Node.js modules (like 'os',
 *
 * 'crypto', 'process') that might need partial shimming or proxying within Cocoon.
 *
 * Responsibilities:
 * - Declaring the list of Node module names it handles (e.g., ['os', 'crypto', 'process']).
 * - Implementing the `load` method.
 * - Returning the corresponding shim module (`os-shim.js`, `crypto-shim.js`, etc.) when
 *   a handled module is required.
 * - Optionally falling back to the original Node.js `require` for unhandled modules or
 *   if a shim is not intended to fully replace the original.
 *
 * Key Interactions:
 * - Registered with the `NodeRequireInterceptor` instance in `Cocoon/index.js`.
 * - Returns specific shim modules (`./os-shim.js`, etc.).
 *--------------------------------------------------------------------------------------------*/

// Import the shims for Node built-in modules
// Using default imports as the previous shims were converted to use `export default`.
// Assuming Uri might be part of parentUri context
import { Uri } from "../Shim/out/vscode";
import cryptoShim from "./crypto-shim";
import fsShim from "./fs-shim";
import osShim from "./os-shim";
import processShim from "./process-shim";

// Re-using the INodeModuleFactory interface defined in fs-module-shim-factory.ts
// If this is a common interface, it should be in a shared types file.
// For now, re-declaring for clarity if it's not imported from elsewhere.
export interface INodeModuleFactory {
	readonly nodeModuleName: string | readonly string[];

	load(
		request: string,

		parentUri: Uri | undefined,

		originalLoad: (request: string) => any,
	): any;

	alternativeModuleName?(name: string): string | undefined;
}

export class NodeModuleShimFactory implements INodeModuleFactory {
	// List all node modules we want to shim
	public get nodeModuleName(): readonly string[] {
		// Return as readonly string array
		return ["fs", "os", "crypto", "process"];
	}

	public load(
		// The module name being required (e.g., "fs", "os")
		request: string,

		// The URI of the module performing the require
		parentUri: Uri | undefined,

		// The original Node.js require/load function
		originalLoad: (request: string) => any,
	): any {
		// Should return the shimmed module or result of originalLoad
		console.log(
			`[Cocoon Node Factory] Intercepted require('${request}') from ${parentUri?.toString() || "unknown"}`,
		);

		switch (request) {
			case "fs":
				return fsShim;

			case "process":
				return processShim;

			case "os":
				return osShim;

			case "crypto":
				return cryptoShim;

			default:
				// If we didn't intend to shim it, or if the request is for a sub-module
				// of a shimmed module that the shim doesn't explicitly handle (e.g., 'fs/promises'),

				// try the original loader.
				console.warn(
					`[Cocoon Node Factory] Module '${request}' not explicitly shimmed by this factory. Passing to original loader.`,
				);

				try {
					return originalLoad(request);
				} catch (e: any) {
					console.error(
						`[Cocoon Node Factory] Original loader failed for '${request}':`,

						e,
					);

					// Rethrow if original fails, so the require call fails as expected.
					throw e;
				}
		}
	}

	// public alternativeModuleName(name: string): string | undefined {

	// Example: if (name === 'some-module') return 'some-module-shimmed';
	//
	//     return undefined;
	// }
}

// Original JS export
// module.exports = { NodeModuleShimFactory };

// `export class ...` handles this in TS.
