/*
 * File: Cocoon/Source/Core/RequireInterceptor/Definition.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:39 UTC
 * Dependency: ../../Service/Log/Service.js, ../APIFactory/Service.js, ../ExtensionPath/Service.js, ../NodeModuleShim/Service.js, ./Factory/Interface.js, ./Factory/VSCode.js, ./Service.js, effect, node:module, vs/base/common/uri.js, vscode
 */

/**
 * @module Definition (RequireInterceptor)
 * @description The live implementation of the RequireInterceptor service. It
 * patches Node.js's `require` function to intercept module loads.
 */

import * as Module from "node:module";
import { Cause, Effect, Exit } from "effect";
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
export default Effect.gen(function* (G) {
	const APIFactory = yield* G(APIFactoryService);
	const ExtensionPath = yield* G(ExtensionPathService);
	const Log = yield* G(LogService);
	const NodeModuleShim = yield* G(NodeModuleShimService);

	const Factories = new Map<string, INodeModuleFactory>([
		["vscode", new VSCodeNodeModuleFactory(APIFactory, ExtensionPath, Log)],
	]);

	const OriginalRequire = Module.prototype.require;
	let IsInstalled = false;

	const InstallEffect = () =>
		Effect.gen(function* (G) {
			if (IsInstalled) {
				return;
			}

			yield* G(
				Effect.sync(() => {
					(Module.prototype as any).require = function (
						this: NodeModule,
						Request: string,
					): any {
						const Factory = Factories.get(Request);
						if (Factory) {
							const ParentURI = this.filename
								? URI.file(this.filename)
								: URI.parse("unknown:/unknown");
							return Factory.Load(
								Request,
								ParentURI as Uri,
								(Req) => OriginalRequire.call(this, Req),
							);
						}

						if (Module.builtinModules.includes(Request)) {
							const ParentURI = this.filename
								? URI.file(this.filename)
								: URI.parse("unknown:/unknown");
							const ShimResult = NodeModuleShim.Load(
								Request,
								ParentURI as Uri,
							);

							if (Exit.isSuccess(ShimResult)) {
								return ShimResult.value;
							} else {
								throw Cause.squash(ShimResult.cause);
							}
						}
						return OriginalRequire.call(this, Request);
					};
					IsInstalled = true;
				}),
			);

			yield* G(
				Log.Info(
					"Node.js require() interceptor has been successfully installed.",
				),
			);
		});

	const RequireInterceptorImplementation: Service["Type"] = {
		Install: InstallEffect,
	};

	return RequireInterceptorImplementation;
});
