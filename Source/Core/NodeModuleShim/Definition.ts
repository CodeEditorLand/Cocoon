/*
 * File: Cocoon/Source/Core/NodeModuleShim/Definition.ts
 * Responsibility: The live implementation of the `NodeModuleShim` service.
 * Modified: 2025-06-17 10:52:55 UTC
 */

/**
 * @module Definition (NodeModuleShim)
 * @description The live implementation of the `NodeModuleShim` service, which
 * provides sandboxed shims for built-in Node.js modules. This implementation
 * is a synchronous class to be compatible with Node's `require`.
 */

import { Effect, Exit } from "effect";
import type { Uri } from "vscode";

import InitDataService from "../../Service/InitData/Service.js";
import LogService from "../../Service/Log/Service.js";
import { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";
import type { NodeModuleShimService } from "./Service.js"; // FIX: Import the named interface
import CreateCryptoShim from "./Shim/Crypto.js";
import CreateOsShim from "./Shim/Os.js";
import ProcessShim from "./Shim/Process.js";

/**
 * A synchronous class implementation of the NodeModuleShimService.
 */
class NodeModuleShimImpl implements NodeModuleShimService {
	// FIX: Implement the named interface
	private readonly BlockedModules: Set<string>;
	private readonly Shims: Map<string, any>;

	constructor(
		private readonly Log: LogService["Type"],
		InitData: InitDataService["Type"],
	) {
		const OsShim = CreateOsShim(InitData);
		const CryptoShim = CreateCryptoShim();

		this.BlockedModules = new Set([
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

		this.Shims = new Map<string, any>([
			["os", OsShim],
			["node:os", OsShim],
			["crypto", CryptoShim],
			["node:crypto", CryptoShim],
			["process", ProcessShim],
			["node:process", ProcessShim],
		]);
	}

	Load(
		Request: string,
		ParentURI?: Uri,
	): Exit.Exit<any, ModuleBlockedError | ModuleNotShimmedError> {
		const RequesterPath = ParentURI?.fsPath || "unknown module";
		Effect.runFork(
			this.Log.Trace(
				`Intercepted require('${Request}') from '${RequesterPath}'.`,
			),
		);

		if (this.BlockedModules.has(Request)) {
			return Exit.fail(new ModuleBlockedError({ ModuleName: Request }));
		}

		const Shim = this.Shims.get(Request);
		if (Shim) {
			return Exit.succeed(Shim);
		}

		return Exit.fail(new ModuleNotShimmedError({ ModuleName: Request }));
	}
}

/**
 * An `Effect` that constructs the `NodeModuleShim` service implementation.
 */
export default Effect.gen(function* (G) {
	const Log = yield* G(LogService);
	const InitData = yield* G(InitDataService);
	return new NodeModuleShimImpl(Log, InitData);
});
