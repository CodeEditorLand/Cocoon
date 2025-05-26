/*---------------------------------------------------------------------------------------------
 * Cocoon Main Entry Point (index.ts)
 * --------------------------------------------------------------------------------------------
 * This file serves as the primary entry point and orchestrator for the Cocoon Node.js
 * sidecar process. Its main goal is to establish a VS Code-compatible extension host
 * environment within this sidecar, enabling the execution of standard VS Code extensions
 * in a decoupled manner, managed by an external "Mountain" host process.
 *
 * Core Responsibilities:
 * - Process Initialization: Sets up the Node.js environment.
 * - IPC Management: Utilizes `cocoon-ipc.ts` for communication with Mountain.
 * - Dependency Injection (DI): Configures and instantiates `InstantiationService` with
 *   core VS Code services and Cocoon-specific shims.
 * - Service Orchestration: Instantiates and wires up `IExtHost...` services.
 * - Module Interception: Sets up CJS and ESM interceptors. The API factory provider
 *   constructs the `vscode` API object using DI-managed shims.
 * - Extension Host Lifecycle: Initializes `ExtHostExtensionService`.
 * - URI Revival & Error Handling.
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";
import { performance } from "perf_hooks";
import { Barrier } from "vs/base/common/async";
import { VSBuffer } from "vs/base/common/buffer";
import { CancellationTokenSource } from "vs/base/common/cancellation";
import { MarshalledId, revive } from "vs/base/common/marshalling";
import { Schemas } from "vs/base/common/network";
import {
	URI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import { IURITransformer } from "vs/base/common/uriIpc";
import {
	ExtensionIdentifier,
	// Keep IExtensionDescription for general use
	IExtensionDescription,
	// For apiFactoryProvider default
	nullExtensionDescription,
	// For apiFactoryProvider type
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
	type ExtHostConfigProvider,
} from "vs/workbench/api/common/extHostConfiguration";
import { IExtHostDiagnostics } from "vs/workbench/api/common/extHostDiagnostics";
import {
	IExtHostDocuments,
	IExtHostDocumentsAndEditors,
} from "vs/workbench/api/common/extHostDocuments";
import {
	ExtensionPaths,
	// This is the REAL service DI key
	IExtHostExtensionService,
	IHostUtils,
} from "vs/workbench/api/common/extHostExtensionService";
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
	NodeModuleAliasingModuleFactory,
	NodeRequireInterceptor,
	// Alias the real service implementation
	ExtHostExtensionService as RealExtHostExtensionService,
	VSCodeNodeModuleFactory,
} from "vs/workbench/api/node/extHostExtensionService";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
import {
	RPCProtocol,
	type IRPCProtocolLogger,
} from "vs/workbench/services/extensions/common/rpcProtocol";

// Cocoon Specific Imports
import * as bootstrapUtils from "./cocoon-bootstrap";
import {
	CocoonNodeModuleESMInterceptor,
	type CocoonESMInterceptorContext,
} from "./cocoon-esm-interceptor";
// Import context type
import ipcApiInstance, {
	type CocoonPrimaryIpc,
	type VineMessage,
} from "./cocoon-ipc";
import { ShimExtHostApiDeprecationService } from "./shims/api-deprecation-shim";
import { ShimExtHostAuthentication } from "./shims/authentication-shim";
import {
	ShimExtHostClipboardService,
	type IExtHostClipboardServiceShape,
} from "./shims/clipboard-shim";
import { ShimExtHostCommands } from "./shims/commands-shim";
import { ShimExtHostConfiguration } from "./shims/configuration-shim";
import {
	ShimExtHostDebugService,
	type IExtHostDebugServiceShape,
} from "./shims/debug-shim";
import { ShimDiagnosticsService } from "./shims/diagnostics-shim";
import {
	ShimExtHostDialogService,
	type IExtHostDialogServiceShape,
} from "./shims/dialog-service-shim";
import { CocoonDocumentService } from "./shims/document-shim";
import { ShimExtensionEnablementService } from "./shims/enablement-service-shim";
import {
	ShimExtHostEnvService,
	type IExtHostEnvServiceShape,
} from "./shims/env-shim";
import {
	ShimExtHostExtensions,
	type IExtHostExtensionsShape,
} from "./shims/extensions-shim";
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
import {
	ShimExtHostMessageService,
	type IExtHostMessageServiceInterface,
} from "./shims/message-service-shim";
import { NodeModuleShimFactory as NodeBuiltinsShimFactory } from "./shims/node-module-shim-factory";
import { ShimOutputService } from "./shims/output-channel-shim";
import {
	ShimExtensionsProposedApi,
	type IExtHostProposedApis as CocoonIExtHostProposedApis,
} from "./shims/proposed-api-shim";
import {
	ShimExtHostQuickInputService,
	type IExtHostQuickInputServiceShape,
} from "./shims/quick-input-shim";
import { ShimExtHostSecretState } from "./shims/secret-state-shim";
import { ShimExtensionStoragePaths } from "./shims/storage-paths-shim";
import { ShimExtHostStorage } from "./shims/storage-shim";
import {
	ShimExtHostTaskService,
	type IExtHostTaskServiceShape,
} from "./shims/tasks-shim";
import { ShimExtHostTelemetry } from "./shims/telemetry-shim";
import { ShimExtHostTerminalService } from "./shims/terminal-service-shim";
import { ShimUriTransformerService } from "./shims/uri-transformer-shim";
import {
	ShimExtHostWindowPartsService,
	type IExtHostWindowPartsServiceShape,
} from "./shims/window-parts-shim";
import { ShimExtHostWorkspace } from "./shims/workspace-shim";
// Import all necessary types from the vscode API shim for constructing the API object
// Import the entire module for type reference
import type * as vscode from "./vscode";
import {
	// ... other core classes/enums needed by the factory itself
	// From vscode.ts re-export
	LogLevel as VscodeApiLogLevelEnumPublic,
	Position as VscodePositionPublic,
	Range as VscodeRangePublic,
	// Re-import key classes/enums for use in factory, even if also in vscode.ts
	Uri as VscodeUriPublic,
	type Commands as VscodeCommandsAPIType,
	type Debug as VscodeDebugAPIType,
	type Env as VscodeEnvAPIType,
	type Extensions as VscodeExtensionsAPIType,
	// For type casting
	type FileSystem as VscodeFileSystem,
	type Languages as VscodeLanguagesAPIType,
	type Tasks as VscodeTasksAPIType,
	type Window as VscodeWindowAPIType,
	type Workspace as VscodeWorkspaceAPIType,
} from "./vscode";

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

	process.exit(1);
}

// --- Global State ---
let cocoonDI: IInstantiationService | null = null;

let cocoonRpcProtocol: RPCProtocol | null = null;

const cocoonIpcAdapter = ipcApiInstance.createHostProtocolInterface();

let initializationFailedOrExited = false;

bootstrapUtils.patchProcess(() => !initializationFailedOrExited);

// --- URI Revival for Initial Data (Pre-DI) ---
function reviveUriComponentsForInitData(
	uriComponent: any,

	logService?: ILogService,
): URI | undefined {
	if (!uriComponent) return undefined;

	try {
		if (
			typeof uriComponent === "object" &&
			uriComponent !== null &&
			(uriComponent.path !== undefined ||
				uriComponent.scheme !== undefined ||
				(uriComponent as any).$mid === MarshalledId.Uri ||
				(uriComponent as any).$mid === MarshalledId.UriSimple)
		) {
			return URI.revive(uriComponent as VSCodeInternalUriComponents);
		}
	} catch (e: any) {
		logService?.warn(
			`[Cocoon URI Revival Pre-DI] Failed for component: ${JSON.stringify(uriComponent)}`,

			e.message,
		);
	}

	return undefined;
}

function transformUrisInObjectForInitData(
	obj: any,

	logService?: ILogService,
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

	if (Array.isArray(obj)) {
		return obj
			.map((item) => transformUrisInObjectForInitData(item, logService))
			.filter((item) => item !== undefined);
	}

	const revivedUriAttempt = reviveUriComponentsForInitData(obj, logService);

	if (revivedUriAttempt instanceof URI) {
		return revivedUriAttempt;
	}

	const newObj: { [key: string]: any } = {};

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			newObj[key] = transformUrisInObjectForInitData(
				obj[key],

				logService,
			);
		}
	}

	return newObj;
}

// Define Service Identifiers for new shims (if not already defined in their files and exported)
export const IExtHostMessageService =
	createDecorator<IExtHostMessageServiceInterface>("extHostMessageService");

export const IExtHostQuickInput =
	createDecorator<IExtHostQuickInputServiceShape>("extHostQuickInput");

export const IExtHostDialogs =
	createDecorator<IExtHostDialogServiceShape>("extHostDialogs");

export const IExtHostClipboard =
	createDecorator<IExtHostClipboardServiceShape>("extHostClipboard");

export const IExtHostEnv =
	createDecorator<IExtHostEnvServiceShape>("extHostEnv");

export const IExtHostExtensions =
	// For vscode.extensions
	createDecorator<IExtHostExtensionsShape>("extHostExtensions");

export const IExtHostDebugService = createDecorator<IExtHostDebugServiceShape>(
	"extHostDebugService",

	// For vscode.debug
);

export const IExtHostTaskService =
	// For vscode.tasks
	createDecorator<IExtHostTaskServiceShape>("extHostTaskService");

export const IExtHostWindowParts =
	// For misc window parts
	createDecorator<IExtHostWindowPartsServiceShape>("extHostWindowParts");

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
		const tempInitialLogLevel = rawInitDataFromMountain.logLevel
			? (parseLogLevel(rawInitDataFromMountain.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;

		//  // For pre-DI loggingconst earlyLogService = new ShimLogService(tempInitialLogLevel,

		// "CocoonEarlyInit");

		const uriTransformerServiceInstance = new ShimUriTransformerService(
			rawInitDataFromMountain.remote?.authority,
		);

		const rpcLogger: IRPCProtocolLogger | null = null;

		console.log(
			"[Cocoon] Creating final RPCProtocol instance with URI transformer...",
		);

		cocoonRpcProtocol = new RPCProtocol(
			cocoonIpcAdapter!,

			rpcLogger,

			uriTransformerServiceInstance,
		);

		// For VS Code's `revive`
		(globalThis as any).__COC_RPC_PROTOCOL__ = cocoonRpcProtocol;

		console.log(
			"[Cocoon] Reviving URIs in raw initData from Mountain using global RPCProtocol transformer...",
		);

		const revivedInitData = revive(
			rawInitDataFromMountain,
		) as ExtHostInitData;

		console.log(
			"[Cocoon] InitData URIs revived. Logs location:",

			revivedInitData.logsLocation.toString(),
		);

		console.log(
			"[Cocoon] Setting up ServiceCollection and core services...",
		);

		const services = new ServiceCollection();

		const finalLogLevel = revivedInitData.logLevel
			? (parseLogLevel(revivedInitData.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;

		logService = new ShimLogService(finalLogLevel, "CocoonMain");

		services.set(ILogService, logService);

		services.set(ILoggerService, new ShimLoggerService(logService));

		services.set(IExtHostInitDataService, {
			_serviceBrand: undefined,

			value: revivedInitData,
		});

		services.set(IExtHostRpcService, cocoonRpcProtocol);

		services.set(IURITransformerService, uriTransformerServiceInstance);

		services.set(IHostUtils, new ShimHostUtils(logService));

		const fileSystemInfoService = new ShimExtHostFileSystemInfo(
			cocoonRpcProtocol,

			logService,
		);

		services.set(IExtHostFileSystemInfo, fileSystemInfoService);

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

			new ShimExtHostApiDeprecationService(cocoonRpcProtocol, logService),
		);

		console.log("[Cocoon] Creating InstantiationService...");

		cocoonDI = new InstantiationService(services, true /* strict */);

		// Instantiate services that require DI
		const documentServiceInstance = cocoonDI.createInstance(
			CocoonDocumentService,
		);

		cocoonDI.set(IExtHostDocuments, documentServiceInstance);

		cocoonDI.set(
			IExtHostDocumentsAndEditors,

			documentServiceInstance as any,
		);

		const localFsApiShimInstance = new ShimFileSystemApi(logService);

		// Register new granular shims with DI
		cocoonDI.set(
			IExtHostMessageService,

			cocoonDI.createInstance(ShimExtHostMessageService),
		);

		cocoonDI.set(
			IExtHostQuickInput,

			cocoonDI.createInstance(ShimExtHostQuickInputService),
		);

		cocoonDI.set(
			IExtHostDialogs,

			cocoonDI.createInstance(ShimExtHostDialogService),
		);

		const clipboardServiceInstance = cocoonDI.createInstance(
			ShimExtHostClipboardService,
		);

		cocoonDI.set(IExtHostClipboard, clipboardServiceInstance);

		cocoonDI.set(
			IExtHostEnv,

			cocoonDI.createInstance(
				ShimExtHostEnvService,

				cocoonDI.get(IExtHostInitDataService),

				clipboardServiceInstance,
			),
		);

		cocoonDI.set(
			IExtHostWindowParts,

			cocoonDI.createInstance(ShimExtHostWindowPartsService),

			// For misc window parts
		);

		cocoonDI.set(
			IExtHostWorkspace,

			cocoonDI.createInstance(
				ShimExtHostWorkspace,

				revivedInitData,

				documentServiceInstance,

				localFsApiShimInstance,

				cocoonDI,
			),
		);

		cocoonDI.set(
			IExtHostConfiguration,

			cocoonDI.createInstance(
				ShimExtHostConfiguration,

				revivedInitData.configurationData,
			),
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
		);

		cocoonDI.set(
			IExtHostLanguageModels,

			cocoonDI.createInstance(
				ShimExtHostLanguageModels,

				cocoonDI.get(IExtHostAuthentication),
			),
		);

		cocoonDI.set(
			IExtHostLanguageFeatures,

			cocoonDI.createInstance(
				ShimLanguageFeatures,

				documentServiceInstance,
			),
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

			cocoonDI.createInstance(ShimExtensionsProposedApi, revivedInitData),
		);

		// Register the REAL ExtHostExtensionService, now passing cocoonDI (IInstantiationService)
		cocoonDI.set(
			IExtHostExtensionService,

			new SyncDescriptor(RealExtHostExtensionService, [
				false,

				ipcApiInstance as CocoonPrimaryIpc,

				cocoonDI,
			]),
		);

		// Register shims for vscode.extensions, vscode.debug, vscode.tasks
		cocoonDI.set(
			IExtHostExtensions,

			cocoonDI.createInstance(
				ShimExtHostExtensions,

				cocoonDI.get(IExtHostExtensionService),
			),
		);

		cocoonDI.set(
			IExtHostDebugService,

			cocoonDI.createInstance(ShimExtHostDebugService),
		);

		cocoonDI.set(
			IExtHostTaskService,

			cocoonDI.createInstance(ShimExtHostTaskService),
		);

		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			if (!cocoonDI.has(id)) {
				cocoonDI.set(id, descriptor);
			}
		}

		const extHostExtensionService = cocoonDI.get(IExtHostExtensionService);

		const extHostConfigService = cocoonDI.get(IExtHostConfiguration);

		performance.mark("code/extHost/willWaitForConfigAndPaths");

		const [extensionPaths, configProvider, globalRegistry, myRegistry] =
			await Promise.all([
				extHostExtensionService.getExtensionPathIndex(),

				extHostConfigService.getConfigProvider(),

				extHostExtensionService.getGlobalExtensionRegistry(),

				extHostExtensionService.getExtensionRegistry(),
			]);

		performance.mark("code/extHost/didWaitForConfigAndPaths");

		const preResolvedExtensionRegistries: IExtensionRegistries = {
			mine: myRegistry,

			all: globalRegistry,
		};

		console.log("[Cocoon] Preparing API Factory Provider...");

		const apiFactoryProvider =
			cocoonDI.invokeFunction<IExtensionApiFactory>((accessor) => {
				const originalVSCodeFactory =
					createVSCodeApiFactoryOriginal(accessor);

				return (
					extensionDescOrUri: IRelaxedExtensionDescription | URI,

					extensionInfoOverride?: IExtensionRegistries,

					configProviderOverride?: ExtHostConfigProvider,
				): typeof import("vscode") => {
					let extDescription: IRelaxedExtensionDescription =
						nullExtensionDescription as any;

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
							logService?.warn(
								`[Cocoon API Factory] Could not identify extension for ESM import from ${parentUri.toString()}`,
							);
						}
					} else if (extensionDescOrUri) {
						extDescription = extensionDescOrUri;
					}

					const vscodeApiBase = originalVSCodeFactory(
						extDescription,

						finalExtensionRegistries,

						finalConfigProvider,
					);

					// --- Augment/Override with our DI-managed shims ---
					const commandsShim = accessor.get(IExtHostCommands);

					const workspaceShim = accessor.get(IExtHostWorkspace);

					const languagesShim = accessor.get(
						IExtHostLanguageFeatures,
					);

					const outputServiceShim = accessor.get(
						IExtHostOutputService,
					);

					const terminalServiceShim = accessor.get(
						IExtHostTerminalService,
					);

					const messageServiceShim = accessor.get(
						IExtHostMessageService,
					);

					const quickInputShim = accessor.get(IExtHostQuickInput);

					const dialogShim = accessor.get(IExtHostDialogs);

					const envShim = accessor.get(IExtHostEnv);

					const diagnosticServiceShim =
						accessor.get(IExtHostDiagnostics);

					const extensionsShim = accessor.get(IExtHostExtensions);

					const debugShim = accessor.get(IExtHostDebugService);

					const tasksShim = accessor.get(IExtHostTaskService);

					// For misc window parts
					const windowPartsShim = accessor.get(IExtHostWindowParts);

					const completeVscodeApi = {
						...vscodeApiBase,

						commands: commandsShim as vscode.Commands,

						workspace: workspaceShim as vscode.Workspace,

						languages: {
							...(vscodeApiBase.languages || {}),

							// Methods from ShimLanguageFeatures
							registerHoverProvider:
								languagesShim.registerHoverProvider.bind(
									languagesShim,
								),

							registerCompletionItemProvider:
								languagesShim.registerCompletionItemProvider.bind(
									languagesShim,
								),

							registerDefinitionProvider:
								languagesShim.registerDefinitionProvider.bind(
									languagesShim,
								),

							registerCodeActionsProvider:
								languagesShim.registerCodeActionsProvider.bind(
									languagesShim,
								),

							registerCodeLensProvider:
								languagesShim.registerCodeLensProvider.bind(
									languagesShim,
								),

							registerDeclarationProvider:
								languagesShim.registerDeclarationProvider.bind(
									languagesShim,
								),

							registerDocumentFormattingEditProvider:
								languagesShim.registerDocumentFormattingEditProvider.bind(
									languagesShim,
								),

							registerDocumentHighlightProvider:
								languagesShim.registerDocumentHighlightProvider.bind(
									languagesShim,
								),

							registerDocumentLinkProvider:
								languagesShim.registerDocumentLinkProvider.bind(
									languagesShim,
								),

							registerDocumentRangeFormattingEditProvider:
								languagesShim.registerDocumentRangeFormattingEditProvider.bind(
									languagesShim,
								),

							registerOnTypeFormattingEditProvider:
								languagesShim.registerOnTypeFormattingEditProvider.bind(
									languagesShim,
								),

							registerReferenceProvider:
								languagesShim.registerReferenceProvider.bind(
									languagesShim,
								),

							registerRenameProvider:
								languagesShim.registerRenameProvider.bind(
									languagesShim,
								),

							registerSignatureHelpProvider:
								languagesShim.registerSignatureHelpProvider.bind(
									languagesShim,
								),

							registerImplementationProvider:
								languagesShim.registerImplementationProvider.bind(
									languagesShim,
								),

							registerTypeDefinitionProvider:
								languagesShim.registerTypeDefinitionProvider.bind(
									languagesShim,
								),

							registerWorkspaceSymbolProvider:
								languagesShim.registerWorkspaceSymbolProvider.bind(
									languagesShim,
								),

							registerSelectionRangeProvider:
								languagesShim.registerSelectionRangeProvider.bind(
									languagesShim,
								),

							registerCallHierarchyProvider:
								languagesShim.registerCallHierarchyProvider.bind(
									languagesShim,
								),

							registerTypeHierarchyProvider:
								languagesShim.registerTypeHierarchyProvider.bind(
									languagesShim,
								),

							registerLinkedEditingRangeProvider:
								languagesShim.registerLinkedEditingRangeProvider.bind(
									languagesShim,
								),

							registerInlayHintsProvider:
								languagesShim.registerInlayHintsProvider.bind(
									languagesShim,
								),

							registerDocumentColorProvider:
								languagesShim.registerDocumentColorProvider.bind(
									languagesShim,
								),

							registerFoldingRangeProvider:
								languagesShim.registerFoldingRangeProvider.bind(
									languagesShim,
								),

							// Other languages API methods
							getLanguages:
								languagesShim.getLanguages.bind(languagesShim),

							setTextDocumentsLanguage:
								languagesShim.setTextDocumentsLanguage.bind(
									languagesShim,
								),

							match: languagesShim.match.bind(languagesShim),

							createDiagnosticCollection: (name?: string) =>
								diagnosticServiceShim.createDiagnosticCollection(
									name,
								),

							get onDidChangeDiagnostics() {
								return diagnosticServiceShim.onDidChangeDiagnostics;
							},

							setLanguageStatus:
								languagesShim.setLanguageStatus.bind(
									languagesShim,
								),

							createLanguageStatusItem:
								languagesShim.createLanguageStatusItem.bind(
									languagesShim,
								),
						} as vscode.Languages,

						window: {
							...(vscodeApiBase.window || {}),

							// From specific shims
							showInformationMessage: (
								message: string,

								...args: any[]
							) =>
								messageServiceShim.showInformationMessage(
									message,

									...(args as
										| [
												vscode.MessageOptions,

												...(
													| vscode.MessageItem[]
													| string[]
												),
										  ]
										| (vscode.MessageItem[] | string[])),
								),

							showWarningMessage: (
								message: string,

								...args: any[]
							) =>
								messageServiceShim.showWarningMessage(
									message,

									...(args as
										| [
												vscode.MessageOptions,

												...(
													| vscode.MessageItem[]
													| string[]
												),
										  ]
										| (vscode.MessageItem[] | string[])),
								),

							showErrorMessage: (
								message: string,

								...args: any[]
							) =>
								messageServiceShim.showErrorMessage(
									message,

									...(args as
										| [
												vscode.MessageOptions,

												...(
													| vscode.MessageItem[]
													| string[]
												),
										  ]
										| (vscode.MessageItem[] | string[])),
								),

							showQuickPick: quickInputShim.showQuickPick.bind(
								quickInputShim,

								// Cast to any due to overloads
							) as any,

							showInputBox:
								quickInputShim.showInputBox.bind(
									quickInputShim,
								),

							showOpenDialog:
								dialogShim.showOpenDialog.bind(dialogShim),

							showSaveDialog:
								dialogShim.showSaveDialog.bind(dialogShim),

							createOutputChannel: (
								name: string,

								optsOrLangId?:
									| string
									| { log?: boolean; languageId?: string },
							) =>
								outputServiceShim.createOutputChannel(
									name,

									optsOrLangId as any,
								),

							createTerminal: (options?: any) =>
								terminalServiceShim.createTerminal(options),

							get terminals() {
								return terminalServiceShim.terminals;
							},

							get activeTerminal() {
								return terminalServiceShim.activeTerminal;
							},

							get onDidOpenTerminal() {
								return terminalServiceShim.onDidOpenTerminal;
							},

							get onDidCloseTerminal() {
								return terminalServiceShim.onDidCloseTerminal;
							},

							get onDidChangeActiveTerminal() {
								return terminalServiceShim.onDidChangeActiveTerminal;
							},

							get onDidChangeTerminalState() {
								return terminalServiceShim.onDidChangeTerminalState;
							},

							// From ShimExtHostWindowPartsService
							get state() {
								return windowPartsShim.state;
							},

							createStatusBarItem:
								windowPartsShim.createStatusBarItem.bind(
									windowPartsShim,

									// Cast due to overloads
								) as any,

							setStatusBarMessage:
								windowPartsShim.setStatusBarMessage.bind(
									windowPartsShim,

									// Cast due to overloads
								) as any,

							withProgress:
								windowPartsShim.withProgress.bind(
									windowPartsShim,
								),

							createTreeView: windowPartsShim.createTreeView.bind(
								windowPartsShim,

								// Cast
							) as any,

							registerTreeDataProvider:
								windowPartsShim.registerTreeDataProvider.bind(
									windowPartsShim,

									// Cast
								) as any,

							createWebviewPanel:
								windowPartsShim.createWebviewPanel.bind(
									windowPartsShim,
								),

							registerWebviewPanelSerializer:
								windowPartsShim.registerWebviewPanelSerializer.bind(
									windowPartsShim,
								),

							registerUriHandler:
								windowPartsShim.registerUriHandler.bind(
									windowPartsShim,
								),

							// TODO: Add activeTextEditor, visibleTextEditors (from IExtHostDocumentsAndEditors)
						} as VscodeWindowAPIType,

						env: envShim as VscodeEnvAPIType,

						extensions: extensionsShim as VscodeExtensionsAPIType,

						debug: debugShim as VscodeDebugAPIType,

						tasks: tasksShim as VscodeTasksAPIType,

						// Re-export core classes and enums from vscode.ts for `vscode.Uri` style access
						Uri: VscodeUriPublic,

						Position: VscodePositionPublic,

						Range: VscodeRangePublic,

						Selection: vscode.Selection,

						Location: vscode.Location,

						Disposable: vscode.Disposable,

						CancellationToken: vscode.CancellationToken,

						CancellationTokenSource: vscode.CancellationTokenSource,

						CancellationError: vscode.CancellationError,

						EventEmitter: vscode.VscodeEmitter,

						Diagnostic: vscode.Diagnostic,

						DiagnosticRelatedInformation:
							vscode.DiagnosticRelatedInformation,

						CompletionItem: vscode.CompletionItem,

						CompletionList: vscode.CompletionList,

						SnippetString: vscode.SnippetString,

						Hover: vscode.Hover,

						SignatureHelp: vscode.SignatureHelp,

						DefinitionLink: vscode.DefinitionLink,

						CodeAction: vscode.CodeAction,

						CodeActionKind: vscode.CodeActionKind,

						CodeLens: vscode.CodeLens,

						Command: vscode.VscodeCommand,

						DocumentLink: vscode.DocumentLink,

						WorkspaceEdit: vscode.WorkspaceEdit,

						SymbolInformation: vscode.SymbolInformation,

						SymbolKind: vscode.SymbolKind,

						CallHierarchyItem: vscode.CallHierarchyItem,

						TypeHierarchyItem: vscode.TypeHierarchyItem,

						QuickPickItem: vscode.QuickPickItem,

						InputBoxOptions: vscode.InputBoxOptions,

						TextEdit: vscode.TextEdit,

						RelativePattern: vscode.RelativePattern,

						ThemeColor: vscode.ThemeColor,

						ThemeIcon: vscode.ThemeIcon,

						FileType: vscode.FileType,

						DiagnosticSeverity: vscode.DiagnosticSeverity,

						ExtensionKind: vscode.ExtensionKind,

						ExtensionMode: vscode.ExtensionMode,

						EndOfLine: vscode.EndOfLine,

						ViewColumn: vscode.ViewColumn,

						StatusBarAlignment: vscode.StatusBarAlignment,

						QuickInputButtons: vscode.QuickInputButtons,

						ConfigurationTarget: vscode.ConfigurationTarget,

						TextEditorRevealType: vscode.TextEditorRevealType,

						TextDocumentChangeReason:
							vscode.TextDocumentChangeReason,

						TaskScope: vscode.TaskScope,

						DebugConsoleMode: vscode.DebugConsoleMode,

						ProgressLocation: vscode.ProgressLocation,

						CompletionItemKind: vscode.CompletionItemKind,

						CompletionTriggerKind: vscode.CompletionTriggerKind,

						SignatureHelpTriggerKind:
							vscode.SignatureHelpTriggerKind,

						IndentAction: vscode.IndentAction,

						LanguageStatusSeverity: vscode.LanguageStatusSeverity,

						LogLevel: VscodeApiLogLevelEnumPublic,

						FileSystemError: vscode.VscodeFileSystemError,
					};

					return completeVscodeApi as typeof import("vscode");
				};
			});

		console.log("[Cocoon] API Factory Provider configured.");

		console.log("[Cocoon] Setting up CJS NodeRequireInterceptor...");

		const cjsModuleInterceptor = cocoonDI.createInstance(
			NodeRequireInterceptor,

			apiFactoryProvider,

			{
				extensionRegistry: () => preResolvedExtensionRegistries,

				extensionPaths: () => extensionPaths,

				configProvider: () => configProvider,
			},
		);

		cjsModuleInterceptor.register(
			new VSCodeNodeModuleFactory(
				apiFactoryProvider,

				extensionPaths,

				preResolvedExtensionRegistries,

				configProvider,

				logService!,
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

		console.log("[Cocoon] Setting up ESM Interceptor...");

		const esmInterceptorContext: CocoonESMInterceptorContext = {
			apiFactory: apiFactoryProvider,

			// No longer passing these directly, apiFactory gets them via accessor
			// extensionService: extHostExtensionService,

			// configurationService: extHostConfigService,

			// logService: logService!,
		};

		const esmModuleInterceptor = cocoonDI.createInstance(
			CocoonNodeModuleESMInterceptor,

			esmInterceptorContext,
		);

		await esmModuleInterceptor.install();

		console.log("[Cocoon] ESM Interceptor installed.");

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

		console.log(
			"[Cocoon] Initializing real ExtHostExtensionService (will load extensions)...",
		);

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

		const earlyLogService = new ShimLogService(
			LogLevel.Info,

			"CocoonInitDataRevival",
		);

		const revivedParams = transformUrisInObjectForInitData(
			message.params,

			earlyLogService,
		);

		initializeCocoonHost(revivedParams).catch((err: any) => {
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
