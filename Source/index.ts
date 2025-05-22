import * as fs from "fs";
import * as path from "path";
import { performance } from "perf_hooks";
import { VSBuffer } from "vs/base/common/buffer";
import {
	MarshalledId,
	revive as vscodeCoreRevive,
} from "vs/base/common/marshalling";
// For URI revival & general revival
import {
	URI,
	UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import {
	ExtensionIdentifier,
	IExtensionDescription,
	IExtensionDescriptionDelta,
	IRelaxedExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	createDecorator,
	IInstantiationService,
	InstantiationService,
} from "vs/platform/instantiation/common/instantiationService";
import {
	ServiceCollection,
	SyncDescriptor,
} from "vs/platform/instantiation/common/serviceCollection";
// Service Interfaces
import {
	ILoggerService,
	ILogService,
	LogLevel,
	parseLogLevel,
} from "vs/platform/log/common/log";
// The interface

// Interceptor & Error Handling
import { ErrorHandler } from "vs/workbench/api/common/extensionHostMain";
import {
	createApiFactory as createVSCodeApiFactoryOriginal,
	IExtensionApiFactory,
} from "vs/workbench/api/common/extHost.api.impl";
import {
	ExtHostContext,
	ExtHostWorkspaceShape,
	MainContext,
	IWorkspaceData as RpcWorkspaceData,
} from "vs/workbench/api/common/extHost.protocol";
// For ApiFactory
import { IExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService";
import {
	ExtHostCommandsShape,
	IExtHostCommands,
} from "vs/workbench/api/common/extHostCommands";
// Import real shape
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
// Using IExtHostDocuments for service ID
import {
	ExtensionPaths,
	IExtHostExtensionService,
	IHostUtils,
} from "vs/workbench/api/common/extHostExtensionService";
// As defined in AbstractExtHostExtensionService

import { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
import {
	ExtHostInitData,
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	ExtHostLanguageFeaturesShape,
	IExtHostLanguageFeatures,
} from "vs/workbench/api/common/extHostLanguageFeatures";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels";
// For real ExtHostExtensionService
import { IExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";
// For real ExtHostExtensionService
import { IExtHostManagedSockets } from "vs/workbench/api/common/extHostManagedSockets";
import { IExtHostOutputService } from "vs/workbench/api/common/extHostOutput";
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
import {
	IURITransformer,
	IURITransformerService,
} from "vs/workbench/api/common/extHostUriTransformerService";
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace";
// REAL Extension Service Implementation (Node specific)
import { ExtHostExtensionService } from "vs/workbench/api/node/extHostExtensionService";
import {
	NodeModuleAliasingModuleFactory,
	NodeRequireInterceptor,
	INodeModuleFactory as VscodeINodeModuleFactory,
	VSCodeNodeModuleFactory,
} from "vs/workbench/api/node/extHostRequireInterceptor";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
import {
	ActivationKind,
	ExtensionActivationReason,
} from "vs/workbench/services/extensions/common/extensions";
// Or from extHostExtensionActivator
import {
	IMessagePassingProtocol,
	IRPCProtocolLogger,
	RPCProtocol,
} from "vs/workbench/services/extensions/common/rpcProtocol";
import type {
	Uri as VscodeApiUri,
	FileSystem as VscodeFileSystem,
} from "vscode";

// For API factory typing

// Type from AbstractExtHostExtensionService context

// Cocoon Specific Imports
import * as bootstrapUtils from "./cocoon-bootstrap";
// Import VineMessage
import ipcApiInstance, { CocoonIpcApi, VineMessage } from "./cocoon-ipc";
// TODO: Create this shim
import { ShimExtHostApiDeprecationService } from "./shims/api-deprecation-shim";
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
// TODO: Create this simple shim
import { ShimExtHostLocalizationService } from "./shims/localization-shim";
// Shim Implementations (import classes)
import { ShimLoggerService, ShimLogService } from "./shims/log-shim";
// TODO: Create this shim (likely complex or NOP)
import { ShimExtHostManagedSockets } from "./shims/managed-sockets-shim";
import { NodeModuleShimFactory as NodeBuiltinsShimFactory } from "./shims/node-module-shim-factory";
import { ShimOutputService } from "./shims/output-channel-shim";
import {
	IExtHostProposedApis as CocoonIExtHostProposedApis,
	ShimExtensionsProposedApi,
} from "./shims/proposed-api-shim";
import { ShimExtHostSecretState } from "./shims/secret-state-shim";
import { ShimExtensionStoragePaths } from "./shims/storage-paths-shim";
import { ShimExtHostStorage } from "./shims/storage-shim";
import { ShimExtHostTerminalService } from "./shims/terminal-service-shim";
import { ShimUriTransformerService } from "./shims/uri-transformer-shim";
import {
	WorkspaceFoldersChangeEvent as CocoonWorkspaceFoldersChangeEvent,
	ShimExtHostWorkspace,
} from "./shims/workspace-shim";

/*---------------------------------------------------------------------------------------------
 * Cocoon Main Entry Point (index.ts)
 * --------------------------------------------------------------------------------------------
 * Orchestrates the Cocoon Node.js sidecar: sets up the environment, DI, shims,
 * runs the real VS Code ExtHostExtensionService, and manages IPC with Mountain.
 * This implementation is for Path A (Cocoon Sidecar).
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon] Node.js Sidecar Process Starting...");

performance.mark(`code/extHost/willConnectToRenderer`);

// TODO: Centralize this path configuration (e.g., via env var or startup arg from Mountain).
const vsCodeOutPath = path.resolve(
	__dirname,
	"../../../Dependency/Microsoft/Dependency/Editor/out",
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
		/* Should not happen in standard Node.js */ console.warn(
			"[Cocoon] module.paths not an array.",
		);
	}
} else {
	console.error(
		`[Cocoon] CRITICAL FAILURE: VSCode 'out' directory NOT FOUND: ${vsCodeOutPath}`,
	);
	process.exit(1);
}

// --- Core VS Code & Node Imports ---
console.log("[Cocoon] Importing core VS Code and Node modules...");

// --- Global State ---
// Renamed for clarity
let cocoonInstantiationService: IInstantiationService | null = null;
// Renamed
let cocoonRpcProtocol: RPCProtocol | null = null;
// Renamed
let cocoonIpcAdapter: IMessagePassingProtocol | null = null;
let initializationFailedOrExited: boolean = false;

declare global {
	// Simpler global name for DI
	var cocoonDI: IInstantiationService | undefined;
	// cocoonFileSystemApiService used by vscode.ts to inject workspace.fs
	var cocoonFileSystemApiServiceInstance: VscodeFileSystem | undefined;
}
global.cocoonDI = undefined;
global.cocoonFileSystemApiServiceInstance = undefined;

// --- Process Patching ---
bootstrapUtils.patchProcess(() => !initializationFailedOrExited);

// --- IPC Adapter Setup ---
console.log("[Cocoon] Creating IPC MessagePassingProtocol adapter for RPC...");
cocoonIpcAdapter = ipcApiInstance.createHostProtocolInterface();

// --- URI Revival for Initial Data (Pre-DI) ---
// This uses VS Code's core URI.revive and marshalling concepts.
function reviveUriComponentsInObject(obj: any): any {
	if (!obj) return obj;
	if (Array.isArray(obj))
		return obj.map((item) => reviveUriComponentsInObject(item));
	if (typeof obj === "object") {
		// Check if it's a candidate for URI revival (has $mid or common URI props)
		if (
			(obj as any).$mid === MarshalledId.Uri ||
			(obj.scheme && obj.path !== undefined)
		) {
			try {
				return URI.revive(obj as VSCodeInternalUriComponents);
			} catch (e) {
				/* console.warn(`Pre-DI URI revival failed for candidate:`, obj, e); */
				// Might be too noisy
			}
		}
		const newObj: { [key: string]: any } = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				newObj[key] = reviveUriComponentsInObject(obj[key]);
			}
		}
		return newObj;
	}
	return obj;
}

// --- Main Initialization Function ---
async function initializeCocoonHost(
	rawInitDataFromMountain: any,
): Promise<void> {
	console.log("[Cocoon] Initializing Cocoon Extension Host Environment...");
	performance.mark(`code/extHost/didWaitForInitData`);
	if (initializationFailedOrExited) {
		console.warn("[Cocoon] Init skipped: already failed/exited.");
		return;
	}

	// For use in final catch block
	let logService: ILogService | undefined;

	try {
		console.log("[Cocoon] Reviving URIs in raw initData from Mountain...");
		const revivedInitData = reviveUriComponentsInObject(
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

		// 2. Service Collection & Core Services (Log, InitData, RPC, URI Transformer, HostUtils, FSInfo)
		console.log(
			"[Cocoon] Setting up ServiceCollection and core services...",
		);
		const services = new ServiceCollection();

		const initialLogLevel = revivedInitData.logLevel
			? (parseLogLevel(revivedInitData.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;
		// Use parsed level
		logService = new ShimLogService(initialLogLevel);
		services.set(ILogService, logService);
		services.set(ILoggerService, new ShimLoggerService(logService));
		services.set(IExtHostInitDataService, {
			_serviceBrand: undefined,
			value: revivedInitData,
		});
		// The real RPCProtocol instance
		services.set(IExtHostRpcService, cocoonRpcProtocol);
		services.set(
			IURITransformerService,
			new ShimUriTransformerService(revivedInitData.remote?.authority),
		);
		services.set(IHostUtils, new ShimHostUtils());
		services.set(
			IExtHostFileSystemInfo,
			new ShimExtHostFileSystemInfo(logService),
			// Provide logService
		);
		services.set(
			IExtHostApiDeprecationService,
			new ShimExtHostApiDeprecationService(logService),
			// Provide logService
		);
		services.set(
			IExtHostLocalizationService,
			new ShimExtHostLocalizationService(logService),
			// Provide logService
		);
		services.set(
			IExtHostManagedSockets,
			new ShimExtHostManagedSockets(logService),
			// Provide logService
		);
		// TODO: For telemetry, IExtHostTelemetry needs to be shimmed or a NOP impl provided if real ExtHostExtensionService requires it.
		// For now, assuming real ExtHostExtensionService can handle it being potentially undefined or a simple object.
		services.set(IExtHostTelemetry, {
			_serviceBrand: undefined,
			$publicLog() {},
			$publicLog2() {},
			onExtensionError: () => false,
		});

		// 3. Create InstantiationService
		console.log("[Cocoon] Creating InstantiationService...");
		cocoonInstantiationService = new InstantiationService(
			services,
			true /* strict */,
		);
		// Make available via simpler global name
		global.cocoonDI = cocoonInstantiationService;

		// 4. Instantiate and Register Shims (and real services where applicable) via DI
		console.log(
			"[Cocoon] Instantiating and registering remaining shims/services...",
		);

		// Shims that are dependencies for other services or the real ExtHostExtensionService
		const docService =
			cocoonInstantiationService.createInstance(ShimDocumentService);
		// Also used by ExtHostDocumentsAndEditors if that's separate
		services.set(IExtHostDocuments, docService);

		// If VS Code's ExtHostDocumentsAndEditors service is used instead of just IExtHostDocuments,
		// it would be: services.set(IExtHostDocumentsAndEditors, new SyncDescriptor(ExtHostDocumentsAndEditors));
		// For now, ShimDocumentService implements IExtHostDocumentsShape for simplicity.

		const langFeaturesService = cocoonInstantiationService.createInstance(
			ShimLanguageFeatures,
			docService,
		);
		services.set(IExtHostLanguageFeatures, langFeaturesService);

		const workspaceService = cocoonInstantiationService.createInstance(
			// initDataService is implicitly injected by DI
			ShimExtHostWorkspace,
			// Pass IExtHostFileSystemInfo
			cocoonInstantiationService.get(IExtHostFileSystemInfo),
			docService,
		);
		services.set(IExtHostWorkspace, workspaceService);

		const configService = cocoonInstantiationService.createInstance(
			ShimExtHostConfiguration,
			// initDataService injected by DI
		);
		services.set(IExtHostConfiguration, configService);

		services.set(
			IExtensionStoragePaths,
			cocoonInstantiationService.createInstance(
				ShimExtensionStoragePaths,
			),
			// initDataService injected by DI
		);
		services.set(
			IExtHostStorage,
			cocoonInstantiationService.createInstance(ShimExtHostStorage),
		);
		services.set(
			IExtHostCommands,
			cocoonInstantiationService.createInstance(ShimExtHostCommands),
		);
		services.set(
			IExtHostSecretState,
			cocoonInstantiationService.createInstance(ShimExtHostSecretState),
		);
		services.set(
			IExtHostOutputService,
			cocoonInstantiationService.createInstance(ShimOutputService),
		);
		services.set(
			IExtHostDiagnostics,
			cocoonInstantiationService.createInstance(ShimDiagnosticsService),
		);
		services.set(
			IExtHostTerminalService,
			cocoonInstantiationService.createInstance(
				ShimExtHostTerminalService,
			),
		);
		services.set(
			IExtHostLanguageModels,
			cocoonInstantiationService.createInstance(
				ShimExtHostLanguageModels,
			),
			// Pass IExtHostAuth
		);
		services.set(
			IWorkbenchExtensionEnablementService,
			cocoonInstantiationService.createInstance(
				ShimExtensionEnablementService,
			),
		);
		services.set(
			IExtensionHostKindPicker,
			cocoonInstantiationService.createInstance(
				ShimExtensionHostKindPicker,
			),
		);

		// Proposed APIs Service
		const IExtHostProposedApis =
			// Use VS Code's pattern
			createDecorator<CocoonIExtHostProposedApis>("extHostProposedApis");
		services.set(
			IExtHostProposedApis,
			cocoonInstantiationService.createInstance(
				ShimExtensionsProposedApi,
			),
		);

		// REAL ExtHostExtensionService (from VS Code's sources)
		// Its dependencies like IExtHostApiDeprecationService, IExtHostLocalizationService, IExtHostTelemetry, etc.,
		// must be available in the `services` ServiceCollection.
		services.set(
			IExtHostExtensionService,
			new SyncDescriptor(ExtHostExtensionService),
		);

		// 5. Add any remaining standard VS Code singleton descriptors
		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			if (!services.has(id)) services.set(id, descriptor);
		}

		// 6. Instantiate and Install the NodeRequireInterceptor
		console.log("[Cocoon] Setting up NodeRequireInterceptor...");

		const apiFactoryProvider =
			cocoonInstantiationService.invokeFunction<IExtensionApiFactory>(
				(accessor) => {
					const originalVSCodeFactory =
						createVSCodeApiFactoryOriginal(accessor);
					// Get from accessor
					const localLogSvc = accessor.get(ILogService);
					const localFsApiShimInstance = new ShimFileSystemApi(
						localLogSvc,
					);
					global.cocoonFileSystemApiServiceInstance =
						localFsApiShimInstance;

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
						if (!vscodeApi.workspace)
							(vscodeApi as any).workspace = {};
						(vscodeApi.workspace as any).fs =
							// Inject our FS API shim
							localFsApiShimInstance;
						return vscodeApi;
					};
				},
			);

		// From ShimExtHostWorkspace
		const extPaths = await workspaceService.getExtensionPathIndex();
		// From ShimExtHostConfiguration
		const cfgProvider = await configService.getConfigProvider();

		const moduleInterceptor = cocoonInstantiationService.invokeFunction(
			(accessor) => {
				const interceptor = accessor.createInstance(
					NodeRequireInterceptor,
					apiFactoryProvider,
					{
						// Use global Map/Set
						ExtensionIdentifierMap: Map,
						ExtensionIdentifierSet: Set,
						extensionRegistry: accessor
							.get(IExtHostExtensionService)
							// Pass promise
							.getExtensionRegistry(),
					},
				);
				interceptor.register(
					new VSCodeNodeModuleFactory(
						apiFactoryProvider,
						extPaths,
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
			},
		);
		console.log("[Cocoon] Installing NodeRequireInterceptor...");
		// This patches `require`
		await moduleInterceptor.install();
		console.log("[Cocoon] NodeRequireInterceptor installed.");

		// 7. Install Error Handlers
		console.log("[Cocoon] Installing Error Handlers...");
		const errorHandlerInstance =
			cocoonInstantiationService.createInstance(ErrorHandler);
		ErrorHandler.installEarlyHandler(
			errorHandlerInstance,
			cocoonInstantiationService,
		);
		console.log("[Cocoon] Early error handler installed.");
		// Global uncaught exception handlers
		process.on(
			"uncaughtException",
			(err: Error) =>
				ErrorHandler.onUnexpectedError(err, cocoonRpcProtocol),
			// Use ErrorHandler's static method
		);
		process.on("unhandledRejection", (reason: any) =>
			ErrorHandler.onUnexpectedError(reason, cocoonRpcProtocol),
		);

		// 8. Instantiate and Initialize the REAL ExtHostExtensionService
		console.log(
			"[Cocoon] Instantiating real ExtHostExtensionService via DI...",
		);
		const extensionService =
			cocoonInstantiationService.invokeFunction<IExtHostExtensionService>(
				(accessor) => accessor.get(IExtHostExtensionService),
			);

		console.log(
			"[Cocoon] Initializing real ExtHostExtensionService (this will load extensions)...",
		);
		await extensionService.initialize();
		console.log(
			"[Cocoon] Real ExtHostExtensionService initialized successfully.",
		);

		ErrorHandler.installFullHandler(
			errorHandlerInstance,
			cocoonInstantiationService,
		);
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
		// Use logService if available
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
// Renamed
let isInitializationTriggered = false;
console.log(
	"[Cocoon] Setting up main IPC message listener for 'initExtensionHost' command...",
);

ipcApiInstance.onMessageFromMountain((message: VineMessage) => {
	// Use VineMessage type
	if (isInitializationTriggered) return;

	if (
		message &&
		message.msg_type === 1 /* Request */ &&
		message.method === "initExtensionHost" &&
		message.params
	) {
		console.log(
			"[Cocoon] Received 'initExtensionHost' command from Mountain.",
		);
		isInitializationTriggered = true;

		console.log("[Cocoon] Creating RPCProtocol instance...");
		if (!cocoonIpcAdapter) {
			// Was ipcMessagePassingProtocol
			console.error(
				"[Cocoon] CRITICAL: IPC Adapter (cocoonIpcAdapter) is null. Cannot create RPCProtocol.",
			);
			initializationFailedOrExited = true;
			process.exit(1);
			return;
		}
		// The IURITransformer is null for local extension hosts.
		// The RPCProtocol takes an optional IRPCProtocolLogger. We can pass a basic one or null.
		// TODO: Implement a basic RPC logger if needed
		const rpcLogger: IRPCProtocolLogger | null = null;
		global.cocoonRpcProtocolInstance = new RPCProtocol(
			cocoonIpcAdapter,
			rpcLogger,
			null /* IURITransformer */,
		);
		cocoonRpcProtocol = global.cocoonRpcProtocolInstance;

		initializeCocoonHost(
			message.params /* raw initData from Mountain */,
		).catch((err: any) => {
			if (!initializationFailedOrExited) {
				// Prevent double error handling
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
			`[Cocoon] Received unexpected IPC message before 'initExtensionHost': Method='${message?.method}', Type=${message?.msg_type}`,
		);
	}
});

ipcApiInstance.sendNotificationToMountain("extHostReadyForInit", {});
console.log(
	"[Cocoon] Cocoon sidecar is ready and waiting for 'initExtensionHost' from Mountain.",
);
// --- END OF FILE index.ts ---
