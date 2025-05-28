/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js Built-in Modules Shim Factory (node-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface, designed to work seamlessly with the
 * `NodeRequireInterceptor`.
 *
 * This factory intercepts `require()` calls for a predefined list of built-in
 * Node.js modules. When such a call is intercepted:
 * - For 'os', 'crypto', 'process': It substitutes the native module with a Cocoon-specific
 *   shim implementation, providing controlled or proxied behavior.
 * - For 'fs': It **blocks** the native 'fs' module and throws an error, directing
 *   extensions to use the `vscode.workspace.fs` API instead. This is because the
 *   previous `fs-shim.ts` relied on a deprecated backend.
 *
 * Responsibilities:
 * - Maintaining a list of Node.js module names it handles ('fs', 'os', 'crypto', 'process').
 * - Implementing `load(request, parentUri, originalLoad)`:
 *   - Returns shims for 'os', 'crypto', 'process'.
 *   - Throws an error for 'fs', preventing its use.
 *   - Defensively delegates to `originalLoad` for unhandled (but listed) modules.
 *
 * Key Interactions:
 * - An instance is registered with `NodeRequireInterceptor` in `Cocoon/index.ts`.
 * - Provides shims from `./os-shim.ts`, `./crypto-shim.ts`, `./process-shim.ts`.
 * - Blocks `require('fs')`.
 *
 *--------------------------------------------------------------------------------------------*/

import type { Uri as VscodeUri } from "vscode"; // From API shim

import cryptoShimInstance from "./crypto-shim";
// fs-shim.ts is obsolete and will be removed. require('fs') will be blocked.
// import fsShimInstanceFromFile from "./fs-shim";
import osShimInstance from "./os-shim";
import processShimInstance from "./process-shim";

export interface INodeModuleFactory {
	readonly nodeModuleName: string | readonly string[];
	load(
		request: string,
		parentUri: VscodeUri | undefined,
		originalLoad: (request: string) => any,
	): any;
	alternativeModuleName?(requestedName: string): string | undefined;
}

/**
 * Factory providing Cocoon shims for selected Node.js built-ins.
 * Notably, it blocks `require('fs')`.
 */
export class NodeModuleShimFactory implements INodeModuleFactory {
	public readonly nodeModuleName: readonly string[] = [
		"fs", // Now explicitly blocked
		"os",
		"crypto",
		"process",
		// TODO: Evaluate other built-ins (child_process, http, path, etc.) for shimming, blocking, or pass-through.
	];

	public load(
		request: string,
		parentUri: VscodeUri | undefined,
		originalLoad: (request: string) => any,
	): any {
		const requesterModulePath = parentUri
			? parentUri.fsPath || parentUri.toString()
			: "an unknown module";
		// Use debug for general interception logs to be less verbose by default.
		console.debug(
			`[Cocoon Node Shim Factory] Intercepted require('${request}') from '${requesterModulePath}'.`,
		);

		switch (request) {
			case "fs":
				const errorMsg = `[Cocoon Node Shim Factory] require('fs') from '${requesterModulePath}' is DISALLOWED. Extensions MUST use 'vscode.workspace.fs' for all filesystem operations in Cocoon. The native 'fs' module is not available.`;
				console.error(errorMsg); // Log as an error because this is a hard block.
				throw new Error(errorMsg); // Prevent native 'fs' from loading and fail the require.

			case "process":
				return processShimInstance;
			case "os":
				return osShimInstance;
			case "crypto":
				return cryptoShimInstance;

			default:
				// This case should ideally not be reached if NodeRequireInterceptor
				// only calls this factory for modules listed in `this.nodeModuleName`.
				console.warn(
					`[Cocoon Node Shim Factory] WARNING: Module '${request}' was routed to this factory but no specific shim or block is defined. ` +
						`Attempting to load via original Node.js loader. This may indicate a configuration mismatch.`,
				);
				try {
					const prefixedRequest = request.startsWith("node:")
						? request
						: `node:${request}`;
					return originalLoad(prefixedRequest);
				} catch (e: any) {
					console.error(
						`[Cocoon Node Shim Factory] CRITICAL: Original loader failed for module '${request}', which was listed in nodeModuleName ` +
							`but not explicitly handled. Module will not be available to '${requesterModulePath}'. Error:`,
						e.message,
						e.stack,
					);
					throw e; // Rethrow to fail the require() call.
				}
		}
	}
}
