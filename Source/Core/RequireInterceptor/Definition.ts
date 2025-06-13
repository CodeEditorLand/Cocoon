/**
 * @module Definition (RequireInterceptor)
 * @description The live implementation of the RequireInterceptor service.
 */

import * as Module from "node:module";
import { Effect } from "effect";
import { URI } from "vs/base/common/uri.js";

import { Tag as LogTag } from "../../Service/Log.js";
import { Tag as ApiFactoryTag } from "../ApiFactory/mod.js";
import { Tag as ExtensionPathsTag } from "../ExtensionPath/mod.js";
import {
	VscodeNodeModuleFactory,
	type INodeModuleFactory,
} from "./Factory/mod.js";
import { type Interface } from "./Service.js";

/**
 * An Effect that builds the live implementation of the RequireInterceptor service.
 */
export const Definition = Effect.gen(function* (_) {
	const ApiFactory = yield* _(ApiFactoryTag);
	const ExtensionPaths = yield* _(ExtensionPathsTag);
	const Log = yield* _(LogTag);

	const Factories = new Map<string, INodeModuleFactory>();
	Factories.set(
		"vscode",
		new VscodeNodeModuleFactory(ApiFactory, ExtensionPaths, Log),
	);
	// Other factories, e.g., for 'open', would be registered here.

	// Store the original require function before we patch it.
	const OriginalRequire = Module.prototype.require;

	const InstallEffect = () =>
		Effect.sync(() => {
			Module.prototype.require = function (
				this: NodeModule,
				Request: string,
			): any {
				const Factory = Factories.get(Request);
				if (Factory) {
					const ParentUri = this.filename
						? URI.file(this.filename)
						: URI.file("/");
					return Factory.Load(Request, ParentUri, (req) =>
						OriginalRequire.call(this, req),
					);
				}
				return OriginalRequire.call(this, Request);
			};
			Log.Info(
				"Node.js require() interceptor has been successfully installed.",
			);
		});

	const ServiceImplementation: Interface = {
		Install: InstallEffect,
	};

	return ServiceImplementation;
});
