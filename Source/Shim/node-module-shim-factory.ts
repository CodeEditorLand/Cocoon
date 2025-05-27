/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js Built-in Modules Shim Factory (node-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface, designed to work seamlessly with the
 * `NodeRequireInterceptor` (typically from VS Code's `extHostExtensionService.ts` or a
 * similar CommonJS `require` interception mechanism used within Cocoon).
 *
 * This factory's primary role is to intercept `require()` calls made by extensions
 * (or VS Code platform code running in Cocoon) for a predefined list of built-in
 * Node.js modules. When such a call is intercepted, this factory substitutes the
 * native Node.js module with a Cocoon-specific shim implementation. This allows Cocoon
 * to provide controlled, proxied, or modified behavior for these core Node.js modules, * aligning with Cocoon's sandboxing, security, or host interaction goals.
 *
 * Responsibilities:
 * - Maintaining a list of Node.js module names for which it provides shims (e.g., *   'fs', 'os', 'crypto', 'process').
 * - Implementing the `load(request, parentUri, originalLoad)` method, which is the
 *   contractual entry point called by the `NodeRequireInterceptor`.
 * - Based on the `request` string (the module name being required):
 *   - Returning the appropriate Cocoon shim module instance (e.g., an instance from
 *     `fs-shim.ts` for 'fs', from `os-shim.ts` for 'os').
 *   - If a module name is encountered that this factory is registered for but doesn't
 *     have a specific shim in its `switch` case (which should be rare if configured
 *     correctly), it defensively delegates to the `originalLoad` function.
 * - For module names *not* explicitly handled or listed in its `nodeModuleName` array, *   this factory is typically *not called* by the `NodeRequireInterceptor`. The
 *   interceptor would usually try other factories or fall back to `originalLoad` itself.
 *
 * Key Interactions:
 * - An instance of `NodeModuleShimFactory` is registered with the `NodeRequireInterceptor`
 *   during Cocoon's initialization phase in `Cocoon/index.ts`.
 * - It provides shimmed versions for 'fs', 'os', 'crypto', and 'process', importing these
 *   shim implementations from their respective files (e.g., `fs-shim.ts`).
 * - The `NodeRequireInterceptor` is responsible for invoking this factory's `load` method
 *   only for the module names declared in `this.nodeModuleName`.
 *
 *--------------------------------------------------------------------------------------------*/

// Import the shim implementations for Node.js built-in modules.
// These are typically the default exports (singleton instances) from their respective shim files.

// For the `parentUri` parameter type in the INodeModuleFactory interface.
// This should be `vscode.Uri` from the API definition used by extensions.
// Can also be from `../Shim/out/vscode` if that's the canonical source
import type { Uri as VscodeUri } from "vscode";

import cryptoShimInstance from "./crypto-shim";
// Default export from fs-shim.ts, specific to 'fs' module.
import fsShimInstanceFromFile from "./fs-shim";
import osShimInstance from "./os-shim";
import processShimInstance from "./process-shim";

// --- Type Definitions ---

/**
 * Interface for a factory that can provide modules, typically shims, * for Node.js built-in module names when intercepted by `NodeRequireInterceptor`.
 *
 * TODO: This interface definition should ideally reside in a central location
 * (e.g., alongside `NodeRequireInterceptor`'s definition or in a shared `types.ts` file)
 * if it's intended to be implemented by multiple distinct module factories within Cocoon.
 */
export interface INodeModuleFactory {
	/**
	 * The name (string) or array of names of the Node.js module(s) this factory is responsible for.
	 * The `NodeRequireInterceptor` will invoke this factory's `load` method if a `require()` call
	 * matches one of these declared module names.
	 */
	readonly nodeModuleName: string | readonly string[];

	/**
	 * Called by the `NodeRequireInterceptor` when a `require()` call targets a module name
	 * listed in this factory's `nodeModuleName`.
	 *
	 * @param request The exact string passed to `require()` (e.g., "fs", "os").
	 * @param parentUri The `vscode.Uri` of the module that initiated the `require()` call, if available.
	 *                  This can be useful for logging, or for context-specific shimming if a shim's
	 *                  behavior needs to vary based on the requester.
	 * @param originalLoad A function provided by the interceptor that allows calling the original
	 *                     Node.js `require` mechanism. This should be used if the factory decides
	 *                     not to shim a particular request (e.g., for sub-paths like `require('module/subpath')`
	 *                     if only 'module' is shimmed at the top level) or for modules this factory
	 *                     doesn't intend to alter.
	 * @returns The shimmed module instance, or the result of `originalLoad(request)` if the request
	 *          is delegated back to the original Node.js loader.
	 */
	load(
		request: string,

		parentUri: VscodeUri | undefined,

		originalLoad: (request: string) => any,
	): any;

	/**
	 * Optional method for the `NodeRequireInterceptor` to query if this factory handles a module
	 * under an alternative name. For instance, if an extension `require('node:fs')` but the factory
	 * is registered for 'fs', this method could return 'fs' to indicate it can handle the request.
	 *
	 * @param requestedName The module name as originally requested by `require()`.
	 * @returns An alternative module name that this factory is registered for, or `undefined` if no
	 *          alternative is applicable.
	 */
	alternativeModuleName?(requestedName: string): string | undefined;
}

/**
 * A factory that provides Cocoon's shim implementations for a selected set of
 * built-in Node.js modules, including 'fs', 'os', 'crypto', and 'process'.
 */
export class NodeModuleShimFactory implements INodeModuleFactory {
	/**
	 * The list of Node.js built-in module names that this factory will provide shims for.
	 * The `NodeRequireInterceptor` will only call this factory's `load` method for these names.
	 */
	public readonly nodeModuleName: readonly string[] = [
		// Handled by fsShimInstanceFromFile from ./fs-shim.ts
		"fs",

		// Handled by osShimInstance from ./os-shim.ts
		"os",

		// Handled by cryptoShimInstance from ./crypto-shim.ts
		"crypto",

		// Handled by processShimInstance from ./process-shim.ts
		"process",

		// TODO: Evaluate and add other Node.js built-in modules if they require shimming,

		// controlled access, or proxying within the Cocoon environment. Examples:
		// - 'path': Usually safe to pass through directly (`originalLoad('node:path')`). Consider if any path manipulation needs to be virtualized.
		// - 'child_process': Highly sensitive; would require significant shimming/restriction or be blocked entirely.
		// - 'http'/'https': Network requests might need proxying through Mountain for security or observability.
		// - 'url', 'util', 'assert', 'stream', 'zlib', 'vm', 'worker_threads'.
		// For each, decide whether to:
		//   1. Provide a full or partial shim (and list it here).
		//   2. Always delegate to `originalLoad` (by not listing it here, so this factory isn't called for it).
		//   3. Block it entirely (if listed here, `load` could throw an error explicitly disallowing it).
	];

	// This factory is typically instantiated directly and doesn't extend BaseCocoonShim,

	// so it doesn't have `this._logService`. Direct console logging is used for bootstrap-phase messages.
	// If more sophisticated logging is needed here, ILogService could be passed to its constructor.

	/**
	 * Loads the appropriate shim when a `require()` call for one of the handled Node.js
	 * built-in modules is intercepted by the `NodeRequireInterceptor`.
	 *
	 * @param request The module name being required (e.g., "fs", "os"). This will be one of
	 *                the names listed in `this.nodeModuleName`.
	 * @param parentUri The URI of the module making the `require()` call.
	 * @param originalLoad A function to delegate to the original Node.js `require` mechanism.
	 * @returns The shimmed module instance for the requested module.
	 * @throws Error if `originalLoad` fails for an unhandled (but listed) module.
	 */
	public load(
		request: string,

		parentUri: VscodeUri | undefined,

		originalLoad: (request: string) => any,
	): any {
		const requesterModulePath = parentUri
			? // Prefer fsPath for local readability
				parentUri.fsPath || parentUri.toString()
			: "an unknown module";

		// This log can be frequent. In a production build, use console.trace for less noise
		// or make it conditional on a debug flag.
		console.trace(
			`[Cocoon Node Shim Factory] Intercepted require('${request}') from '${requesterModulePath}'.`,
		);

		switch (request) {
			case "fs":
				// `fsShimInstanceFromFile` is the default export from `./fs-shim.ts`
				return fsShimInstanceFromFile;

			case "process":
				return processShimInstance;

			case "os":
				return osShimInstance;

			case "crypto":
				return cryptoShimInstance;

			// Example of how 'path' might be handled if direct pass-through is acceptable
			// (though 'path' is not currently in `this.nodeModuleName`, so this factory wouldn't be called for it):
			// case "path":
			//   console.trace(`[Cocoon Node Shim Factory] Delegating require('path') to original Node.js loader for '${requesterModulePath}'.`);

			// Prefer `node:` prefix for built-ins when using originalLoad
			//   return originalLoad("node:path");

			default:
				// This `default` case should ideally not be reached if the `NodeRequireInterceptor`
				// correctly calls this factory *only* for modules listed in `this.nodeModuleName`.
				// This serves as a defensive fallback if the interceptor's routing logic or the factory's
				// `nodeModuleName` list has a mismatch.
				console.warn(
					`[Cocoon Node Shim Factory] WARNING: Module '${request}' was routed to this factory but no specific shim is defined ` +
						`in its 'load' method's switch statement. This may indicate a configuration mismatch or an incompletely shimmed module. ` +
						`Attempting to load via original Node.js loader.`,
				);

				try {
					// Attempt to load using the original Node.js require mechanism.
					// Using the `node:` prefix is best practice for clarity and future-proofing when loading built-ins.
					const prefixedRequest = request.startsWith("node:")
						? request
						: `node:${request}`;

					return originalLoad(prefixedRequest);
				} catch (e: any) {
					console.error(
						`[Cocoon Node Shim Factory] CRITICAL: Original loader failed for module '${request}', which was listed in nodeModuleName ` +
							`but not explicitly handled by this factory. The module will not be available to '${requesterModulePath}'. Error:`,

						e.message,

						e.stack,
					);

					// Rethrow the error to ensure the `require()` call fails, as it would if the module
					// genuinely couldn't be loaded by Node.js.
					throw e;
				}
		}
	}

	// `alternativeModuleName` is an optional method from `INodeModuleFactory`.
	// It's typically not needed if `nodeModuleName` lists the exact, canonical names
	// that extensions will use in `require()` calls (e.g., 'fs', not 'node:fs').
	// The `NodeRequireInterceptor` often normalizes requests (e.g., 'node:fs' to 'fs')
	// before consulting factories.
	// Example:
	// public alternativeModuleName(requestedName: string): string | undefined {

	// If an extension tries `require('node:fs')` but this factory is registered for 'fs'
	//
	//    if (requestedName === "node:fs" && this.nodeModuleName.includes("fs")) {

	// Tell the interceptor to try this factory again, but with 'fs' as the request.
	//
	//        return "fs";

	//    }

	// No alternative known for other names.
	//    return undefined;

	// }
}
