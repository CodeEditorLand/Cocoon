/**
 * @module Definition (RequireInterceptor)
 * @description The live implementation of the RequireInterceptor service. It
 * patches Node.js's `require` function to intercept module loads.
 */

import * as Module from "node:module";
import { Effect } from "effect";
import { URI } from "vs/base/common/uri.js";

import { Log } from "../../Service/Log.js";
import { APIFactory } from "../APIFactory.js";
import { ExtensionPath } from "../ExtensionPath.js";
import { VscodeNodeModuleFactory, type INodeModuleFactory } from "./Factory.js";
import type { Interface } from "./Service.js";

/**
 * An Effect that builds the live implementation of the RequireInterceptor service.
 */
export const Definition = Effect.gen(function* (_) {
	const APIFactoryService = yield* _(APIFactory.Tag);
	const ExtensionPathService = yield* _(ExtensionPath.Tag);
	const LogService = yield* _(Log.Tag);

	const Factories = new Map<string, INodeModuleFactory>();
	Factories.set(
		"vscode",
		new VscodeNodeModuleFactory(
			APIFactoryService,
			ExtensionPathService,
			LogService,
		),
	);
	// Other factories, e.g., for 'open', 'electron', would be registered here.

	// Store the original require function before we patch it.
	const OriginalRequire = Module.prototype.require;
	let isInstalled = false;

	const Install = () =>
		Effect.sync(() => {
			if (isInstalled) {
				return;
			}

			Module.prototype.require = function (
				this: NodeModule,
				Request: string,
			): any {
				const Factory = Factories.get(Request);
				if (Factory) {
					// If a filename is not available, we can't identify the extension.
					// We'll create a dummy URI, and the factory will handle the fallback.
					const ParentURI = this.filename
						? URI.file(this.filename)
						: URI.parse("unknown:/unknown");

					return Factory.Load(Request, ParentURI, (req) =>
						OriginalRequire.call(this, req),
					);
				}
				// For any other module, delegate to the original `require`.
				return OriginalRequire.call(this, Request);
			};

			isInstalled = true;
			LogService.Info(
				"Node.js require() interceptor has been successfully installed.",
			);
		});

	const ServiceImplementation: Interface = {
		Install,
	};

	return ServiceImplementation;
});
