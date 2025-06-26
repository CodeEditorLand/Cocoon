/**
 * @module L1
 * @description Debugging the layer composition. This version includes L5 services.
 */

import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import { Effect, Layer } from "effect";

// --- Real Service Imports ---
// L0
import { CancellationService } from "../Cancellation.js";
import { InitDataService } from "../InitData.js";
import { IPCConfigurationService } from "../IPCConfiguration.js";
import { LoggerService } from "../Logger.js";
// L1
import { ApplicationConfigurationService } from "../ApplicationConfiguration.js";
import { IPCService } from "../IPC.js";
import { LanguageFeatureService } from "../LanguageFeature.js";
import { TelemetryService } from "../Telemetry.js";
// L2
import { ExtensionPathService } from "../ExtensionPath.js";
import { HostKindPickerService } from "../HostKindPicker.js";
import { NodeModuleShimService } from "../NodeModuleShim.js";
// L3
import { APIDeprecationService } from "../APIDeprecation.js";
import { ClipboardService } from "../Clipboard.js";
import { DialogService } from "../Dialog.js";
import { DocumentService } from "../Document.js";
import { MessageService } from "../Message.js";
import { QuickInputService } from "../QuickInput.js";
import { ProposedAPIService } from "../ProposedAPI.js";
import { SecretStorageService } from "../SecretStorage.js";
import { FileSystemInformationService } from "../FileSystemInformation.js";
// L4
import { AuthenticationService } from "../Authentication.js";
import { TaskService } from "../Task.js";
// L5
import { FileSystemService } from "../FileSystem.js";
import { StorageService } from "../Storage.js";

import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

// --- DUMMY DATA ---
const DUMMY_INIT_DATA: IExtensionHostInitData = {} as any;

const composeAppLayer = (_initializationData: IExtensionHostInitData) => {
	// Level 0 Layer
	const L0_World = Layer.mergeAll(
		IPCConfigurationService.Default,
		CancellationService.Default,
		LoggerService.Default,
		Layer.succeed(InitDataService, DUMMY_INIT_DATA),
	);

	// Level 1a
	const L1a_Services = Layer.mergeAll(
		IPCService.Default,
		ApplicationConfigurationService.Default,
		LanguageFeatureService.Default,
	);
	const L1a_World = Layer.provide(
		Layer.merge(L0_World, L1a_Services),
		L0_World,
	);

	// Level 1b
	const L1b_Services = Layer.mergeAll(TelemetryService.Default);
	const L1b_World = Layer.provide(L1b_Services, L1a_World);
	const L1_Complete_World = Layer.mergeAll(L0_World, L1a_World, L1b_World);

	// Level 2
	const L2_Services = Layer.mergeAll(
		ExtensionPathService.Default,
		HostKindPickerService.Default,
		NodeModuleShimService.Default,
	);
	const L2_World = Layer.provide(
		Layer.merge(L1_Complete_World, L2_Services),
		L1_Complete_World,
	);

	// Level 3
	const L3_Services = Layer.mergeAll(
		APIDeprecationService.Default,
		ClipboardService.Default,
		DialogService.Default,
		DocumentService.Default,
		MessageService.Default,
		QuickInputService.Default,
		ProposedAPIService.Default,
		SecretStorageService.Default,
		FileSystemInformationService.Default,
	);
	const L3_World = Layer.provide(
		Layer.merge(L2_World, L3_Services),
		L2_World,
	);

	// Level 4
	const L4_Services = Layer.mergeAll(
		TaskService.Default,
		AuthenticationService.Default,
	);
	const L4_World = Layer.provide(
		Layer.merge(L3_World, L4_Services),
		L3_World,
	);

	// --- Level 5 ---
	const L5_Services = Layer.mergeAll(
		FileSystemService.Default,
		StorageService.Default,
	);
	const L5_World = Layer.provide(L5_Services, L4_World);

	// The final layer for this test is a merge of all previously built layers.
	return Layer.mergeAll(L4_World, L5_World);
};

// --- Utility Layers ---
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon" },
}));
const DevToolsLive = Layer.provide(
	DevTools.layerWebSocket(),
	NodeSocket.layerWebSocketConstructor,
);
const UtilityLayers = Layer.mergeAll(TracingLive, DevToolsLive);

// --- Main Application Logic ---
const MainLogic = Effect.gen(function* () {
	yield* Effect.log("--- Verifying Services ---");

	yield* Effect.log(
		"Attempting to resolve L4 Service (AuthenticationService)...",
	);
	yield* AuthenticationService;
	yield* Effect.log("✔ AuthenticationService resolved successfully.");

	yield* Effect.log(
		"Attempting to resolve L5 Service (FileSystemService)...",
	);
	yield* FileSystemService;
	yield* Effect.log("✔ FileSystemService resolved successfully.");

	yield* Effect.never;
});

// --- Final Application Assembly and Execution ---
const AppLayer = composeAppLayer(DUMMY_INIT_DATA);
const FinalLayer = Layer.merge(AppLayer, UtilityLayers);

const AppEffectWithRequirements = MainLogic.pipe(
	Effect.catchAllCause((cause) =>
		Effect.logFatal("An unrecoverable error occurred.", cause),
	),
);

const ExecutableMainEffect = Effect.provide(
	AppEffectWithRequirements,
	FinalLayer,
).pipe(Effect.scoped);

NodeRuntime.runMain(ExecutableMainEffect);
