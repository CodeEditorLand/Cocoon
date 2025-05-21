/*---------------------------------------------------------------------------------------------
 * Cocoon Node 'fs' Shim Factory (shims/fs-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface for the `NodeRequireInterceptor`.
 * Its purpose is to intercept calls to Node.js's built-in `require('fs')` made by
 * extension code or bundled VS Code platform code running within Cocoon.
 *
 * Responsibilities:
 * - Declaring that it handles the 'fs' module name.
 * - Implementing the `load` method, which is called by the `NodeRequireInterceptor`.
 * - Returning the `fs-shim.js` module instance when `require('fs')` is intercepted.
 *
 * Key Interactions:
 * - Registered with the `NodeRequireInterceptor` instance in `Cocoon/index.js`.
 * - Returns the `fs-shim.js` module.
 *--------------------------------------------------------------------------------------------*/

// Assuming Uri might be part of parentUri context
import { Uri } from "../Shim/out/vscode";
// Import the fs-shim module
import * as fsShim from "./fs-shim";

// Define the INodeModuleFactory interface based on its expected usage
// This interface would typically come from the `NodeRequireInterceptor`'s definition.
export interface INodeModuleFactory {
	readonly nodeModuleName: string | readonly string[];

	load(
		request: string,

		parentUri: Uri | undefined,

		originalLoad: (request: string) => any,
	): any;

	alternativeModuleName?(name: string): string | undefined;
}

export class FsModuleShimFactory implements INodeModuleFactory {
	// Can be a single string or array
	public get nodeModuleName(): string {
		// Explicitly string for 'fs'
		return "fs";
	}

	// Called by the interceptor when require('fs') is encountered
	public load(
		// Should be 'fs' if nodeModuleName is specific
		request: string,

		// The URI of the module performing the require
		parentUri: Uri | undefined,

		// The original Node.js require/load function
		originalLoad: (request: string) => any,
	): any {
		// Should return the 'fs' module shim
		console.log(
			`[Cocoon FS Factory] Intercepted require('fs') from ${
				parentUri?.toString() || "unknown"
			}`,
		);

		// Return our shim implementation
		// fsShim is imported, so it's already the module's exports
		return fsShim;

		// We could potentially return different shims based on the calling extension (parentUri)
		// or use originalLoad('fs') if we want to allow *some* direct access (risky).
	}

	// Optional: If we wanted fs to sometimes resolve to fs-extra, for example
	// public alternativeModuleName(name: string): string | undefined { return undefined; }
}

// Original JS export
// module.exports = { FsModuleShimFactory };

// `export class ...` handles this in TS.
