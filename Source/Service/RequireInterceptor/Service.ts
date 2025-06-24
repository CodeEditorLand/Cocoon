/*
 * File: Cocoon/Source/Service/RequireInterceptor/Service.ts
 * Role: Defines the RequireInterceptor service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Patch Node.js's `require` to provide sandboxed APIs like 'vscode' to extensions.
 */

import { Cause, Effect, Exit } from "effect";
import * as Module from "node:module";
import { URI } from "vs/base/common/uri.js";
import type { Uri } from "vscode";

import { APIFactory } from "../APIFactory/Service.js";
import { ExtensionPath } from "../ExtensionPath/Service.js";
import { NodeModuleShim } from "../NodeModuleShim/Service.js";
import { Logger } from "../Log/Service.js";

// --- Internal Module Factory Logic ---
interface INodeModuleFactory {
	Load(
		Request: string,
		ParentURI: Uri,
		OriginalRequire: (request: string) => any,
	): any;
}

class VSCodeNodeModuleFactory implements INodeModuleFactory {
	constructor(
		private readonly APIFactoryService: APIFactory,
		private readonly ExtensionPathService: ExtensionPath,
		private readonly LogService: Logger,
	) {}

	public Load(_Request: "vscode", ParentURI: Uri): any {
		const Extension = this.ExtensionPathService.FindSubstr(ParentURI);
		if (Extension) {
			return this.APIFactoryService.CreateAPI(Extension);
		}
		const ErrorMessage = `FATAL: require('vscode') was called from an unknown location: ${ParentURI.fsPath}. Could not determine extension owner.`;
		this.LogService.Error(ErrorMessage);
		throw new Error(
			"[Cocoon] `require('vscode')` may only be called from an extension.",
		);
	}
}

// --- Service Definition ---
export class RequireInterceptor extends Effect.Service<RequireInterceptor>()(
	"Service/RequireInterceptor",
	{
		effect: Effect.gen(function* (Generator) {
			const APIFactoryService = yield* Generator(APIFactory);
			const ExtensionPathService = yield* Generator(ExtensionPath);
			const LogService = yield* Generator(Logger);
			const NodeModuleShimService = yield* Generator(NodeModuleShim);

			const Factories = new Map<string, INodeModuleFactory>([
				[
					"vscode",
					new VSCodeNodeModuleFactory(
						APIFactoryService,
						ExtensionPathService,
						LogService,
					),
				],
			]);

			const OriginalRequire = Module.prototype.require;
			let IsInstalled = false;

			const InstallEffect = () =>
				Effect.gen(function* (Generator) {
					if (IsInstalled) return;

					yield* Generator(
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
										(Req) =>
											OriginalRequire.call(this, Req),
									);
								}

								if (Module.builtinModules.includes(Request)) {
									const ParentURI = this.filename
										? URI.file(this.filename)
										: URI.parse("unknown:/unknown");
									const ShimResult =
										NodeModuleShimService.Load(
											Request,
											ParentURI as Uri,
										);
									if (Exit.isSuccess(ShimResult)) {
										return ShimResult.value;
									}
									throw Cause.squash(ShimResult.cause);
								}

								return OriginalRequire.call(this, Request);
							};
							IsInstalled = true;
						}),
					);

					yield* Generator(
						LogService.Info(
							"Node.js require() interceptor has been successfully installed.",
						),
					);
				});

			return { Install: InstallEffect };
		}),
	},
) {}
