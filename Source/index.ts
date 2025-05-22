/*---------------------------------------------------------------------------------------------
 * Cocoon Main Entry Point (index.ts)
 * --------------------------------------------------------------------------------------------
 * This file serves as the primary entry point and orchestrator for the Cocoon Node.js
 * sidecar process. Its main goal is to establish a VS Code-compatible extension host
 * environment within this sidecar, enabling the execution of standard VS Code extensions
 * in a decoupled manner, managed by an external "Mountain" host process.
 *
 * Core Responsibilities:
 * - Process Initialization: Sets up the Node.js environment, including module path
 *   adjustments for VS Code's internal module resolution.
 * - IPC Management: Utilizes `cocoon-ipc.ts` to communicate with the Mountain host,
 *
 *   primarily waiting for an `initExtensionHost` command containing initialization data.
 * - Dependency Injection (DI): Configures and instantiates VS Code's `InstantiationService`
 *   with a `ServiceCollection` that includes:
 *     - Core VS Code services (e.g., `ILogService`, `IExtHostRpcService`).
 *     - Cocoon-specific "shims" that implement VS Code service interfaces to adapt
 *       them for the sidecar environment (e.g., `ShimExtHostWorkspace`, `ShimExtHostConfiguration`).
 *     - The REAL `ExtHostExtensionService` from VS Code's sources.
 * - Service Orchestration: Instantiates and wires up numerous `IExtHost...` services.
 * - Module Interception: Sets up `NodeRequireInterceptor` to manage how extensions
 *   `require` modules, especially the `vscode` API. This includes:
 *     - Providing a custom `vscode` API factory (`apiFactoryProvider`) that can inject
 *       shimmed functionalities (e.g., `vscode.workspace.fs`).
 *     - Shimmed module factories for Node.js built-ins (like 'fs') if necessary.
 * - Extension Host Lifecycle: Triggers the initialization of the `ExtHostExtensionService`,
 *
 *   which subsequently loads and activates extensions based on the provided init data.
 * - URI Revival: Handles the "revival" of URI-like objects (and other marshallable types)
 *   received from the Mountain process into proper VS Code `URI` instances.
 * - Global Error Handling: Installs global error handlers (`process.on('uncaughtException')`,
 *
 *   etc.) to report errors back to Mountain via RPC.
 *
 * Key Interactions:
 * - `cocoon-ipc.ts`: Handles all low-level IPC (stdio JSON messaging) with Mountain.
 * - VS Code `InstantiationService`: Central to the DI pattern used.
 * - VS Code `RPCProtocol`: Used for structured RPC communication over the IPC channel.
 * - VS Code `ExtHostExtensionService` (Node version): The core engine for running extensions.
 * - Numerous VS Code `IExtHost...` service interfaces and their implementations (real or shimmed).
 * - VS Code `NodeRequireInterceptor` & `VSCodeNodeModuleFactory`: For `require` patching.
 * - VS Code `ErrorHandler`: For centralized error reporting.
 * - Cocoon Shims (`./shims/*`): Provide the necessary abstractions and adaptations.
 *
 * Architectural Context:
 * - This implementation is specifically for "Path A" of the Cocoon project, where Cocoon
 *   runs as a dedicated Node.js sidecar process.
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";
import { performance } from "perf_hooks";
import { Barrier } from "vs/base/common/async";
import { VSBuffer } from "vs/base/common/buffer";
import {
	CancellationToken,
	CancellationTokenSource,
} from "vs/base/common/cancellation";
import {
	MarshalledId,
	revive as vscodeCoreRevive,
} from "vs/base/common/marshalling";
import { Schemas } from "vs/base/common/network";
import {
	URI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import {
	ExtensionIdentifier,
	IExtensionDescription,
	IExtensionDescriptionDelta,
	type IRelaxedExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	type IInstantiationService,
	InstantiationService,
	createDecorator,
} from "vs/platform/instantiation/common/instantiationService";
import {
	ServiceCollection,
	SyncDescriptor,
} from "vs/platform/instantiation/common/serviceCollection";
import {
	ILogService,
	ILoggerService,
	LogLevel,
	parseLogLevel,
} from "vs/platform/log/common/log";
import {
	type IExtensionApiFactory,
	createApiFactory as createVSCodeApiFactoryOriginal,
} from "vs/workbench/api/common/extHost.api.impl";
import {
	ExtHostContext,
	ExtHostWorkspaceShape,
	MainContext,
	IWorkspaceData as RpcWorkspaceData,
} from "vs/workbench/api/common/extHost.protocol";
// --- ExtHost Service Interfaces (Alphabetical) ---
import { IExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService";
// Needed for real ExtHostLM
import { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication";
import {
	ExtHostCommandsShape,
	IExtHostCommands,
} from "vs/workbench/api/common/extHostCommands";
import {
	IExtHostConfiguration,
	IExtHostConfigurationProvider,
	IExtHostConfigurationShape,
} from "vs/workbench/api/common/extHostConfiguration";
import {
	ExtHostDiagnosticsShape,
	IExtHostDiagnostics,
} from "vs/workbench/api/common/extHostDiagnostics";
import {
	ExtHostDocumentsAndEditorsShape,
	IExtHostDocuments,
	IExtHostDocumentsShape,
} from "vs/workbench/api/common/extHostDocuments";
// IExtHostExtensionService & its Node implementation are key
import {
	AbstractExtHostExtensionService,
	ExtensionPaths,
	IExtHostExtensionService,
	IHostUtils,
} from "vs/workbench/api/common/extHostExtensionService";
import { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
import {
	type ExtHostInitData,
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	ExtHostLanguageFeaturesShape,
	IExtHostLanguageFeatures,
} from "vs/workbench/api/common/extHostLanguageFeatures";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels";
import { IExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";
import { IExtHostManagedSockets } from "vs/workbench/api/common/extHostManagedSockets";
import { IExtHostOutputService } from "vs/workbench/api/common/extHostOutput";
// IExtHostProposedApis is not a standard DI service, but a concept for API factory
import { IExtHostRpcService } from "vs/workbench/api/common/extHostRpcService";
import { IExtHostSecretState } from "vs/workbench/api/common/extHostSecretState";
import { IExtHostStorage } from "vs/workbench/api/common/extHostStorage";
import { IExtensionStoragePaths } from "vs/workbench/api/common/extHostStoragePaths";
// For real ExtHostExtensionService
import { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry";
import {
	IExtHostTerminalService,
	IExtHostTerminalServiceShape,
} from "vs/workbench/api/common/extHostTerminalService";
import { IURITransformerService } from "vs/workbench/api/common/extHostUriTransformerService";
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace";
// Interceptor & Error Handling
import { ErrorHandler } from "vs/workbench/api/common/extensionHostMain";
// The REAL service for Path A
import { ExtHostExtensionService } from "vs/workbench/api/node/extHostExtensionService";
import {
	NodeModuleAliasingModuleFactory,
	NodeRequireInterceptor,
	VSCodeNodeModuleFactory,
	INodeModuleFactory as VscodeINodeModuleFactory,
} from "vs/workbench/api/node/extHostRequireInterceptor";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
import {
	ActivationKind,
	ExtensionActivationReason,
} from "vs/workbench/services/extensions/common/extensions";
import {
	type IMessagePassingProtocol,
	type IRPCProtocolLogger,
	RPCProtocol,
} from "vs/workbench/services/extensions/common/rpcProtocol";
import type {
	Uri as VscodeApiUri,
	FileSystem as VscodeFileSystem,
} from "vscode";

// Cocoon Specific Imports
import * as bootstrapUtils from "./cocoon-bootstrap";
import ipcApiInstance, { CocoonIpcApi, type VineMessage } from "./cocoon-ipc";
import { ShimExtHostApiDeprecationService } from "./shims/api-deprecation-shim";
import { ShimExtHostAuthentication } from "./shims/authentication-shim";
import { ShimExtHostCommands } from "./shims/commands-shim";
import { ShimExtHostConfiguration } from "./shims/configuration-shim";
import { ShimDiagnosticsService } from "./shims/diagnostics-shim";
import { ShimDocumentService } from "./shims/document-shim";
import { ShimExtensionEnablementService } from "./shims/enablement-service-shim";
import { ShimExtHostFileSystemInfo } from "./shims/file-system-info-shim";
import { ShimFileSystemApi } from "./shims/fs-api-shim";
import { FsModuleShimFactory } from "./shims/fs-module-shim-factory";
import { ShimExtensionHostKindPicker } from "./shims/host-kind-picker-shim";
import { ShimHostUtils } from "./shims/host-utils-shim";
import { ShimLanguageFeatures } from "./shims/language-features-shim";
import { ShimExtHostLanguageModels } from "./shims/language-models-shim";
import { ShimExtHostLocalizationService } from "./shims/localization-shim";
// Only if shims actually import and use it directly
// import { BaseCocoonShim } from "./_baseShim";

// Shim Implementations (import classes)
import { ShimLogService, ShimLoggerService } from "./shims/log-shim";
import { ShimExtHostManagedSockets } from "./shims/managed-sockets-shim";
import { NodeModuleShimFactory as NodeBuiltinsShimFactory } from "./shims/node-module-shim-factory";
import { ShimOutputService } from "./shims/output-channel-shim";
import {
	type IExtHostProposedApis as CocoonIExtHostProposedApis,
	ShimExtensionsProposedApi,
} from "./shims/proposed-api-shim";
import { ShimExtHostSecretState } from "./shims/secret-state-shim";
import { ShimExtensionStoragePaths } from "./shims/storage-paths-shim";
import { ShimExtHostStorage } from "./shims/storage-shim";
import { ShimExtHostTelemetry } from "./shims/telemetry-shim";
import { ShimExtHostTerminalService } from "./shims/terminal-service-shim";
import { ShimUriTransformerService } from "./shims/uri-transformer-shim";
import { ShimExtHostWorkspace } from "./shims/workspace-shim";

console.log("[Cocoon] Node.js Sidecar Process Starting...");

performance.mark(`code/extHost/willConnectToRenderer`);

const vsCodeOutPath = path.resolve(
	__dirname,

	"../../../Dependency/Microsoft/Dependency/Editor/out",

	// TODO: Configure externally
);

console.log(
	`[Cocoon] VS Code 'out' directory for module resolution: ${vsCodeOutPath}`,
);

if (fs.existsSync(vsCodeOutPath)) {
	if (Array.isArray((module as any).paths)) {
		(module as any).paths.unshift(path.join(vsCodeOutPath));

		console.log(
			"[Cocoon] VS Code 'out' directory prepended to module.paths.",
		);
	} else {
		console.warn("[Cocoon] module.paths not an array.");
	}
} else {
	console.error(
		`[Cocoon] CRITICAL FAILURE: VSCode 'out' directory NOT FOUND: ${vsCodeOutPath}`,
	);

	process.exit(1);
}

// --- Core VS Code Imports (Alphabetical for clarity) ---
console.log("[Cocoon] Importing core VS Code modules...");

// --- Global State ---
let cocoonDI: IInstantiationService | null = null;

let cocoonRpcProtocol: RPCProtocol | null = null;

let cocoonIpcAdapter: IMessagePassingProtocol | null = null;

let initializationFailedOrExited = false;

declare global {
	// Short alias
	var DI: IInstantiationService | undefined;

	var fsImplForVscodeApi: VscodeFileSystem | undefined;

	// Note: cocoonRpcProtocolInstance is used via (global as any) later, not strictly typed here.
}

global.DI = undefined;

global.fsImplForVscodeApi = undefined;

// --- Process Patching ---
bootstrapUtils.patchProcess(() => !initializationFailedOrExited);

// --- IPC Adapter Setup ---
console.log("[Cocoon] Creating IPC MessagePassingProtocol adapter for RPC...");

cocoonIpcAdapter = ipcApiInstance.createHostProtocolInterface();

// --- URI Revival for Initial Data ---
function reviveUriComponentsRaw(uriComponent: any): URI | undefined {
	if (!uriComponent) return undefined;

	try {
		if (
			typeof uriComponent === "object" &&
			uriComponent !== null &&
			(uriComponent.path !== undefined ||
				uriComponent.scheme !== undefined ||
				// Check for common URI properties
				uriComponent.authority !== undefined ||
				(uriComponent as any).$mid === MarshalledId.Uri ||
				(uriComponent as any).$mid === MarshalledId.UriSimple)
		) {
			return URI.revive(uriComponent as VSCodeInternalUriComponents);
		}
	} catch (e: any) {
		console.warn(
			`[Cocoon Pre-DI URI Revival] Failed for component:`,

			uriComponent,

			e,

			// Keep warning for hard failures
		);
	}

	return undefined;
}

function transformUrisInObjectRawForInitData(obj: any): any {
	if (
		!obj ||
		obj instanceof URI ||
		obj instanceof VSBuffer ||
		obj instanceof CancellationTokenSource ||
		typeof obj !== "object"
	) {
		return obj;
	}

	if (Array.isArray(obj)) {
		// If undefineds from failed revival in arrays are problematic, they might need filtering.
		// VS Code's own marshalling/revival handles this; here we replicate.
		// File 2 original: .map(...).filter(item => item !== undefined);

		// Retaining the filter as it was in File 2, assuming it's intentional.
		return obj
			.map((item) => transformUrisInObjectRawForInitData(item))
			.filter((item) => item !== undefined);
	}

	// Attempt to revive the object itself if it's a URI candidate
	const revivedUriAttempt = reviveUriComponentsRaw(obj);

	if (revivedUriAttempt instanceof URI) {
		return revivedUriAttempt;
	}

	// This case from File 2 seems specific, keep if it addresses a known issue.
	if (
		revivedUriAttempt === undefined &&
		obj.path &&
		obj.scheme &&
		!(obj instanceof Error)
	) {
		console.warn(
			"[Cocoon Pre-DI URI Transform] Transformer failed for potential URI, returning undefined:",

			obj,
		);

		return undefined;
	}

	const newObj: { [key: string]: any } = {};

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			newObj[key] = transformUrisInObjectRawForInitData(obj[key]);
		}
	}

	return newObj;
}

// --- Main Initialization Function ---
async function initializeCocoonHost(
	rawInitDataFromMountain: any,
): Promise<void> {
	console.log(
		"[Cocoon] Initializing Cocoon Extension Host Environment (Path A)...",
	);

	performance.mark(`code/extHost/didWaitForInitData`);

	if (initializationFailedOrExited) {
		console.warn("[Cocoon] Init skipped: already failed/exited.");

		return;
	}

	let logService: ILogService | undefined;

	try {
		console.log("[Cocoon] Reviving URIs in raw initData from Mountain...");

		const revivedInitData = transformUrisInObjectRawForInitData(
			rawInitDataFromMountain,
		) as ExtHostInitData;

		console.log(
			"[Cocoon] InitData URIs revived. Logs location:",

			revivedInitData.logsLocation.toString(),
		);

		if (!cocoonRpcProtocol)
			throw new Error(
				"RPCProtocol (cocoonRpcProtocol) not initialized before host init.",
			);

		console.log(
			"[Cocoon] Setting up ServiceCollection and core services...",
		);

		const services = new ServiceCollection();

		// A. Core services needed by many, including AbstractExtHostExtensionService constructor
		const initialLogLevel = revivedInitData.logLevel
			? (parseLogLevel(revivedInitData.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;

		logService = new ShimLogService(initialLogLevel);

		services.set(ILogService, logService);

		services.set(ILoggerService, new ShimLoggerService(logService));

		services.set(IExtHostInitDataService, {
			_serviceBrand: undefined,

			value: revivedInitData,
		});

		services.set(IExtHostRpcService, cocoonRpcProtocol);

		services.set(
			IURITransformerService,

			new ShimUriTransformerService(revivedInitData.remote?.authority),
		);

		services.set(IHostUtils, new ShimHostUtils(logService));

		// Shim constructors are based on File 2's usage.
		// If ShimExtHostFileSystemInfo needs RPC, it should be passed, e.g., cocoonRpcProtocol.getProxy(...)
		services.set(
			IExtHostFileSystemInfo,

			new ShimExtHostFileSystemInfo(undefined, logService),
		);

		services.set(
			IExtensionStoragePaths,

			new ShimExtensionStoragePaths(
				undefined,

				revivedInitData.environment,

				logService,
			),
		);

		services.set(
			IExtHostStorage,

			new ShimExtHostStorage(cocoonRpcProtocol, logService),
		);

		services.set(
			IExtHostSecretState,

			new ShimExtHostSecretState(cocoonRpcProtocol, logService),
		);

		services.set(
			IExtHostLocalizationService,

			new ShimExtHostLocalizationService(cocoonRpcProtocol, logService),
		);

		services.set(
			IExtHostManagedSockets,

			new ShimExtHostManagedSockets(cocoonRpcProtocol, logService),
		);

		services.set(
			IExtHostTelemetry,

			new ShimExtHostTelemetry(cocoonRpcProtocol, logService),
		);

		services.set(
			IExtHostApiDeprecationService,

			new ShimExtHostApiDeprecationService(undefined, logService),
		);

		// B. Instantiate DI service itself
		console.log("[Cocoon] Creating InstantiationService...");

		cocoonDI = new InstantiationService(services, true /* strict */);

		global.DI = cocoonDI;

		// C. Services that might depend on the initial set or be instantiated by DI
		const docService = cocoonDI.createInstance(ShimDocumentService);

		services.set(IExtHostDocuments, docService);

		const workspaceService = cocoonDI.createInstance(
			ShimExtHostWorkspace,

			cocoonDI.get(IExtHostFileSystemInfo),

			docService,
		);

		services.set(IExtHostWorkspace, workspaceService);

		const configService = cocoonDI.createInstance(ShimExtHostConfiguration);

		services.set(IExtHostConfiguration, configService);

		const commandsService = cocoonDI.createInstance(ShimExtHostCommands);

		services.set(IExtHostCommands, commandsService);

		const outputService = cocoonDI.createInstance(ShimOutputService);

		services.set(IExtHostOutputService, outputService);

		const diagnosticsService = cocoonDI.createInstance(
			ShimDiagnosticsService,
		);

		services.set(IExtHostDiagnostics, diagnosticsService);

		const terminalService = cocoonDI.createInstance(
			ShimExtHostTerminalService,
		);

		services.set(IExtHostTerminalService, terminalService);

		const authService = cocoonDI.createInstance(ShimExtHostAuthentication);

		services.set(IExtHostAuthentication, authService);

		const langModelsService = cocoonDI.createInstance(
			ShimExtHostLanguageModels,

			authService,
		);

		services.set(IExtHostLanguageModels, langModelsService);

		const langFeaturesService = cocoonDI.createInstance(
			ShimLanguageFeatures,

			docService,
		);

		services.set(IExtHostLanguageFeatures, langFeaturesService);

		services.set(
			IWorkbenchExtensionEnablementService,

			cocoonDI.createInstance(ShimExtensionEnablementService),
		);

		services.set(
			IExtensionHostKindPicker,

			cocoonDI.createInstance(ShimExtensionHostKindPicker),
		);

		const IExtHostProposedApis =
			createDecorator<CocoonIExtHostProposedApis>("extHostProposedApis");

		services.set(
			IExtHostProposedApis,

			cocoonDI.createInstance(ShimExtensionsProposedApi),
		);

		// D. REAL ExtHostExtensionService (from VS Code's sources)
		services.set(
			IExtHostExtensionService,

			new SyncDescriptor(ExtHostExtensionService),
		);

		// E. Add any remaining standard VS Code singleton descriptors
		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			if (!services.has(id)) services.set(id, descriptor);
		}

		// F. Instantiate and Install the NodeRequireInterceptor
		console.log("[Cocoon] Setting up NodeRequireInterceptor...");

		const apiFactoryProvider =
			cocoonDI.invokeFunction<IExtensionApiFactory>((accessor) => {
				const originalVSCodeFactory =
					createVSCodeApiFactoryOriginal(accessor);

				const localLogSvc = accessor.get(ILogService);

				const localFsApiShimInstance = new ShimFileSystemApi(
					localLogSvc,
				);

				global.fsImplForVscodeApi = localFsApiShimInstance;

				return (
					extensionDesc: IRelaxedExtensionDescription,

					extensionInfo,

					configProvider,
				) => {
					const vscodeApi = originalVSCodeFactory(
						extensionDesc,

						extensionInfo,

						configProvider,
					);

					if (!vscodeApi.workspace) (vscodeApi as any).workspace = {};

					(vscodeApi.workspace as any).fs = localFsApiShimInstance;

					return vscodeApi;
				};
			});

		const extHostWorkspaceService = cocoonDI.get(IExtHostWorkspace);

		const extPathIndexPromise =
			extHostWorkspaceService.getExtensionPathIndex();

		const extHostConfigService = cocoonDI.get(IExtHostConfiguration);

		const cfgProviderPromise = extHostConfigService.getConfigProvider();

		const [extPaths, cfgProvider] = await Promise.all([
			extPathIndexPromise,

			cfgProviderPromise,
		]);

		const moduleInterceptor = cocoonDI.invokeFunction((accessor) => {
			const interceptor = accessor.createInstance(
				NodeRequireInterceptor,

				apiFactoryProvider,

				{
					extensionRegistry: () =>
						accessor
							.get(IExtHostExtensionService)
							.getExtensionRegistry(),

					// If IExtHostRequireInterceptorOptions for the target VS Code version needs
					// globalStoragePath, storagePath, etc., they would be sourced from revivedInitData
					// and passed here. Assuming current options are sufficient based on File 2.
				},
			);

			interceptor.register(
				new VSCodeNodeModuleFactory(
					apiFactoryProvider,

					extPaths!,

					cfgProvider,

					accessor.get(ILogService),
				),
			);

			interceptor.register(
				accessor.createInstance(NodeModuleAliasingModuleFactory),
			);

			interceptor.register(new FsModuleShimFactory());

			interceptor.register(new NodeBuiltinsShimFactory());

			return interceptor;
		});

		console.log("[Cocoon] Installing NodeRequireInterceptor...");

		await moduleInterceptor.install();

		console.log("[Cocoon] NodeRequireInterceptor installed.");

		// G. Install Error Handlers
		console.log("[Cocoon] Installing Error Handlers...");

		const errorHandlerInstance = cocoonDI.createInstance(ErrorHandler);

		ErrorHandler.installEarlyHandler(errorHandlerInstance, cocoonDI);

		process.on("uncaughtException", (err: Error) =>
			ErrorHandler.onUnexpectedError(err, cocoonRpcProtocol || undefined),
		);

		process.on("unhandledRejection", (reason: any) =>
			ErrorHandler.onUnexpectedError(
				reason,

				cocoonRpcProtocol || undefined,
			),
		);

		console.log("[Cocoon] Error handlers installed.");

		// H. Instantiate and Initialize the REAL ExtHostExtensionService
		console.log(
			"[Cocoon] Getting real ExtHostExtensionService instance from DI...",
		);

		const extensionService =
			cocoonDI.invokeFunction<IExtHostExtensionService>((accessor) =>
				accessor.get(IExtHostExtensionService),
			);

		console.log(
			"[Cocoon] Initializing real ExtHostExtensionService (will load extensions)...",
		);

		await extensionService.initialize();

		console.log(
			"[Cocoon] Real ExtHostExtensionService initialized successfully.",
		);

		ErrorHandler.installFullHandler(errorHandlerInstance, cocoonDI);

		logService?.info("[Cocoon] Full error handler installed.");

		console.log(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);

		ipcApiInstance.sendNotificationToMountain("extHostInitialized", {});
	} catch (hostError: any) {
		initializationFailedOrExited = true;

		const finalError =
			hostError instanceof Error
				? hostError
				: new Error(String(hostError));

		console.error(
			"[Cocoon] FATAL: Failed to initialize Cocoon Extension Host:",

			finalError.message,

			finalError.stack,
		);

		logService?.error("[Cocoon] FATAL during initialization:", finalError);

		try {
			ipcApiInstance.sendNotificationToMountain("extHostError", {
				message: `Cocoon initialization failed: ${finalError.message}`,

				stack: finalError.stack,

				name: finalError.name,
			});
		} catch (sendError: any) {
			console.error(
				"[Cocoon] Also failed to send initialization error to Mountain:",

				sendError,
			);
		}

		process.exit(1);
	}
}

// --- Main Message Listener & Readiness Signal ---
let isInitializationStarted = false;

console.log(
	"[Cocoon] Setting up main IPC message listener for 'initExtensionHost' command...",
);

ipcApiInstance.onMessageFromMountain((message: VineMessage) => {
	if (isInitializationStarted) return;

	if (
		message &&
		message.msg_type === 1 /* Request */ &&
		message.method === "initExtensionHost" &&
		message.params
	) {
		console.log(
			"[Cocoon] Received 'initExtensionHost' command from Mountain.",
		);

		isInitializationStarted = true;

		console.log("[Cocoon] Creating RPCProtocol instance...");

		if (!cocoonIpcAdapter) {
			console.error(
				"[Cocoon] CRITICAL: IPC Adapter (cocoonIpcAdapter) is null. Cannot create RPCProtocol.",
			);

			initializationFailedOrExited = true;

			process.exit(1);

			return;
		}

		const rpcLogger: IRPCProtocolLogger | null = null;

		// Assign to global first, then to module-scoped variable, as per File 2's pattern
		(global as any).cocoonRpcProtocolInstance = new RPCProtocol(
			cocoonIpcAdapter,

			rpcLogger,

			null /* IURITransformer */,
		);

		cocoonRpcProtocol = (global as any).cocoonRpcProtocolInstance;

		initializeCocoonHost(message.params).catch((err: any) => {
			if (!initializationFailedOrExited) {
				initializationFailedOrExited = true;

				const finalError =
					err instanceof Error ? err : new Error(String(err));

				console.error(
					"[Cocoon] Unhandled promise rejection during async initializeCocoonHost:",

					finalError.message,

					finalError.stack,
				);

				try {
					ipcApiInstance.sendNotificationToMountain("extHostError", {
						message: `Cocoon async init catastrophically failed: ${finalError.message}`,

						stack: finalError.stack,

						name: finalError.name,
					});
				} catch (sendError: any) {
					console.error(
						"[Cocoon] Also failed to send async init catastrophy to Mountain:",

						sendError,
					);
				}

				process.exit(1);
			}
		});
	} else if (
		message &&
		message.msg_type !== 6 /* Notification */ &&
		message.method !== "rpcData" /* Internal RPC */
	) {
		console.warn(
			`[Cocoon] Unexpected IPC message before 'initExtensionHost': Method='${message?.method}', Type=${message?.msg_type}`,
		);
	}
});

ipcApiInstance.sendNotificationToMountain("extHostReadyForInit", {});

console.log(
	"[Cocoon] Cocoon sidecar is ready and waiting for 'initExtensionHost' from Mountain.",
);
