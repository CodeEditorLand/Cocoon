/**
 * @module Cocoon
 * @description The main entry point for the Cocoon Node.js extension host.
 */

import * as Path from "path";
import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

import { CoreServiceLayer } from "./Core.js";
import { ExtensionHost } from "./Core/ExtensionHost.js";
import { RequireInterceptor } from "./Core/RequireInterceptor.js";
import { RunProcessPatch } from "./PatchProcess.js";
import { AllServiceLayer } from "./Service.js";
import { InitDataLayer } from "./Service/InitData.js";
import { IPC, type Configuration as IPCConfiguration } from "./Service/IPC.js";

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
	const Interceptor = yield* RequireInterceptor.Tag;
	yield* Interceptor.Install();
	yield* Effect.logInfo("Node.js require() interceptor installed.");

	const Host = yield* ExtensionHost.Tag;
	yield* Host.ActivateById(
		"*" as any,
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

	const IPCService = yield* IPC.Tag;

	IPCService.RegisterInvokeHandler(
		"initExtensionHost",
		(initializationData: IExtensionHostInitData) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(
					"Received 'initExtensionHost' data from Mountain.",
				);

				// Compose the final application layer, providing the received init data.
				const ApplicationLayer = AllServiceLayer(
					ApplicationConfiguration,
				).pipe(
					Layer.provide(CoreServiceLayer),
					Layer.provide(InitDataLayer(initializationData)),
				);

				yield* Effect.provide(
					FullApplicationInitialization,
					ApplicationLayer,
				);

				yield* Deferred.succeed(InitializationBarrier, undefined);
				return "initialized";
			}),
	);

	yield* IPCService.SendNotification("$initialHandshake", []);
	yield* Effect.logInfo("Cocoon is ready. Sent handshake to Mountain.");

	yield* Deferred.await(InitializationBarrier);
	yield* Effect.logInfo("Cocoon is fully initialized and operational.");

	yield* Effect.never;
}).pipe(
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
);

// --- Application Layer Composition ---

const ApplicationConfiguration: IPCConfiguration = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] || "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] || "localhost:50052",
};

// This layer contains all services needed before the handshake.
// After the handshake, a more complete layer including InitData is created.
const PreInitLayer = Layer.mergeAll(
	CoreServiceLayer,
	IPC.Live(ApplicationConfiguration),
);

// --- Run the Application ---

const RunnableApplication = Main.pipe(Effect.provide(PreInitLayer));

NodeRuntime.runMain(RunnableApplication);
