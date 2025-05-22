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
	// Added for default API
	nullExtensionDescription,
	type IRelaxedExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	createDecorator,
	InstantiationService,
	// Added for apiFactoryProvider
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
// Interceptor & Error Handling
import { ErrorHandler } from "vs/workbench/api/common/extensionHostMain";
import {
	createApiFactory as createVSCodeApiFactoryOriginal,
	type IExtensionApiFactory,
	// Added for apiFactoryProvider
	type IExtensionRegistries,
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
	// Added for apiFactoryProvider
	type ExtHostConfigProvider,
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
	IExtHostInitDataService,
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	ExtHostLanguageFeaturesShape,
	IExtHostLanguageFeatures,
} from "vs/workbench/api/common/extHostLanguageFeatures";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels";
import { IExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";
import { IExtHostManagedSockets } from "vs/workbench/api/common/extHostManagedSockets";
import { IExtHostOutputService } from "vs/workbench/api/common/extHostOutput";
// NodeRequireInterceptor and VSCodeNodeModuleFactory come from node/extHostExtensionService.ts, not common/extHostRequireInterceptor.ts
// The common one is the abstract class.
// For INodeModuleFactory and NodeRequireInterceptor for CJS
import type { INodeModuleFactory as VscodeINodeModuleFactoryType } from "vs/workbench/api/common/extHostRequireInterceptor";
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
// The REAL service for Path A
import {
	ExtHostExtensionService,
	// These are from the NODE specific implementation
	NodeModuleAliasingModuleFactory,
	NodeRequireInterceptor,
	VSCodeNodeModuleFactory,
} from "vs/workbench/api/node/extHostExtensionService";
// Corrected import path

import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
import {
	ActivationKind,
	ExtensionActivationReason,
} from "vs/workbench/services/extensions/common/extensions";
import {
	RPCProtocol,
	type IMessagePassingProtocol,
	type IRPCProtocolLogger,
} from "vs/workbench/services/extensions/common/rpcProtocol";
import type {
	Uri as VscodeApiUri,
	FileSystem as VscodeFileSystem,
} from "vscode";

// Cocoon Specific Imports
import * as bootstrapUtils from "./cocoon-bootstrap";
import { CocoonNodeModuleESMInterceptor } from "./cocoon-esm-interceptor";
// Import the new ESM interceptor
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
		console.warn("[Cocoon] module.paths not an array.");
	}
} else {
	console.error(
		`[Cocoon] CRITICAL FAILURE: VSCode 'out' directory NOT FOUND: ${vsCodeOutPath}`,
	);

	process.exit(1);
}

console.log("[Cocoon] Importing core VS Code modules...");

let cocoonDI: IInstantiationService | null = null;

let cocoonRpcProtocol: RPCProtocol | null = null;

let cocoonIpcAdapter: IMessagePassingProtocol | null = null;

let initializationFailedOrExited = false;

declare global {
	var DI: IInstantiationService | undefined;

	var fsImplForVscodeApi: VscodeFileSystem | undefined;
}

global.DI = undefined;

global.fsImplForVscodeApi = undefined;

bootstrapUtils.patchProcess(() => !initializationFailedOrExited);

console.log("[Cocoon] Creating IPC MessagePassingProtocol adapter for RPC...");

cocoonIpcAdapter = ipcApiInstance.createHostProtocolInterface();

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

function transformUrisInObjectRawForInitData(obj: any): any {
	// ... (implementation unchanged)
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
		return obj
			.map((item) => transformUrisInObjectRawForInitData(item))
			.filter((item) => item !== undefined);
	}

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

		if (!cocoonRpcProtocol) {
			throw new Error(
				"RPCProtocol (cocoonRpcProtocol) not initialized before host init.",
			);
		}

		console.log(
			"[Cocoon] Setting up ServiceCollection and core services...",
		);

		const services = new ServiceCollection();

		// A. Core services
		const initialLogLevel = revivedInitData.logLevel
			? (parseLogLevel(revivedInitData.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;

		logService = new ShimLogService(initialLogLevel);

		services.set(ILogService, logService);

		// Corrected: Pass logService
		services.set(ILoggerService, new ShimLoggerService(logService));

		services.set(IExtHostInitDataService, {
			_serviceBrand: undefined,

			value: revivedInitData,
		});

		// Create the URI Transformer *before* RPCProtocol if it's needed by RPCProtocol itself for initData revival
		const uriTransformerServiceInstance = new ShimUriTransformerService(
			revivedInitData.remote?.authority,
		);

		services.set(IURITransformerService, uriTransformerServiceInstance);

		// Initialize RPCProtocol with the transformer
		// This is a change: RPCProtocol is now created *after* IURITransformerService is available
		// Note: The global `cocoonRpcProtocol` will be reassigned here.
		// The one created before `initializeCocoonHost` was temporary or could be an issue.
		// It's better to create it here once all dependencies like the transformer are ready.

		// If cocoonRpcProtocol was already created based on a null transformer,

		// and if it caches the transformer or its effects, this might be too late.
		// Ideally, RPCProtocol receives its transformer at construction.
		// Let's assume the global cocoonRpcProtocol is the one to be fully configured.
		// The original `ExtensionHostMain` creates RPCProtocol and then uses IT to transform initData.
		// Our `cocoonIpcAdapter` is already created.
		// We re-assign the global to ensure the one used henceforth has the transformer.
		(global as any).cocoonRpcProtocolInstance = new RPCProtocol(
			// Assert non-null as it's checked before
			cocoonIpcAdapter!,

			// rpcLogger
			null,

			// Pass the actual transformer instance
			uriTransformerServiceInstance,
		);

		cocoonRpcProtocol = (global as any).cocoonRpcProtocolInstance;

		// Now register this fully configured RPCProtocol as the service
		services.set(IExtHostRpcService, cocoonRpcProtocol);

		services.set(IHostUtils, new ShimHostUtils(logService));

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

			// Corrected: pass RPC
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
		// These need to be available before ExtHostExtensionService or API Factory access them
		const docService = cocoonDI.createInstance(ShimDocumentService);

		// Use `cocoonDI.set` if services collection was already used by InstantiationService constructor
		cocoonDI.set(IExtHostDocuments, docService);

		const workspaceService = cocoonDI.createInstance(
			ShimExtHostWorkspace,

			// No need to pass FileSystemInfo and DocService if they are fetched via DI inside ShimExtHostWorkspace constructor
		);

		cocoonDI.set(IExtHostWorkspace, workspaceService);

		const configService = cocoonDI.createInstance(ShimExtHostConfiguration);

		cocoonDI.set(IExtHostConfiguration, configService);

		const commandsService = cocoonDI.createInstance(ShimExtHostCommands);

		cocoonDI.set(IExtHostCommands, commandsService);

		const outputService = cocoonDI.createInstance(ShimOutputService);

		cocoonDI.set(IExtHostOutputService, outputService);

		const diagnosticsService = cocoonDI.createInstance(
			ShimDiagnosticsService,
		);

		cocoonDI.set(IExtHostDiagnostics, diagnosticsService);

		const terminalService = cocoonDI.createInstance(
			ShimExtHostTerminalService,
		);

		cocoonDI.set(IExtHostTerminalService, terminalService);

		const authService = cocoonDI.createInstance(ShimExtHostAuthentication);

		cocoonDI.set(IExtHostAuthentication, authService);

		const langModelsService = cocoonDI.createInstance(
			ShimExtHostLanguageModels,

			authService,
		);

		cocoonDI.set(IExtHostLanguageModels, langModelsService);

		const langFeaturesService = cocoonDI.createInstance(
			ShimLanguageFeatures,

			docService,
		);

		cocoonDI.set(IExtHostLanguageFeatures, langFeaturesService);

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

		// D. REAL ExtHostExtensionService
		cocoonDI.set(
			IExtHostExtensionService,

			new SyncDescriptor(ExtHostExtensionService),
		);

		// E. Add remaining singletons
		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			if (!cocoonDI.has(id)) {
				// Check if already set by cocoonDI.set
				cocoonDI.set(id, descriptor);
			}
		}

		// F. Prepare API Factory Provider for Interceptors
		console.log("[Cocoon] Preparing API Factory Provider...");

		const apiFactoryProvider =
			cocoonDI.invokeFunction<IExtensionApiFactory>((accessor) => {
				const originalVSCodeFactory =
					createVSCodeApiFactoryOriginal(accessor);

				// Already available via DI
				const localLogSvc = accessor.get(ILogService);

				const localFsApiShimInstance = new ShimFileSystemApi(
					localLogSvc,
				);

				global.fsImplForVscodeApi = localFsApiShimInstance;

				// This function is the IExtensionApiFactory
				return (
					extensionDesc: IRelaxedExtensionDescription,

					// These come from ExtHostExtensionService
					extensionInfo: IExtensionRegistries,

					// This comes from ExtHostConfiguration
					configProviderForFactory: ExtHostConfigProvider,
				): typeof vscode => {
					const vscodeApi = originalVSCodeFactory(
						extensionDesc,

						extensionInfo,

						configProviderForFactory,
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

		const extHostExtensionServiceForCJS = cocoonDI.get(
			IExtHostExtensionService,

			// Get the real service
		);

		const extPathsForCJS =
			await extHostExtensionServiceForCJS.getExtensionPathIndex();

		const extHostConfigServiceForCJS = cocoonDI.get(IExtHostConfiguration);

		const cfgProviderForCJS =
			await extHostConfigServiceForCJS.getConfigProvider();

		const extensionRegistriesForCJS: IExtensionRegistries = {
			// Needs sync version or await earlier
			mine: extHostExtensionServiceForCJS.getExtensionRegistryNow(),

			// Needs sync version or await earlier
			all: extHostExtensionServiceForCJS.getGlobalExtensionRegistryNow(),
		};

		// NodeRequireInterceptor and factories are from ...api/node/extHostExtensionService.ts in newer VS Code
		const cjsModuleInterceptor = cocoonDI.createInstance(
			// Use createInstance for DI
			NodeRequireInterceptor,

			// Your wrapped factory
			apiFactoryProvider,

			{
				// IExtHostRequireInterceptorOptions
				// Provide as a function
				extensionRegistry: () => extensionRegistriesForCJS,

				// Provide as a function
				extensionPaths: () => extPathsForCJS!,

				// Provide as a function
				configProvider: () => cfgProviderForCJS,
			},
		);

		// Register factories for CJS interceptor
		cjsModuleInterceptor.register(
			// This is from ...api/node/extHostExtensionService.ts
			new VSCodeNodeModuleFactory(
				apiFactoryProvider,

				extPathsForCJS!,

				// Pass the IExtensionRegistries
				extensionRegistriesForCJS,

				cfgProviderForCJS,

				logService!,
			),
		);

		cjsModuleInterceptor.register(
			cocoonDI.createInstance(NodeModuleAliasingModuleFactory),
		);

		cjsModuleInterceptor.register(new FsModuleShimFactory());

		cjsModuleInterceptor.register(new NodeBuiltinsShimFactory());

		console.log("[Cocoon] Installing CJS NodeRequireInterceptor...");

		// This patches require
		await cjsModuleInterceptor.install();

		console.log("[Cocoon] CJS NodeRequireInterceptor installed.");

		// H. Instantiate and Install ESM CocoonNodeModuleESMInterceptor
		console.log("[Cocoon] Setting up ESM Interceptor...");

		// The ESM Interceptor needs a way to call the apiFactory.
		// The context it needs: apiFactory, and potentially services to resolve ext path for that apiFactory call.
		const esmInterceptorContext: CocoonESMInterceptorContext = {
			apiFactory: apiFactoryProvider,

			// Provide a way for the factory to get necessary info if it's called with just a URI
			// This is complex because the API factory needs IExtensionDescription, IExtensionRegistries, and ExtHostConfigProvider
			// The original VSCodeNodeModuleFactory gets these through its constructor and `_extensionPaths`.
			// We need to ensure `apiFactoryProvider` can resolve these from a URI passed by ESM interceptor.
			// This might mean apiFactoryProvider needs to be smarter or ESM interceptor context needs more.
			// For now, let's assume apiFactoryProvider (as modified above) can work if it gets an extDesc or URI.
			// If apiFactoryProvider needs to access DI services, it's fine as it's invoked via cocoonDI.
		};

		const esmModuleInterceptor = cocoonDI.createInstance(
			CocoonNodeModuleESMInterceptor,

			esmInterceptorContext,
		);

		// This registers the loader hook
		await esmModuleInterceptor.install();

		console.log("[Cocoon] ESM Interceptor installed.");

		// I. Install Error Handlers
		console.log("[Cocoon] Installing Error Handlers...");

		const errorHandlerInstance = cocoonDI.createInstance(ErrorHandler);

		// Pass cocoonDI
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

		// J. Instantiate and Initialize the REAL ExtHostExtensionService
		console.log(
			"[Cocoon] Getting real ExtHostExtensionService instance from DI...",
		);

		// Already got it as extHostExtensionServiceForCJS, reuse or get again for clarity.
		const extensionService = cocoonDI.get(IExtHostExtensionService);

		console.log(
			"[Cocoon] Initializing real ExtHostExtensionService (will load extensions)...",
		);

		// This will call _beforeAlmostReadyToRunExtensions
		await extensionService.initialize();

		console.log(
			"[Cocoon] Real ExtHostExtensionService initialized successfully.",
		);

		// Pass cocoonDI
		ErrorHandler.installFullHandler(errorHandlerInstance, cocoonDI);

		logService?.info("[Cocoon] Full error handler installed.");

		console.log(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);

		ipcApiInstance.sendNotificationToMountain("extHostInitialized", {});
	} catch (hostError: any) {
		// ... (error handling unchanged)
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

		// Initialize cocoonRpcProtocol here, but note it might be re-initialized inside initializeCocoonHost
		// if we decide to pass the transformer at construction time there.
		// For now, let's keep the initial creation here. If it's re-created with a transformer inside,

		// ensure all parts of the system use the *final* instance.
		console.log(
			"[Cocoon] Creating initial RPCProtocol instance (may be reconfigured with transformer later)...",
		);

		if (!cocoonIpcAdapter) {
			console.error(
				"[Cocoon] CRITICAL: IPC Adapter (cocoonIpcAdapter) is null. Cannot create RPCProtocol.",
			);

			initializationFailedOrExited = true;

			process.exit(1);

			return;
		}

		const rpcLogger: IRPCProtocolLogger | null = null;

		(global as any).cocoonRpcProtocolInstance = new RPCProtocol(
			cocoonIpcAdapter,

			rpcLogger,

			null /* IURITransformer */,
		);

		cocoonRpcProtocol = (global as any).cocoonRpcProtocolInstance;

		initializeCocoonHost(message.params).catch((err: any) => {
			// ... (error handling unchanged)
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
