// Cocoon/Source/Cocoon.ts

/**
 * @module Cocoon
 * @description The main entry point for the Cocoon Node.js extension host.
 */

import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer, Scope } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

import CoreServiceLayer from "./Core.js";
import ExtensionHostService from "./Core/ExtensionHost/Service.js";
import RequireInterceptorService from "./Core/RequireInterceptor/Service.js";
import RunProcessPatch from "./PatchProcess.js";
import AllServiceLayer from "./Service.js";
import { default as InitDataLayer } from "./Service/InitData/Live.js";
// FIX: Import Tag
import { Live as IPCLive } from "./Service/IPC.js";
import IPCConfiguration, {
	IPCConfigurationService,
} from "./Service/IPC/Configuration.js";
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
const InitializeAfterHandshake = Effect.gen(function* () {
	// Step 1: Install the require() interceptor.
	const Interceptor = yield* RequireInterceptorService;
	yield* Interceptor.Install();
	yield* Effect.logInfo("Node.js require() interceptor installed.");

	// Step 2: Trigger the initial "star activation" of extensions.
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
	// A barrier to pause the main thread until the host sends init data.
	const InitializationBarrier = yield* Deferred.make<Error, void>();
	const IPC = yield* IPCService;

	// Step 1: Register the handler that will be invoked by the host.
	IPC.RegisterInvokeHandler(
		"initExtensionHost",
		(InitializationData: IExtensionHostInitData) => {
			// Step 2: Once init data is received, create the final application layer.
			// This layer provides the missing InitData service to the pre-init layer.
			const CompleteApplicationLayer = Layer.provide(
				Layer.mergeAll(
					CoreServiceLayer,
					AllServiceLayer(ApplicationConfiguration),
				),
				InitDataLayer(InitializationData),
			);

			// Step 3: Define the effect that runs the rest of the application logic.
			const HandlerEffect = Effect.gen(function* () {
				yield* Effect.logInfo(
					"Received 'initExtensionHost' data from Mountain.",
				);

				// Step 3.1: Apply process patches and run the main initialization.
				yield* RunProcessPatch;
				yield* InitializeAfterHandshake;

				// Step 3.2: Signal that initialization is complete.
				return yield* Deferred.succeed(
					InitializationBarrier,
					undefined,
				);
			});

			// FIX: The handler logic is now a self-contained, runnable effect.
			// We provide its layer and then fork it into the background.
			const Runnable = Effect.provide(
				HandlerEffect,
				CompleteApplicationLayer,
			).pipe(
				Effect.catchAllCause((cause) =>
					Deferred.failCause(InitializationBarrier, cause),
				),
				Effect.scoped,
			);

			// Step 4: Fork the main application logic so it doesn't block the IPC handler.
			return Effect.runPromise(Effect.fork(Runnable));
		},
	);

	// Step 5: Send the initial handshake to the host and wait for the init data.
	yield* IPC.SendNotification("$initialHandshake", []);
	yield* Effect.logInfo("Cocoon is ready. Sent handshake to Mountain.");

	// Step 6: Wait here until the 'initExtensionHost' handler signals completion.
	yield* Deferred.await(InitializationBarrier);
	yield* Effect.logInfo("Cocoon is fully initialized and operational.");

	// Step 7: Keep the process alive indefinitely to listen for more IPC events.
	yield* Effect.never;
}).pipe(
	// Step 8: Define a top-level error handler for any uncaught failures.
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
);

// --- Application Layer Composition ---

const ApplicationConfiguration: IPCConfiguration = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
};

// FIX: This layer now only provides the IPC service, which is all that's
// needed to establish the initial connection and wait for the handshake.
const PreHandshakeLayer = IPCLive(ApplicationConfiguration);

// --- Run the Application ---

const RunnableApplication = Effect.provide(Main, PreHandshakeLayer);

NodeRuntime.runMain(RunnableApplication);
