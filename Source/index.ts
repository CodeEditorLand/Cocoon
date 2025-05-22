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
 * - Module Interception: Sets up `NodeRequireInterceptor` (for CJS) and
 *   `CocoonNodeModuleESMInterceptor` (for ESM) to manage how extensions
 *   import/require modules, especially the `vscode` API. This includes:
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
 * - VS Code `NodeRequireInterceptor` & `VSCodeNodeModuleFactory`: For CJS `require` patching.
 * - `CocoonNodeModuleESMInterceptor`: For ESM `import` patching.
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
import { CancellationTokenSource } from "vs/base/common/cancellation";
import { MarshalledId } from "vs/base/common/marshalling";
import { Schemas } from "vs/base/common/network";
import {
	URI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// For RPCProtocol transformer type
import { IURITransformer } from "vs/base/common/uriIpc";
import {
	ExtensionIdentifier,
	IExtensionDescription,
	IExtensionDescriptionDelta,
	nullExtensionDescription,
	type IRelaxedExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	createDecorator,
	InstantiationService,
	ServicesAccessor,
	type IInstantiationService,
} from "vs/platform/instantiation/common/instantiationService";
import {
	ServiceCollection,
	SyncDescriptor,
} from "vs/platform/instantiation/common/serviceCollection";
import {
	ILoggerService,
	ILogService,
	LogLevel,
	parseLogLevel,
} from "vs/platform/log/common/log";
import { ErrorHandler } from "vs/workbench/api/common/extensionHostMain";
import {
	createApiFactory as createVSCodeApiFactoryOriginal,
	type IExtensionApiFactory,
	type IExtensionRegistries,
} from "vs/workbench/api/common/extHost.api.impl";
import {
	ExtHostContext,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import { IExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService";
import { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication";
import { IExtHostCommands } from "vs/workbench/api/common/extHostCommands";
import {
	IExtHostConfiguration,
	IExtHostConfigurationProvider,
	type ExtHostConfigProvider,
} from "vs/workbench/api/common/extHostConfiguration";
import { IExtHostDiagnostics } from "vs/workbench/api/common/extHostDiagnostics";
import {
	IExtHostDocuments,
	IExtHostDocumentsAndEditors,
} from "vs/workbench/api/common/extHostDocuments";
import {
	ExtensionPaths,
	IExtHostExtensionService,
	IHostUtils,
} from "vs/workbench/api/common/extHostExtensionService";
// AbstractExtHostExtensionService not needed directly here
import { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
import {
	IExtHostInitDataService,
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
import { IExtHostLanguageFeatures } from "vs/workbench/api/common/extHostLanguageFeatures";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels";
import { IExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";
import { IExtHostManagedSockets } from "vs/workbench/api/common/extHostManagedSockets";
import { IExtHostOutputService } from "vs/workbench/api/common/extHostOutput";
import { IExtHostRpcService } from "vs/workbench/api/common/extHostRpcService";
import { IExtHostSecretState } from "vs/workbench/api/common/extHostSecretState";
import { IExtHostStorage } from "vs/workbench/api/common/extHostStorage";
import { IExtensionStoragePaths } from "vs/workbench/api/common/extHostStoragePaths";
import { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry";
import { IExtHostTerminalService } from "vs/workbench/api/common/extHostTerminalService";
import { IURITransformerService } from "vs/workbench/api/common/extHostUriTransformerService";
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace";
import {
	// The REAL service for Path A (Node version)
	ExtHostExtensionService,
	NodeModuleAliasingModuleFactory,
	// This is the Node.js specific CJS interceptor
	NodeRequireInterceptor,
	VSCodeNodeModuleFactory,
} from "vs/workbench/api/node/extHostExtensionService";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
import {
	RPCProtocol,
	type IRPCProtocolLogger,
} from "vs/workbench/services/extensions/common/rpcProtocol";
// For global type
import type { FileSystem as VscodeFileSystem } from "vscode";

// Cocoon Specific Imports
import * as bootstrapUtils from "./cocoon-bootstrap";
import {
	CocoonNodeModuleESMInterceptor,
	type CocoonESMInterceptorContext,
} from "./cocoon-esm-interceptor";
// CocoonIpcApi not used directly
import ipcApiInstance, { type VineMessage } from "./cocoon-ipc";
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
import { ShimLoggerService, ShimLogService } from "./shims/log-shim";
import { ShimExtHostManagedSockets } from "./shims/managed-sockets-shim";
import { NodeModuleShimFactory as NodeBuiltinsShimFactory } from "./shims/node-module-shim-factory";
import { ShimOutputService } from "./shims/output-channel-shim";
import {
	ShimExtensionsProposedApi,
	type IExtHostProposedApis as CocoonIExtHostProposedApis,
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

// --- Module Path Setup ---
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
		console.warn(
			"[Cocoon] module.paths not an array, cannot prepend VS Code 'out' path.",
		);
	}
} else {
	console.error(
		`[Cocoon] CRITICAL FAILURE: VSCode 'out' directory NOT FOUND: ${vsCodeOutPath}. Extensions may fail to load internal dependencies.`,
	);

	// Critical failure
	process.exit(1);
}

// --- Global State ---
let cocoonDI: IInstantiationService | null = null;

// This will be the fully configured one
let cocoonRpcProtocol: RPCProtocol | null = null;

// Low-level adapter
const cocoonIpcAdapter = ipcApiInstance.createHostProtocolInterface();

let initializationFailedOrExited = false;

declare global {
	var DI: IInstantiationService | undefined;

	var fsImplForVscodeApi: VscodeFileSystem | undefined;
}

global.DI = undefined;

global.fsImplForVscodeApi = undefined;

bootstrapUtils.patchProcess(() => !initializationFailedOrExited);

// --- URI Revival for Initial Data (Pre-DI) ---
function reviveUriComponentsRaw(uriComponent: any): URI | undefined {
	// ... (implementation unchanged)
	if (!uriComponent) return undefined;

	try {
		if (
			typeof uriComponent === "object" &&
			uriComponent !== null &&
			(uriComponent.path !== undefined ||
				uriComponent.scheme !== undefined ||
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
		);
	}

	return undefined;
}

function transformUrisInObjectRawForInitData(
	obj: any,

	rpcProtocolForRevival: RPCProtocol | null,
): any {
	if (
		!obj ||
		obj instanceof URI ||
		obj instanceof VSBuffer ||
		obj instanceof CancellationTokenSource ||
		typeof obj !== "object"
	) {
		return obj;
	}

	// Use RPCProtocol's transformer if available for initial revival, mimicking ExtensionHostMain
	if (rpcProtocolForRevival) {
		try {
			obj = rpcProtocolForRevival.transformIncomingURIs(obj);
		} catch (e) {
			console.warn(
				"[Cocoon InitData Revival] RPC transformIncomingURIs failed, falling back to raw revival:",

				e,
			);

			// Fallback to raw revival if RPC transform fails or isn't comprehensive enough for nested objects
		}
	}

	if (Array.isArray(obj)) {
		return obj
			.map((item) =>
				transformUrisInObjectRawForInitData(
					item,

					rpcProtocolForRevival,
				),
			)
			.filter((item) => item !== undefined);
	}

	// Attempt to revive the object itself if it's a URI candidate (already handled by rpcProtocol.transformIncomingURIs if transformer is set)
	// This raw revival acts as a fallback or for deeply nested structures not caught by the main RPC transform.
	const revivedUriAttempt = reviveUriComponentsRaw(obj);

	if (revivedUriAttempt instanceof URI) {
		return revivedUriAttempt;
	}

	if (
		revivedUriAttempt === undefined &&
		obj.path &&
		obj.scheme &&
		!(obj instanceof Error)
	) {
		console.warn(
			"[Cocoon Pre-DI URI Transform] Raw transformer failed for potential URI, returning undefined:",

			obj,
		);

		return undefined;
	}

	const newObj: { [key: string]: any } = {};

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			newObj[key] = transformUrisInObjectRawForInitData(
				obj[key],

				rpcProtocolForRevival,
			);
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
		// Create URI Transformer Service *first*
		const tempInitDataForTransformer =
			// Cast for early access
			rawInitDataFromMountain as Partial<ExtHostInitData>;

		const uriTransformerServiceInstance = new ShimUriTransformerService(
			tempInitDataForTransformer.remote?.authority,
		);

		const rpcLogger: IRPCProtocolLogger | null = null;

		// Create the *final* RPCProtocol instance with the transformer
		console.log(
			"[Cocoon] Creating final RPCProtocol instance with URI transformer...",
		);

		cocoonRpcProtocol = new RPCProtocol(
			cocoonIpcAdapter!,

			rpcLogger,

			// Pass the actual transformer instance
			uriTransformerServiceInstance,
		);

		// Update global
		(global as any).cocoonRpcProtocolInstance = cocoonRpcProtocol;

		console.log(
			"[Cocoon] Reviving URIs in raw initData from Mountain using RPCProtocol transformer...",
		);

		const revivedInitData = transformUrisInObjectRawForInitData(
			rawInitDataFromMountain,

			cocoonRpcProtocol,
		) as ExtHostInitData;

		console.log(
			"[Cocoon] InitData URIs revived. Logs location:",

			revivedInitData.logsLocation.toString(),
		);

		console.log(
			"[Cocoon] Setting up ServiceCollection and core services...",
		);

		const services = new ServiceCollection();

		// A. Core services
		const initialLogLevel = revivedInitData.logLevel
			? (parseLogLevel(revivedInitData.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;

		// logService is now correctly defined here
		logService = new ShimLogService(initialLogLevel);

		services.set(ILogService, logService);

		services.set(ILoggerService, new ShimLoggerService(logService));

		services.set(IExtHostInitDataService, {
			_serviceBrand: undefined,

			value: revivedInitData,
		});

		// Register the final RPCProtocol
		services.set(IExtHostRpcService, cocoonRpcProtocol);

		// Register the created transformer
		services.set(IURITransformerService, uriTransformerServiceInstance);

		services.set(IHostUtils, new ShimHostUtils(logService));

		services.set(
			IExtHostFileSystemInfo,

			new ShimExtHostFileSystemInfo(undefined, logService),

			// RPC not needed by shim
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

			// RPC not needed by shim
		);

		// B. Instantiate DI service itself
		console.log("[Cocoon] Creating InstantiationService...");

		cocoonDI = new InstantiationService(services, true /* strict */);

		global.DI = cocoonDI;

		// C. Services that depend on the initial set or are instantiated by DI
		//    Order can matter if shims have DI dependencies on each other.
		cocoonDI.set(
			IExtHostDocuments,

			cocoonDI.createInstance(ShimDocumentService),
		);

		cocoonDI.set(
			IExtHostWorkspace,

			cocoonDI.createInstance(ShimExtHostWorkspace),
		);

		cocoonDI.set(
			IExtHostConfiguration,

			cocoonDI.createInstance(ShimExtHostConfiguration),
		);

		cocoonDI.set(
			IExtHostCommands,

			cocoonDI.createInstance(ShimExtHostCommands),
		);

		cocoonDI.set(
			IExtHostOutputService,

			cocoonDI.createInstance(ShimOutputService),
		);

		cocoonDI.set(
			IExtHostDiagnostics,

			cocoonDI.createInstance(ShimDiagnosticsService),
		);

		cocoonDI.set(
			IExtHostTerminalService,

			cocoonDI.createInstance(ShimExtHostTerminalService),
		);

		cocoonDI.set(
			IExtHostAuthentication,

			cocoonDI.createInstance(ShimExtHostAuthentication),

			// Real ExtHostLM needs this
		);

		cocoonDI.set(
			IExtHostLanguageModels,

			cocoonDI.createInstance(ShimExtHostLanguageModels),

			// Pass authService via DI
		);

		cocoonDI.set(
			IExtHostLanguageFeatures,

			cocoonDI.createInstance(ShimLanguageFeatures),

			// Pass docService via DI
		);

		cocoonDI.set(
			IWorkbenchExtensionEnablementService,

			cocoonDI.createInstance(ShimExtensionEnablementService),
		);

		cocoonDI.set(
			IExtensionHostKindPicker,

			cocoonDI.createInstance(ShimExtensionHostKindPicker),
		);

		const IExtHostProposedApis =
			createDecorator<CocoonIExtHostProposedApis>("extHostProposedApis");

		cocoonDI.set(
			IExtHostProposedApis,

			cocoonDI.createInstance(ShimExtensionsProposedApi),
		);

		// D. REAL ExtHostExtensionService (from VS Code's sources)
		cocoonDI.set(
			IExtHostExtensionService,

			new SyncDescriptor(ExtHostExtensionService),
		);

		// E. Add any remaining standard VS Code singleton descriptors
		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			if (!cocoonDI.has(id)) {
				cocoonDI.set(id, descriptor);
			}
		}

		// --- Pre-fetch and cache data needed by API/Module Factories ---
		const extHostExtensionService = cocoonDI.get(IExtHostExtensionService);

		const extHostConfigService = cocoonDI.get(IExtHostConfiguration);

		performance.mark("code/extHost/willWaitForConfigAndPaths");

		const [extensionPaths, configProvider, globalRegistry, myRegistry] =
			await Promise.all([
				extHostExtensionService.getExtensionPathIndex(),

				extHostConfigService.getConfigProvider(),

				// Assuming a method to get the global one
				extHostExtensionService.getGlobalExtensionRegistry(),

				// This gets 'myRegistry'
				extHostExtensionService.getExtensionRegistry(),
			]);

		performance.mark("code/extHost/didWaitForConfigAndPaths");

		const preResolvedExtensionRegistries: IExtensionRegistries = {
			mine: myRegistry,

			all: globalRegistry,
		};

		// F. Prepare API Factory Provider for Interceptors
		console.log("[Cocoon] Preparing API Factory Provider...");

		const apiFactoryProvider =
			cocoonDI.invokeFunction<IExtensionApiFactory>((accessor) => {
				// accessor is implicitly cocoonDI here
				const originalVSCodeFactory =
					createVSCodeApiFactoryOriginal(accessor);

				const localLogSvc = accessor.get(ILogService);

				const localFsApiShimInstance = new ShimFileSystemApi(
					localLogSvc,
				);

				global.fsImplForVscodeApi = localFsApiShimInstance;

				return (
					extensionDescOrUri: IRelaxedExtensionDescription | URI,

					// These will be supplied by CJS factory, but ESM factory needs to derive them
					extensionInfoOverride?: IExtensionRegistries,

					configProviderOverride?: ExtHostConfigProvider,
				): typeof vscode => {
					let extDescription: IRelaxedExtensionDescription =
						nullExtensionDescription;

					const finalExtensionRegistries =
						extensionInfoOverride || preResolvedExtensionRegistries;

					const finalConfigProvider =
						configProviderOverride || configProvider;

					if (extensionDescOrUri instanceof URI) {
						const parentUri = extensionDescOrUri;

						const foundExt = extensionPaths.findSubstr(parentUri);

						if (foundExt) {
							extDescription = foundExt;
						} else {
							localLogSvc.warn(
								`[Cocoon API Factory] Could not identify extension for ESM import from ${parentUri.toString()}`,
							);
						}
					} else if (extensionDescOrUri) {
						extDescription = extensionDescOrUri;
					}

					const vscodeApi = originalVSCodeFactory(
						extDescription,

						finalExtensionRegistries,

						finalConfigProvider,
					);

					if (!vscodeApi.workspace) {
						(vscodeApi as any).workspace = {};
					}

					(vscodeApi.workspace as any).fs = localFsApiShimInstance;

					return vscodeApi;
				};
			});

		// G. Instantiate and Install CJS NodeRequireInterceptor
		console.log("[Cocoon] Setting up CJS NodeRequireInterceptor...");

		const cjsModuleInterceptor = cocoonDI.createInstance(
			NodeRequireInterceptor,

			apiFactoryProvider,

			{
				// Use pre-resolved
				extensionRegistry: () => preResolvedExtensionRegistries,

				// Use pre-resolved
				extensionPaths: () => extensionPaths,

				// Use pre-resolved
				configProvider: () => configProvider,

				// If needed
				// remoteAuthority: revivedInitData.remote?.authority,
			},
		);

		cjsModuleInterceptor.register(
			new VSCodeNodeModuleFactory(
				apiFactoryProvider,

				extensionPaths,

				preResolvedExtensionRegistries,

				configProvider,

				logService,
			),
		);

		cjsModuleInterceptor.register(
			cocoonDI.createInstance(NodeModuleAliasingModuleFactory),
		);

		cjsModuleInterceptor.register(new FsModuleShimFactory());

		cjsModuleInterceptor.register(new NodeBuiltinsShimFactory());

		console.log("[Cocoon] Installing CJS NodeRequireInterceptor...");

		await cjsModuleInterceptor.install();

		console.log("[Cocoon] CJS NodeRequireInterceptor installed.");

		// H. Instantiate and Install ESM CocoonNodeModuleESMInterceptor
		console.log("[Cocoon] Setting up ESM Interceptor...");

		const esmInterceptorContext: CocoonESMInterceptorContext = {
			apiFactory: apiFactoryProvider,

			// Pass the already resolved/instantiated services:
			// The real IExtHostExtensionService
			extensionService: extHostExtensionService,

			// The real IExtHostConfiguration (or your shim)
			configurationService: extHostConfigService,

			// The log service
			logService: logService,
		};

		const esmModuleInterceptor = cocoonDI.createInstance(
			CocoonNodeModuleESMInterceptor,

			esmInterceptorContext,
		);

		await esmModuleInterceptor.install();

		console.log("[Cocoon] ESM Interceptor installed.");

		// I. Install Error Handlers
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

		// J. Initialize the REAL ExtHostExtensionService
		console.log(
			"[Cocoon] Initializing real ExtHostExtensionService (will load extensions)...",
		);

		// This now uses the already resolved & cached data internally for its registries/paths
		await extHostExtensionService.initialize();

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
	if (isInitializationStarted) {
		return;
	}

	if (
		message?.msg_type === 1 /* Request */ &&
		message.method === "initExtensionHost" &&
		message.params
	) {
		console.log(
			"[Cocoon] Received 'initExtensionHost' command from Mountain.",
		);

		isInitializationStarted = true;

		// The initial RPCProtocol (without transformer) is created here.
		// It will be replaced by a new one with a transformer inside initializeCocoonHost.
		// This is okay as long as no RPC calls are made on this initial instance that *require* transformation
		// before initializeCocoonHost runs and re-assigns cocoonRpcProtocol.
		// The transformUrisInObjectRawForInitData now takes this RPC protocol to attempt URI transformation.
		if (!cocoonIpcAdapter) {
			console.error(
				"[Cocoon] CRITICAL: IPC Adapter (cocoonIpcAdapter) is null. Cannot create RPCProtocol.",
			);

			initializationFailedOrExited = true;

			process.exit(1);

			return;
		}

		const tempRpcForInitDataRevival = new RPCProtocol(
			cocoonIpcAdapter,

			null,

			null,
		);

		// For transformUrisInObjectRawForInitData
		(global as any).cocoonRpcProtocolInstance = tempRpcForInitDataRevival;

		// For transformUrisInObjectRawForInitData
		cocoonRpcProtocol = tempRpcForInitDataRevival;

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
		message.method !== "rpcData"
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
