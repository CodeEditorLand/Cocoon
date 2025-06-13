/**
 * @module Cocoon
 * @description The main entry point for the Cocoon Node.js extension host.
 *
 * This file orchestrates the entire application lifecycle:
 * 1. Sets up the Node.js environment by patching module paths.
 * 2. Defines the main application workflow as a declarative `Effect`.
 * 3. Composes all service layers (`Core`, `IPC`, `Services`) into a single application layer.
 * 4. Executes the main Effect, which includes performing a handshake with Mountain,
 *    initializing all services with data from the host, and activating extensions.
 */

import * as Path from "path";
import { Barrier, Context, Effect, Layer, Scope } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

import { CoreServicesLayer } from "./Core.js";
import { ExtensionHost } from "./Core/ExtensionHost.js";
import { RequireInterceptor } from "./Core/RequireInterceptor.js";
import { RunProcessPatch } from "./PatchProcess.js";
import { AllServicesLayer } from "./Service.js";
import { InitDataLayer } from "./Service/InitData.js";
import { IPCProvider, Live as LiveIPC } from "./Service/IPC.js";

// --- Pre-initialization Steps ---
// Add the bundled VS Code module path to Node's search paths. This allows
// imports like `vs/base/common/uri.js` to resolve correctly.
const VSCodeOutDir =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutDir);

// --- Application Logic ---

/**
 * An Effect that represents the full initialization of all services *after*
 * the handshake with Mountain is complete and the init data has been received.
 */
const FullAppInitialization = Effect.gen(function* (_) {
	const Interceptor = yield* _(RequireInterceptor.Tag);
	yield* _(Interceptor.Install());
	yield* _(Effect.logInfo("Node.js require() interceptor installed."));

	// Now that the environment is fully set up, we can activate extensions.
	const Host = yield* _(ExtensionHost.Tag);
	// The '*' event signifies activating all extensions marked for startup.
	yield* _(
		Host.ActivateById("*" as any, { startup: true, activationEvent: "*" }),
	);

	yield* _(Effect.logInfo("Startup extensions activated."));
});

/**
 * The main application workflow, described as a single declarative Effect.
 */
const Main = Effect.gen(function* (_) {
	const InitBarrier = yield* _(Barrier.make());

	// 1. Apply all low-level process patches (e.g., console piping, termination hooks).
	yield* _(RunProcessPatch);

	// 2. Get the IPC provider.
	const IPC = yield* _(IPCProvider.Tag);

	// 3. Register the handler that will be called by Mountain to kick off initialization.
	IPC.RegisterInvokeHandler(
		"initExtensionHost",
		(InitData: IExtensionHostInitData) =>
			Effect.gen(function* (_) {
				yield* _(
					Effect.logInfo(
						"Received 'initExtensionHost' data from Mountain.",
					),
				);

				// Compose the final application layer, providing the received init data.
				const AppLayer = AllServicesLayer.pipe(
					Layer.provide(CoreServicesLayer),
					Layer.provide(InitDataLayer(InitData)),
				);

				// Provide the full layer to our initialization Effect and run it.
				yield* _(Effect.provide(FullAppInitialization, AppLayer));

				// Signal that initialization is complete.
				yield* _(Barrier.succeed(InitBarrier, undefined));
				return "initialized"; // Acknowledge completion back to Mountain.
			}).pipe(Effect.runPromise),
	);

	// 4. Send the 'Ready' signal to Mountain, indicating we are ready for init data.
	yield* _(IPC.SendNotification("$initialHandshake", []));
	yield* _(Effect.logInfo("Cocoon is ready. Sent handshake to Mountain."));

	// 5. Wait for the `initExtensionHost` handler to open the barrier.
	yield* _(Barrier.await(InitBarrier));
	yield* _(Effect.logInfo("Cocoon is fully initialized and operational."));

	// 6. Keep the process alive indefinitely.
	yield* _(Effect.never);
}).pipe(
	// Global error handler for the entire application.
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
);

// --- Application Layer Composition ---

/**
 * A configuration object for the IPC layer.
 */
const AppConfig = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] || "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] || "localhost:50052",
};

/**
 * The base Layer for the application, providing the IPC connection.
 * Other layers will be built on top of this.
 */
const CocoonBaseLayer = LiveIPC(AppConfig);

// --- Run the Application ---

// We create a master Scope for the application. When this scope is closed (e.g., on SIGTERM),
// all finalizers from our `Layer.scoped` resources (like the gRPC client/server)
// will be executed, ensuring a graceful shutdown.
const AppWithScope = Scope.make().pipe(
	Effect.flatMap((scope) =>
		Effect.provide(Main, CocoonBaseLayer).pipe(Scope.extend(scope)),
	),
);

// Fork the entire application into the background.
Effect.runFork(AppWithScope);
