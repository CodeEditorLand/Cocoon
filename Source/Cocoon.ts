/*
 * File: Cocoon/Source/Cocoon.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:45 UTC
 * Dependency: ./Core/APIFactory/Live.js, ./Core/ESMInterceptor/Live.js, ./Core/ExtensionHost/Live.js, ./Core/ExtensionHost/Service.js, ./Core/ExtensionPath/Live.js, ./Core/HostKindPicker/Live.js, ./Core/NodeModuleShim/Live.js, ./Core/RequireInterceptor/Live.js, ./Core/RequireInterceptor/Service.js, ./PatchProcess.js, ./Service/APIDeprecation/Live.js, ./Service/Authentication/Live.js, ./Service/Cancellation/Live.js, ./Service/Clipboard/Live.js, ./Service/Command/Live.js, ./Service/Configuration/Live.js, ./Service/Debug/Live.js, ./Service/Diagnostic/Live.js, ./Service/Dialog/Live.js, ./Service/Document/Live.js, ./Service/Environment/Live.js, ./Service/Extension/Live.js, ./Service/FileSystem/Live.js, ./Service/FileSystemInformation/Live.js, ./Service/IPC/Live.js, ./Service/IPC/Service.js, ./Service/InitData/Live.js, ./Service/LanguageFeature/Live.js, ./Service/Localization/Live.js, ./Service/Log/Live.js, ./Service/Message/Live.js, ./Service/ProposedAPI/Live.js, ./Service/QuickInput/Live.js, ./Service/SecretStorage/Live.js, ./Service/StatusBar/Live.js, ./Service/Storage/Live.js, ./Service/StoragePath/Live.js, ./Service/Task/Live.js, ./Service/Telemetry/Live.js, ./Service/TreeView/Live.js, ./Service/WebViewPanel/Live.js, ./Service/Window/Live.js, ./Service/WorkSpace/Live.js, @effect/platform-node, effect, node:path, vs/workbench/services/extensions/common/extensionHostProtocol.js
 */

import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer, Logger } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

// --- Core Service Imports ---
import APIFactoryLive from "./Core/APIFactory/Live.js";
import ESMInterceptorLive from "./Core/ESMInterceptor/Live.js";
import ExtensionHostLive from "./Core/ExtensionHost/Live.js";
import ExtensionHostService from "./Core/ExtensionHost/Service.js";
import ExtensionPathLive from "./Core/ExtensionPath/Live.js";
import HostKindPickerLive from "./Core/HostKindPicker/Live.js";
import NodeModuleShimLive from "./Core/NodeModuleShim/Live.js";
import RequireInterceptorLive from "./Core/RequireInterceptor/Live.js";
import RequireInterceptorService from "./Core/RequireInterceptor/Service.js";
// --- Other Imports ---
import RunProcessPatch from "./PatchProcess.js";
import APIDeprecationLive from "./Service/APIDeprecation/Live.js";
import AuthenticationLive from "./Service/Authentication/Live.js";
import CancellationLive from "./Service/Cancellation/Live.js";
import ClipboardLive from "./Service/Clipboard/Live.js";
import CommandLive from "./Service/Command/Live.js";
import ConfigurationLive from "./Service/Configuration/Live.js";
import DebugLive from "./Service/Debug/Live.js";
import DiagnosticLive from "./Service/Diagnostic/Live.js";
import DialogLive from "./Service/Dialog/Live.js";
import DocumentLive from "./Service/Document/Live.js";
import EnvironmentLive from "./Service/Environment/Live.js";
import ExtensionLive from "./Service/Extension/Live.js";
import FileSystemLive from "./Service/FileSystem/Live.js";
import FileSystemInformationLive from "./Service/FileSystemInformation/Live.js";
import InitDataLive from "./Service/InitData/Live.js";
import IPCConfigurationService, {
	type IPCConfiguration,
} from "./Service/IPC/Configuration.js";
import IPCLive from "./Service/IPC/Live.js";
import IPCService from "./Service/IPC/Service.js";
import LanguageFeatureLive from "./Service/LanguageFeature/Live.js";
import LocalizationLive from "./Service/Localization/Live.js";
import LogLive from "./Service/Log/Live.js";
import MessageLive from "./Service/Message/Live.js";
import ProposedAPILive from "./Service/ProposedAPI/Live.js";
import QuickInputLive from "./Service/QuickInput/Live.js";
import SecretStorageLive from "./Service/SecretStorage/Live.js";
import StatusBarLive from "./Service/StatusBar/Live.js";
import StorageLive from "./Service/Storage/Live.js";
import StoragePathLive from "./Service/StoragePath/Live.js";
import TaskLive from "./Service/Task/Live.js";
import TelemetryLive from "./Service/Telemetry/Live.js";
import TreeViewLive from "./Service/TreeView/Live.js";
import WebViewPanelLive from "./Service/WebViewPanel/Live.js";
import WindowLive from "./Service/Window/Live.js";
import WorkSpaceLive from "./Service/WorkSpace/Live.js";

// --- Pre-initialization Steps ---
const VSCodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutputDirectory);

/**
 * The logic that runs *after* the initial handshake with the host is complete.
 */
const PostHandshakeEffect = Effect.gen(function* (G) {
	yield* G(Effect.logInfo("Proceeding with full initialization..."));
	yield* G(RunProcessPatch);
	const Interceptor = yield* G(RequireInterceptorService);
	yield* G(Interceptor.Install());
	yield* G(Effect.logInfo("Node.js require() interceptor installed."));
	const Host = yield* G(ExtensionHostService);
	yield* G(
		Host.ActivateById(
			"*" as any,
			{ startup: true, activationEvent: "*" } as any,
		),
	);
	yield* G(Effect.logInfo("Startup extensions activated."));
	yield* G(Effect.logInfo("Cocoon is fully initialized and operational."));
	yield* G(Effect.never);
});

/**
 * The logic that runs *before* the main application can be initialized.
 */
const PreHandshakeEffect = Effect.gen(function* (G) {
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
	yield* G(Effect.logInfo("Cocoon is ready. Sent handshake to Mountain."));
	yield* G(IPC.SendNotification("$initialHandshake", []));
	const InitializationData = yield* G(Deferred.await(InitializationBarrier));
	yield* G(Effect.logInfo("Cocoon handshake complete."));
	return InitializationData;
});

// --- Layer Definitions ---

const ApplicationConfiguration: IPCConfiguration = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
};

const ConfigurationLayer = Layer.succeed(
	IPCConfigurationService,
	ApplicationConfiguration,
);

const PreHandshakeLayer = Layer.mergeAll(
	ConfigurationLayer,
	Logger.logFmt,
	CancellationLive,
	IPCLive,
);

const LiveApplicationLayer = Layer.mergeAll(
	APIFactoryLive,
	ESMInterceptorLive,
	ExtensionHostLive,
	ExtensionPathLive,
	HostKindPickerLive,
	NodeModuleShimLive,
	RequireInterceptorLive,
	APIDeprecationLive,
	AuthenticationLive,
	ClipboardLive,
	CommandLive,
	ConfigurationLive,
	DebugLive,
	DiagnosticLive,
	DialogLive,
	DocumentLive,
	EnvironmentLive,
	ExtensionLive,
	FileSystemLive,
	FileSystemInformationLive,
	LanguageFeatureLive,
	LocalizationLive,
	LogLive,
	MessageLive,
	ProposedAPILive,
	QuickInputLive,
	SecretStorageLive,
	StatusBarLive,
	StorageLive,
	StoragePathLive,
	TaskLive,
	TelemetryLive,
	TreeViewLive,
	WebViewPanelLive,
	WindowLive,
	WorkSpaceLive,
);

// --- Application Entry Point ---

const getInitializationData = PreHandshakeEffect.pipe(
	Effect.provide(PreHandshakeLayer),
);

const RunnableApplication = getInitializationData.pipe(
	Effect.flatMap((initData) => {
		const initDataLayer = InitDataLive(initData);

		// Layer that provides the runtime-specific data and the core IPC/logging services
		const RuntimeDependenciesLayer = Layer.merge(
			initDataLayer,
			PreHandshakeLayer,
		);

		// A fully resolved layer where all internal and external dependencies are satisfied.
		const ResolvedLayer = Layer.provide(
			LiveApplicationLayer,
			RuntimeDependenciesLayer,
		);

		// Provide the fully resolved layer to the main application logic.
		return PostHandshakeEffect.pipe(Effect.provide(ResolvedLayer));
	}),
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
	Effect.scoped,
);

NodeRuntime.runMain(RunnableApplication);
