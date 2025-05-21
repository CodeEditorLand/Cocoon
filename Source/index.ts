// Assume these are available via module.paths or are standard Node modules
// Node.js built-in
import { EventEmitter } from "events";
// Using Node's fs for path checking
import * as fs from "fs";
// --- Setup Module Paths (CRITICAL) ---
import * as path from "path";
import { performance } from "perf_hooks";
// Needs bundling
import { VSBuffer } from "vs/base/common/buffer";
// Needs bundling
import { URI, UriParts } from "vs/base/common/uri";
import {
	ExtensionIdentifier,
	IExtensionDescription,
	IRelaxedExtensionDescription,
	// Needs bundling
} from "vs/platform/extensions/common/extensions";
// Needs bundling
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	createDecorator,
	IInstantiationService,
	InstantiationService,
	// Needs bundling
} from "vs/platform/instantiation/common/instantiationService";
// Used by BaseCocoonShim
// import { MarshalledId } from "vs/base/common/marshallingIds";

// Used by BaseCocoonShim
// import { revive } from "vs/base/common/marshalling";

import {
	ServiceCollection,
	SyncDescriptor,
	// Needs bundling
} from "vs/platform/instantiation/common/serviceCollection";
// This type might be part of extHostExtensionActivator
// import { ExtensionActivationReason } from "vs/workbench/services/extensions/common/extensions";

// Service Interfaces (ensure paths are correct)
import {
	ILoggerService,
	ILogService,
	LogLevel,
} from "vs/platform/log/common/log";
// Interceptor & Error Handling
// Assuming this path
import { ErrorHandler } from "vs/workbench/api/common/extensionHostMain";
import {
	createApiFactory as createVSCodeApiFactory,
	IExtensionApiFactory,
} from "vs/workbench/api/common/extHost.api.impl";
import {
	ExtHostContext,
	MainContext,
	// Needs bundling
} from "vs/workbench/api/common/extHost.protocol";
import { IExtHostCommands } from "vs/workbench/api/common/extHostCommands";
import {
	IExtHostConfiguration,
	IExtHostConfigurationShape,
} from "vs/workbench/api/common/extHostConfiguration";
import { IExtHostDiagnostics } from "vs/workbench/api/common/extHostDiagnostics";
import {
	IExtHostDocuments,
	IExtHostDocumentsShape,
} from "vs/workbench/api/common/extHostDocuments";
// This might be from a different path in newer VS Code
import { IHostUtils } from "vs/workbench/api/common/extHostExtensionService";
import {
	ExtHostInitData,
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	ExtHostLanguageFeaturesShape,
	IExtHostLanguageFeatures,
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
import {
	IURITransformer,
	IURITransformerService,
} from "vs/workbench/api/common/extHostUriTransformerService";
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace";
import {
	ExtHostExtensionService,
	IExtHostExtensionService,
	// Node specific
} from "vs/workbench/api/node/extHostExtensionService";
import {
	NodeModuleAliasingModuleFactory,
	NodeRequireInterceptor,
	VSCodeNodeModuleFactory,
} from "vs/workbench/api/node/extHostRequireInterceptor";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
import {
	IMessagePassingProtocol,
	RPCProtocol,
	// Needs bundling
} from "vs/workbench/services/extensions/common/rpcProtocol";

// Import as namespace
import * as ipc from ".";
// --- Cocoon Specific Requires ---
// Import as namespace
import * as bootstrap from "./cocoon-bootstrap";
import { ShimExtHostCommands } from "./shims/commands-shim";
import { ShimExtHostConfiguration } from "./shims/configuration-shim";
import { ShimDiagnosticsService } from "./shims/diagnostics-shim";
import { ShimDocumentService } from "./shims/document-shim";
import { ShimExtensionEnablementService } from "./shims/enablement-service-shim";
import { ShimFileSystemApi } from "./shims/fs-api-shim";
import { FsModuleShimFactory } from "./shims/fs-module-shim-factory";
import { ShimExtensionHostKindPicker } from "./shims/host-kind-picker-shim";
import { ShimHostUtils } from "./shims/host-utils-shim";
import { ShimLanguageFeatures } from "./shims/language-features-shim";
import { ShimExtHostLanguageModels } from "./shims/language-models-shim";
// Shim Implementations (import classes)
import { ShimLoggerService, ShimLogService } from "./shims/log-shim";
// Renamed to avoid conflict
import { NodeModuleShimFactory as NodeBuiltinsShimFactory } from "./shims/node-module-shim-factory";
import { ShimOutputService } from "./shims/output-channel-shim";
import {
	IExtHostProposedApi,
	ShimExtensionsProposedApi,
	// Import interface too
} from "./shims/proposed-api-shim";
import { ShimExtHostSecretState } from "./shims/secret-state-shim";
import { ShimExtensionStoragePaths } from "./shims/storage-paths-shim";
import { ShimExtHostStorage } from "./shims/storage-shim";
import { ShimExtHostTerminalService } from "./shims/terminal-service-shim";
import { ShimUriTransformerService } from "./shims/uri-transformer-shim";
import { ShimExtHostWorkspace } from "./shims/workspace-shim";

// --- START OF FILE index.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Bootstrap Entry Point (index.ts)
 * --------------------------------------------------------------------------------------------
 * This script is the main entry point for the Cocoon Node.js sidecar process.
 * It sets up the Node.js environment to mimic the VS Code extension host, loads real
 * VS Code platform code, registers shims for platform dependencies, and initializes
 * the real `ExtHostExtensionService` to load and run extensions.
 *
 * Responsibilities:
 * - Patching the Node.js `process` object (`cocoon-bootstrap.ts`).
 * - Setting up the Vine IPC communication layer (`cocoon-ipc.ts`).
 * - Waiting for the `initExtensionHost` command/payload from Mountain via Vine.
 * - Reviving/Transforming URI components within the received `initData` into live `vscode.Uri` objects.
 * - Loading core VS Code modules (DI, RPC, Services, etc.) from the bundled JS file(s).
 * - Setting up the Dependency Injection container (`ServiceCollection`, `InstantiationService`).
 * - Registering service implementations:
 *   - Registers numerous SHIMS (`./shims/*.ts`) for services requiring native/UI interaction.
 *   - Registers the REAL `RPCProtocol` instance for `IExtHostRpcService`.
 *   - Registers REAL VS Code services (via `SyncDescriptor`s) where no shimming is needed.
 * - Installing the `NodeRequireInterceptor` to handle `require('vscode')` and shim native Node modules.
 * - Installing standard VS Code `ErrorHandler`s.
 * - Instantiating the REAL `ExtHostExtensionService` via DI.
 * - Calling `ExtHostExtensionService.initialize()` to start extension loading/activation.
 * - Signaling successful initialization back to Mountain via Vine (`extHostInitialized`).
 *
 * Key Interactions:
 * - Launched by Mountain (`process_mgmt.rs`).
 * - Communicates with Mountain exclusively via `Vine` IPC (`cocoon-ipc.ts`).
 * - Uses `cocoon-bootstrap.ts` for process patching.
 * - `require`s code from the JS bundle generated by `Rest`/`Maintain`.
 * - Uses VS Code's `InstantiationService` for DI.
 * - Instantiates and uses shims from `./shims/`.
 * - Instantiates and initializes the real `ExtHostExtensionService`.
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon] Node.js Sidecar Starting...");

performance.mark(`code/extHost/willConnectToRenderer`);

const vsCodeOutPath = path.resolve(
	__dirname,

	// Adjust path as needed
	"../../../Dependency/Microsoft/Dependency/Editor/out",
);

console.log(
	`[Cocoon] Verifying VS Code build output directory for require(): ${vsCodeOutPath}`,
);

if (fs.existsSync(vsCodeOutPath)) {
	// module.paths is a Node.js specific global. In TS, you might need to declare it or handle it carefully.
	// For now, assume `(module as any).paths` or handle if `module` is not typed for `paths`.
	if (Array.isArray((module as any).paths)) {
		(module as any).paths.unshift(path.join(vsCodeOutPath));

		console.log(
			"[Cocoon] VS Code 'out' directory found. Updated Node.js module.paths.",
		);
	} else {
		console.warn(
			"[Cocoon] module.paths is not an array, cannot prepend VS Code 'out' directory.",
		);
	}
} else {
	console.error(
		`[Cocoon] CRITICAL ERROR: VSCode 'out' directory not found at expected location: ${vsCodeOutPath}.`,
	);

	console.error("[Cocoon] Please ensure VSCode has been built successfully.");

	// Critical failure
	process.exit(1);
}

// --- Core VSCode & Node Requires ---
console.log("[Cocoon] Requiring core modules...");

// For reviveUriOnly

// --- Global State ---
let instantiationService: IInstantiationService | null = null;

let rpcProtocolInstance: RPCProtocol | null = null;

// From cocoon-ipc
let messagePassingProtocol: IMessagePassingProtocol | null = null;

let didFail: boolean = false;

// Expose to shims if needed (e.g., ExtensionContext creation)
// Use declare global for better type safety if accessed by shims directly.
declare global {
	var cocoonInstantiationService: IInstantiationService | null;

	var cocoonRpcProtocolInstance: RPCProtocol | null;
}

global.cocoonInstantiationService = null;

global.cocoonRpcProtocolInstance = null;

// --- Process Patching ---
bootstrap.patchProcess(() => !didFail);

// --- IPC Adapter Setup ---
console.log("[Cocoon] Creating Host Protocol Interface (IPC Adapter)...");

messagePassingProtocol = ipc.createHostProtocolInterface();

// --- URI Helper Functions ---
function reviveUriOnly(uriComponent: any): URI | undefined {
	// uriComponent can be various things
	if (!uriComponent) return undefined;

	try {
		// Check if it's already a URI instance (less likely from raw initData)
		if (uriComponent instanceof URI) return uriComponent;

		if (typeof uriComponent === "object" && uriComponent !== null) {
			// Check for common URI component properties or VS Code's marshalling ID
			if (
				uriComponent.path ||
				uriComponent.scheme ||
				uriComponent.authority ||
				(uriComponent as any).$mid === 1 /* MarshalledId.UriSimple */
			) {
				// Cast to UriParts if it matches
				return URI.revive(uriComponent as UriParts);
			}
		}
	} catch (e: any) {
		console.error(
			`[Cocoon URI] Failed to revive URI component:`,

			uriComponent,

			e,
		);
	}

	return undefined;
}

function transformUrisDeep(
	obj: any,

	transformerFunc: (component: any) => URI | undefined,
): any {
	if (!obj) return obj;

	// Already a URI instance
	if (obj instanceof URI) return obj;

	if (Array.isArray(obj)) {
		return obj
			.map((item) => transformUrisDeep(item, transformerFunc))
			.filter((item) => item !== undefined);
	}

	if (typeof obj === "object" && obj !== null) {
		const revivedUriAttempt = transformerFunc(obj);

		if (revivedUriAttempt instanceof URI) {
			return revivedUriAttempt;
		} else if (
			revivedUriAttempt === undefined &&
			obj.path &&
			obj.scheme &&
			!(obj instanceof Error)
		) {
			// If transformerFunc returned undefined but it looked like a URI, log it.
			// This means reviveUriOnly failed for some reason.
			console.warn(
				"[Cocoon URI] transformUrisDeep: transformerFunc failed for potential URI, returning undefined:",

				obj,
			);

			return undefined;
		}

		const newObj: { [key: string]: any } = {};

		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				newObj[key] = transformUrisDeep(obj[key], transformerFunc);
			}
		}

		return newObj;
	}

	return obj;
}

// --- Main Initialization Function ---
async function initializeExtensionHost(
	initDataRaw: any /* ExtHostInitData from RPC, but before URI revival */,
): Promise<void> {
	console.log("[Cocoon] Initializing Extension Host Environment...");

	performance.mark(`code/extHost/didWaitForInitData`);

	if (didFail) {
		console.warn("[Cocoon] Initialization skipped, already failed.");

		return;
	}

	// Define here for final catch block
	let logServiceInstance: ILogService | undefined;

	try {
		console.log("[Cocoon] Reviving URIs in initData...");

		const initData = transformUrisDeep(
			initDataRaw,

			reviveUriOnly,

			// Cast after transformation
		) as ExtHostInitData;

		console.log("[Cocoon] Finished reviving URIs in initData.");

		const serviceCollection = new ServiceCollection();

		// 1. Core services first (Log, InitData, RPC, URI Transformer, HostUtils)
		if (!rpcProtocolInstance) {
			// Should have been set by listener
			throw new Error(
				"RPCProtocol instance not created before initializeExtensionHost",
			);
		}

		// Cast if ShimLogService constructor differs
		logServiceInstance = new ShimLogService(rpcProtocolInstance as any);

		// Pass ILogService
		const loggerServiceInstance = new ShimLoggerService(logServiceInstance);

		const initDataServiceInstance: IExtHostInitDataService = {
			_serviceBrand: undefined,

			...initData,
		};

		const hostUtilsInstance = new ShimHostUtils();

		const uriTransformerInstance = new ShimUriTransformerService(
			initData.remote?.authority,
		);

		serviceCollection.set(ILogService, logServiceInstance);

		serviceCollection.set(ILoggerService, loggerServiceInstance);

		serviceCollection.set(IExtHostInitDataService, initDataServiceInstance);

		serviceCollection.set(IExtHostRpcService, rpcProtocolInstance);

		serviceCollection.set(IURITransformerService, uriTransformerInstance);

		serviceCollection.set(IHostUtils, hostUtilsInstance);

		// 2. Create InstantiationService
		console.log("[Cocoon] Creating InstantiationService...");

		instantiationService = new InstantiationService(
			serviceCollection,

			true,
		);

		global.cocoonInstantiationService = instantiationService;

		// 3. Instantiate and register shims via DI
		console.log("[Cocoon] Instantiating remaining shims via DI...");

		const docServiceInstance =
			instantiationService.createInstance(ShimDocumentService);

		serviceCollection.set(IExtHostDocuments, docServiceInstance);

		const languageFeaturesInstance = instantiationService.createInstance(
			ShimLanguageFeatures,

			docServiceInstance,
		);

		serviceCollection.set(
			IExtHostLanguageFeatures,

			languageFeaturesInstance,
		);

		const workspaceInstance = instantiationService.createInstance(
			ShimExtHostWorkspace,

			initData,

			docServiceInstance,

			// Pass initData
		);

		serviceCollection.set(IExtHostWorkspace, workspaceInstance);

		const configInstance = instantiationService.createInstance(
			ShimExtHostConfiguration,

			initData,

			// Pass initData
		);

		serviceCollection.set(IExtHostConfiguration, configInstance);

		const storagePathsInstance = instantiationService.createInstance(
			ShimExtensionStoragePaths,

			initData.environment,

			// Pass environment
		);

		serviceCollection.set(IExtensionStoragePaths, storagePathsInstance);

		const storageInstance =
			instantiationService.createInstance(ShimExtHostStorage);

		serviceCollection.set(IExtHostStorage, storageInstance);

		const commandsInstance =
			instantiationService.createInstance(ShimExtHostCommands);

		serviceCollection.set(IExtHostCommands, commandsInstance);

		const secretStateInstance = instantiationService.createInstance(
			ShimExtHostSecretState,
		);

		serviceCollection.set(IExtHostSecretState, secretStateInstance);

		const outputServiceInstance =
			instantiationService.createInstance(ShimOutputService);

		serviceCollection.set(IExtHostOutputService, outputServiceInstance);

		const diagnosticsInstance = instantiationService.createInstance(
			ShimDiagnosticsService,
		);

		serviceCollection.set(IExtHostDiagnostics, diagnosticsInstance);

		const terminalServiceInstance = instantiationService.createInstance(
			ShimExtHostTerminalService,
		);

		serviceCollection.set(IExtHostTerminalService, terminalServiceInstance);

		const languageModelsInstance = instantiationService.createInstance(
			ShimExtHostLanguageModels,
		);

		serviceCollection.set(IExtHostLanguageModels, languageModelsInstance);

		// Assuming IExtHostProposedApi is a valid service identifier if used with DI
		const IProposedApi =
			// Example decorator
			createDecorator<IExtHostProposedApi>("extHostProposedApi");

		const proposedApiInstance = instantiationService.createInstance(
			ShimExtensionsProposedApi,

			initData,
		);

		serviceCollection.set(IProposedApi, proposedApiInstance);

		// Register REAL VS Code services where no shimming is needed using SyncDescriptor
		// Example: serviceCollection.set(IFooService, new SyncDescriptor(ExtHostFooService));

		// This requires ExtHostFooService to be importable and its dependencies resolvable by DI.

		// For services that are shims but also might be registered with DI using their interfaces:
		const enablementServiceInstance = instantiationService.createInstance(
			ShimExtensionEnablementService,
		);

		serviceCollection.set(
			IWorkbenchExtensionEnablementService,

			enablementServiceInstance,
		);

		const kindPickerInstance = instantiationService.createInstance(
			ShimExtensionHostKindPicker,
		);

		serviceCollection.set(IExtensionHostKindPicker, kindPickerInstance);

		// 4. Add remaining standard VSCode singleton descriptors
		console.log(
			"[Cocoon] Adding remaining standard singleton descriptors...",
		);

		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			if (!serviceCollection.has(id)) {
				serviceCollection.set(id, descriptor);
			}
		}

		// 5. Instantiate and Install the Require Interceptor
		console.log("[Cocoon] Setting up RequireInterceptor...");

		const apiFactoryProvider =
			instantiationService.invokeFunction<IExtensionApiFactory>(
				(accessor) => {
					// Use aliased import
					const originalFactory = createVSCodeApiFactory(accessor);

					// Get from accessor
					const localLogSvc = accessor.get(ILogService);

					return (
						extensionData,

						extensionInfo,

						localConfigProvider,
					) => {
						const vscodeApi = originalFactory(
							extensionData,

							extensionInfo,

							localConfigProvider,
						);

						// Inject our shimmed vscode.workspace.fs
						if (vscodeApi.workspace) {
							(vscodeApi.workspace as any).fs =
								new ShimFileSystemApi(localLogSvc);
						} else {
							(vscodeApi as any).workspace = {
								fs: new ShimFileSystemApi(localLogSvc),
							};
						}

						return vscodeApi;
					};
				},
			);

		const extPathIndex = await (workspaceInstance as ShimExtHostWorkspace)
			// workspaceInstance is ShimExtHostWorkspace
			.getExtensionPathIndex();

		const cfgProvider = await (configInstance as ShimExtHostConfiguration)
			// configInstance is ShimExtHostConfiguration
			.getConfigProvider();

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

				interceptor.register(
					accessor.createInstance(NodeModuleAliasingModuleFactory),
				);

				// Shim for 'fs'
				interceptor.register(new FsModuleShimFactory());

				// Shim for other node builtins like 'os', 'crypto', 'process'
				interceptor.register(new NodeBuiltinsShimFactory());

				return interceptor;
			},
		);

		console.log("[Cocoon] Installing require interceptor...");

		await moduleInterceptor.install();

		console.log("[Cocoon] Require interceptor installed successfully.");

		// 6. Install Error Handlers
		console.log("[Cocoon] Installing Error Handlers...");

		// Create instance first
		const errorHandler = instantiationService.createInstance(ErrorHandler);

		// Pass instance
		ErrorHandler.встановітьEarlyHandler(errorHandler, instantiationService);

		console.log("[Cocoon] Early error handler installed.");

		process.on("uncaughtException", (err: Error) => {
			// Type error
			console.error("[Cocoon Uncaught Exception]", err);

			ipc.sendNotificationToMountain("extHostError", {
				message: err.message || String(err),

				stack: err.stack,
			});
		});

		process.on(
			"unhandledRejection",

			(reason: any, promise: Promise<any>) => {
				// Type reason and promise
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

				ipc.sendNotificationToMountain("extHostError", {
					message: err.message || String(err),

					stack: err.stack,
				});
			},
		);

		// 7. Instantiate and Initialize the REAL Extension Service
		console.log("[Cocoon] Instantiating real ExtHostExtensionService...");

		const extensionService =
			instantiationService.invokeFunction<IExtHostExtensionService>(
				(accessor) => accessor.get(IExtHostExtensionService),
			);

		// Register ExtHostExtensionService itself if it needs to be callable by other ExtHost services (uncommon)
		// Already gettable via DI
		// serviceCollection.set(IExtHostExtensionService, extensionService);

		console.log("[Cocoon] Initializing real Extension Service...");

		// This is the critical call to load extensions
		await extensionService.initialize();

		console.log("[Cocoon] Real Extension Service initialized.");

		// Install the full error handler AFTER extension service is ready
		// Pass instance
		ErrorHandler.встановітьFullHandler(errorHandler, instantiationService);

		logServiceInstance?.info("[Cocoon] Full error handler installed.");

		console.log(
			"[Cocoon] Extension Host Environment Initialized Successfully.",
		);

		// Signal success
		ipc.sendNotificationToMountain("extHostInitialized", {});
	} catch (hostError: any) {
		didFail = true;

		console.error(
			"[Cocoon] FATAL: Failed to initialize extension host environment:",

			hostError,
		);

		try {
			ipc.sendNotificationToMountain("extHostError", {
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
let initializationStarted = false;

console.log("[Cocoon] Setting up main message listener for init command...");

ipc.onMessageFromMountain(
	(message: any /* Type this with VineMessage if defined */) => {
		// Ignore if already started
		if (initializationStarted) return;

		if (
			message &&
			message.msg_type === 1 /* Request */ &&
			message.method === "initExtensionHost" &&
			message.params
		) {
			console.log(
				"[Cocoon] Received initExtensionHost command. Starting initialization...",
			);

			initializationStarted = true;

			console.log(
				"[Cocoon] Creating RPCProtocol instance (transformer: null)...",
			);

			if (!messagePassingProtocol) {
				console.error(
					"[Cocoon] CRITICAL: messagePassingProtocol (IPC adapter) is null. Cannot create RPCProtocol.",
				);

				process.exit(1);
			}

			global.cocoonRpcProtocolInstance = new RPCProtocol(
				messagePassingProtocol,

				null /* NO transformer for local */,
			);

			// Assign to module-scoped variable
			rpcProtocolInstance = global.cocoonRpcProtocolInstance;

			initializeExtensionHost(message.params).catch((err: any) => {
				if (!didFail) {
					// Prevent double-reporting if error already caught in initializeExtensionHost
					didFail = true;

					console.error(
						"[Cocoon] Unhandled error during async initializeExtensionHost call:",

						err,
					);

					try {
						ipc.sendNotificationToMountain("extHostError", {
							message: `Cocoon async initialization failed: ${err.message || err}`,

							stack: err.stack,
						});
					} catch (sendError: any) {
						console.error(
							"[Cocoon] Failed to send async initialization error back to Mountain:",

							sendError,
						);
					}

					process.exit(1);
				}
			});
		} else if (
			message &&
			message.msg_type !== 6 /* Notification */ &&
			message.method !== "rpcData"
		) {
			console.warn(
				`[Cocoon] Received unexpected message before initialization:`,

				message?.method || `Type: ${message?.msg_type}`,
			);
		}
	},
);

ipc.sendNotificationToMountain("extHostReadyForInit", {});

console.log("[Cocoon] Ready for init command from Mountain.");

// Ukrainian "встановіть" -> "install"
// ErrorHandler.installEarlyHandler(errorHandler, instantiationService);

// ErrorHandler.installFullHandler(errorHandler, instantiationService);

// --- END OF FILE index.ts ---
