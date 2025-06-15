/**
 * @module Cocoon
 * @description The main entry point for the Cocoon Node.js extension host.
 */

import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

import CoreServiceLayer from "./Core.js";
import ExtensionHostService from "./Core/ExtensionHost/Service.js";
import RequireInterceptorService from "./Core/RequireInterceptor/Service.js";
import RunProcessPatch from "./PatchProcess.js";
import AllServiceLayer from "./Service.js";
import InitDataLayer from "./Service/InitData/Live.js";
import type IPCConfigurationService from "./Service/IPC/Configuration.js";
import IPCService from "./Service/IPC/Service.js";

// --- Pre-initialization Steps ---
const VSCodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutputDirectory);

// --- Application Logic ---

/**
 * An Effect that represents the full initialization of all services *after*
 * the handshake with Mountain is complete and the init data has been received.
 */
const FullApplicationInitialization = Effect.gen(function* () {
	const Interceptor = yield* RequireInterceptorService;
	yield* Interceptor.Install();
	yield* Effect.logInfo("Node.js require() interceptor installed.");

	const Host = yield* ExtensionHostService;
	yield* Host.ActivateById(
		"*" as any, // This is a placeholder for VS Code's "star activation"
		{
			startup: true,
			activationEvent: "*",
		} as any,
	);

	yield* Effect.logInfo("Startup extensions activated.");
});

/**
 * The main application workflow, described as a single declarative Effect.
 */
const Main = Effect.gen(function* () {
	const InitializationBarrier = yield* Deferred.make<void, never>();

	yield* RunProcessPatch;

	const IPC = yield* IPCService;

	IPC.RegisterInvokeHandler(
		"initExtensionHost",
		(InitializationData: IExtensionHostInitData) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(
					"Received 'initExtensionHost' data from Mountain.",
				);

				// Compose the final application layer, providing the received init data.
				const ApplicationLayer = AllServiceLayer(
					ApplicationConfiguration,
				).pipe(
					Layer.provide(CoreServiceLayer),
					Layer.provide(InitDataLayer(InitializationData)),
				);

				yield* Effect.provide(
					FullApplicationInitialization,
					ApplicationLayer,
				);

				yield* Deferred.succeed(InitializationBarrier, undefined);
				return "initialized";
			}).pipe(Effect.runPromise),
	);

	yield* IPC.SendNotification("$initialHandshake", []);
	yield* Effect.logInfo("Cocoon is ready. Sent handshake to Mountain.");

	yield* Deferred.await(InitializationBarrier);
	yield* Effect.logInfo("Cocoon is fully initialized and operational.");

	yield* Effect.never;
}).pipe(
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
);

// --- Application Layer Composition ---

const ApplicationConfiguration: IPCConfigurationService = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] || "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] || "localhost:50052",
};

// This layer contains all services needed before the handshake.
// After the handshake, a more complete layer including InitData is created.
const PreInitLayer = Layer.mergeAll(
	CoreServiceLayer,
	AllServiceLayer(ApplicationConfiguration),
);

// --- Run the Application ---

const RunnableApplication = Effect.provide(Main, PreInitLayer);

NodeRuntime.runMain(RunnableApplication);
