/**
 * @module Definition (ESMInterceptor)
 * @description The live implementation of the ESMInterceptor service. This module
 * contains the core logic for registering the Node.js loader hook, handling
 * communication with it, and generating dynamic `vscode` modules on the fly.
 */

import { Buffer } from "node:buffer";
import * as Module from "node:module";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { Effect, Option, Ref, Scope } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type * as VSCode from "vscode";

import LogService from "../../Service/Log/Service.js";
import APIFactoryService from "../APIFactory/Service.js";
import ExtensionPathService from "../ExtensionPath/Service.js";
import {
	ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME,
	LOADER_HOOK_SCRIPT_FILENAME,
} from "./Constants.js";
import CreateDynamicModule from "./CreateDynamicModule.js";
import type Service from "./Service.js";

// A bidirectional map to associate API objects with their unique keys.
class BidirectionalMap<K, V> {
	private readonly A = new Map<K, V>();
	private readonly B = new Map<V, K>();
	set(Key: K, Value: V) {
		this.A.set(Key, Value);
		this.B.set(Value, Key);
		return this;
	}
	get(Key: K): Option.Option<V> {
		return Option.fromNullable(this.A.get(Key));
	}
	getKey(Value: V): Option.Option<K> {
		return Option.fromNullable(this.B.get(Value));
	}
}

// Effect-fully loads the loader hook script from disk.
const LoadHookScript = (FileName: string): Effect.Effect<string, Error> => {
	return Effect.try({
		try: () => {
			const { readFileSync } = require("node:fs");
			const { join } = require("node:path");
			const ScriptPath = join(__dirname, FileName);
			return readFileSync(ScriptPath, "utf-8");
		},
		catch: (CaughtError) =>
			new Error(`Failed to load ESM hook script: ${CaughtError}`),
	});
};

// Sets up the global function that the dynamic module will call to get its API instance.
const SetupGlobalAPIRetriever = (
	APICache: Ref.Ref<BidirectionalMap<object, string>>,
): Effect.Effect<void> => {
	return Effect.sync(() => {
		(globalThis as any)[ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME] = (
			APIKey: string,
		) => {
			const Cache = Effect.runSync(Ref.get(APICache));
			const MaybeAPI = Cache.getKey(APIKey);
			if (Option.isSome(MaybeAPI)) {
				return MaybeAPI.value;
			}
			return undefined;
		};
	});
};

// An Effect that handles a single resolution request from the loader thread.
const HandleResolveRequest = (
	Message: { readonly ID: number; readonly ImportingModuleURL: string },
	APIFactory: APIFactoryService,
	ExtensionPath: ExtensionPathService,
	Log: LogService,
	VSCodeAPICache: Ref.Ref<BidirectionalMap<object, string>>,
	DataURICache: Ref.Ref<Map<string, string>>,
	MainThreadPort: MessagePort,
) => {
	return Effect.gen(function* () {
		const { ID, ImportingModuleURL } = Message;
		const ParentURI = yield* Effect.try({
			try: () => new URL(ImportingModuleURL),
			catch: (CaughtError) => new Error(`Invalid URL: ${CaughtError}`),
		});
		const MaybeExtension = ExtensionPath.FindSubstr(ParentURI as any);

		if (!MaybeExtension) {
			const Error = new Error(
				`Could not find extension for module: ${ImportingModuleURL}`,
			);
			yield* Log.Error(
				"ESM Interceptor failed to identify extension.",
				Error,
			);
			MainThreadPort.postMessage({
				id: ID,
				error: { message: Error.message },
			});
			return;
		}

		const DataURICacheValue = yield* Ref.get(DataURICache);
		const CachedDataURI = DataURICacheValue.get(
			MaybeExtension.identifier.value,
		);
		if (CachedDataURI) {
			MainThreadPort.postMessage({ id: ID, url: CachedDataURI });
			return;
		}

		const APIObject = APIFactory.CreateAPI(MaybeExtension);
		const APIKey = generateUuid();
		yield* Ref.update(VSCodeAPICache, (Cache) =>
			Cache.set(APIObject, APIKey),
		);

		const ModuleScript = CreateDynamicModule(
			APIKey,
			APIObject as typeof VSCode,
		);
		const DataURI = `data:text/javascript;base64,${Buffer.from(ModuleScript).toString("base64")}`;

		yield* Ref.update(DataURICache, (Map) =>
			Map.set(MaybeExtension.identifier.value, DataURI),
		);
		MainThreadPort.postMessage({ id: ID, url: DataURI });
	});
};

/**
 * An Effect that builds the live implementation of the ESMInterceptor service.
 */
export default Effect.gen(function* () {
	const APIFactory = yield* APIFactoryService;
	const ExtensionPath = yield* ExtensionPathService;
	const Log = yield* LogService;

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
					HandleResolveRequest(
						Message,
						APIFactory,
						ExtensionPath,
						Log,
						VSCodeAPICache,
						DataURICache,
						MainThreadPort,
					),
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

			yield* Log.Info("ESM loader hook successfully registered.");

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
			Effect.catchAll((Error) =>
				Effect.logFatal(
					"Critical failure during ESM Interceptor installation.",
					Error,
				),
			),
			Effect.scoped, // Ensures the finalizer is attached to a scope
		);

	const ESMInterceptorImplementation: Service = { Install };
	return ESMInterceptorImplementation;
});
