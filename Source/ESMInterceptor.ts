/**
 * @module ESMInterceptor
 * @description Defines the service for setting up the Node.js loader hook to
 * intercept `import 'vscode'` statements and provide a sandboxed API module.
 */

import { Effect } from "effect";
import { APIFactoryService } from "./APIFactory.js";
import { ExtensionPathService } from "./ExtensionPath.js";
import { LoggerService } from "./Logger.js";

/**
 * @interface ESMInterceptor
 * @description The contract for the ESMInterceptor service.
 */
export interface ESMInterceptor {
	/**
	 * An `Effect` that, when executed, installs the ESM loader hook
	 * and handles the cleanup of all associated resources.
	 */
	readonly Install: () => Effect.Effect<void, Error>;
}

/**
 * @class ESMInterceptorService
 * @description The `Effect.Service` for the `ESMInterceptor`.
 */
export class ESMInterceptorService extends Effect.Service<ESMInterceptorService>()(
	"Service/ESMInterceptor",
	{
		effect: Effect.gen(function* () {
			// This service is complex and depends on Node.js-specific APIs (`node:module.register`).
			// The implementation from `OldCocoon` is highly specific and should be synthesized
			// if a full implementation is required. For now, this provides a stubbed `Install`
			// method to satisfy the contract and resolve type errors.
			yield* APIFactoryService;
			yield* ExtensionPathService;
			const Logger = yield* LoggerService;

			const Install = (): Effect.Effect<void, Error> =>
				Effect.gen(function* () {
					yield* Logger.Warn(
						"ESMInterceptor.Install is a stub and has no effect.",
					);
				});

			return { Install };
		}),
	},
) {}
