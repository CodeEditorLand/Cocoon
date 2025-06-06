/*---------------------------------------------------------------------------------------------
 * Cocoon Main Entry Point 
 * --------------------------------------------------------------------------------------------
 * This file serves as the primary entry point and orchestrator for the Cocoon Node.js
 * sidecar process. Its main goal is to establish a VS Code-compatible extension host
 * environment within this sidecar. This enables the execution of standard VS Code
 * extensions in a decoupled manner, with the Cocoon process being managed by an
 * external "Mountain" host process (representing the main application).
 *
 * Core Responsibilities:
 * - Process Initialization: Sets up the Node.js environment. This includes:
 *   - Patching global `process` behaviors (via `cocoon-bootstrap.ts`) to control
 *     process exits and configure settings like `ELECTRON_RUN_AS_NODE`.
 *   - Adjusting Node.js module search paths (`module.paths`) to include VS Code's
 *     internal `out` directory. This path is configurable via the `VSCODE_OUT_DIR`
 *     environment variable and is essential for resolving VS Code's internal modules
 *     (e.g., 'vs/base/common/uri').
 *
 * - IPC Management: Initializes and utilizes the `cocoon-ipc.ts` module. This module
 *   manages newline-delimited JSON-based Inter-Process Communication (IPC) with the
 *   Mountain host process over standard input/output (stdio). It also includes
 *   `skyToCocoonMessageBus` for communication between Cocoon and Sky (webview content)
 *   if they are in the same process/context or proxied appropriately.
 *
 * - RPC Setup: Establishes VS Code's `RPCProtocol` on top of the Vine IPC layer.
 *   This integrates a URI transformer (`ShimUriTransformerService`) to handle URI
 *   translation and revival between Cocoon (ExtHost) and Mountain (MainThread).
 *   This is crucial for correctly interpreting URIs across process boundaries.
 *
 * - Dependency Injection (DI): Configures and instantiates VS Code's `InstantiationService`.
 *   This DI container is populated with registrations for:
 *   - Core VS Code extension host services (e.g., `ILogService`, `IExtHostInitDataService`,
 *     `IExtHostExtensionService`).
 *   - Cocoon-specific shim implementations for many of these services, allowing Cocoon
 *     to intercept and handle API calls appropriately.
 *   - The `CancellationTokenRegistry` for managing cancellation signals.
 *
 * - Service Orchestration: Instantiates and wires up the necessary `IExtHost...` services.
 *   It ensures that Cocoon's shims are used where Cocoon provides its own behavior or
 *   needs to adapt VS Code's behavior. For services like `ExtHostExtensionService`, it
 *   uses the real VS Code implementation to maintain high fidelity in extension loading
 *   and lifecycle management.
 *
 * - Module Interception (`require` and `import`):
 *   - Sets up `NodeRequireInterceptor` for CommonJS `require()` calls. This interceptor
 *     uses an API factory (`apiFactoryProvider`) to construct the `vscode` API object
 *     that extensions receive. It registers factories to provide:
 *       - Shims for certain Node.js built-in modules (e.g., 'os', 'crypto').
 *       - A mechanism to block access to other Node.js built-ins like 'fs' for security.
 *       - The shimmed `vscode` module itself.
 *   - Sets up `CocoonNodeModuleESMInterceptor` for ECMAScript Module (ESM) `import`
 *     statements. This also leverages the `apiFactoryProvider` to serve extension-specific
 *     `vscode` API instances, often via dynamically generated `data:` URI modules for ESM.
 *
 * - API Factory (`apiFactoryProvider`): This is a critical component responsible for
 *   constructing the `vscode` API object that each extension receives. It starts with
 *   VS Code's original API factory and then strategically overrides specific namespaces
 *   (e.g., `vscode.commands`, `vscode.window`, `vscode.workspace`, `vscode.languages`)
 *   with instances of Cocoon's shims. These shims are typically retrieved via the DI
 *   container. This ensures that when an extension calls, for example,
 *   `vscode.window.showInformationMessage(...)`, it is Cocoon's `ShimExtHostMessageService`
 *   that handles the call, forwarding it to Mountain via RPC. The factory also passes
 *   the `ExtensionIdentifier` to shims that require context about the calling extension.
 *   It also shims `vscode.ipcRenderer` for extension<->Sky communication.
 *
 * - Extension Host Lifecycle: Initializes the real `ExtHostExtensionService` (from
 *   `vs/workbench/api/node/extHostExtensionService`). This service then takes over the
 *   standard VS Code process of scanning, loading, and activating extensions based on
 *   the initialization data (`ExtHostInitData`) received from Mountain and the configured
 *   environment.
 *
 * - Global Error Handling: Installs VS Code's `ErrorHandler` and sets up global listeners
 *   for `uncaughtException` and `unhandledRejection` to report errors, typically
 *   forwarding them to Mountain via RPC or logging them.
 *
 * - Communication Lifecycle with Mountain:
 *   - Sends an `extHostReadyForInit` notification to Mountain upon startup, indicating
 *     it's ready to receive initialization data.
 *   - Waits for an `initExtensionHost` command (request) from Mountain. This command
 *     includes critical initialization data (`ExtHostInitData`) such as workspace details,
 *     configuration, logs location, etc.
 *   - After successfully initializing all services and the extension host environment,
 *     it sends an `extHostInitialized` notification back to Mountain.
 *   - If fatal errors occur during initialization, it attempts to report these errors
 *     to Mountain before exiting.
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
import { type IURITransformer } from "vs/base/common/uriIpc";
import {
	ExtensionIdentifier,
	nullExtensionDescription,
	type IExtensionDescription,
	type IRelaxedExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	createDecorator,
	InstantiationService,
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
	type MainContext,
} from "vs/workbench/api/common/extHost.protocol";
// MainContext for proxy types
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

import { CancellationTokenRegistry } from "./cancellation-token-registry";
import * as bootstrapUtils from "./cocoon-bootstrap";
import {
	CocoonNodeModuleESMInterceptor,
	type CocoonESMInterceptorContext,
} from "./cocoon-esm-interceptor";
import ipcApiInstance, {
	initializeSkyIpcRouter,
	skyToCocoonMessageBus,
	type CocoonPrimaryIpc,
	type ConfigurationChangedEventPayload,
	type VineMessage,
	type WorkspaceFoldersChangedEventPayload,
} from "./cocoon-ipc";
import { initializeConverterLogger as initCocoonTypeConverterLogger } from "./cocoon-type-converters";
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
	type ExtensionSourceInfo as EnvExtensionSourceInfo,
	type IExtHostEnvServiceShape,
} from "./shims/env-shim";
import {
	ShimExtHostExtensions,
	type IExtHostExtensionsShape,
} from "./shims/extensions-shim";
import { ShimExtHostFileSystemInfo } from "./shims/file-system-info-shim";
import { ShimFileSystemApi } from "./shims/fs-api-shim";
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
	type ExtensionSourceInfo as MessageExtensionSourceInfo,
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
import type * as vscode from "./vscode";
import {
	LogLevel as VscodeApiLogLevelEnumPublic,
	CallHierarchyItem as VscodeCallHierarchyItemPublic,
	CancellationError as VscodeCancellationErrorPublic,
	CancellationToken as VscodeCancellationTokenPublic,
	CancellationTokenSource as VscodeCancellationTokenSourcePublic,
	CodeActionKind as VscodeCodeActionKindPublic,
	CodeAction as VscodeCodeActionPublic,
	CodeLens as VscodeCodeLensPublic,
	Command as VscodeCommandPublic,
	CompletionItemKind as VscodeCompletionItemKindPublic,
	CompletionItem as VscodeCompletionItemPublic,
	CompletionList as VscodeCompletionListPublic,
	CompletionTriggerKind as VscodeCompletionTriggerKindPublic,
	ConfigurationTarget as VscodeConfigurationTargetPublic,
	DebugConsoleMode as VscodeDebugConsoleModePublic,
	DefinitionLink as VscodeDefinitionLinkPublic,
	Diagnostic as VscodeDiagnosticPublic,
	DiagnosticRelatedInformation as VscodeDiagnosticRelatedInformationPublic,
	DiagnosticSeverity as VscodeDiagnosticSeverityPublic,
	Disposable as VscodeDisposableFromApi, // Already imported as VscodeDisposablePublic
	Disposable as VscodeDisposablePublic,
	DocumentLink as VscodeDocumentLinkPublic,
	EventEmitter as VscodeEmitterPublic,
	EndOfLine as VscodeEndOfLinePublic,
	ExtensionKind as VscodeExtensionKindPublic,
	ExtensionMode as VscodeExtensionModePublic,
	FileSystemError as VscodeFileSystemErrorPublic,
	FileType as VscodeFileTypePublic,
	Hover as VscodeHoverPublic,
	IndentAction as VscodeIndentActionPublic,
	InputBoxOptions as VscodeInputBoxOptionsPublic,
	LanguageStatusSeverity as VscodeLanguageStatusSeverityPublic,
	Location as VscodeLocationPublic,
	Position as VscodePositionPublic,
	ProgressLocation as VscodeProgressLocationPublic,
	QuickInputButtons as VscodeQuickInputButtonsPublic,
	QuickPickItem as VscodeQuickPickItemPublic,
	Range as VscodeRangePublic,
	RelativePattern as VscodeRelativePatternPublic,
	Selection as VscodeSelectionPublic,
	SignatureHelp as VscodeSignatureHelpPublic,
	SignatureHelpTriggerKind as VscodeSignatureHelpTriggerKindPublic,
	SnippetString as VscodeSnippetStringPublic,
	StatusBarAlignment as VscodeStatusBarAlignmentPublic,
	SymbolInformation as VscodeSymbolInformationPublic,
	SymbolKind as VscodeSymbolKindPublic,
	TaskScope as VscodeTaskScopePublic,
	TextDocumentChangeReason as VscodeTextDocumentChangeReasonPublic,
	TextEditorRevealType as VscodeTextEditorRevealTypePublic,
	TextEdit as VscodeTextEditPublic,
	ThemeColor as VscodeThemeColorPublic,
	ThemeIcon as VscodeThemeIconPublic,
	TypeHierarchyItem as VscodeTypeHierarchyItemPublic,
	Uri as VscodeUriPublic,
	ViewColumn as VscodeViewColumnPublic,
	WorkspaceEdit as VscodeWorkspaceEditPublic,
	type Commands as VscodeCommandsAPIType,
	type Debug as VscodeDebugAPIType,
	type Env as VscodeEnvAPIType,
	type Extensions as VscodeExtensionsAPIType,
	// IPC Renderer related types
	type IpcRenderer as VscodeIpcRendererAPIType,
	type Languages as VscodeLanguagesAPIType,
	type Tasks as VscodeTasksAPIType,
	type Window as VscodeWindowAPIType,
	type Workspace as VscodeWorkspaceAPIType,
} from "./vscode";

type ApiFactoryExtensionSourceInfo = EnvExtensionSourceInfo &
	MessageExtensionSourceInfo;

console.log("[Cocoon] Node.js Sidecar Process Starting...");
performance.mark(`code/extHost/willConnectToRenderer`);

const VSCODE_OUT_DIR_ENV_VAR = "VSCODE_OUT_DIR";
const configuredVsCodeOutDir = process.env[VSCODE_OUT_DIR_ENV_VAR];
const defaultVsCodeOutDir = path.resolve(
	__dirname,
	"../../../Dependency/Microsoft/Dependency/Editor/out",
);
const vsCodeOutDirectory = configuredVsCodeOutDir || defaultVsCodeOutDir;

if (configuredVsCodeOutDir) {
	console.log(
		`[Cocoon] Using VS Code 'out' directory from env var ${VSCODE_OUT_DIR_ENV_VAR}: ${vsCodeOutDirectory}`,
	);
} else {
	console.log(
		`[Cocoon] Using default VS Code 'out' directory for internal module resolution: ${vsCodeOutDirectory}`,
	);
}

if (fs.existsSync(vsCodeOutDirectory)) {
	if (Array.isArray((module as any).paths)) {
		(module as any).paths.unshift(vsCodeOutDirectory);
		console.log(
			"[Cocoon] VS Code 'out' directory successfully prepended to module.paths for CJS resolution.",
		);
	} else {
		console.warn(
			"[Cocoon] `module.paths` is not an array. Cannot prepend VS Code 'out' directory.",
		);
	}
} else {
	console.error(
		`[Cocoon] CRITICAL FAILURE: VS Code 'out' directory NOT FOUND at path: ${vsCodeOutDirectory}.`,
	);
	process.exit(1);
}

let cocoonDI: IInstantiationService | null = null;
let cocoonRpcProtocol: RPCProtocol | null = null;
const cocoonIpcAdapter = ipcApiInstance.createHostProtocolInterface();
let initializationFailedOrExited = false;

bootstrapUtils.patchProcess(() => initializationFailedOrExited);

function reviveUrisInObjectForEarlyInitData(
	obj: any,
	earlyLogService?: ILogService,
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
			.map((item) =>
				reviveUrisInObjectForEarlyInitData(item, earlyLogService),
			)
			.filter((item) => item !== undefined);
	}
	if (
		typeof obj.scheme === "string" &&
		obj.path !== undefined &&
		(obj.$mid === MarshalledId.Uri ||
			obj.$mid === MarshalledId.UriSimple ||
			!obj.$mid)
	) {
		try {
			return URI.revive(obj as VSCodeInternalUriComponents);
		} catch (error: any) {
			earlyLogService?.warn(
				`[Cocoon Early URI Revival] Failed to revive potential URI: ${JSON.stringify(obj)}. Error: ${error.message}`,
			);
		}
	}
	const newObj: { [key: string]: any } = {};
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			newObj[key] = reviveUrisInObjectForEarlyInitData(
				obj[key],
				earlyLogService,
			);
		}
	}
	return newObj;
}

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
	createDecorator<IExtHostExtensionsShape>("extHostExtensions");
export const IExtHostDebugService = createDecorator<IExtHostDebugServiceShape>(
	"extHostDebugService",
);
export const IExtHostTaskService =
	createDecorator<IExtHostTaskServiceShape>("extHostTaskService");
export const IExtHostWindowParts =
	createDecorator<IExtHostWindowPartsServiceShape>("extHostWindowParts");
export const ICocoonExtHostProposedApis =
	createDecorator<CocoonIExtHostProposedApis>("cocoonExtHostProposedApis");
export const ICancellationTokenRegistry =
	createDecorator<CancellationTokenRegistry>("cancellationTokenRegistry");

async function initializeCocoonHost(
	rawInitDataFromMountain: any,
): Promise<void> {
	console.log("[Cocoon] Initializing Cocoon Extension Host Environment...");
	performance.mark(`code/extHost/didWaitForInitData`);

	if (initializationFailedOrExited) {
		console.warn(
			"[Cocoon] Initialization skipped: Already failed or exited.",
		);
		return;
	}

	let logService: ILogService | undefined;

	try {
		const uriTransformerServiceInstance = new ShimUriTransformerService(
			rawInitDataFromMountain?.remote?.authority,
		);
		const rpcLogger: IRPCProtocolLogger | null = null;
		console.log("[Cocoon] Creating final RPCProtocol instance...");
		cocoonRpcProtocol = new RPCProtocol(
			cocoonIpcAdapter!,
			rpcLogger,
			uriTransformerServiceInstance,
		);
		(globalThis as any).__COC_RPC_PROTOCOL__ = cocoonRpcProtocol;
		console.log("[Cocoon] RPCProtocol instance created and set globally.");

		console.log("[Cocoon] Reviving URIs in raw initData from Mountain...");
		const revivedFullyInitData = revive(
			rawInitDataFromMountain,
		) as ExtHostInitData;
		console.log(
			`[Cocoon] InitData URIs fully revived. Logs: ${revivedFullyInitData.logsLocation.toString()}. Workspace: ${revivedFullyInitData.workspace?.id ?? "none"}`,
		);

		console.log("[Cocoon] Setting up ServiceCollection...");
		const services = new ServiceCollection();
		const finalLogLevel = revivedFullyInitData.logLevel
			? (parseLogLevel(revivedFullyInitData.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;
		logService = new ShimLogService(finalLogLevel, "CocoonMainLog");
		services.set(ILogService, logService);
		services.set(ILoggerService, new ShimLoggerService(logService));
		logService.info(
			`[Cocoon] Main LogService initialized. Level: ${LogLevel[finalLogLevel]}.`,
		);

		initCocoonTypeConverterLogger(logService);
		initializeSkyIpcRouter(logService); // Initialize Sky<->Cocoon bus router

		const cancellationTokenRegistryInstance = new CancellationTokenRegistry(
			logService,
		);
		services.set(
			ICancellationTokenRegistry,
			cancellationTokenRegistryInstance,
		);
		logService.info("[Cocoon] CancellationTokenRegistry initialized.");

		const initDataServiceInstance = {
			_serviceBrand: undefined,
			value: revivedFullyInitData,
		};
		services.set(IExtHostInitDataService, initDataServiceInstance);
		services.set(IExtHostRpcService, cocoonRpcProtocol);
		services.set(IURITransformerService, uriTransformerServiceInstance);

		const fileSystemInfoService = new ShimExtHostFileSystemInfo(
			cocoonRpcProtocol,
			logService,
		);
		services.set(IExtHostFileSystemInfo, fileSystemInfoService);
		cocoonRpcProtocol.set(
			ExtHostContext.ExtHostFileSystemInfo as any,
			fileSystemInfoService,
		); // RPC registration

		services.set(
			IExtHostStorage,
			new ShimExtHostStorage(cocoonRpcProtocol, logService),
		);
		services.set(
			IExtHostSecretState,
			new ShimExtHostSecretState(
				cocoonRpcProtocol,
				logService,
				"placeholderGlobalSecretStateContext",
			),
		);
		const localizationServiceInstance = new ShimExtHostLocalizationService(
			cocoonRpcProtocol,
			logService,
			revivedFullyInitData,
		);
		services.set(IExtHostLocalizationService, localizationServiceInstance);
		services.set(
			IExtHostManagedSockets,
			new ShimExtHostManagedSockets(cocoonRpcProtocol, logService),
		);
		services.set(
			IExtHostTelemetry,
			new ShimExtHostTelemetry(
				cocoonRpcProtocol,
				logService,
				initDataServiceInstance,
			),
		);
		services.set(
			IExtHostApiDeprecationService,
			new ShimExtHostApiDeprecationService(cocoonRpcProtocol, logService),
		);

		cocoonDI = new InstantiationService(services, true);
		logService.info("[Cocoon] InstantiationService created.");

		cocoonDI.set(IHostUtils, cocoonDI.createInstance(ShimHostUtils));
		cocoonDI.set(
			IExtensionStoragePaths,
			cocoonDI.createInstance(
				ShimExtensionStoragePaths,
				revivedFullyInitData.environment,
			),
		);
		const documentServiceInstance = cocoonDI.createInstance(
			CocoonDocumentService,
		);
		cocoonDI.set(IExtHostDocuments, documentServiceInstance);
		cocoonDI.set(
			IExtHostDocumentsAndEditors,
			documentServiceInstance as any,
		);
		const fsApiShimInstance = cocoonDI.createInstance(
			ShimFileSystemApi,
			fileSystemInfoService,
		);
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
				initDataServiceInstance,
				clipboardServiceInstance,
			),
		);
		cocoonDI.set(
			IExtHostWindowParts,
			cocoonDI.createInstance(ShimExtHostWindowPartsService),
		);
		cocoonDI.set(
			IExtHostWorkspace,
			cocoonDI.createInstance(
				ShimExtHostWorkspace,
				initDataServiceInstance,
				fileSystemInfoService,
				documentServiceInstance,
				fsApiShimInstance,
			),
		);

		const initialConfigFromMainInitData =
			revivedFullyInitData.configuration as
				| RpcConfigurationInitData
				| undefined;
		const configServiceInstance = cocoonDI.createInstance(
			ShimExtHostConfiguration,
			initialConfigFromMainInitData,
		);
		cocoonDI.set(IExtHostConfiguration, configServiceInstance);
		cocoonRpcProtocol.set(
			ExtHostContext.ExtHostConfiguration as any,
			configServiceInstance,
		); // RPC registration

		cocoonDI.set(
			IExtHostCommands,
			cocoonDI.createInstance(
				ShimExtHostCommands,
				cocoonDI.get(IExtHostTelemetry),
				uriTransformerServiceInstance,
			),
		);
		cocoonDI.set(
			IExtHostOutputService,
			cocoonDI.createInstance(ShimOutputService),
		);
		cocoonDI.set(
			IExtHostDiagnostics,
			cocoonDI.createInstance(
				ShimDiagnosticsService,
				uriTransformerServiceInstance,
			),
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
				cancellationTokenRegistryInstance,
			),
		);

		cocoonDI.set(
			IExtHostExtensionService,
			new SyncDescriptor(RealExtHostExtensionService, [
				false,
				ipcApiInstance as CocoonPrimaryIpc,
				cocoonDI,
			]),
		);
		logService.info("[Cocoon] Real IExtHostExtensionService registered.");

		cocoonDI.set(
			IWorkbenchExtensionEnablementService,
			cocoonDI.createInstance(
				ShimExtensionEnablementService,
				cocoonDI.get(IExtHostExtensionService),
			),
		);
		cocoonDI.set(
			IExtHostExtensions,
			cocoonDI.createInstance(
				ShimExtHostExtensions,
				cocoonDI.get(IExtHostExtensionService),
			),
		);
		cocoonDI.set(
			IExtensionHostKindPicker,
			cocoonDI.createInstance(ShimExtensionHostKindPicker),
		);
		cocoonDI.set(
			ICocoonExtHostProposedApis,
			cocoonDI.createInstance(
				ShimExtensionsProposedApi,
				revivedFullyInitData,
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
			if (!cocoonDI.has(id)) cocoonDI.set(id, descriptor);
		}
		logService.info(
			"[Cocoon] Standard VS Code singleton services registered.",
		);

		const extHostExtensionService = cocoonDI.get(IExtHostExtensionService);
		const extHostConfigService = cocoonDI.get(IExtHostConfiguration);
		performance.mark("code/extHost/willWaitForConfigAndPaths");
		const [
			extensionPaths,
			configProvider,
			globalExtensionRegistry,
			localExtensionRegistry,
		] = await Promise.all([
			extHostExtensionService.getExtensionPathIndex(),
			extHostConfigService.getConfigProvider(),
			extHostExtensionService.getGlobalExtensionRegistry(),
			extHostExtensionService.getExtensionRegistry(),
		]);
		performance.mark("code/extHost/didWaitForConfigAndPaths");
		const preResolvedExtensionRegistries: IExtensionRegistries = {
			mine: localExtensionRegistry,
			all: globalExtensionRegistry,
		};
		logService.info("[Cocoon] Preparing API Factory Provider...");

		const apiFactoryProvider =
			cocoonDI.invokeFunction<IExtensionApiFactory>((accessor) => {
				const originalVSCodeApiFactory =
					createVSCodeApiFactoryOriginal(accessor);
				return (
					extensionDescriptionOrUri:
						| IRelaxedExtensionDescription
						| URI,
					extensionRegistriesOverride?: IExtensionRegistries,
					configProviderOverride?: ExtHostConfigProvider,
				): typeof import("vscode") => {
					let actualExtensionDescription: IRelaxedExtensionDescription =
						nullExtensionDescription as any;
					const finalExtensionRegistriesToUse =
						extensionRegistriesOverride ||
						preResolvedExtensionRegistries;
					const finalConfigProviderToUse =
						configProviderOverride || configProvider;

					if (extensionDescriptionOrUri instanceof URI) {
						const foundExtension = extensionPaths.findSubstr(
							extensionDescriptionOrUri,
						);
						if (foundExtension)
							actualExtensionDescription = foundExtension;
						else
							logService?.warn(
								`[Cocoon API Factory] Could not identify extension for ESM import URI: ${extensionDescriptionOrUri.toString()}.`,
							);
					} else if (extensionDescriptionOrUri) {
						actualExtensionDescription = extensionDescriptionOrUri;
					}

					const vscodeApiBaseObject = originalVSCodeApiFactory(
						actualExtensionDescription,
						finalExtensionRegistriesToUse,
						finalConfigProviderToUse,
					);
					const extensionSourceInfo:
						| ApiFactoryExtensionSourceInfo
						| undefined =
						actualExtensionDescription ===
							nullExtensionDescription ||
						!actualExtensionDescription.identifier
							? undefined
							: {
									id: actualExtensionDescription.identifier
										.value,
									displayName:
										actualExtensionDescription.displayName ||
										actualExtensionDescription.name,
								};

					const languageFeaturesServiceShim = accessor.get(
						IExtHostLanguageFeatures,
					);
					const messageServiceShim = accessor.get(
						IExtHostMessageService,
					);
					const diagnosticsServiceShim =
						accessor.get(IExtHostDiagnostics);
					const outputServiceShim = accessor.get(
						IExtHostOutputService,
					);
					const windowPartsServiceShim =
						accessor.get(IExtHostWindowParts);
					const terminalServiceShim = accessor.get(
						IExtHostTerminalService,
					);

					const createExtensionIpcRenderer = (
						currentExtensionDesc: IRelaxedExtensionDescription,
					): typeof import("vscode").ipcRenderer => {
						const extIdForLog =
							currentExtensionDesc.identifier.value;
						return {
							on: (
								channel: string,
								listener: (event: any, ...args: any[]) => void,
							): VscodeDisposablePublic => {
								logService?.debug(
									`[ExtIPC][${extIdForLog}] ipcRenderer.on('${channel}') registered.`,
								);
								skyToCocoonMessageBus.on(channel, listener);
								return new VscodeDisposablePublic(() => {
									logService?.debug(
										`[ExtIPC][${extIdForLog}] ipcRenderer.on('${channel}') listener removed.`,
									);
									skyToCocoonMessageBus.removeListener(
										channel,
										listener,
									);
								});
							},
							once: (
								channel: string,
								listener: (event: any, ...args: any[]) => void,
							): VscodeDisposablePublic => {
								logService?.debug(
									`[ExtIPC][${extIdForLog}] ipcRenderer.once('${channel}') registered.`,
								);
								const onceWrapper = (...args: any[]) => {
									skyToCocoonMessageBus.removeListener(
										channel,
										onceWrapper,
									);
									listener(...args);
								};
								skyToCocoonMessageBus.once(
									channel,
									onceWrapper,
								);
								return new VscodeDisposablePublic(() => {
									logService?.debug(
										`[ExtIPC][${extIdForLog}] Disposing once listener for ipcRenderer.once('${channel}').`,
									);
									skyToCocoonMessageBus.removeListener(
										channel,
										onceWrapper,
									);
								});
							},
							send: (channel: string, ...args: any[]): void => {
								logService?.warn(
									`[ExtIPC][${extIdForLog}] ipcRenderer.send('${channel}') from extension. Forwarding to Mountain/Sky:`,
									args,
								);
								ipcApiInstance.sendNotificationToMountain(
									"extHostIpc:send",
									{
										target: "mountain",
										originalChannel: channel,
										originalArgument: args,
									},
								);
							},
							invoke: async (
								channel: string,
								...args: any[]
							): Promise<any> => {
								logService?.warn(
									`[ExtIPC][${extIdForLog}] ipcRenderer.invoke('${channel}') from extension. Forwarding to Mountain/Sky:`,
									args,
								);
								try {
									return await ipcApiInstance.sendToMountainAndWait(
										"extHostIpc:invoke",
										{
											target: "mountain",
											originalChannel: channel,
											originalArgument: args,
										},
										30000,
									);
								} catch (e) {
									logService?.error(
										`[ExtIPC][${extIdForLog}] Error invoking '${channel}' on Mountain/Sky:`,
										e,
									);
									throw e;
								}
							},
							removeListener: (
								channel: string,
								listener: (...args: any[]) => void,
							): void => {
								logService?.debug(
									`[ExtIPC][${extIdForLog}] ipcRenderer.removeListener('${channel}') called.`,
								);
								skyToCocoonMessageBus.removeListener(
									channel,
									listener,
								);
							},
							removeAllListeners: (channel?: string): void => {
								logService?.debug(
									`[ExtIPC][${extIdForLog}] ipcRenderer.removeAllListeners('${channel || "all"}') called.`,
								);
								if (channel)
									skyToCocoonMessageBus.removeAllListeners(
										channel,
									);
								else skyToCocoonMessageBus.removeAllListeners();
							},
						} as unknown as typeof import("vscode").ipcRenderer; // Cast needed due to complex types
					};

					const completeVscodeApiObject = {
						...vscodeApiBaseObject,
						commands: accessor.get(
							IExtHostCommands,
						) as VscodeCommandsAPIType,
						workspace: accessor.get(
							IExtHostWorkspace,
						) as VscodeWorkspaceAPIType,
						languages: {
							...(vscodeApiBaseObject.languages || {}),
							registerHoverProvider: (s, p) =>
								languageFeaturesServiceShim.$registerHoverProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerCompletionItemProvider: (s, p, ...t) =>
								languageFeaturesServiceShim.$registerCompletionItemProvider(
									s,
									p,
									t,
									actualExtensionDescription.identifier,
								),
							registerDefinitionProvider: (s, p) =>
								languageFeaturesServiceShim.$registerDefinitionProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerCodeActionsProvider: (s, p, m) =>
								languageFeaturesServiceShim.$registerCodeActionProvider(
									s,
									p,
									m,
									actualExtensionDescription.identifier,
								),
							registerCodeLensProvider: (s, p) =>
								languageFeaturesServiceShim.$registerCodeLensProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerDeclarationProvider: (s, p) =>
								languageFeaturesServiceShim.$registerDeclarationProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerDocumentFormattingEditProvider: (s, p) =>
								languageFeaturesServiceShim.$registerDocumentFormattingEditProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerDocumentHighlightProvider: (s, p) =>
								languageFeaturesServiceShim.$registerDocumentHighlightProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerDocumentLinkProvider: (s, p) =>
								languageFeaturesServiceShim.$registerDocumentLinkProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerDocumentRangeFormattingEditProvider: (
								s,
								p,
							) =>
								languageFeaturesServiceShim.$registerDocumentRangeFormattingEditProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerOnTypeFormattingEditProvider: (
								s,
								p,
								ft,
								...mt
							) =>
								languageFeaturesServiceShim.$registerOnTypeFormattingEditProvider(
									s,
									p,
									[ft, ...mt],
									undefined,
									actualExtensionDescription.identifier,
								),
							registerReferenceProvider: (s, p) =>
								languageFeaturesServiceShim.$registerReferenceProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerRenameProvider: (s, p) =>
								languageFeaturesServiceShim.$registerRenameProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerSignatureHelpProvider: (s, p, m) =>
								languageFeaturesServiceShim.$registerSignatureHelpProvider(
									s,
									p,
									m,
									actualExtensionDescription.identifier,
								),
							registerImplementationProvider: (s, p) =>
								languageFeaturesServiceShim.$registerImplementationProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerTypeDefinitionProvider: (s, p) =>
								languageFeaturesServiceShim.$registerTypeDefinitionProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerWorkspaceSymbolProvider: (p) =>
								languageFeaturesServiceShim.$registerWorkspaceSymbolProvider(
									p,
									actualExtensionDescription.identifier,
								),
							registerSelectionRangeProvider: (s, p) =>
								languageFeaturesServiceShim.$registerSelectionRangeProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerCallHierarchyProvider: (s, p) =>
								languageFeaturesServiceShim.$registerCallHierarchyProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerTypeHierarchyProvider: (s, p) =>
								languageFeaturesServiceShim.$registerTypeHierarchyProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerLinkedEditingRangeProvider: (s, p) =>
								languageFeaturesServiceShim.$registerLinkedEditingRangeProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerInlayHintsProvider: (s, p) =>
								languageFeaturesServiceShim.$registerInlayHintsProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerDocumentColorProvider: (s, p) =>
								languageFeaturesServiceShim.$registerDocumentColorProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							registerFoldingRangeProvider: (s, p) =>
								languageFeaturesServiceShim.$registerFoldingRangeProvider(
									s,
									p,
									actualExtensionDescription.identifier,
								),
							getLanguages:
								languageFeaturesServiceShim.getLanguages.bind(
									languageFeaturesServiceShim,
								),
							setTextDocumentsLanguage:
								languageFeaturesServiceShim.setTextDocumentsLanguage.bind(
									languageFeaturesServiceShim,
								),
							match: languageFeaturesServiceShim.match.bind(
								languageFeaturesServiceShim,
							),
							createDiagnosticCollection: (n) =>
								diagnosticsServiceShim.createDiagnosticCollection(
									n,
								),
							get onDidChangeDiagnostics() {
								return diagnosticsServiceShim.onDidChangeDiagnostics;
							},
							setLanguageStatus:
								languageFeaturesServiceShim.setLanguageStatus.bind(
									languageFeaturesServiceShim,
								),
							createLanguageStatusItem:
								languageFeaturesServiceShim.createLanguageStatusItem.bind(
									languageFeaturesServiceShim,
								),
						} as VscodeLanguagesAPIType,
						window: {
							...(vscodeApiBaseObject.window || {}),
							showInformationMessage: (m, ...r) => {
								const o =
									r.length > 0 &&
									typeof r[0] === "object" &&
									r[0] !== null &&
									!(r[0] as vscode.MessageItem).title &&
									!(r[0] as ApiFactoryExtensionSourceInfo)?.id
										? (r.shift() as vscode.MessageOptions)
										: {};
								return messageServiceShim.showInformationMessage(
									m,
									o,
									extensionSourceInfo,
									...(r as Array<
										string | vscode.MessageItem
									>),
								);
							},
							showWarningMessage: (m, ...r) => {
								const o =
									r.length > 0 &&
									typeof r[0] === "object" &&
									r[0] !== null &&
									!(r[0] as vscode.MessageItem).title &&
									!(r[0] as ApiFactoryExtensionSourceInfo)?.id
										? (r.shift() as vscode.MessageOptions)
										: {};
								return messageServiceShim.showWarningMessage(
									m,
									o,
									extensionSourceInfo,
									...(r as Array<
										string | vscode.MessageItem
									>),
								);
							},
							showErrorMessage: (m, ...r) => {
								const o =
									r.length > 0 &&
									typeof r[0] === "object" &&
									r[0] !== null &&
									!(r[0] as vscode.MessageItem).title &&
									!(r[0] as ApiFactoryExtensionSourceInfo)?.id
										? (r.shift() as vscode.MessageOptions)
										: {};
								return messageServiceShim.showErrorMessage(
									m,
									o,
									extensionSourceInfo,
									...(r as Array<
										string | vscode.MessageItem
									>),
								);
							},
							showQuickPick: accessor
								.get(IExtHostQuickInput)
								.showQuickPick.bind(
									accessor.get(IExtHostQuickInput),
								) as any,
							showInputBox: accessor
								.get(IExtHostQuickInput)
								.showInputBox.bind(
									accessor.get(IExtHostQuickInput),
								),
							showOpenDialog: accessor
								.get(IExtHostDialogs)
								.showOpenDialog.bind(
									accessor.get(IExtHostDialogs),
								),
							showSaveDialog: accessor
								.get(IExtHostDialogs)
								.showSaveDialog.bind(
									accessor.get(IExtHostDialogs),
								),
							createOutputChannel: (n, o) =>
								outputServiceShim.createOutputChannel(
									n,
									o as any,
									actualExtensionDescription.identifier,
								),
							createTerminal: accessor
								.get(IExtHostTerminalService)
								.createTerminal.bind(
									terminalServiceShim,
								) as any,
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
							get state() {
								return windowPartsServiceShim.state;
							},
							createStatusBarItem:
								windowPartsServiceShim.createStatusBarItem.bind(
									windowPartsServiceShim,
									actualExtensionDescription.identifier,
								) as any,
							setStatusBarMessage:
								windowPartsServiceShim.setStatusBarMessage.bind(
									windowPartsServiceShim,
								) as any,
							withProgress:
								windowPartsServiceShim.withProgress.bind(
									windowPartsServiceShim,
								),
							createTreeView:
								windowPartsServiceShim.createTreeView.bind(
									windowPartsServiceShim,
									actualExtensionDescription.identifier,
								) as any,
							registerTreeDataProvider:
								windowPartsServiceShim.registerTreeDataProvider.bind(
									windowPartsServiceShim,
									actualExtensionDescription.identifier,
								) as any,
							createWebviewPanel:
								windowPartsServiceShim.createWebviewPanel.bind(
									windowPartsServiceShim,
									actualExtensionDescription.identifier,
								),
							registerWebviewPanelSerializer:
								windowPartsServiceShim.registerWebviewPanelSerializer.bind(
									windowPartsServiceShim,
									actualExtensionDescription.identifier,
								),
							registerUriHandler:
								windowPartsServiceShim.registerUriHandler.bind(
									windowPartsServiceShim,
									actualExtensionDescription.identifier,
								),
						} as VscodeWindowAPIType,
						env: accessor.get(IExtHostEnv) as VscodeEnvAPIType,
						extensions: accessor.get(
							IExtHostExtensions,
						) as VscodeExtensionsAPIType,
						debug: accessor.get(
							IExtHostDebugService,
						) as VscodeDebugAPIType,
						tasks: accessor.get(
							IExtHostTaskService,
						) as VscodeTasksAPIType,
						ipcRenderer: createExtensionIpcRenderer(
							actualExtensionDescription,
						), // Add shimmed ipcRenderer
						// Re-export core types
						Uri: VscodeUriPublic,
						Position: VscodePositionPublic,
						Range: VscodeRangePublic,
						Selection: VscodeSelectionPublic,
						Location: VscodeLocationPublic,
						Disposable: VscodeDisposablePublic,
						CancellationToken: VscodeCancellationTokenPublic,
						CancellationTokenSource:
							VscodeCancellationTokenSourcePublic,
						CancellationError: VscodeCancellationErrorPublic,
						EventEmitter: VscodeEmitterPublic,
						Diagnostic: VscodeDiagnosticPublic,
						DiagnosticRelatedInformation:
							VscodeDiagnosticRelatedInformationPublic,
						CompletionItem: VscodeCompletionItemPublic,
						CompletionList: VscodeCompletionListPublic,
						SnippetString: VscodeSnippetStringPublic,
						Hover: VscodeHoverPublic,
						SignatureHelp: VscodeSignatureHelpPublic,
						DefinitionLink: VscodeDefinitionLinkPublic,
						CodeAction: VscodeCodeActionPublic,
						CodeActionKind: VscodeCodeActionKindPublic,
						CodeLens: VscodeCodeLensPublic,
						Command: VscodeCommandPublic,
						DocumentLink: VscodeDocumentLinkPublic,
						WorkspaceEdit: VscodeWorkspaceEditPublic,
						SymbolInformation: VscodeSymbolInformationPublic,
						SymbolKind: VscodeSymbolKindPublic,
						CallHierarchyItem: VscodeCallHierarchyItemPublic,
						TypeHierarchyItem: VscodeTypeHierarchyItemPublic,
						QuickPickItem: VscodeQuickPickItemPublic,
						InputBoxOptions: VscodeInputBoxOptionsPublic,
						TextEdit: VscodeTextEditPublic,
						RelativePattern: VscodeRelativePatternPublic,
						ThemeColor: VscodeThemeColorPublic,
						ThemeIcon: VscodeThemeIconPublic,
						FileType: VscodeFileTypePublic,
						DiagnosticSeverity: VscodeDiagnosticSeverityPublic,
						ExtensionKind: VscodeExtensionKindPublic,
						ExtensionMode: VscodeExtensionModePublic,
						EndOfLine: VscodeEndOfLinePublic,
						ViewColumn: VscodeViewColumnPublic,
						StatusBarAlignment: VscodeStatusBarAlignmentPublic,
						QuickInputButtons: VscodeQuickInputButtonsPublic,
						ConfigurationTarget: VscodeConfigurationTargetPublic,
						TextEditorRevealType: VscodeTextEditorRevealTypePublic,
						TextDocumentChangeReason:
							VscodeTextDocumentChangeReasonPublic,
						TaskScope: VscodeTaskScopePublic,
						DebugConsoleMode: VscodeDebugConsoleModePublic,
						ProgressLocation: VscodeProgressLocationPublic,
						CompletionItemKind: VscodeCompletionItemKindPublic,
						CompletionTriggerKind:
							VscodeCompletionTriggerKindPublic,
						SignatureHelpTriggerKind:
							VscodeSignatureHelpTriggerKindPublic,
						IndentAction: VscodeIndentActionPublic,
						LanguageStatusSeverity:
							VscodeLanguageStatusSeverityPublic,
						LogLevel: VscodeApiLogLevelEnumPublic,
						FileSystemError: VscodeFileSystemErrorPublic,
					};
					return completeVscodeApiObject as typeof import("vscode");
				};
			});
		logService.info("[Cocoon] API Factory Provider configured.");

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
		cjsModuleInterceptor.register(new NodeBuiltinsShimFactory());
		logService.info("[Cocoon] Installing CJS NodeRequireInterceptor...");
		await cjsModuleInterceptor.install();
		logService.info("[Cocoon] CJS NodeRequireInterceptor installed.");

		logService.info("[Cocoon] Setting up ESM Interceptor...");
		const esmInterceptorContext: CocoonESMInterceptorContext = {
			apiFactory: apiFactoryProvider,
		};
		const esmModuleInterceptor = cocoonDI.createInstance(
			CocoonNodeModuleESMInterceptor,
			esmInterceptorContext,
		);
		await esmModuleInterceptor.install();
		logService.info("[Cocoon] ESM Interceptor installed.");

		logService.info("[Cocoon] Installing global error handlers...");
		const errorHandlerInstance = cocoonDI.createInstance(ErrorHandler);
		ErrorHandler.installEarlyHandler(errorHandlerInstance, cocoonDI);
		process.on("uncaughtException", (error: Error) =>
			ErrorHandler.onUnexpectedError(
				error,
				cocoonRpcProtocol || undefined,
			),
		);
		process.on("unhandledRejection", (reason: any) =>
			ErrorHandler.onUnexpectedError(
				reason,
				cocoonRpcProtocol || undefined,
			),
		);
		logService.info("[Cocoon] Global error handlers installed.");

		logService.info(
			"[Cocoon] Initializing real ExtHostExtensionService...",
		);
		await extHostExtensionService.initialize();
		logService.info("[Cocoon] Real ExtHostExtensionService initialized.");
		localizationServiceInstance.signalLocalizationInitialized();
		logService.info("[Cocoon] Signaled localization service.");
		ErrorHandler.installFullHandler(errorHandlerInstance, cocoonDI);
		logService.info("[Cocoon] Full ErrorHandler capabilities installed.");

		console.log(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);
		logService.info(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);
		ipcApiInstance.sendNotificationToMountain("extHostInitialized", {});
	} catch (hostInitializationError: any) {
		initializationFailedOrExited = true;
		const finalError =
			hostInitializationError instanceof Error
				? hostInitializationError
				: new Error(String(hostInitializationError));
		const errorMessageToLogAndSend = `\n!!!!!!!!!!!!!!!!!!\n[Cocoon] FATAL ERROR: Failed to initialize Cocoon ExtHost:\nMessage: ${finalError.message}\nStack: ${finalError.stack || "N/A"}\n!!!!!!!!!!!!!!!!!!\n`;
		console.error(errorMessageToLogAndSend);
		logService?.error(
			"[Cocoon] FATAL ERROR during Cocoon initialization:",
			finalError,
		);
		try {
			ipcApiInstance.sendNotificationToMountain("extHostError", {
				message: `Cocoon initialization failed: ${finalError.message}`,
				stack: finalError.stack,
				name: finalError.name,
			});
		} catch (errorSendingNotification: any) {
			console.error(
				"[Cocoon] Additionally, failed to send fatal error notification to Mountain:",
				errorSendingNotification,
			);
		}
		process.exit(1);
	}
}

let isInitializationStarted = false;
console.log(
	"[Cocoon] Setting up main IPC message listener for 'initExtensionHost' from Mountain...",
);
ipcApiInstance.onMessageFromMountain((ipcMessage: VineMessage) => {
	if (
		isInitializationStarted &&
		ipcMessage.method !== "rpcData" &&
		ipcMessage.msg_type !== 6
	)
		return;

	if (
		ipcMessage?.msg_type === 1 &&
		ipcMessage.method === "initExtensionHost" &&
		ipcMessage.params
	) {
		if (isInitializationStarted) {
			console.warn(
				"[Cocoon] Received 'initExtensionHost' again. Ignoring duplicate.",
			);
			return;
		}
		console.log(
			"[Cocoon] Received 'initExtensionHost' command from Mountain.",
		);
		isInitializationStarted = true;
		const earlyLogServiceForRevival = new ShimLogService(
			LogLevel.Info,
			"CocoonEarlyInitDataReviver",
		);
		earlyLogServiceForRevival.info(
			"[Cocoon] Attempting to revive URIs in raw initData (pre-DI)...",
		);
		const revivedParametersForEarlyStage =
			reviveUrisInObjectForEarlyInitData(
				ipcMessage.params,
				earlyLogServiceForRevival,
			);
		earlyLogServiceForRevival.info(
			"[Cocoon] Preliminary initData URI revival complete. Proceeding with full host initialization.",
		);
		initializeCocoonHost(revivedParametersForEarlyStage).catch(
			(unhandledErrorInAsyncInit: any) => {
				if (!initializationFailedOrExited) {
					initializationFailedOrExited = true;
					const finalError =
						unhandledErrorInAsyncInit instanceof Error
							? unhandledErrorInAsyncInit
							: new Error(String(unhandledErrorInAsyncInit));
					const errorMessageToLogAndSend = `\n!!!!!!!!!!!!!!!!!!\n[Cocoon] CATASTROPHIC UNHANDLED ERROR during async initializeCocoonHost:\nMessage: ${finalError.message}\nStack: ${finalError.stack || "N/A"}\n!!!!!!!!!!!!!!!!!!\n`;
					console.error(errorMessageToLogAndSend);
					try {
						ipcApiInstance.sendNotificationToMountain(
							"extHostError",
							{
								message: `Cocoon async init catastrophically failed: ${finalError.message}`,
								stack: finalError.stack,
								name: finalError.name,
							},
						);
					} catch (errorSendingNotification: any) {
						console.error(
							"[Cocoon] Additionally, failed to send catastrophic async init error notification to Mountain:",
							errorSendingNotification,
						);
					}
					process.exit(1);
				}
			},
		);
	} else if (
		ipcMessage &&
		ipcMessage.msg_type !== 6 &&
		ipcMessage.method !== "rpcData" &&
		!isInitializationStarted
	) {
		console.warn(
			`[Cocoon] Unexpected IPC message before 'initExtensionHost'. Method='${ipcMessage?.method}', Type=${ipcMessage?.msg_type}. Discarding.`,
		);
	}
});

ipcApiInstance.sendNotificationToMountain("extHostReadyForInit", {});
console.log(
	"[Cocoon] Cocoon sidecar process is ready and waiting for 'initExtensionHost' from Mountain.",
);
