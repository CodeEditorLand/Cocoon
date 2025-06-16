/*
 * File: Cocoon/Source/Core/NodeModuleShim/Definition.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:21 UTC
 * Dependency: ${Request}, ../../Service/InitData/Service.js, ../../Service/Log/Service.js, ./Error.js, ./Service.js, ./Shim/Crypto.js, ./Shim/Os.js, ./Shim/Process.js, effect, vscode
 */

/**
 * @module Definition (NodeModuleShim)
 * @description The live implementation of the `NodeModuleShim` service, which
 * provides sandboxed shims for built-in Node.js modules.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import InitDataService from "../../Service/InitData/Service.js";
import LogService from "../../Service/Log/Service.js";
import { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";
import type Service from "./Service.js";
import CreateCryptoShim from "./Shim/Crypto.js";
import CreateOsShim from "./Shim/Os.js";
import ProcessShim from "./Shim/Process.js";

/**
 * An `Effect` that constructs the `NodeModuleShim` service implementation.
 */
export default Effect.gen(function* () {
	const Log = yield* LogService;
	const InitData = yield* InitDataService;

	const OsShim = CreateOsShim(InitData);
	const CryptoShim = CreateCryptoShim();

	const BlockedModules = new Set([
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

	const Load = (
		Request: string,
		ParentURI?: Uri,
	): Effect.Effect<any, ModuleBlockedError | ModuleNotShimmedError> =>
		Effect.gen(function* () {
			const RequesterPath = ParentURI?.fsPath || "unknown module";
			yield* Log.Trace(
				`Intercepted require('${Request}') from '${RequesterPath}'.`,
			);

			if (BlockedModules.has(Request)) {
				return yield* new ModuleBlockedError({ ModuleName: Request });
			}

			const Shim = Shims.get(Request);
			if (Shim) {
				return Shim;
			}

			return yield* new ModuleNotShimmedError({ ModuleName: Request });
		});

	const NodeModuleShimImplementation: Service["Type"] = { Load };
	return NodeModuleShimImplementation;
});
