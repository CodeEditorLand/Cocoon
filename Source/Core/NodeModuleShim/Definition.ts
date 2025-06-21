/**
 * @module Definition (NodeModuleShim)
 * @description The live implementation of the `NodeModuleShim` service, which
 * provides sandboxed shims for built-in Node.js modules. This implementation
 * is constructed effectfully but provides a synchronous `Load` method to be
 * compatible with Node's `require`.
 */

import { Effect, Exit } from "effect";
import type { Uri } from "vscode";

import InitDataService from "../../Service/InitData/Service.js";
import LogService from "../../Service/Log/Service.js";
import ModuleBlockedError from "./Error/ModuleBlockedError.js";
import ModuleNotShimmedError from "./Error/ModuleNotShimmedError.js";
import type NodeModuleShimService from "./Service.js";
import CreateCryptoShim from "./Shim/Crypto.js";
import CreateOsShim from "./Shim/Os.js";
import ProcessShim from "./Shim/Process.js";

/**
 * An `Effect` that constructs the `NodeModuleShim` service implementation.
 * This refactors the original class into an effectful constructor, aligning with
 * idiomatic Effect-TS patterns for dependency management.
 */
export default Effect.gen(function* (G) {
	const Log = yield* G(LogService);

	const InitData = yield* G(InitDataService);

	// Initialization logic, previously in the class constructor
	const OsShim = CreateOsShim(InitData);

	const CryptoShim = CreateCryptoShim();

	const BlockedModules = new Set<string>([
		"fs",
		"node:fs",
		"fs/promises",
		"node:fs/promises",
		"path",
		"node:path",
		"child_process",
		"node:child_process",
		"worker_threads",
		"node:worker_threads",
		"cluster",
		"node:cluster",
		"vm",
		"node:vm",
	]);

	const Shims = new Map<string, any>([
		["os", OsShim],
		["node:os", OsShim],
		["crypto", CryptoShim],
		["node:crypto", CryptoShim],
		["process", ProcessShim],
		["node:process", ProcessShim],
	]);

	// Create the service implementation object
	const NodeModuleShim: NodeModuleShimService["Type"] = {
		Load(
			Request: string,
			ParentURI?: Uri,
		): Exit.Exit<any, ModuleBlockedError | ModuleNotShimmedError> {
			const RequesterPath = ParentURI?.fsPath || "unknown module";

			// The logging side-effect is forked so it doesn't block the sync return
			Effect.runFork(
				Log.Trace(
					`Intercepted require('${Request}') from '${RequesterPath}'.`,
				),
			);

			if (BlockedModules.has(Request)) {
				return Exit.fail(
					new ModuleBlockedError({ ModuleName: Request }),
				);
			}

			const Shim = Shims.get(Request);

			if (Shim) {
				return Exit.succeed(Shim);
			}

			return Exit.fail(
				new ModuleNotShimmedError({ ModuleName: Request }),
			);
		},
	};

	return NodeModuleShim;
});
