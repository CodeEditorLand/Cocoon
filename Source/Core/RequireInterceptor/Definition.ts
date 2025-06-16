/**
 * @module Definition (RequireInterceptor)
 * @description The live implementation of the RequireInterceptor service. It
 * patches Node.js's `require` function to intercept module loads.
 */

import * as Module from "node:module";
import { Effect } from "effect";
import { URI } from "vs/base/common/uri.js";
import type { Uri } from "vscode";

import LogService from "../../Service/Log/Service.js";
import APIFactoryService from "../APIFactory/Service.js";
import ExtensionPathService from "../ExtensionPath/Service.js";
import NodeModuleShimService from "../NodeModuleShim/Service.js";
import type INodeModuleFactory from "./Factory/Interface.js";
import VSCodeNodeModuleFactory from "./Factory/VSCode.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the RequireInterceptor service.
 */
export default Effect.gen(function* () {
	const APIFactory = yield* APIFactoryService;
	const ExtensionPath = yield* ExtensionPathService;
	const Log = yield* LogService;
	const NodeModuleShim = yield* NodeModuleShimService;

	const Factories = new Map<string, INodeModuleFactory>([
		["vscode", new VSCodeNodeModuleFactory(APIFactory, ExtensionPath, Log)],
		// Other factories for modules like 'open' or 'electron' would be added here.
	]);

	// Store the original require function before we patch it.
	const OriginalRequire = Module.prototype.require;
	let IsInstalled = false;

	const Install = () =>
		Effect.gen(function* () {
			if (IsInstalled) {
				return;
			}

			yield* Effect.sync(() => {
				(Module.prototype as any).require = function (
					this: NodeModule,
					Request: string,
				): any {
					// If a factory exists for the requested module, use it.
					const Factory = Factories.get(Request);
					if (Factory) {
						const ParentURI = this.filename
							? URI.file(this.filename)
							: URI.parse("unknown:/unknown");

						return Factory.Load(Request, ParentURI as Uri, (Req) =>
							OriginalRequire.call(this, Req),
						);
					}

					// If it's a built-in Node module, attempt to load a shim.
					if (Module.builtinModules.includes(Request)) {
						const ParentURI = this.filename
							? URI.file(this.filename)
							: URI.parse("unknown:/unknown");

						// The shim loader is effectful, but `require` is sync. We must run it synchronously.
						const ShimResult = Effect.runSyncExit(
							NodeModuleShim.Load(Request, ParentURI as Uri),
						);

						if (ShimResult._tag === "Success") {
							return ShimResult.value;
						} else {
							// FIX: To properly re-throw with the original Cause, we must
							// wrap the cause in `Effect.failCause` and then run that.
							throw Effect.runSync(
								Effect.failCause(ShimResult.cause),
							);
						}
					}

					// For any other module, delegate to the original `require`.
					return OriginalRequire.call(this, Request);
				};

				IsInstalled = true;
			});

			yield* Log.Info(
				"Node.js require() interceptor has been successfully installed.",
			);
		});

	const RequireInterceptorImplementation: Service["Type"] = {
		Install,
	};

	return RequireInterceptorImplementation;
});
