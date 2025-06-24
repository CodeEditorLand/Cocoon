/**
 * @module RequireInterceptor
 * @description Defines the service for patching Node.js's `require` function.
 * This interception is critical for providing sandboxed APIs like the `vscode`
 * module to extensions, ensuring each extension receives its own isolated API instance.
 */

import { Cause, Effect, Exit } from "effect";
import * as Module from "node:module";
import { URI } from "vs/base/common/uri.js";
import type { Uri } from "vscode";
import { APIFactory } from "./APIFactory.js";
import { ExtensionPath } from "./ExtensionPath.js";
import { NodeModuleShim } from "./NodeModuleShim.js";
import { Logger } from "./Logger.js";

/**
 * @interface NodeModuleFactory
 * @description The interface for a factory that can produce a module when
 * `require(Request)` is called by an extension.
 */
interface NodeModuleFactory {
	/**
	 * Loads or creates a module instance.
	 * @param Request The exact string passed to `require` (e.g., 'vscode').
	 * @param ParentUri The URI of the module making the `require` call.
	 * @returns The module object to be returned by the patched `require`.
	 */
	Load(Request: string, ParentUri: Uri): any;
}

/**
 * @class VsCodeNodeModuleFactory
 * @description A factory that creates the `vscode` API object for a specific extension.
 * @implements {NodeModuleFactory}
 */
class VsCodeNodeModuleFactory implements NodeModuleFactory {
	constructor(
		private readonly APIFactoryService: APIFactory,
		private readonly ExtensionPathService: ExtensionPath,
		private readonly LogService: Logger,
	) {}

	public Load(_Request: "vscode", ParentUri: Uri): any {
		const Extension = this.ExtensionPathService.FindSubstr(ParentUri);
		if (Extension) {
			return this.APIFactoryService.CreateAPI(Extension);
		}
		const ErrorMessage = `FATAL: require('vscode') was called from an unknown location: ${ParentUri.fsPath}. Could not determine extension owner.`;
		this.LogService.Error(ErrorMessage);
		throw new Error(
			"[Cocoon] `require('vscode')` may only be called from an extension.",
		);
	}
}

/**
 * @interface RequireInterceptor
 * @description The contract for the RequireInterceptor service.
 */
export interface RequireInterceptor {
	/**
	 * An `Effect` that, when executed, patches the `Module.prototype.require`
	 * function to intercept module loads.
	 */
	readonly Install: () => Effect.Effect<void, never>;
}

/**
 * @class RequireInterceptor
 * @description The `Effect.Service` for the RequireInterceptor.
 */
export class RequireInterceptorService extends Effect.Service<RequireInterceptorService>()(
	"Service/RequireInterceptor",
	{
		effect: Effect.gen(function* () {
			const APIFactoryService = yield* APIFactory;
			const ExtensionPathService = yield* ExtensionPath;
			const LogService = yield* Logger;
			const NodeModuleShimService = yield* NodeModuleShim;

			const Factories = new Map<string, NodeModuleFactory>([
				[
					"vscode",
					new VsCodeNodeModuleFactory(
						APIFactoryService,
						ExtensionPathService,
						LogService,
					),
				],
			]);

			const OriginalRequire = Module.prototype.require;
			let IsInstalled = false;

			const Install = () =>
				Effect.gen(function* () {
					if (IsInstalled) return;

					yield* Effect.sync(() => {
						(Module.prototype as any).require = function (
							this: NodeModule,
							Request: string,
						): any {
							const Factory = Factories.get(Request);
							if (Factory) {
								const ParentUri = this.filename
									? URI.file(this.filename)
									: URI.parse("unknown:/unknown");
								return Factory.Load(Request, ParentUri as Uri);
							}
							if (Module.builtinModules.includes(Request)) {
								const ParentUri = this.filename
									? URI.file(this.filename)
									: URI.parse("unknown:/unknown");
								const ShimResult = NodeModuleShimService.Load(
									Request,
									ParentUri as Uri,
								);
								if (Exit.isSuccess(ShimResult)) {
									return ShimResult.value;
								}
								throw Cause.squash(ShimResult.cause);
							}
							return OriginalRequire.call(this, Request);
						};
						IsInstalled = true;
					});

					yield* LogService.Info(
						"Node.js require() interceptor has been successfully installed.",
					);
				});

			return { Install };
		}),
	},
) {}
