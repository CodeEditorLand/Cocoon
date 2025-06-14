/**
 * @module Definition (RequireInterceptor)
 * @description The live implementation of the RequireInterceptor service. It
 * patches Node.js's `require` function to intercept module loads.
 */

import * as Module from "node:module";
import { Context, Effect } from "effect";
import { URI } from "vs/base/common/uri.js";

import LogServiceTag from "../../Service/Log/Service.js";
import APIFactoryServiceTag from "../APIFactory/Service.js";
import ExtensionPathServiceTag from "../ExtensionPath/Service.js";
import type INodeModuleFactory from "./Factory/Interface.js";
import VSCodeNodeModuleFactory from "./Factory/VSCode.js";

/**
 * An Effect that builds the live implementation of the RequireInterceptor service.
 */
export default Effect.gen(function* (_) {
	const APIFactory = yield* _(APIFactoryServiceTag);
	const ExtensionPath = yield* _(ExtensionPathServiceTag);
	const Log = yield* _(LogServiceTag);

	const Factories = new Map<string, INodeModuleFactory>();
	Factories.set(
		"vscode",
		new VSCodeNodeModuleFactory(APIFactory, ExtensionPath, Log),
	);
	// Other factories, e.g., for 'open', 'electron', would be registered here.

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
					This: NodeModule,
					Request: string,
				): any {
					const Factory = Factories.get(Request);
					if (Factory) {
						// If a filename is not available, we can't identify the extension.
						// We'll create a dummy URI, and the factory will handle the fallback.
						const ParentURI = This.filename
							? URI.file(This.filename)
							: URI.parse("unknown:/unknown");

						return Factory.Load(Request, ParentURI, (Req) =>
							OriginalRequire.call(This, Req),
						);
					}
					// For any other module, delegate to the original `require`.
					return OriginalRequire.call(This, Request);
				};

				IsInstalled = true;
			});

			yield* Log.Info(
				"Node.js require() interceptor has been successfully installed.",
			);
		});

	const ServiceImplementation: Context.Tag.Service<any> = {
		Install,
	};

	return ServiceImplementation;
});
