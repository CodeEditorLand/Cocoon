/**
 * @module Definition (NodeModuleShim)
 * @description The live implementation of the `NodeModuleShim` service, which
 * provides sandboxed shims for built-in Node.js modules.
 */

import { Context, Effect } from "effect";
import type { Uri } from "vscode";

import InitDataService from "../../Service/InitData/Service.js";
import LogService from "../../Service/Log/Service.js";
import ModuleBlockedError from "./Error/ModuleBlockedError.js";
import ModuleNotShimmedError from "./Error/ModuleNotShimmedError.js";
import CryptoShim from "./Shim/Crypto.js";
import CreateOsShim from "./Shim/Os.js";
import ProcessShim from "./Shim/Process.js";

/**
 * An `Effect` that constructs the `NodeModuleShim` service implementation.
 * It depends on `Log` for logging and `InitData` to create
 * environment-aware shims.
 */
export default Effect.gen(function* (_) {
	const Log = yield* _(LogService);
	const InitData = yield* _(InitDataService);

	// Create shims that depend on initialization data ahead of time.
	const OsShim = CreateOsShim(InitData);

	/**
	 * An `Effect` that attempts to load a sandboxed Node.js module.
	 *
	 * It acts as a gatekeeper, explicitly blocking certain modules (like 'fs'),
	 * providing safe shims for others (like 'os' and 'crypto'), and failing
	 * for any unhandled module requests.
	 *
	 * @param Request The name of the module being required (e.g., 'os').
	 * @param ParentURI The URI of the module making the `require` call.
	 */
	const Load = (Request: string, ParentURI?: Uri) =>
		Effect.gen(function* (_) {
			const RequesterPath = ParentURI?.fsPath || "unknown module";
			yield* _(
				Log.Trace(
					`Intercepted require('${Request}') from '${RequesterPath}'.`,
				),
			);

			switch (Request) {
				// Blocked modules that interact directly with the filesystem or host.
				case "fs":
				case "node:fs":
				case "fs/promises":
				case "node:fs/promises":
				case "path":
				case "node:path":
				case "child_process":
				case "node:child_process":
				case "worker_threads":
				case "node:worker_threads":
				case "cluster":
				case "node:cluster":
				case "vm":
				case "node:vm":
					return yield* _(
						Effect.fail(
							new ModuleBlockedError({ ModuleName: Request }),
						),
					);

				// Safe, sandboxed shims.
				case "os":
				case "node:os":
					return OsShim;

				case "crypto":
				case "node:crypto":
					return CryptoShim;

				case "process":
				case "node:process":
					return ProcessShim;

				// Any other module is considered not shimmed and will fail.
				default:
					return yield* _(
						Effect.fail(
							new ModuleNotShimmedError({ ModuleName: Request }),
						),
					);
			}
		});

	const ServiceImplementation: Context.Tag.Service<any> = {
		Load,
	};

	return ServiceImplementation;
});
