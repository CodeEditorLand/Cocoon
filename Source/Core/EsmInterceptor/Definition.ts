/**
 * @module Definition (EsmInterceptor)
 * @description The live implementation of the EsmInterceptor service.
 */

import { Buffer } from "node:buffer";
import * as Module from "node:module";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { BidirectionalMap, Effect, pipe, Ref, Scope } from "effect";

import { Tag as APIFactoryTag } from "../APIFactory.js";
import { LOADER_HOOK_SCRIPT_FILENAME } from "./Constants.js";
import { HandleResolveRequest } from "./HandleResolveRequest.js";
import { LoadHookScript } from "./LoadHookScript.js";
import type { Interface } from "./Service.js";
import { SetupGlobalAPIRetriever } from "./SetupGlobalAPIRetriever.js";

/**
 * An Effect that builds the live implementation of the EsmInterceptor service.
 */
export const Definition = Effect.gen(function* (_) {
	const APIFactory = yield* _(APIFactoryTag);

	const InstallEffect = () =>
		Effect.gen(function* (_) {
			if (typeof (Module as any).register !== "function") {
				return yield* _(
					Effect.fail(
						new Error(
							"`node:module.register` is not available. ESM interception will fail.",
						),
					),
				);
			}

			const VSCodeAPICache = yield* _(
				Ref.make(BidirectionalMap.empty<object, string>()),
			);
			const DataUriCache = yield* _(Ref.make(new Map<string, string>()));

			// Create the communication channel between this main thread and the hook thread.
			const { port1: MainThreadPort, port2: LoaderHookPort } =
				new MessageChannel();

			yield* _(SetupGlobalAPIRetriever(VSCodeAPICache));

			// Listen for module resolution requests from the hook thread.
			MainThreadPort.on("message", (Message) => {
				Effect.runFork(
					HandleResolveRequest({
						Message,
						APIFactory,
						VSCodeAPICache,
						DataUriCache,
						MainThreadPort,
					}),
				);
			});

			const HookScriptContent = yield* _(
				LoadHookScript(LOADER_HOOK_SCRIPT_FILENAME),
			);
			const HookDataUri = `data:text/javascript;base64,${Buffer.from(HookScriptContent).toString("base64")}`;

			// Register the hook with Node.js.
			(Module as any).register(HookDataUri, {
				parentURL: import.meta.url,
				data: { port: LoaderHookPort },
				transferList: [LoaderHookPort],
			});

			yield* _(
				Effect.logInfo("ESM loader hook successfully registered."),
			);

			// Add a finalizer to the current scope to ensure cleanup on shutdown.
			yield* _(
				Scope.addFinalizer(
					Effect.sync(() => {
						MainThreadPort.close();
						LoaderHookPort.close();
						delete (globalThis as any)[
							ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME
						];
						Effect.logInfo("ESM Interceptor resources released.");
					}),
				),
			);
		}).pipe(
			Effect.catchAll((error) =>
				Effect.logFatal(
					"Critical failure during ESM Interceptor installation.",
					error,
				),
			),
		);

	return { Install: InstallEffect };
});
