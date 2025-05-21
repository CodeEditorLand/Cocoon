// Node.js built-in
import * as fs from "fs";
// --- Setup Module Paths ---
import * as path from "path";
// Node.js built-in
import { performance } from "perf_hooks";
import { VSBuffer } from "vs/base/common/buffer";
// VS Code internal URI
import { URI, UriComponents as VSCodeUriComponents } from "vs/base/common/uri";
import {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	createDecorator,
	IInstantiationService,
	InstantiationService,
} from "vs/platform/instantiation/common/instantiationService";
// MarshalledId and revive are used by BaseCocoonShim, direct import not strictly needed here if BaseCocoonShim handles it.
// import { MarshalledId } from "vs/base/common/marshallingIds";

// Alias to avoid conflict with local revive
// import { revive as vscodeRevive } from "vs/base/common/marshalling";
import {
	ServiceCollection,
	SyncDescriptor,
} from "vs/platform/instantiation/common/serviceCollection";
// Service Interfaces (ensure paths and names match your VS Code version)
import {
	ILoggerService,
	ILogService,
	LogLevel,
} from "vs/platform/log/common/log";
// Interceptor & Error Handling
import { ErrorHandler } from "vs/workbench/api/common/extensionHostMain";
import {
	createApiFactory as createVSCodeApiFactory,
	IExtensionApiFactory /* VSCodeAPI */,
} from "vs/workbench/api/common/extHost.api.impl";
import {
	ExtHostContext,
	MainContext,
	IWorkspaceData as RpcWorkspaceData,
	ExtHostWorkspaceShape as VscodeExtHostWorkspaceShape,
} from "vs/workbench/api/common/extHost.protocol";
// Use DTOs from protocol

import { IExtHostCommands } from "vs/workbench/api/common/extHostCommands";
import {
	IExtHostConfiguration,
	IExtHostConfigurationShape,
} from "vs/workbench/api/common/extHostConfiguration";
import {
	ExtHostDiagnosticsShape,
	IExtHostDiagnostics,
} from "vs/workbench/api/common/extHostDiagnostics";
// Added ExtHostDiagnosticsShape
import {
	IExtHostDocuments,
	IExtHostDocumentsShape,
} from "vs/workbench/api/common/extHostDocuments";
// Path might vary
import { IHostUtils } from "vs/workbench/api/common/extHostExtensionService";
// Needed for Workspace shim
import { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
import {
	ExtHostInitData,
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	IExtHostLanguageFeatures,
	ExtHostLanguageFeaturesShape as VscodeExtHostLangFeaturesShape,
} from "vs/workbench/api/common/extHostLanguageFeatures";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels";
import { IExtHostOutputService } from "vs/workbench/api/common/extHostOutput";
import { IExtHostRpcService } from "vs/workbench/api/common/extHostRpcService";
import { IExtHostSecretState } from "vs/workbench/api/common/extHostSecretState";
import { IExtHostStorage } from "vs/workbench/api/common/extHostStorage";
import { IExtensionStoragePaths } from "vs/workbench/api/common/extHostStoragePaths";
import {
	IExtHostTerminalService,
	IExtHostTerminalServiceShape,
} from "vs/workbench/api/common/extHostTerminalService";
import { IURITransformerService } from "vs/workbench/api/common/extHostUriTransformerService";
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace";
// Real Extension Service Implementation (Node specific)
import {
	ExtHostExtensionService,
	IExtHostExtensionService,
} from "vs/workbench/api/node/extHostExtensionService";
import {
	INodeModuleFactory,
	NodeModuleAliasingModuleFactory,
	NodeRequireInterceptor,
	VSCodeNodeModuleFactory,
} from "vs/workbench/api/node/extHostRequireInterceptor";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
// ExtensionActivationReason might be part of extHostExtensionActivator or extensions itself
import {
	ActivationKind,
	ExtensionActivationReason,
} from "vs/workbench/services/extensions/common/extensions";
import {
	IMessagePassingProtocol,
	RPCProtocol,
} from "vs/workbench/services/extensions/common/rpcProtocol";
import type {
	Uri as VscodeApiUri,
	FileSystem as VscodeFileSystem,
} from "vscode";

// For API factory

// Cocoon Specific Imports
// Use namespace import
import * as bootstrapUtils from "./cocoon-bootstrap";
// Default import
import ipcApiInstance, { CocoonIpcApi } from "./cocoon-ipc";
import { ShimExtHostCommands } from "./shims/commands-shim";
import { ShimExtHostConfiguration } from "./shims/configuration-shim";
import { ShimDiagnosticsService } from "./shims/diagnostics-shim";
import { ShimDocumentService } from "./shims/document-shim";
import { ShimExtensionEnablementService } from "./shims/enablement-service-shim";
import {
	IExtHostFileSystemInfo as CocoonIExtHostFileSystemInfo,
	ShimExtHostFileSystemInfo,
} from "./shims/file-system-info-shim";
// Assuming you create this
import { ShimFileSystemApi } from "./shims/fs-api-shim";
import { FsModuleShimFactory } from "./shims/fs-module-shim-factory";
import { ShimExtensionHostKindPicker } from "./shims/host-kind-picker-shim";
import { ShimHostUtils } from "./shims/host-utils-shim";
import {
	ExtHostLanguageFeaturesServiceShape as CocoonExtHostLangFeaturesShape,
	ShimLanguageFeatures,
} from "./shims/language-features-shim";
import { ShimExtHostLanguageModels } from "./shims/language-models-shim";
// Shim Implementations (import classes)
import { ShimLoggerService, ShimLogService } from "./shims/log-shim";
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

// Import event type

/*---------------------------------------------------------------------------------------------
 * Cocoon Bootstrap Entry Point (index.ts)
 * --------------------------------------------------------------------------------------------
 * Main entry point for the Cocoon Node.js sidecar process.
 * Sets up the environment, loads VS Code platform code, registers shims,
 *
 * initializes ExtHostExtensionService, and runs extensions.
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon] Node.js Sidecar Starting...");

performance.mark(`code/extHost/willConnectToRenderer`);

// TODO: Ensure this path is robust and correctly points to VS Code's 'out' directory.
// Consider using an environment variable or a configuration file for this path.
const vsCodeOutPath = path.resolve(
	__dirname,

	"../../../Dependency/Microsoft/Dependency/Editor/out",
);

console.log(
	`[Cocoon] Verifying VS Code build output directory for require(): ${vsCodeOutPath}`,
);

if (fs.existsSync(vsCodeOutPath)) {
	if (Array.isArray((module as any).paths)) {
		// Node.js specific module.paths
		// Add to the beginning for higher precedence
		(module as any).paths.unshift(path.join(vsCodeOutPath));
		console.log(
			"[Cocoon] VS Code 'out' directory found. Updated Node.js module.paths.",
		);
	} else {
		console.warn(
			"[Cocoon] module.paths is not an array or not available, cannot prepend VS Code 'out' directory path.",
		);
	}
} else {
	console.error(
		`[Cocoon] CRITICAL ERROR: VSCode 'out' directory not found at expected location: ${vsCodeOutPath}.`,
	);

	console.error(
		"[Cocoon] Please ensure VSCode has been built successfully and the path is correct.",
	);

	process.exit(1);
}

// --- Core VSCode & Node Imports ---
console.log("[Cocoon] Importing core modules...");

// --- Global State ---
let instantiationService: IInstantiationService | null = null;

let rpcProtocolInstance: RPCProtocol | null = null;

// Renamed for clarity
let ipcMessagePassingProtocol: IMessagePassingProtocol | null = null;
// Combined flag
let didFailOrExit: boolean = false;

declare global {
	var cocoonInstantiationService: IInstantiationService | null;

	var cocoonRpcProtocolInstance: RPCProtocol | null;

	// For workspace.fs in vscode.ts
	var cocoonFileSystemApiService: VscodeFileSystem | null;
}
global.cocoonInstantiationService = null;

global.cocoonRpcProtocolInstance = null;

global.cocoonFileSystemApiService = null;

// --- Process Patching ---
// Pass the control flag
bootstrapUtils.patchProcess(() => !didFailOrExit);

// --- IPC Adapter Setup ---
console.log("[Cocoon] Creating Host Protocol Interface (IPC Adapter)...");

// Use imported instance
ipcMessagePassingProtocol = ipcApiInstance.createHostProtocolInterface();

// --- URI Helper Functions (from BaseCocoonShim, could be centralized or part of a utility class) ---
// For initial initData revival, we need a basic reviver before full DI is up.
function reviveUriDtoRaw(uriComponent: any): URI | undefined {
	if (!uriComponent) return undefined;

	try {
		if (
			typeof uriComponent === "object" &&
			uriComponent !== null &&
			(uriComponent.path ||
				uriComponent.scheme ||
				uriComponent.authority ||
				(uriComponent as any).$mid === 1)
		) {
			return URI.revive(uriComponent as VSCodeUriComponents);
		}
	} catch (e: any) {
		console.error(
			`[Cocoon Pre-DI URI Revival] Failed for component:`,

			uriComponent,

			e,
		);
	}
	return undefined;
}
function transformUrisInObjectRaw(
	obj: any,

	transformerFunc: (component: any) => URI | undefined,
): any {
	if (!obj || obj instanceof URI) return obj;

	if (Array.isArray(obj))
		return obj
			.map((item) => transformUrisInObjectRaw(item, transformerFunc))
			.filter((item) => item !== undefined);

	if (typeof obj === "object") {
		const revivedUriAttempt = transformerFunc(obj);

		if (revivedUriAttempt instanceof URI) return revivedUriAttempt;

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

		for (const key in obj)
			if (Object.prototype.hasOwnProperty.call(obj, key))
				newObj[key] = transformUrisInObjectRaw(
					obj[key],

					transformerFunc,
				);

		return newObj;
	}
	return obj;
}

// --- Main Initialization Function ---
async function initializeCocoonExtensionHost(rawInitData: any): Promise<void> {
	console.log("[Cocoon] Initializing Extension Host Environment...");

	performance.mark(`code/extHost/didWaitForInitData`);

	if (didFailOrExit) {
		console.warn(
			"[Cocoon] Initialization skipped, already failed or exited.",
		);

		return;
	}

	let logService: ILogService | undefined;

	try {
		console.log("[Cocoon] Reviving URIs in initial initData...");

		const initData = transformUrisInObjectRaw(
			rawInitData,

			reviveUriDtoRaw,
		) as ExtHostInitData;

		console.log("[Cocoon] URIs in initData revived.");

		// 1. RPC Protocol Instance (already created and assigned to rpcProtocolInstance)
		if (!rpcProtocolInstance)
			throw new Error("RPCProtocol instance is null, cannot proceed.");

		// 2. Service Collection and Core Services
		console.log(
			"[Cocoon] Setting up ServiceCollection and core services...",
		);

		const serviceCollection = new ServiceCollection();

		// Default to Trace for dev, initData might override
		logService = new ShimLogService(LogLevel.Trace);
		// TODO: Use initData.logLevel if provided by Mountain to set initial log level
		// if (initData.logLevel) { logService.setLevel(initData.logLevel); }
		serviceCollection.set(ILogService, logService);

		serviceCollection.set(
			ILoggerService,

			new ShimLoggerService(logService),

			// Pass ILogService
		);

		const initDataService: IExtHostInitDataService = {
			_serviceBrand: undefined,

			...initData,
		};

		serviceCollection.set(IExtHostInitDataService, initDataService);

		// The real RPCProtocol
		serviceCollection.set(IExtHostRpcService, rpcProtocolInstance);
		serviceCollection.set(
			IURITransformerService,

			new ShimUriTransformerService(initData.remote?.authority),
		);

		serviceCollection.set(IHostUtils, new ShimHostUtils());

		// IExtHostFileSystemInfo is critical for URI comparisons in ExtHostWorkspace
		// Instantiate shim
		const extHostFileSystemInfoInstance = new ShimExtHostFileSystemInfo();
		serviceCollection.set(
			IExtHostFileSystemInfo,

			extHostFileSystemInfoInstance,
		);

		// 3. Create InstantiationService
		console.log("[Cocoon] Creating InstantiationService...");

		instantiationService = new InstantiationService(
			serviceCollection,

			true /* strict parent */,
		);

		// Make available globally for shims needing it
		global.cocoonInstantiationService = instantiationService;

		// 4. Instantiate and Register Shims (and real services where applicable) via DI
		console.log("[Cocoon] Instantiating and registering shims/services...");

		// Order matters for dependencies: Log > InitData > RPC > FSInfo > (Docs, Workspace, Config) > Others > ExtensionService
		const docService =
			instantiationService.createInstance(ShimDocumentService);

		serviceCollection.set(IExtHostDocuments, docService);

		const langFeaturesService = instantiationService.createInstance(
			ShimLanguageFeatures,

			docService,
		);

		serviceCollection.set(IExtHostLanguageFeatures, langFeaturesService);

		const workspaceService = instantiationService.createInstance(
			ShimExtHostWorkspace,

			initDataService /* IExtHostInitDataService.value */,

			extHostFileSystemInfoInstance,

			docService,
		);

		serviceCollection.set(IExtHostWorkspace, workspaceService);

		const configService = instantiationService.createInstance(
			ShimExtHostConfiguration,

			initData,

			// initData directly as it's simpler here
		);
		serviceCollection.set(IExtHostConfiguration, configService);

		serviceCollection.set(
			IExtensionStoragePaths,

			instantiationService.createInstance(
				ShimExtensionStoragePaths,

				initData.environment,
			),
		);

		serviceCollection.set(
			IExtHostStorage,

			instantiationService.createInstance(ShimExtHostStorage),
		);

		serviceCollection.set(
			IExtHostCommands,

			instantiationService.createInstance(ShimExtHostCommands),
		);

		serviceCollection.set(
			IExtHostSecretState,

			instantiationService.createInstance(ShimExtHostSecretState),
		);

		serviceCollection.set(
			IExtHostOutputService,

			instantiationService.createInstance(ShimOutputService),
		);

		serviceCollection.set(
			IExtHostDiagnostics,

			instantiationService.createInstance(ShimDiagnosticsService),
		);

		serviceCollection.set(
			IExtHostTerminalService,

			instantiationService.createInstance(ShimExtHostTerminalService),
		);

		serviceCollection.set(
			IExtHostLanguageModels,

			instantiationService.createInstance(ShimExtHostLanguageModels),
		);

		serviceCollection.set(
			IWorkbenchExtensionEnablementService,

			instantiationService.createInstance(ShimExtensionEnablementService),
		);

		serviceCollection.set(
			IExtensionHostKindPicker,

			instantiationService.createInstance(ShimExtensionHostKindPicker),
		);

		// Proposed APIs Service (shimmed)
		// TODO: VS Code uses a specific service ID for proposed APIs if it's a formal service.
		// If not, it's often handled within ExtHostExtensionService or ApiFactory.
		// For now, let's assume a custom decorator if it were a distinct service.
		const IExtHostProposedApisShim =
			createDecorator<CocoonIExtHostProposedApis>(
				"extHostProposedApisShim",
			);

		serviceCollection.set(
			IExtHostProposedApisShim,

			instantiationService.createInstance(
				ShimExtensionsProposedApi,

				initData,
			),
		);

		// Real ExtHostExtensionService (from VS Code's sources)
		serviceCollection.set(
			IExtHostExtensionService,

			new SyncDescriptor(ExtHostExtensionService),
		);

		// 5. Add any remaining standard VS Code singleton descriptors (if any are not covered or shimmed)
		console.log(
			"[Cocoon] Adding any remaining standard singleton descriptors...",
		);

		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			if (!serviceCollection.has(id))
				serviceCollection.set(id, descriptor);
		}

		// 6. Instantiate and Install the Require Interceptor
		console.log("[Cocoon] Setting up NodeRequireInterceptor...");

		const apiFactoryProvider =
			instantiationService.invokeFunction<IExtensionApiFactory>(
				(accessor) => {
					const originalVSCodeFactory =
						createVSCodeApiFactory(accessor);

					const localLogSvc = accessor.get(ILogService);

					const localFsApiShimInstance = new ShimFileSystemApi(
						localLogSvc,

						// Create instance for fs
					);
					// Make it available for vscode.ts
					global.cocoonFileSystemApiService = localFsApiShimInstance;

					return (extension, extensionInfo, localConfigProvider) => {
						const vscodeApi = originalVSCodeFactory(
							extension,

							extensionInfo,

							localConfigProvider,
						);

						// Inject our shimmed vscode.workspace.fs
						// Ensure workspace and its properties are modifiable if they come from originalFactory
						if (!vscodeApi.workspace)
							(vscodeApi as any).workspace = {};

						(vscodeApi.workspace as any).fs =
							localFsApiShimInstance;

						// TODO: Inject other direct API parts if needed, e.g., if vscode.ts's _injectРеализация isn't used.
						return vscodeApi;
					};
				},
			);

		// These are needed by VSCodeNodeModuleFactory
		// ShimExtHostWorkspace should provide this
		const extPathIndex = await workspaceService.getExtensionPathIndex();
		// ShimExtHostConfiguration should provide this
		const cfgProvider = await configService.getConfigProvider();

		const moduleInterceptor = instantiationService.invokeFunction(
			(accessor) => {
				const interceptor = accessor.createInstance(
					NodeRequireInterceptor,

					apiFactoryProvider,

					{
						ExtensionIdentifierMap: Map,

						ExtensionIdentifierSet: Set,
					},
				);

				// Factory for `require('vscode')`
				interceptor.register(
					new VSCodeNodeModuleFactory(
						apiFactoryProvider,

						extPathIndex,

						{
							ExtensionIdentifierMap: Map,

							ExtensionIdentifierSet: Set,
						},

						cfgProvider,

						accessor.get(ILogService),
					),
				);

				// Factory for aliased modules (e.g., 'graceful-fs')
				interceptor.register(
					accessor.createInstance(NodeModuleAliasingModuleFactory),
				);

				// Factory for `require('fs')`
				interceptor.register(new FsModuleShimFactory());

				// Factory for other Node built-ins (`os`, `crypto`, `process`)
				interceptor.register(new NodeBuiltinsShimFactory());

				// TODO: Add other INodeModuleFactory instances if more modules need specific interception.
				return interceptor;
			},
		);

		console.log("[Cocoon] Installing require interceptor...");

		await moduleInterceptor.install();

		console.log("[Cocoon] Require interceptor installed successfully.");

		// 7. Install Error Handlers
		console.log("[Cocoon] Installing Error Handlers...");

		const errorHandlerInstance =
			instantiationService.createInstance(ErrorHandler);

		ErrorHandler.installEarlyHandler(
			errorHandlerInstance,

			instantiationService,

			// Pass IS
		);
		console.log("[Cocoon] Early error handler installed.");

		process.on("uncaughtException", (err: Error) => {
			console.error(
				"[Cocoon Uncaught Exception]",

				err.message,

				err.stack,
			);

			ipcApiInstance.sendNotificationToMountain("extHostError", {
				message: err.message || String(err),

				stack: err.stack,
			});
		});

		process.on(
			"unhandledRejection",

			(reason: any, promise: Promise<any>) => {
				console.error(
					"[Cocoon Unhandled Rejection at:",

					promise,

					"reason:",

					reason,
				);

				const err =
					reason instanceof Error
						? reason
						: new Error(String(reason));

				ipcApiInstance.sendNotificationToMountain("extHostError", {
					message: err.message || String(err),

					stack: err.stack,
				});
			},
		);

		// 8. Instantiate and Initialize the REAL ExtHostExtensionService
		console.log(
			"[Cocoon] Instantiating real ExtHostExtensionService via DI...",
		);

		const extensionService =
			instantiationService.invokeFunction<IExtHostExtensionService>(
				(accessor) => accessor.get(IExtHostExtensionService),
			);

		console.log(
			"[Cocoon] Initializing real ExtHostExtensionService (will load extensions)...",
		);

		// This is the critical call
		await extensionService.initialize();
		console.log("[Cocoon] Real ExtHostExtensionService initialized.");

		// Install the full error handler AFTER extension service and its dependencies are ready
		ErrorHandler.installFullHandler(
			errorHandlerInstance,

			instantiationService,

			// Pass IS
		);
		logService?.info("[Cocoon] Full error handler installed.");

		console.log(
			"[Cocoon] Extension Host Environment Initialized Successfully.",
		);

		ipcApiInstance.sendNotificationToMountain("extHostInitialized", {});
	} catch (hostError: any) {
		didFailOrExit = true;

		console.error(
			"[Cocoon] FATAL: Failed to initialize extension host environment:",

			hostError.message,

			hostError.stack,
		);

		try {
			ipcApiInstance.sendNotificationToMountain("extHostError", {
				message: `Cocoon initialization failed: ${hostError.message || hostError}`,

				stack: hostError.stack,
			});
		} catch (sendError: any) {
			console.error(
				"[Cocoon] Failed to send initialization error back to Mountain:",

				sendError,
			);
		}
		process.exit(1);
	}
}

// --- Main Message Listener & Readiness Signal ---
// Renamed for clarity
let initializationFlowStarted = false;
console.log(
	"[Cocoon] Setting up main message listener for 'initExtensionHost' command...",
);

ipcApiInstance.onMessageFromMountain(
	(message: any /* TODO: Type with VineMessage from cocoon-ipc.ts */) => {
		if (initializationFlowStarted) {
			/* console.log("[Cocoon IPC] Ignoring message, initialization already started/done."); */ return;
		}

		if (
			message &&
			message.msg_type === 1 /* Request */ &&
			message.method === "initExtensionHost" &&
			message.params
		) {
			console.log(
				"[Cocoon] Received 'initExtensionHost' command from Mountain. Params snippet:",

				JSON.stringify(message.params).substring(0, 200),
			);

			initializationFlowStarted = true;

			console.log("[Cocoon] Creating RPCProtocol instance...");

			if (!ipcMessagePassingProtocol) {
				console.error(
					"[Cocoon] CRITICAL: ipcMessagePassingProtocol is null. Cannot create RPCProtocol.",
				);

				didFailOrExit = true;

				process.exit(1);

				return;
			}
			// The transformer is null for local extension hosts. If Cocoon ever talks to a remote with different URI schemes, this would change.
			global.cocoonRpcProtocolInstance = new RPCProtocol(
				ipcMessagePassingProtocol,

				null /* IURITransformer */,
			);

			rpcProtocolInstance = global.cocoonRpcProtocolInstance;

			initializeCocoonExtensionHost(
				message.params /* raw initData */,
			).catch((err: any) => {
				if (!didFailOrExit) {
					// Prevent double-reporting/exit if error already handled inside initialize
					didFailOrExit = true;

					console.error(
						"[Cocoon] Unhandled promise rejection during async initializeCocoonExtensionHost:",

						err.message,

						err.stack,
					);

					try {
						ipcApiInstance.sendNotificationToMountain(
							"extHostError",

							{
								message: `Cocoon async init failed: ${err.message || err}`,

								stack: err.stack,
							},
						);
					} catch (sendError: any) {
						console.error(
							"[Cocoon] Failed to send async init error to Mountain:",

							sendError,
						);
					}
					process.exit(1);
				}
			});
		} else if (
			message &&
			message.msg_type !== 6 /* Notification */ &&
			message.method !== "rpcData" /* Internal RPC data */
		) {
			console.warn(
				`[Cocoon] Received unexpected message before 'initExtensionHost': Method='${message?.method}', Type=${message?.msg_type}`,
			);
		}
	},
);

ipcApiInstance.sendNotificationToMountain("extHostReadyForInit", {});

console.log(
	"[Cocoon] Cocoon sidecar is ready and waiting for 'initExtensionHost' command from Mountain.",
);
