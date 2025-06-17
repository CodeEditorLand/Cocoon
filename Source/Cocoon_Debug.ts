/*
 * File: Cocoon/Source/Cocoon_Debug.ts
 * Responsibility: A temporary entry point for debugging layer composition and circular dependencies.
 */

import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer, Logger } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

// --- Add other service imports here as you test them ---
// Example:
// --- Pre-Handshake Services (known to be simple) ---
import CancellationLive from "./Service/Cancellation/Live.js";
import InitDataLive from "./Service/InitData/Live.js";
import IPCConfigurationService, {
	type IPCConfiguration,
} from "./Service/IPC/Configuration.js";
import IPCLive from "./Service/IPC/Live.js";
import IPCService from "./Service/IPC/Service.js";
import LogLive from "./Service/Log/Live.js";
// --- Post-Handshake Services (to be added incrementally) ---
import LogService from "./Service/Log/Service.js";

// ... and so on for all services from Cocoon.ts

// A minimal effect to test just the pre-handshake part
const PreHandshakeEffect = Effect.gen(function* (G) {
	// This logic is copied from Cocoon.ts
	const InitializationBarrier = yield* G(
		Deferred.make<IExtensionHostInitData, Error>(),
	);
	const IPC = yield* G(IPCService);
	IPC.RegisterInvokeHandler(
		"initExtensionHost",
		(InitializationData: IExtensionHostInitData): Promise<void> =>
			Effect.runPromise(
				Deferred.succeed(
					InitializationBarrier,
					InitializationData,
				).pipe(Effect.asVoid),
			),
	);
	yield* G(IPC.SendNotification("$initialHandshake", []));
	const InitializationData = yield* G(Deferred.await(InitializationBarrier));
	yield* G(Effect.logInfo("Debug: Pre-handshake complete."));
	return InitializationData;
});

// A minimal effect to test the post-handshake dependencies
const PostHandshakeEffect_Debug = Effect.gen(function* (G) {
	// We will add `yield*` calls here to test if services are available.
	// For now, it just logs.
	const log = yield* G(LogService);
	yield* G(log.Info("Debug: Post-handshake effect started."));
	yield* G(Effect.never);
});

// The main orchestration effect for debugging
const MainEffect_Debug = Effect.gen(function* (G) {
	// Step 1: Get initialization data
	const InitializationData = yield* G(PreHandshakeEffect);
	yield* G(Effect.logInfo("Debug: Received Init Data."));

	// Step 2: Build the application layer incrementally.
	// Start with only the simplest layers and add more to find the issue.
	const ApplicationLayer = Layer.mergeAll(
		// --- Start by uncommenting layers one by one ---
		LogLive, // Has no dependencies
	);

	// Create the runtime-dependent InitData layer
	const InitDataLayer = InitDataLive(InitializationData);

	// The Final Layer that should have all dependencies resolved
	const FinalApplicationLayer = ApplicationLayer.pipe(
		// Provide InitData, which is required by many core services
		Layer.provide(InitDataLayer),
	);

	// Run the post-handshake logic with the incrementally-built layer
	yield* G(
		PostHandshakeEffect_Debug.pipe(Effect.provide(FinalApplicationLayer)),
	);
});

// --- Pre-Handshake Layer Setup (same as Cocoon.ts) ---
const ApplicationConfiguration: IPCConfiguration = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
};
const ConfigurationLayer = Layer.succeed(
	IPCConfigurationService,
	ApplicationConfiguration,
);
const PreHandshakeDependencies = Layer.mergeAll(
	ConfigurationLayer,
	Logger.logFmt,
	CancellationLive,
);
const PreHandshakeLayer = IPCLive.pipe(Layer.provide(PreHandshakeDependencies));

// The final runnable application for debugging
const RunnableApplication = MainEffect_Debug.pipe(
	Effect.provide(PreHandshakeLayer),
	Effect.scoped,
);

// This line is where you will see the TypeScript error.
// Hover over `RunnableApplication` to see its inferred `R` type.
// Our goal is to make `R` become `never`.
NodeRuntime.runMain(RunnableApplication);
