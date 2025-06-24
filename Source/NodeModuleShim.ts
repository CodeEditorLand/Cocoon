/**
 * @module NodeModuleShim
 * @description Defines the service for intercepting requests for built-in Node.js
 * modules. It provides safe, sandboxed shims for allowed modules (like `os` and
 * `crypto`) and explicitly blocks access to modules that could compromise host
 * stability or security (like `fs` and `child_process`).
 */

import { Effect, Exit } from "effect";
import type { Uri } from "vscode";
import { InitDataService } from "./InitData.js";
import { LoggerService } from "./Logger.js";
import { ModuleBlockedProblem } from "./NodeModuleShim/ModuleBlockedProblem.js";
import { ModuleNotShimmedProblem } from "./NodeModuleShim/ModuleNotShimmedProblem.js";
import { CreateCryptoShim } from "./NodeModuleShim/Crypto.js";
import { CreateOsShim } from "./NodeModuleShim/Os.js";
import { ProcessShim } from "./NodeModuleShim/Process.js";

/**
 * @interface NodeModuleShim
 * @description The contract for the NodeModuleShim service.
 */
export interface NodeModuleShim {
	/**
	 * Loads a shim for a requested built-in Node.js module.
	 * @param Request The name of the module being required (e.g., 'os').
	 * @param ParentUri The URI of the module making the `require` call.
	 * @returns An `Exit` value that is either a `Success` containing the shim
	 * or a `Failure` with a `ModuleBlockedProblem` or `ModuleNotShimmedProblem`.
	 */
	readonly Load: (
		Request: string,
		ParentUri?: Uri,
	) => Exit.Exit<any, ModuleBlockedProblem | ModuleNotShimmedProblem>;
}

/**
 * @class NodeModuleShim
 * @description The `Effect.Service` for providing sandboxed shims for Node.js modules.
 */
export class NodeModuleShimService extends Effect.Service<NodeModuleShimService>()(
	"Service/NodeModuleShim",
	{
		effect: Effect.gen(function* () {
			const Logger = yield* LoggerService;
			const InitData = yield* InitDataService;

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

			const Load = (
				Request: string,
				ParentUri?: Uri,
			): Exit.Exit<
				any,
				ModuleBlockedProblem | ModuleNotShimmedProblem
			> => {
				const RequesterPath = ParentUri?.fsPath || "unknown module";
				Effect.runFork(
					Logger.Trace(
						`Intercepted require('${Request}') from '${RequesterPath}'.`,
					),
				);
				if (BlockedModules.has(Request)) {
					return Exit.fail(
						new ModuleBlockedProblem({ ModuleName: Request }),
					);
				}
				const Shim = Shims.get(Request);
				if (Shim) {
					return Exit.succeed(Shim);
				}
				return Exit.fail(
					new ModuleNotShimmedProblem({ ModuleName: Request }),
				);
			};

			return { Load };
		}),
	},
) {}
