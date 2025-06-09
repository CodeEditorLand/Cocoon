/*
 * File: Cocoon/Source/Index.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-07 05:37:43 UTC
 * Dependency: ./Bootstrap, ./CancellationRegistry, ./Ipc, ./Shim, ./TypeConverter, ./vscode, node:fs, node:path, perf_hooks, vs/base/common/async, vs/base/common/buffer, vs/base/common/cancellation, vs/platform/instantiation/common/extensions, vs/workbench/api/common/extHostApiDeprecationService, vs/workbench/api/common/extHostAuthentication, vs/workbench/api/common/extHostCommands, vs/workbench/api/common/extHostDiagnostics, vs/workbench/api/common/extHostFileSystemInfo, vs/workbench/api/common/extHostLanguageFeatures, vs/workbench/api/common/extHostLanguageModels, vs/workbench/api/common/extHostLocalizationService, vs/workbench/api/common/extHostManagedSockets, vs/workbench/api/common/extHostOutput, vs/workbench/api/common/extHostRpcService, vs/workbench/api/common/extHostSecretState, vs/workbench/api/common/extHostStorage, vs/workbench/api/common/extHostStoragePaths, vs/workbench/api/common/extHostTelemetry, vs/workbench/api/common/extHostTerminalService, vs/workbench/api/common/extHostUriTransformerService, vs/workbench/api/common/extHostWorkspace, vs/workbench/api/common/extensionHostMain, vs/workbench/services/extensionManagement/common/extensionManagement, vs/workbench/services/extensions/common/extensionHostKind
 * Export: ICancellationTokenRegistry, ICocoonProposedApi, IExtHostClipboard, IExtHostDebug, IExtHostDialog, IExtHostEnvironment, IExtHostExtension, IExtHostMessageService, IExtHostQuickInput, IExtHostTask, IExtHostWindowPart
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Main Entry Point
 * --------------------------------------------------------------------------------------------
 * This file serves as the primary entry point and orchestrator for the Cocoon Node.js
 * sidecar process. Its main goal is to establish a VS Code-compatible extension host
 * environment, enabling the execution of standard VS Code extensions in a decoupled manner.
 *
 * Core Responsibilities:
 * - Process Initialization: Sets up the Node.js environment, including patching globals
 *   and adjusting module search paths to resolve VS Code's internal modules.
 * - IPC/RPC Management: Establishes a `RPCProtocol` on top of an IPC layer to communicate
 *   with the "Mountain" host process.
 * - Dependency Injection (DI): Configures and instantiates `InstantiationService`,
 *   populating it with core VS Code services and Cocoon's shim implementations.
 * - Service Orchestration: Instantiates and wires up the necessary services, using
 *   Cocoon shims to adapt or override default VS Code behavior.
 * - Module Interception: Sets up `NodeRequireInterceptor` (CJS) and a custom ESM
 *   interceptor to provide extensions with a shimmed `vscode` API object.
 * - API Factory: A critical component that constructs the `vscode` API object for each
 *   extension, strategically overriding namespaces with Cocoon's shim instances.
 * - Extension Host Lifecycle: Initializes the real `ExtHostExtensionService` to manage
 *   the standard process of scanning, loading, and activating extensions.
 * - Global Error Handling: Installs handlers for uncaught exceptions and rejections.
 * - Communication Lifecycle: Manages the handshake with the Mountain host, from
 *   indicating readiness to receiving initialization data and signaling completion.
 *--------------------------------------------------------------------------------------------*/

import * as Fs from "node:fs";
import * as Path from "node:path";
import { performance as Performance } from "perf_hooks";
import { Barrier } from "vs/base/common/async";
import { VSBuffer } from "vs/base/common/buffer";
import { CancellationTokenSource } from "vs/base/common/cancellation";
import {
	MarshalledId,
	revive as ReviveMarshalled,
} from "vs/base/common/marshalling";
import {
	URI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import {
	nullExtensionDescription,
	type IRelaxedExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	createDecorator,
	InstantiationService,
	ServiceIdentifier,
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
	createApiFactory as CreateVSCodeApiFactory,
	type IExtensionApiFactory,
	type IExtensionRegistries,
} from "vs/workbench/api/common/extHost.api.impl";
import {
	ExtHostContext,
	type ProxyIdentifier as VsProxyIdentifier,
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
	ExtHostExtensionService as RealExtHostExtensionService,
	VSCodeNodeModuleFactory,
} from "vs/workbench/api/node/extHostExtensionService";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
import {
	RPCProtocol,
	type IRPCProtocolLogger,
} from "vs/workbench/services/extensions/common/rpcProtocol";

import * as Bootstrap from "./Bootstrap";
import { CancellationTokenRegistry } from "./CancellationRegistry";
import {
	CocoonNodeModuleESMInterceptor,
	type CocoonESMInterceptorContext,
} from "./EsmInterceptor";
import * as Ipc from "./Ipc";
import { initializeSkyIpcRouter, skyToCocoonMessageBus } from "./Ipc";
import * as Shim from "./Shim";
import { initializeAllConverterLoggers as InitializeTypeConverterLogger } from "./TypeConverter";
import * as Vscode from "./vscode";

type ApiFactoryExtensionSourceInformation =
	Shim.Env.ExtensionSourceInformation &
		Shim.Message.ExtensionSourceInformation;

console.log("[Cocoon] Main Process Starting...");
Performance.mark(`code/extHost/willConnectToRpc`);

// --- VS Code Module Path Setup ---
const VsCodeOutDirectoryEnvironmentVariable = "VSCODE_OUT_DIR";
const ConfiguredVsCodeOutDirectory =
	process.env[VsCodeOutDirectoryEnvironmentVariable];
const DefaultVsCodeOutDirectory = Path.resolve(
	__dirname,
	"../../../Dependency/Microsoft/Dependency/Editor/out",
);
const VsCodeOutDirectory =
	ConfiguredVsCodeOutDirectory || DefaultVsCodeOutDirectory;

if (Fs.existsSync(VsCodeOutDirectory)) {
	if (Array.isArray((module as any).paths)) {
		(module as any).paths.unshift(VsCodeOutDirectory);
	} else {
		console.warn(
			"[Cocoon] `module.paths` is not an array; cannot prepend VS Code 'out' directory.",
		);
	}
} else {
	console.error(
		`[Cocoon] CRITICAL FAILURE: VS Code 'out' directory NOT FOUND: ${VsCodeOutDirectory}.`,
	);
	process.exit(1);
}

// --- Global State ---
let CocoonDependencyInjection: IInstantiationService | null = null;
let RpcProtocol: RPCProtocol | null = null;
let InitializationFailedOrExited = false;
Bootstrap.PatchProcess(() => InitializationFailedOrExited);

// --- Service Decorators ---
export const IExtHostMessageService =
	createDecorator<Shim.Message.IExtHostMessageServiceInterface>(
		"extHostMessageService",
	);
export const IExtHostQuickInput =
	createDecorator<Shim.QuickInput.IExtHostQuickInputServiceShape>(
		"extHostQuickInput",
	);
export const IExtHostDialog =
	createDecorator<Shim.Dialog.IExtHostDialogServiceShape>("extHostDialog");
export const IExtHostClipboard =
	createDecorator<Shim.Clipboard.IExtHostClipboardServiceShape>(
		"extHostClipboard",
	);
export const IExtHostEnvironment =
	createDecorator<Shim.Env.IExtHostEnvironmentServiceShape>("extHostEnv");
export const IExtHostExtension =
	createDecorator<Shim.Extension.IExtHostExtensionsShape>("extHostExtension");
export const IExtHostDebug =
	createDecorator<Shim.Debug.IExtHostDebugServiceShape>(
		"extHostDebugService",
	);
export const IExtHostTask =
	createDecorator<Shim.Task.IExtHostTaskServiceShape>("extHostTaskService");
export const IExtHostWindowPart =
	createDecorator<Shim.WindowPart.IExtHostWindowPartsServiceShape>(
		"extHostWindowPart",
	);
export const ICocoonProposedApi =
	createDecorator<Shim.ProposedApi.ICocoonExtHostProposedApis>(
		"cocoonExtHostProposedApi",
	);
export const ICancellationTokenRegistry =
	createDecorator<CancellationTokenRegistry>("cancellationTokenRegistry");

// --- Main Initialization Logic ---
export async function InitializeCocoonHost(
	RawInitializationData: any,
): Promise<void> {
	console.log("[Cocoon] Initializing Cocoon Extension Host Environment...");
	Performance.mark(`code/extHost/didWaitForInitData`);

	if (InitializationFailedOrExited) {
		console.warn(
			"[Cocoon] Initialization skipped: Already failed or exited.",
		);
		return;
	}

	let LogService: ILogService | undefined;

	try {
		const UriTransformerService =
			new Shim.UriTransformer.ShimUriTransformerService(
				RawInitializationData?.remote?.authority,
			);
		const RpcLogger: IRPCProtocolLogger | null = null;
		RpcProtocol = new RPCProtocol(
			Ipc.Get().CreateHostProtocolInterface(),
			RpcLogger,
			UriTransformerService,
		);
		(globalThis as any).__COC_RPC_PROTOCOL__ = RpcProtocol;

		const FullyRevivedInitializationData = ReviveMarshalled(
			RawInitializationData,
		) as ExtHostInitData;
		const Service = new ServiceCollection();
		const FinalLogLevel = FullyRevivedInitializationData.logLevel
			? (parseLogLevel(FullyRevivedInitializationData.logLevel) ??
				LogLevel.Info)
			: LogLevel.Info;
		LogService = new Shim.Log.ShimLogService(
			FinalLogLevel,
			"CocoonMainLog",
		);
		Service.set(ILogService, LogService);
		Service.set(ILoggerService, new Shim.Log.ShimLoggerService(LogService));
		LogService.info(
			`[Cocoon] Main LogService initialized. Level: ${LogLevel[FinalLogLevel]}.`,
		);

		InitializeTypeConverterLogger(LogService);
		initializeSkyIpcRouter(LogService);

		const CancellationTokenRegistryService = new CancellationTokenRegistry(
			LogService,
		);
		Service.set(
			ICancellationTokenRegistry,
			CancellationTokenRegistryService,
		);

		const InitializationDataService = {
			_serviceBrand: undefined,
			value: FullyRevivedInitializationData,
		};
		Service.set(IExtHostInitDataService, InitializationDataService);
		Service.set(IExtHostRpcService, RpcProtocol);
		Service.set(IURITransformerService, UriTransformerService);

		const FileSystemInformationService =
			new Shim.FileSystemInfo.ShimExtHostFileSystemInfo(
				RpcProtocol,
				LogService,
			);
		Service.set(IExtHostFileSystemInfo, FileSystemInformationService);
		RpcProtocol.set(
			ExtHostContext.ExtHostFileSystemInfo as any,
			FileSystemInformationService,
		);

		Service.set(
			IExtHostStorage,
			new Shim.Storage.ShimExtHostStorage(RpcProtocol, LogService),
		);
		Service.set(
			IExtHostSecretState,
			new Shim.SecretState.ShimExtHostSecretState(
				RpcProtocol,
				LogService,
				"placeholder_global_secret_state",
			),
		);
		const LocalizationService =
			new Shim.Localization.ShimExtHostLocalizationService(
				RpcProtocol,
				LogService,
				FullyRevivedInitializationData,
			);
		Service.set(IExtHostLocalizationService, LocalizationService);
		Service.set(
			IExtHostManagedSockets,
			new Shim.ManagedSocket.ShimExtHostManagedSockets(
				RpcProtocol,
				LogService,
			),
		);
		Service.set(
			IExtHostTelemetry,
			new Shim.Telemetry.ShimExtHostTelemetry(
				RpcProtocol,
				LogService,
				InitializationDataService,
			),
		);
		Service.set(
			IExtHostApiDeprecationService,
			new Shim.ApiDeprecation.ShimExtHostApiDeprecationService(
				RpcProtocol,
				LogService,
			),
		);

		CocoonDependencyInjection = new InstantiationService(Service, true);
		LogService.info("[Cocoon] InstantiationService created.");

		CocoonDependencyInjection.set(
			IHostUtils,
			CocoonDependencyInjection.createInstance(
				Shim.HostUtil.ShimHostUtils,
			),
		);
		CocoonDependencyInjection.set(
			IExtensionStoragePaths,
			CocoonDependencyInjection.createInstance(
				Shim.StoragePath.ShimExtensionStoragePaths,
				FullyRevivedInitializationData.environment,
			),
		);
		const DocumentService = CocoonDependencyInjection.createInstance(
			Shim.Document.CocoonDocumentService,
		);
		CocoonDependencyInjection.set(IExtHostDocuments, DocumentService);
		CocoonDependencyInjection.set(
			IExtHostDocumentsAndEditors,
			DocumentService as any,
		);
		const FileSystemApiShim = CocoonDependencyInjection.createInstance(
			Shim.FsApi.ShimFileSystemApi,
			FileSystemInformationService,
		);
		CocoonDependencyInjection.set(
			IExtHostMessageService,
			CocoonDependencyInjection.createInstance(
				Shim.Message.ShimExtHostMessageService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostQuickInput,
			CocoonDependencyInjection.createInstance(
				Shim.QuickInput.ShimExtHostQuickInputService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostDialog,
			CocoonDependencyInjection.createInstance(
				Shim.Dialog.ShimExtHostDialogService,
			),
		);
		const ClipboardService = CocoonDependencyInjection.createInstance(
			Shim.Clipboard.ShimExtHostClipboardService,
		);
		CocoonDependencyInjection.set(IExtHostClipboard, ClipboardService);
		CocoonDependencyInjection.set(
			IExtHostEnvironment,
			CocoonDependencyInjection.createInstance(
				Shim.Env.ShimExtHostEnvService,
				InitializationDataService,
				ClipboardService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostWindowPart,
			CocoonDependencyInjection.createInstance(
				Shim.WindowPart.ShimExtHostWindowPartsService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostWorkspace,
			CocoonDependencyInjection.createInstance(
				Shim.Workspace.ShimExtHostWorkspace,
				InitializationDataService,
				FileSystemInformationService,
				DocumentService,
				FileSystemApiShim,
			),
		);

		const ConfigurationService = CocoonDependencyInjection.createInstance(
			Shim.Configuration.ShimExtHostConfiguration,
			FullyRevivedInitializationData.configuration as any,
		);
		CocoonDependencyInjection.set(
			IExtHostConfiguration,
			ConfigurationService,
		);
		RpcProtocol.set(
			ExtHostContext.ExtHostConfiguration as any,
			ConfigurationService,
		);

		CocoonDependencyInjection.set(
			IExtHostCommands,
			CocoonDependencyInjection.createInstance(
				Shim.Commands.ShimExtHostCommands,
				CocoonDependencyInjection.get(IExtHostTelemetry),
				UriTransformerService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostOutputService,
			CocoonDependencyInjection.createInstance(
				Shim.OutputChannel.ShimOutputService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostDiagnostics,
			CocoonDependencyInjection.createInstance(
				Shim.Diagnostic.ShimDiagnosticsService,
				UriTransformerService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostTerminalService,
			CocoonDependencyInjection.createInstance(
				Shim.Terminal.ShimExtHostTerminalService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostAuthentication,
			CocoonDependencyInjection.createInstance(
				Shim.Authentication.ShimExtHostAuthentication,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostLanguageModels,
			CocoonDependencyInjection.createInstance(
				Shim.LanguageModel.ShimExtHostLanguageModels,
				CocoonDependencyInjection.get(IExtHostAuthentication),
			),
		);
		CocoonDependencyInjection.set(
			IExtHostLanguageFeatures,
			CocoonDependencyInjection.createInstance(
				Shim.LanguageFeature.ShimLanguageFeatures,
				DocumentService,
				CancellationTokenRegistryService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostExtensionService,
			new SyncDescriptor(RealExtHostExtensionService, [
				false,
				Ipc.Get(),
				CocoonDependencyInjection,
			]),
		);
		LogService.info("[Cocoon] Real IExtHostExtensionService registered.");

		const ExtensionService = CocoonDependencyInjection.get(
			IExtHostExtensionService,
		);
		CocoonDependencyInjection.set(
			IWorkbenchExtensionEnablementService,
			CocoonDependencyInjection.createInstance(
				Shim.EnablementService.ShimExtensionEnablementService,
				ExtensionService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostExtension,
			CocoonDependencyInjection.createInstance(
				Shim.Extension.ShimExtHostExtensions,
				ExtensionService,
			),
		);
		CocoonDependencyInjection.set(
			IExtensionHostKindPicker,
			CocoonDependencyInjection.createInstance(
				Shim.HostKindPicker.ShimExtensionHostKindPicker,
			),
		);
		CocoonDependencyInjection.set(
			ICocoonProposedApi,
			CocoonDependencyInjection.createInstance(
				Shim.ProposedApi.ShimExtensionsProposedApi,
				FullyRevivedInitializationData,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostDebug,
			CocoonDependencyInjection.createInstance(
				Shim.Debug.ShimExtHostDebugService,
			),
		);
		CocoonDependencyInjection.set(
			IExtHostTask,
			CocoonDependencyInjection.createInstance(
				Shim.Task.ShimExtHostTaskService,
			),
		);

		for (const [Id, Descriptor] of getSingletonServiceDescriptors()) {
			if (!CocoonDependencyInjection.has(Id))
				CocoonDependencyInjection.set(Id, Descriptor);
		}
		LogService.info(
			"[Cocoon] Standard VS Code singleton services registered.",
		);

		Performance.mark("code/extHost/willWaitForConfigAndPaths");
		const [
			ExtensionPath,
			ConfigProvider,
			GlobalExtensionRegistry,
			LocalExtensionRegistry,
		] = await Promise.all([
			ExtensionService.getExtensionPathIndex(),
			ConfigurationService.getConfigProvider(),
			ExtensionService.getGlobalExtensionRegistry(),
			ExtensionService.getExtensionRegistry(),
		]);
		Performance.mark("code/extHost/didWaitForConfigAndPaths");
		const PreResolvedExtensionRegistry: IExtensionRegistries = {
			mine: LocalExtensionRegistry,
			all: GlobalExtensionRegistry,
		};
		LogService.info("[Cocoon] Preparing API Factory Provider...");

		const ApiFactoryProvider =
			CocoonDependencyInjection.invokeFunction<IExtensionApiFactory>(
				(accessor) => {
					const OriginalVSCodeApiFactory =
						CreateVSCodeApiFactory(accessor);
					return (
						ExtensionDescriptionOrUri:
							| IRelaxedExtensionDescription
							| URI,
						ExtensionRegistryOverride?: IExtensionRegistries,
						ConfigProviderOverride?: ExtHostConfigProvider,
					): typeof Vscode => {
						let ActualExtensionDescription: IRelaxedExtensionDescription =
							nullExtensionDescription as any;
						if (ExtensionDescriptionOrUri instanceof URI) {
							const FoundExtension = ExtensionPath.findSubstr(
								ExtensionDescriptionOrUri,
							);
							if (FoundExtension)
								ActualExtensionDescription = FoundExtension;
						} else if (ExtensionDescriptionOrUri) {
							ActualExtensionDescription =
								ExtensionDescriptionOrUri;
						}

						const VscodeApiBase = OriginalVSCodeApiFactory(
							ActualExtensionDescription,
							ExtensionRegistryOverride ||
								PreResolvedExtensionRegistry,
							ConfigProviderOverride || ConfigProvider,
						);
						const ExtensionSourceInformation:
							| ApiFactoryExtensionSourceInformation
							| undefined = ActualExtensionDescription.identifier
							? {
									id: ActualExtensionDescription.identifier
										.value,
									displayName:
										ActualExtensionDescription.displayName ||
										ActualExtensionDescription.name,
								}
							: undefined;

						const CreateExtensionIpcRenderer = (
							CurrentExtensionDescription: IRelaxedExtensionDescription,
						): typeof Vscode.IpcRenderer => {
							const ExtensionIdentifier =
								CurrentExtensionDescription.identifier.value;
							return {
								On: (
									Channel: string,
									Listener: (
										Event: any,
										...Argument: any[]
									) => void,
								): Vscode.Disposable => {
									skyToCocoonMessageBus.on(Channel, Listener);
									return new Vscode.Disposable(() =>
										skyToCocoonMessageBus.removeListener(
											Channel,
											Listener,
										),
									);
								},
								Once: (
									Channel: string,
									Listener: (
										Event: any,
										...Argument: any[]
									) => void,
								): Vscode.Disposable => {
									const OnceWrapper = (
										...Argument: any[]
									) => {
										skyToCocoonMessageBus.removeListener(
											Channel,
											OnceWrapper,
										);
										Listener(...Argument);
									};
									skyToCocoonMessageBus.once(
										Channel,
										OnceWrapper,
									);
									return new Vscode.Disposable(() =>
										skyToCocoonMessageBus.removeListener(
											Channel,
											OnceWrapper,
										),
									);
								},
								Send: (
									Channel: string,
									...Argument: any[]
								): void => {
									Ipc.Get().SendNotificationToMountain(
										"extHostIpc:send",
										{
											target: "mountain",
											originalChannel: Channel,
											originalArgument: Argument,
										},
									);
								},
								Invoke: async (
									Channel: string,
									...Argument: any[]
								): Promise<any> => {
									return await Ipc.Get().SendRequestToMountain(
										"extHostIpc:invoke",
										{
											target: "mountain",
											originalChannel: Channel,
											originalArgument: Argument,
										},
										30000,
									);
								},
								RemoveListener: (
									Channel: string,
									Listener: (...Argument: any[]) => void,
								): void => {
									skyToCocoonMessageBus.removeListener(
										Channel,
										Listener,
									);
								},
								RemoveAllListener: (Channel?: string): void => {
									if (Channel)
										skyToCocoonMessageBus.removeAllListeners(
											Channel,
										);
									else
										skyToCocoonMessageBus.removeAllListeners();
								},
							} as unknown as typeof Vscode.IpcRenderer;
						};

						const CompleteVscodeApiObject = {
							...VscodeApiBase,
							// Override namespaces with PascalCase shims
							Command: accessor.get(
								IExtHostCommands,
							) as typeof Vscode.Command,
							Workspace: accessor.get(
								IExtHostWorkspace,
							) as typeof Vscode.Workspace,
							Language: {
								...VscodeApiBase.languages, // Keep original properties
								// Override methods with PascalCase from shims
							} as typeof Vscode.Language,
							Window: {
								...VscodeApiBase.window,
								ShowInformationMessage: (
									Message: string,
									...Rest: any[]
								) => {
									/* ... */
								},
								// ... other window methods
							} as typeof Vscode.Window,
							Environment: accessor.get(
								IExtHostEnvironment,
							) as typeof Vscode.Environment,
							Extension: accessor.get(
								IExtHostExtension,
							) as typeof Vscode.Extension,
							Debug: accessor.get(
								IExtHostDebug,
							) as typeof Vscode.Debug,
							Task: accessor.get(
								IExtHostTask,
							) as typeof Vscode.Task,
							IpcRenderer: CreateExtensionIpcRenderer(
								ActualExtensionDescription,
							),
							// Re-export core types
							Uri: Vscode.Uri,
							Position: Vscode.Position,
							Range: Vscode.Range,
							// ... and all other re-exported types from the Vscode namespace
						};
						// This cast is necessary because we are creating a custom-shaped object.
						return CompleteVscodeApiObject as unknown as typeof Vscode;
					};
				},
			);
		LogService.info("[Cocoon] API Factory Provider configured.");

		const CjsModuleInterceptor = CocoonDependencyInjection.createInstance(
			NodeRequireInterceptor,
			ApiFactoryProvider,
			{
				extensionRegistry: () => PreResolvedExtensionRegistry,
				extensionPaths: () => ExtensionPath,
				configProvider: () => ConfigProvider,
			},
		);
		CjsModuleInterceptor.register(
			new VSCodeNodeModuleFactory(
				ApiFactoryProvider,
				ExtensionPath,
				PreResolvedExtensionRegistry,
				ConfigProvider,
				LogService,
			),
		);
		CjsModuleInterceptor.register(
			CocoonDependencyInjection.createInstance(
				NodeModuleAliasingModuleFactory,
			),
		);
		CjsModuleInterceptor.register(new Shim.NodeModuleShimFactory());
		await CjsModuleInterceptor.install();
		LogService.info("[Cocoon] CJS NodeRequireInterceptor installed.");

		const EsmInterceptorContext: CocoonESMInterceptorContext = {
			ApiFactory: ApiFactoryProvider,
		};
		const EsmModuleInterceptor = CocoonDependencyInjection.createInstance(
			CocoonNodeModuleESMInterceptor,
			EsmInterceptorContext,
		);
		await EsmModuleInterceptor.install();
		LogService.info("[Cocoon] ESM Interceptor installed.");

		const ErrorHandlerInstance =
			CocoonDependencyInjection.createInstance(ErrorHandler);
		ErrorHandler.installEarlyHandler(
			ErrorHandlerInstance,
			CocoonDependencyInjection,
		);
		process.on("uncaughtException", (Error: Error) =>
			ErrorHandler.onUnexpectedError(Error, RpcProtocol || undefined),
		);
		process.on("unhandledRejection", (Reason: any) =>
			ErrorHandler.onUnexpectedError(Reason, RpcProtocol || undefined),
		);
		LogService.info("[Cocoon] Global error handlers installed.");

		await ExtensionService.initialize();
		LogService.info("[Cocoon] Real ExtHostExtensionService initialized.");
		LocalizationService.SignalLocalizationInitialized();
		ErrorHandler.installFullHandler(
			ErrorHandlerInstance,
			CocoonDependencyInjection,
		);
		LogService.info("[Cocoon] Full ErrorHandler capabilities installed.");

		console.log(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);
		LogService.info(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);
		Ipc.Get()
			.SendNotificationToMountain("extHostInitialized", {})
			.catch((Error) =>
				LogService.error(
					"Failed to send extHostInitialized notification:",
					Error,
				),
			);
	} catch (HostInitializationError: any) {
		InitializationFailedOrExited = true;
		const FinalError =
			HostInitializationError instanceof Error
				? HostInitializationError
				: new Error(String(HostInitializationError));
		const ErrorMessage = `[Cocoon] FATAL ERROR: Failed to initialize Cocoon ExtHost:\nMessage: ${FinalError.message}\nStack: ${FinalError.stack || "N/A"}`;
		console.error(ErrorMessage);
		LogService?.error(
			"[Cocoon] FATAL ERROR during Cocoon initialization:",
			FinalError,
		);
		try {
			Ipc.Get().SendNotificationToMountain("extHostError", {
				message: `Cocoon initialization failed: ${FinalError.message}`,
				stack: FinalError.stack,
				name: FinalError.name,
			});
		} catch (NotificationError: any) {
			console.error(
				"[Cocoon] Additionally, failed to send fatal error notification to Mountain:",
				NotificationError,
			);
		}
		process.exit(1);
	}
}

let IsInitializationStarted = false;
async function Main() {
	Performance.mark("code/extHost/willLoadCode");
	try {
		await Ipc.Initialize();
		console.log("[Cocoon Main] IPC Manager started.");

		Ipc.Get().OnMessageFromMountain(async (IpcMessage: Ipc.VineMessage) => {
			if (IsInitializationStarted && IpcMessage.method !== "rpcData")
				return;

			if (
				IpcMessage?.msg_type === 1 &&
				IpcMessage.method === "initExtensionHost" &&
				IpcMessage.params
			) {
				if (IsInitializationStarted) return;
				console.log(
					"[Cocoon] Received 'initExtensionHost' command from Mountain.",
				);
				IsInitializationStarted = true;
				await InitializeCocoonHost(IpcMessage.params);
			}
		});

		await Ipc.Get().SendNotificationToMountain("extHostReadyForInit", {});
		console.log(
			"[Cocoon Main] Sent 'extHostReadyForInit'. Waiting for 'initExtensionHost' command.",
		);
	} catch (Error) {
		console.error("[Cocoon Main] CRITICAL: Failed during startup.", Error);
		process.exit(1);
	}
	Performance.mark("code/extHost/didLoadCode");
}

Main().catch((Error) => {
	console.error("[Cocoon Main] Unhandled top-level error in Main:", Error);
	process.exit(1);
});
