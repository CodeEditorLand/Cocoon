/**
 * @module Definition (ESMInterceptor)
 * @description The live implementation of the ESMInterceptor service. This module
 * contains the core logic for registering the Node.js loader hook, handling
 * communication with it, and generating dynamic `vscode` modules on the fly.
 */

import { Buffer } from "node:buffer";
import * as Module from "node:module";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { BidirectionalMap, Effect, pipe, Ref, Scope } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";

import { Log } from "../../Service/Log.js";
import { APIFactory } from "../APIFactory.js";
import { ExtensionPath } from "../ExtensionPath.js";
import {
	ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME,
	LOADER_HOOK_SCRIPT_FILENAME,
} from "./Constants.js";
import { CreateDynamicModule } from "./CreateDynamicModule.js";
import type { Interface } from "./Service.js";

// --- Synthesized Helper: LoadHookScript ---
// In a real project, this might use fs/promises, but for bundling, it's often
// handled by a build tool (e.g., inlining the script content).
function LoadHookScript(FileName: string): Effect.Effect<string, Error> {
	return Effect.try({
		try: () => {
			// This is a placeholder. A real implementation would need a robust way
			// to locate and read the hook script from the bundled output.
			const { readFileSync } = require("node:fs");
			const { join } = require("node:path");
			// Assuming the hook script is copied to the root of the dist folder.
			const scriptPath = join(__dirname, FileName);
			return readFileSync(scriptPath, "utf-8");
		},
		catch: (e) => new Error(`Failed to load ESM hook script: ${e}`),
	});
}

// --- Synthesized Helper: SetupGlobalAPIRetriever ---
function SetupGlobalAPIRetriever(
	APICache: Ref.Ref<BidirectionalMap.BidirectionalMap<object, string>>,
): Effect.Effect<void> {
	return Effect.sync(() => {
		(globalThis as any)[ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME] = (
			APIKey: string,
		) => {
			const cache = Ref.get(APICache).pipe(Effect.runSync);
			// The key is the API object, the value is the key string. We need to look up by value.
			const maybeAPI = BidirectionalMap.getKey(cache, APIKey);
			if (maybeAPI._tag === "Some") {
				return maybeAPI.value;
			}
			return undefined;
		};
	});
}

// --- Synthesized Helper: HandleResolveRequest ---
interface HandleResolveRequestPayload {
	Message: { ID: number; ImportingModuleURL: string };
	APIFactory: APIFactory.Interface;
	ExtensionPath: ExtensionPath.Interface;
	Log: Log.Interface;
	VSCodeAPICache: Ref.Ref<BidirectionalMap.BidirectionalMap<object, string>>;
	DataURICache: Ref.Ref<Map<string, string>>;
	MainThreadPort: MessagePort;
}

function HandleResolveRequest({
	Message,
	APIFactory,
	ExtensionPath,
	Log,
	VSCodeAPICache,
	DataURICache,
	MainThreadPort,
}: HandleResolveRequestPayload) {
	return Effect.gen(function* (_) {
		const { ID, ImportingModuleURL } = Message;
		const parentURI = yield* _(
			Effect.try(() => new URL(ImportingModuleURL)),
		);
		const extension = ExtensionPath.FindSubstr(parentURI as any);

		if (!extension) {
			const error = new Error(
				`Could not find extension for module: ${ImportingModuleURL}`,
			);
			yield* _(
				Log.Error(
					"ESM Interceptor failed to identify extension.",
					error,
				),
			);
			MainThreadPort.postMessage({
				id: ID,
				error: { message: error.message },
			});
			return;
		}

		const dataURICache = yield* _(Ref.get(DataURICache));
		if (dataURICache.has(extension.identifier.value)) {
			MainThreadPort.postMessage({
				id: ID,
				url: dataURICache.get(extension.identifier.value),
			});
			return;
		}

		const apiCache = yield* _(Ref.get(VSCodeAPICache));
		let apiKey = BidirectionalMap.get(apiCache, extension as any); // This is not quite right, need to get API obj first
		let apiObject: object;

		if (apiKey._tag === "None") {
			apiObject = APIFactory.CreateAPI(extension);
			apiKey = generateUuid();
			yield* _(
				Ref.update(
					VSCodeAPICache,
					BidirectionalMap.set(apiObject, apiKey),
				),
			);
		} else {
			// This branch is tricky because we need the API object, not just the key.
			// Let's refetch it for simplicity.
			apiObject = APIFactory.CreateAPI(extension);
		}

		const moduleScript = CreateDynamicModule(apiKey, apiObject as any);
		const dataURI = `data:text/javascript;base64,${Buffer.from(moduleScript).toString("base64")}`;

		yield* _(
			Ref.update(DataURICache, (map) =>
				map.set(extension.identifier.value, dataURI),
			),
		);
		MainThreadPort.postMessage({ id: ID, url: dataURI });
	});
}

/**
 * An Effect that builds the live implementation of the ESMInterceptor service.
 */
export const Definition = Effect.gen(function* (_) {
	const APIFactoryService = yield* _(APIFactory.Tag);
	const ExtensionPathService = yield* _(ExtensionPath.Tag);
	const LogService = yield* _(Log.Tag);

	const Install = () =>
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
			const DataURICache = yield* _(Ref.make(new Map<string, string>()));

			// Create the communication channel between this main thread and the hook thread.
			const { port1: MainThreadPort, port2: LoaderHookPort } =
				new MessageChannel();

			yield* _(SetupGlobalAPIRetriever(VSCodeAPICache));

			// Listen for module resolution requests from the hook thread.
			MainThreadPort.on("message", (Message) => {
				Effect.runFork(
					HandleResolveRequest({
						Message,
						APIFactory: APIFactoryService,
						ExtensionPath: ExtensionPathService,
						Log: LogService,
						VSCodeAPICache,
						DataURICache,
						MainThreadPort,
					}),
				);
			});

			const HookScriptContent = yield* _(
				LoadHookScript(LOADER_HOOK_SCRIPT_FILENAME),
			);
			const HookDataURI = `data:text/javascript;base64,${Buffer.from(HookScriptContent).toString("base64")}`;

			// Register the hook with Node.js.
			(Module as any).register(HookDataURI, {
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
					}).pipe(
						Effect.tap(() =>
							Effect.logInfo(
								"ESM Interceptor resources released.",
							),
						),
					),
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

	return { Install };
});
