/*
 * File: Cocoon/Source/Cocoon.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./Core.js, ./Core/ExtensionHost/Service.js, ./Core/RequireInterceptor/Service.js, ./PatchProcess.js, ./Service.js, ./Service/IPC.js, ./Service/IPC/Configuration.js, ./Service/IPC/Service.js, ./Service/InitData/Live.js, @effect/platform-node, effect, node:path, vs/workbench/services/extensions/common/extensionHostProtocol.js
 */

import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Deferred, Effect, Exit, Layer } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

import CoreServiceLayer from "./Core.js";
import ExtensionHostService from "./Core/ExtensionHost/Service.js";
import RequireInterceptorService from "./Core/RequireInterceptor/Service.js";
import RunProcessPatch from "./PatchProcess.js";
import AllServiceLayer from "./Service.js";
import InitDataLayer from "./Service/InitData/Live.js";
import { Live as IPCLive } from "./Service/IPC.js";
import type { IPCConfiguration } from "./Service/IPC/Configuration.js";
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
const InitializeAfterHandshake = Effect.gen(function* (G) {
	// Step 1: Install the require() interceptor.
	const Interceptor = yield* G(RequireInterceptorService);
	yield* G(Interceptor.Install());
	yield* G(Effect.logInfo("Node.js require() interceptor installed."));

	// Step 2: Trigger the initial "star activation" of extensions.
	const Host = yield* G(ExtensionHostService);
	yield* G(
		Host.ActivateById(
			"*" as any, // This is a placeholder for VS Code's "star activation"
			{
				startup: true,
				activationEvent: "*",
			} as any,
		),
	);

	yield* G(Effect.logInfo("Startup extensions activated."));
});

/**
 * The main application workflow, described as a single declarative Effect.
 */
const Main = Effect.gen(function* (G) {
	// A barrier to pause the main thread until the host sends init data.
	// The error channel now holds a generic `Error` for simplicity.
	const InitializationBarrier = yield* G(Deferred.make<void, Error>());
	const IPC = yield* G(IPCService);

	// Step 1: Register the handler that will be invoked by the host.
	IPC.RegisterInvokeHandler(
		"initExtensionHost",
		(InitializationData: IExtensionHostInitData) => {
			// Step 2: Create a layer for the application services, which depends on runtime config.
			const servicesLayer = AllServiceLayer(ApplicationConfiguration);

			// Step 3: Create a layer for the core services.
			const coreLayer = CoreServiceLayer;

			// Step 4: Create a layer from the dynamic init data.
			const initDataLayer = InitDataLayer(InitializationData);

			// Step 5: Compose all layers together.
			// `initDataLayer` provides the `InitDataService` that the other layers require.
			const CompleteApplicationLayer = Layer.provide(
				Layer.merge(coreLayer, servicesLayer),
				initDataLayer,
			);

			// Step 6: Define the effect that runs the rest of the application logic.
			const HandlerEffect = Effect.gen(function* (G) {
				yield* G(
					Effect.logInfo(
						"Received 'initExtensionHost' data from Mountain.",
					),
				);

				yield* G(RunProcessPatch);
				yield* G(InitializeAfterHandshake);
			});

			// Step 7: Create the final runnable by providing the complete layer.
			// This results in an Effect with no requirements (R = never).
			const Runnable = HandlerEffect.pipe(
				Effect.provide(CompleteApplicationLayer),
				Effect.scoped,
			);

			// Step 8: Execute the runnable. Since its requirements are satisfied, we can use the default runtime.
			const PromiseResult = Effect.runPromiseExit(Runnable).then(
				(exit) => {
					if (Exit.isSuccess(exit)) {
						// On success, succeed the deferred to unblock the main fiber.
						Effect.runFork(
							Deferred.succeed(
								InitializationBarrier,
								undefined as void,
							),
						);
					} else {
						// On failure, fail the deferred with a user-friendly error message.
						Effect.runFork(
							Deferred.fail(
								InitializationBarrier,
								new Error(Cause.pretty(exit.cause)),
							),
						);
					}
				},
			);

			return PromiseResult;
		},
	);

	// Step 9: Send the initial handshake and wait for init data.
	yield* G(IPC.SendNotification("$initialHandshake", []));
	yield* G(Effect.logInfo("Cocoon is ready. Sent handshake to Mountain."));

	// Step 10: Wait here until the 'initExtensionHost' handler signals completion or failure.
	yield* G(Deferred.await(InitializationBarrier));
	yield* G(Effect.logInfo("Cocoon is fully initialized and operational."));

	// Step 11: Keep the process alive indefinitely.
	yield* G(Effect.never);
}).pipe(
	// Step 12: Top-level error handler for any uncaught failures.
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
);

// --- Application Layer Composition ---

const ApplicationConfiguration: IPCConfiguration = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
};

// Layer needed to perform the initial handshake.
const PreHandshakeLayer = IPCLive(ApplicationConfiguration);

// --- Run the Application ---
const RunnableApplication = Effect.provide(Main, PreHandshakeLayer);

NodeRuntime.runMain(RunnableApplication);
