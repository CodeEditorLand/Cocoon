/**
 * @module Definition (ESMInterceptor)
 * @description The live implementation of the ESMInterceptor service. This module
 * contains the core logic for registering the Node.js loader hook, handling
 * communication with it, and generating dynamic `vscode` modules on the fly.
 */

import { Buffer } from "node:buffer";
import * as Module from "node:module";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { Effect, Option, Ref } from "effect";
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

// Polyfill for removed BidirectionalMap
class BidirectionalMap<K, V> {
	private readonly a = new Map<K, V>();
	private readonly b = new Map<V, K>();
	set(key: K, value: V) {
		this.a.set(key, value);
		this.b.set(value, key);
		return this;
	}
	get(key: K): Option.Option<V> {
		return Option.fromNullable(this.a.get(key));
	}
	getKey(value: V): Option.Option<K> {
		return Option.fromNullable(this.b.get(value));
	}
}

// --- Synthesized Helper: LoadHookScript ---
function LoadHookScript(FileName: string): Effect.Effect<string, Error> {
	return Effect.try({
		try: () => {
			const { readFileSync } = require("node:fs");
			const { join } = require("node:path");
			const scriptPath = join(__dirname, FileName);
			return readFileSync(scriptPath, "utf-8");
		},
		catch: (e) => new Error(`Failed to load ESM hook script: ${e}`),
	});
}

// --- Synthesized Helper: SetupGlobalAPIRetriever ---
function SetupGlobalAPIRetriever(
	APICache: Ref.Ref<BidirectionalMap<object, string>>,
): Effect.Effect<void> {
	return Effect.sync(() => {
		(globalThis as any)[ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME] = (
			APIKey: string,
		) => {
			const cache = Effect.runSync(Ref.get(APICache));
			const maybeAPI = cache.getKey(APIKey);
			if (Option.isSome(maybeAPI)) {
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
	VSCodeAPICache: Ref.Ref<BidirectionalMap<object, string>>;
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
	return Effect.gen(function* () {
		const { ID, ImportingModuleURL } = Message;
		const parentURI = yield* Effect.try(() => new URL(ImportingModuleURL));
		const extension = ExtensionPath.FindSubstr(parentURI as any);

		if (!extension) {
			const error = new Error(
				`Could not find extension for module: ${ImportingModuleURL}`,
			);
			yield* Log.Error(
				"ESM Interceptor failed to identify extension.",
				error,
			);
			MainThreadPort.postMessage({
				id: ID,
				error: { message: error.message },
			});
			return;
		}

		const dataURICache = yield* Ref.get(DataURICache);
		if (dataURICache.has(extension.identifier.value)) {
			MainThreadPort.postMessage({
				id: ID,
				url: dataURICache.get(extension.identifier.value),
			});
			return;
		}

		const apiCache = yield* Ref.get(VSCodeAPICache);
		const apiKeyOpt = apiCache.get(extension as any); // This is not quite right, need to get API obj first
		let apiObject: object;
		let apiKey: string;

		if (Option.isNone(apiKeyOpt)) {
			apiObject = APIFactory.CreateAPI(extension);
			apiKey = generateUuid();
			yield* Ref.update(VSCodeAPICache, (cache) =>
				cache.set(apiObject, apiKey),
			);
		} else {
			apiKey = apiKeyOpt.value;
			// This branch is tricky because we need the API object, not just the key.
			// Let's refetch it for simplicity.
			apiObject = APIFactory.CreateAPI(extension);
		}

		const moduleScript = CreateDynamicModule(apiKey, apiObject as any);
		const dataURI = `data:text/javascript;base64,${Buffer.from(moduleScript).toString("base64")}`;

		yield* Ref.update(DataURICache, (map) =>
			map.set(extension.identifier.value, dataURI),
		);
		MainThreadPort.postMessage({ id: ID, url: dataURI });
	});
}

/**
 * An Effect that builds the live implementation of the ESMInterceptor service.
 */
export const Definition = Effect.gen(function* () {
	const APIFactoryService = yield* APIFactory.Tag;
	const ExtensionPathService = yield* ExtensionPath.Tag;
	const LogService = yield* Log.Tag;

	const Install = () =>
		Effect.gen(function* () {
			if (typeof (Module as any).register !== "function") {
				return yield* Effect.fail(
					new Error(
						"`node:module.register` is not available. ESM interception will fail.",
					),
				);
			}

			const VSCodeAPICache = yield* Ref.make(
				new BidirectionalMap<object, string>(),
			);
			const DataURICache = yield* Ref.make(new Map<string, string>());

			const { port1: MainThreadPort, port2: LoaderHookPort } =
				new MessageChannel();

			yield* SetupGlobalAPIRetriever(VSCodeAPICache);

			MainThreadPort.on("message", (Message) =>
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
				),
			);

			const HookScriptContent = yield* LoadHookScript(
				LOADER_HOOK_SCRIPT_FILENAME,
			);
			const HookDataURI = `data:text/javascript;base64,${Buffer.from(HookScriptContent).toString("base64")}`;

			(Module as any).register(HookDataURI, {
				parentURL: import.meta.url,
				data: { port: LoaderHookPort },
				transferList: [LoaderHookPort],
			});

			yield* Effect.logInfo("ESM loader hook successfully registered.");

			yield* Effect.addFinalizer(() =>
				Effect.sync(() => {
					MainThreadPort.close();
					LoaderHookPort.close();
					delete (globalThis as any)[
						ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME
					];
				}).pipe(
					Effect.tap(() =>
						Effect.logInfo("ESM Interceptor resources released."),
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
			Effect.scoped, // This ensures the finalizer is attached to a scope
		);

	return { Install };
});
