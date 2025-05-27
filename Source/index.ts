/*---------------------------------------------------------------------------------------------
 * Cocoon Main Entry Point (index.ts)
 * --------------------------------------------------------------------------------------------
 * This file serves as the primary entry point and orchestrator for the Cocoon Node.js
 * sidecar process. Its main goal is to establish a VS Code-compatible extension host
 * environment within this sidecar. This enables the execution of standard VS Code
 * extensions in a decoupled manner, with the Cocoon process being managed by an
 * external "Mountain" host process.
 *
 * Core Responsibilities:
 * - Process Initialization: Sets up the Node.js environment by patching global `process`
 *   behaviors (via `cocoon-bootstrap.ts`) to prevent unintentional exits and to
 *   configure settings like `ELECTRON_RUN_AS_NODE`. It also adjusts module search paths
 *   to include VS Code's `out` directory for resolving internal dependencies.
 * - IPC Management: Initializes and utilizes the `cocoon-ipc.ts` module for robust, *   newline-delimited JSON-based communication with the Mountain host over stdio.
 * - RPC Setup: Establishes VS Code's `RPCProtocol` on top of the Vine IPC layer, *   integrating a URI transformer (`ShimUriTransformerService`) to handle URI
 *   translation between Cocoon and Mountain if needed (though often a NO-OP for local).
 * - Dependency Injection (DI): Configures and instantiates VS Code's `InstantiationService`.
 *   This DI container is populated with registrations for core VS Code extension host
 *   services (e.g., `ILogService`, `IExtHostInitDataService`, `IExtHostExtensionService`)
 *   and Cocoon-specific shim implementations for many of these services.
 * - Service Orchestration: Instantiates and wires up the necessary `IExtHost...` services, *   ensuring that shims are used where Cocoon provides its own behavior, and real VS Code
 *   services are used where full fidelity is required and feasible (e.g., the actual
 *   `ExtHostExtensionService`).
 * - Module Interception (`require` and `import`):
 *   - Sets up `NodeRequireInterceptor` for CommonJS `require()` calls. This interceptor
 *     uses an API factory (`apiFactoryProvider`) to construct the `vscode` API object.
 *     It registers factories to provide shims for Node.js built-ins (like 'fs', 'os')
 *     and the `vscode` module itself.
 *   - Sets up `CocoonNodeModuleESMInterceptor` for ESM `import` statements, also leveraging
 *     the `apiFactoryProvider` to serve extension-specific `vscode` API instances via
 *     dynamically generated `data:` URI modules.
 * - API Factory (`apiFactoryProvider`): This crucial component constructs the `vscode` API
 *   object that extensions receive. It starts with VS Code's original API factory and then
 *   strategically overrides specific namespaces (e.g., `vscode.commands`, `vscode.window`, *   `vscode.workspace`) with instances of Cocoon's shims, retrieved via DI. This ensures
 *   that when an extension calls, e.g., `vscode.window.showInformationMessage`, it's
 *   Cocoon's `ShimExtHostMessageService` that handles the call.
 * - Extension Host Lifecycle: Initializes the real `ExtHostExtensionService`, which then
 *   takes over the process of scanning, loading, and activating extensions based on the
 *   provided `initData` and the configured environment.
 * - Global Error Handling: Installs VS Code's `ErrorHandler` and sets up global listeners
 *   for `uncaughtException` and `unhandledRejection` to report errors.
 * - Communication Lifecycle with Mountain:
 *   - Sends `extHostReadyForInit` to Mountain upon startup.
 *   - Waits for an `initExtensionHost` command from Mountain, which includes critical
 *     initialization data (`ExtHostInitData`).
 *   - After successful initialization, sends `extHostInitialized` back to Mountain.
 *   - Reports fatal initialization errors to Mountain.
 *
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";
// For performance marking
import { performance } from "perf_hooks";
// For synchronization barriers
import { Barrier } from "vs/base/common/async";
// For URI revival and RPC
import { VSBuffer } from "vs/base/common/buffer";
// For URI revival
import { CancellationTokenSource } from "vs/base/common/cancellation";
// For URI revival from DTOs
import { MarshalledId, revive } from "vs/base/common/marshalling";
// For URI scheme constants
import { Schemas } from "vs/base/common/network";
import {
	// VS Code's internal URI representation
	URI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// IURITransformer is used by RPCProtocol, implemented by ShimUriTransformerService
import { IURITransformer } from "vs/base/common/uriIpc";
import {
	ExtensionIdentifier,
	// Default for API factory if extension unknown
	nullExtensionDescription,
	// Type for extension metadata
	type IExtensionDescription,
	// Type for API factory parameter
	type IRelaxedExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions";
import {
	// For creating DI service identifiers
	createDecorator,
	InstantiationService,
	// Not directly used here, but part of DI pattern
	// ServicesAccessor,
	type IInstantiationService,
} from "vs/platform/instantiation/common/instantiationService";
import {
	// For DI setup
	ServiceCollection,
	// For registering services with DI
	SyncDescriptor,
} from "vs/platform/instantiation/common/serviceCollection";
import {
	// DI Key for logger factory service
	ILoggerService,
	// DI Key for general log service
	ILogService,
	// Enum for log levels
	LogLevel,
	// Utility to parse log level strings
	parseLogLevel,
} from "vs/platform/log/common/log";
// Global error handler
import { ErrorHandler } from "vs/workbench/api/common/extensionHostMain";
import {
	// VS Code's original API factory
	createApiFactory as createVSCodeApiFactoryOriginal,
	// Type for the API factory function
	type IExtensionApiFactory,
	// Type for extension registry data passed to API factory
	type IExtensionRegistries,
} from "vs/workbench/api/common/extHost.api.impl";
import {
	// Enum for ExtHost RPC targets
	ExtHostContext,
	// Enum for MainThread RPC targets
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import { IExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService";
import { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication";
import { IExtHostCommands } from "vs/workbench/api/common/extHostCommands";
import {
	IExtHostConfiguration,
	// Type for config provider used by API factory
	type ExtHostConfigProvider,
} from "vs/workbench/api/common/extHostConfiguration";
import { IExtHostDiagnostics } from "vs/workbench/api/common/extHostDiagnostics";
import {
	// For document data
	IExtHostDocuments,
	// For document and editor states
	IExtHostDocumentsAndEditors,
} from "vs/workbench/api/common/extHostDocuments";
import {
	// Utility for extension path lookups
	ExtensionPaths,
	// DI Key for the REAL ExtHostExtensionService
	IExtHostExtensionService,
	// DI Key for host utility functions
	IHostUtils,
} from "vs/workbench/api/common/extHostExtensionService";
import { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
import {
	// DI Key for initial data from Mountain
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
	// For CJS require('vscode') aliasing
	NodeModuleAliasingModuleFactory,
	// For intercepting CJS require()
	NodeRequireInterceptor,
	// The real ExtHostExtensionService implementation
	ExtHostExtensionService as RealExtHostExtensionService,
	// Factory for CJS require('vscode')
	VSCodeNodeModuleFactory,
} from "vs/workbench/api/node/extHostExtensionService";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement";
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind";
import {
	// VS Code's RPC protocol implementation
	RPCProtocol,
	// Type for RPC logger (optional)
	type IRPCProtocolLogger,
} from "vs/workbench/services/extensions/common/rpcProtocol";

// --- Cocoon Specific Shim Imports ---
import * as bootstrapUtils from "./cocoon-bootstrap";
import {
	CocoonNodeModuleESMInterceptor,
	type CocoonESMInterceptorContext,
} from "./cocoon-esm-interceptor";
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
	// Cocoon's specific shape/DI key for this
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
// --- Import from vscode.ts for API factory type consistency ---
// This imports the module that defines the shape of `import * as vscode from "vscode"`.
import type * as vscode from "./vscode";
// Re-import key classes/enums specifically for use within the API factory, ensuring they are the public API versions.
import {
	// Renamed in vscode.ts
	VscodeApiLogLevelEnumPublic,
	CallHierarchyItem as VscodeCallHierarchyItemPublic,
	CancellationError as VscodeCancellationErrorPublic,
	CancellationToken as VscodeCancellationTokenPublic,
	CancellationTokenSource as VscodeCancellationTokenSourcePublic,
	CodeActionKind as VscodeCodeActionKindPublic,
	CodeAction as VscodeCodeActionPublic,
	CodeLens as VscodeCodeLensPublic,
	VscodeCommand as VscodeCommandPublic,
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
	Disposable as VscodeDisposablePublic,
	DocumentLink as VscodeDocumentLinkPublic,
	VscodeEmitter as VscodeEmitterPublic,
	EndOfLine as VscodeEndOfLinePublic,
	ExtensionKind as VscodeExtensionKindPublic,
	ExtensionMode as VscodeExtensionModePublic,
	// Renamed in vscode.ts
	VscodeFileSystemError as VscodeFileSystemErrorPublic,
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
	// Types for API factory structure
	type Commands as VscodeCommandsAPIType,
	type Debug as VscodeDebugAPIType,
	type Env as VscodeEnvAPIType,
	type Extensions as VscodeExtensionsAPIType,
	type FileSystem as VscodeFileSystemAPIType,
	type Languages as VscodeLanguagesAPIType,
	type Tasks as VscodeTasksAPIType,
	type Window as VscodeWindowAPIType,
	type Workspace as VscodeWorkspaceAPIType,
} from "./vscode";

console.log("[Cocoon] Node.js Sidecar Process Starting...");

// VS Code standard performance mark
performance.mark(`code/extHost/willConnectToRenderer`);

// --- Module Path Setup for VS Code Internal Dependencies ---
// This allows `require()` calls within VS Code's own `extHost*.ts` files (like RealExtHostExtensionService)
// to resolve paths like 'vs/base/common/uri' correctly, assuming Cocoon's build places these
// dependencies in a predictable relative location.
const vsCodeOutDirectory = path.resolve(
	__dirname,

	"../../../Dependency/Microsoft/Dependency/Editor/out",
);

console.log(
	`[Cocoon] VS Code 'out' directory for internal module resolution: ${vsCodeOutDirectory}`,
);

if (fs.existsSync(vsCodeOutDirectory)) {
	if (Array.isArray((module as any).paths)) {
		// Prepend to Node's module search paths
		(module as any).paths.unshift(path.join(vsCodeOutDirectory));

		console.log(
			"[Cocoon] VS Code 'out' directory successfully prepended to module.paths for CJS resolution.",
		);
	} else {
		console.warn(
			"[Cocoon] `module.paths` is not an array. Cannot prepend VS Code 'out' directory. Internal module resolution might fail.",
		);
	}
} else {
	console.error(
		`[Cocoon] CRITICAL FAILURE: VS Code 'out' directory NOT FOUND at expected path: ${vsCodeOutDirectory}. ` +
			`Extensions and core ExtHost services may fail to load their internal dependencies (e.g., 'vs/base/common/uri'). ` +
			`Ensure VS Code dependencies are correctly bundled or linked.`,
	);

	// Cannot proceed without VS Code's base modules.
	process.exit(1);
}

// --- Global State & Bootstrap ---
// DI Service
let cocoonDI: IInstantiationService | null = null;

// RPC Protocol instance
let cocoonRpcProtocol: RPCProtocol | null = null;

// IPC adapter for RPCProtocol, created from cocoon-ipc
const cocoonIpcAdapter = ipcApiInstance.createHostProtocolInterface();

// Flag to prevent re-entry or actions after failure/exit signal
let initializationFailedOrExited = false;

// Patch global `process.exit` early to be conditional on `!initializationFailedOrExited`.
// This allows Cocoon to control its own termination, preventing premature exits if Mountain
// is still expecting it to run, unless a fatal init error occurs.
bootstrapUtils.patchProcess(() => !initializationFailedOrExited);

// --- URI Revival Function for Initial Data (Pre-DI, Pre-RPC Transformer) ---
// This is a temporary revival function used ONLY for the raw `initDataFromMountain`
// BEFORE the main RPCProtocol and its URI transformer are set up.
// Once RPCProtocol is initialized, `vs/base/common/marshalling.revive` (which uses
// the RPCProtocol's transformer) should be used for all subsequent DTO revival.
function reviveUriComponentsForEarlyInitData(
	uriComponent: any,

	// Optional logger for this early phase
	earlyLogService?: ILogService,
): URI | undefined {
	if (!uriComponent) return undefined;

	try {
		// Check if it looks like a URI DTO from VS Code
		if (
			typeof uriComponent === "object" &&
			uriComponent !== null &&
			(uriComponent.path !== undefined ||
				uriComponent.scheme !== undefined ||
				// Full URI DTO
				(uriComponent as any).$mid === MarshalledId.Uri ||
				// Simplified URI DTO
				(uriComponent as any).$mid === MarshalledId.UriSimple)
		) {
			// Use VS Code's internal URI.revive
			return URI.revive(uriComponent as VSCodeInternalUriComponents);
		}
	} catch (e: any) {
		earlyLogService?.warn(
			// Use the passed-in early logger
			`[Cocoon Early URI Revival] Failed to revive URI component: ${JSON.stringify(uriComponent)}. Error: ${e.message}`,
		);
	}

	// Not a recognizable URI component
	return undefined;
}

function transformUrisInObjectForEarlyInitData(
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
		// Skip primitives, already revived URIs, or specific non-revivable types
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj
			.map((item) =>
				transformUrisInObjectForEarlyInitData(item, earlyLogService),
			)
			.filter((item) => item !== undefined);
	}

	const revivedUriAttempt = reviveUriComponentsForEarlyInitData(
		obj,

		earlyLogService,
	);

	if (revivedUriAttempt instanceof URI) {
		// If the object itself is a URI DTO, return the revived URI
		return revivedUriAttempt;
	}

	// Recursively transform properties of other objects
	const newObj: { [key: string]: any } = {};

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			newObj[key] = transformUrisInObjectForEarlyInitData(
				obj[key],

				earlyLogService,
			);
		}
	}

	return newObj;
}

// Define Service Identifiers for new granular shims if they are not standard VS Code DI keys.
// These allow DI to resolve the correct shim implementation.
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
	// For `vscode.extensions`
	createDecorator<IExtHostExtensionsShape>("extHostExtensions");

export const IExtHostDebugService = createDecorator<IExtHostDebugServiceShape>(
	"extHostDebugService",

	// For `vscode.debug`
);

export const IExtHostTaskService =
	// For `vscode.tasks`
	createDecorator<IExtHostTaskServiceShape>("extHostTaskService");

export const IExtHostWindowParts =
	// For misc `vscode.window` parts
	createDecorator<IExtHostWindowPartsServiceShape>("extHostWindowParts");

// Define DI key for Cocoon's proposed API shim if it differs from VS Code's or needs specific registration
export const ICocoonExtHostProposedApis =
	createDecorator<CocoonIExtHostProposedApis>("cocoonExtHostProposedApis");

// --- Main Initialization Function for Cocoon Extension Host ---
async function initializeCocoonHost(
	rawInitDataFromMountain: any,
): Promise<void> {
	console.log(
		"[Cocoon] Initializing Cocoon Extension Host Environment (Path A - Real ExtHostExtensionService with Shims)...",
	);

	// VS Code standard performance mark
	performance.mark(`code/extHost/didWaitForInitData`);

	if (initializationFailedOrExited) {
		console.warn(
			"[Cocoon] Initialization skipped: Cocoon host has already failed or received an exit signal.",
		);

		return;
	}

	// Will be properly initialized via DI
	let logService: ILogService | undefined;

	try {
		// Early log service for init data revival, before full DI-based log service is ready.
		const tempInitialLogLevelForEarlyLogging =
			rawInitDataFromMountain?.logLevel
				? (parseLogLevel(rawInitDataFromMountain.logLevel) ??
					LogLevel.Info)
				: LogLevel.Info;

		const earlyLogServiceForInitDataRevival = new ShimLogService(
			tempInitialLogLevelForEarlyLogging,

			"CocoonInitDataReviver",
		);

		// Initialize URI Transformer (NO-OP for local MVP, but essential for RPCProtocol)
		const uriTransformerServiceInstance = new ShimUriTransformerService(
			rawInitDataFromMountain?.remote?.authority,
		);

		// Set to an actual logger for verbose RPC debugging if needed
		const rpcLogger: IRPCProtocolLogger | null = null;

		console.log(
			"[Cocoon] Creating final RPCProtocol instance with configured URI transformer...",
		);

		cocoonRpcProtocol = new RPCProtocol(
			// Non-null assertion: adapter must be created by now.
			cocoonIpcAdapter!,

			rpcLogger,

			// Pass the IURITransformer instance
			uriTransformerServiceInstance,
		);

		// Make RPCProtocol instance globally available for VS Code's `revive` function,

		// which uses it to transform URIs during DTO unmarshalling.
		(globalThis as any).__COC_RPC_PROTOCOL__ = cocoonRpcProtocol;

		console.log(
			"[Cocoon] RPCProtocol instance created and set globally for URI revival.",
		);

		// Now that RPCProtocol (with its transformer) is set up, revive the full initData.
		// `revive` will use the transformer from `__COC_RPC_PROTOCOL__`.
		console.log(
			"[Cocoon] Reviving URIs in raw initData from Mountain using global RPCProtocol's transformer...",
		);

		const revivedInitData = revive(
			rawInitDataFromMountain,
		) as ExtHostInitData;

		console.log(
			`[Cocoon] InitData URIs revived. Example - Logs Location: ${revivedInitData.logsLocation.toString()}. ` +
				`Workspace: ${revivedInitData.workspace?.id ?? "none"}`,
		);

		// --- Setup Dependency Injection (DI) ServiceCollection ---
		console.log(
			"[Cocoon] Setting up ServiceCollection and registering core services and shims...",
		);

		const services = new ServiceCollection();

		// Determine final log level from the (now revived) initData.
		const finalLogLevel = revivedInitData.logLevel
			? (parseLogLevel(revivedInitData.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;

		// Main logger for Cocoon
		logService = new ShimLogService(finalLogLevel, "CocoonMainLog");

		services.set(ILogService, logService);

		// Logger factory service
		services.set(ILoggerService, new ShimLoggerService(logService));

		logService.info(
			`[Cocoon] Main LogService initialized. Level: ${LogLevel[finalLogLevel]}.`,
		);

		services.set(IExtHostInitDataService, {
			_serviceBrand: undefined,

			value: revivedInitData,
		});

		// Provide RPC protocol via DI
		services.set(IExtHostRpcService, cocoonRpcProtocol);

		// URI Transformer service
		services.set(IURITransformerService, uriTransformerServiceInstance);

		services.set(
			IHostUtils,

			new ShimHostUtils(cocoonRpcProtocol, logService),

			// Host utilities shim
		);

		const fileSystemInfoService = new ShimExtHostFileSystemInfo(
			cocoonRpcProtocol,

			logService,
		);

		// FS Info (case sensitivity, extUri)
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

			// Memento storage
		);

		services.set(
			IExtHostSecretState,

			new ShimExtHostSecretState(cocoonRpcProtocol, logService),

			// Secret storage
		);

		services.set(
			IExtHostLocalizationService,

			new ShimExtHostLocalizationService(cocoonRpcProtocol, logService),

			// Localization (stub)
		);

		services.set(
			IExtHostManagedSockets,

			new ShimExtHostManagedSockets(cocoonRpcProtocol, logService),

			// Managed Sockets (stub)
		);

		services.set(
			IExtHostTelemetry,

			new ShimExtHostTelemetry(cocoonRpcProtocol, logService),

			// Telemetry (shim)
		);

		services.set(
			IExtHostApiDeprecationService,

			new ShimExtHostApiDeprecationService(cocoonRpcProtocol, logService),

			// API Deprecation (shim)
		);

		console.log(
			"[Cocoon] Core services and shims registered with ServiceCollection. Creating InstantiationService...",
		);

		cocoonDI = new InstantiationService(
			services,

			true /* strict mode: true */,
		);

		logService.info("[Cocoon] InstantiationService created.");

		// --- Instantiate and Register Shims that Require DI or Are Central ---
		// These shims might depend on other services already registered or need to be available early.
		const documentServiceInstance = cocoonDI.createInstance(
			CocoonDocumentService,
		);

		cocoonDI.set(IExtHostDocuments, documentServiceInstance);

		cocoonDI.set(
			IExtHostDocumentsAndEditors,

			documentServiceInstance as any,

			// Cast if it fully implements both
		);

		// For vscode.workspace.fs
		const localFsApiShimInstance = new ShimFileSystemApi(logService);

		// Register granular UI/Env shims with DI
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

				// Pass IExtHostInitDataService
				cocoonDI.get(IExtHostInitDataService),

				// Pass ShimExtHostClipboardService
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

				// ShimExtHostWorkspace constructor takes raw ExtHostInitData, not the service.
				revivedInitData,

				documentServiceInstance,

				// For workspace.fs
				localFsApiShimInstance,

				// Pass IInstantiationService for getConfiguration
				cocoonDI,
			),
		);

		cocoonDI.set(
			IExtHostConfiguration,

			cocoonDI.createInstance(
				ShimExtHostConfiguration,

				// Pass initial config data directly
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

				// Pass IExtHostAuthentication
				cocoonDI.get(IExtHostAuthentication),
			),
		);

		cocoonDI.set(
			IExtHostLanguageFeatures,

			cocoonDI.createInstance(
				ShimLanguageFeatures,

				// Pass CocoonDocumentService
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

		cocoonDI.set(
			ICocoonExtHostProposedApis,

			cocoonDI.createInstance(ShimExtensionsProposedApi, revivedInitData),
		);

		// --- Register the REAL ExtHostExtensionService ---
		// This is "Path A": using VS Code's actual extension service, which will in turn use
		// the shims and services registered above via DI.
		cocoonDI.set(
			IExtHostExtensionService,

			new SyncDescriptor(RealExtHostExtensionService, [
				// `isInitialProbed` - false for normal startup
				false,

				// Pass our IPC implementation
				ipcApiInstance as CocoonPrimaryIpc,

				// Pass the IInstantiationService instance
				cocoonDI,
			]),
		);

		logService.info(
			"[Cocoon] Real IExtHostExtensionService registered with DI using SyncDescriptor.",
		);

		// Register shims for vscode.extensions, vscode.debug, vscode.tasks API namespaces
		// These adapt the real IExtHostExtensionService or provide stubbed functionality.
		cocoonDI.set(
			IExtHostExtensions,

			cocoonDI.createInstance(
				ShimExtHostExtensions,

				// Depends on the real ExtHostExtensionService
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

		// Register any other singleton services from VS Code that might be needed by platform code
		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			if (!cocoonDI.has(id)) {
				cocoonDI.set(id, descriptor);
			}
		}

		logService.info(
			"[Cocoon] Standard VS Code singleton services registered if not already present.",
		);

		// --- Prepare API Factory Provider ---
		// This factory will be used by CJS and ESM interceptors to create the `vscode` API object.
		const extHostExtensionService = cocoonDI.get(IExtHostExtensionService);

		const extHostConfigService = cocoonDI.get(IExtHostConfiguration);

		// VS Code standard performance mark
		performance.mark("code/extHost/willWaitForConfigAndPaths");

		const [extensionPaths, configProvider, globalRegistry, myRegistry] =
			await Promise.all([
				// For resolving extension from URI (ESM)
				extHostExtensionService.getExtensionPathIndex(),

				// For `vscode.workspace.getConfiguration`
				extHostConfigService.getConfigProvider(),

				// All known extensions
				extHostExtensionService.getGlobalExtensionRegistry(),

				// Extensions running in this host
				extHostExtensionService.getExtensionRegistry(),
			]);

		// VS Code standard performance mark
		performance.mark("code/extHost/didWaitForConfigAndPaths");

		const preResolvedExtensionRegistries: IExtensionRegistries = {
			mine: myRegistry,

			all: globalRegistry,
		};

		logService.info(
			"[Cocoon] Preparing API Factory Provider by augmenting VS Code's original factory...",
		);

		const apiFactoryProvider =
			cocoonDI.invokeFunction<IExtensionApiFactory>((accessor) => {
				// Get VS Code's original API factory function.
				const originalVSCodeFactory =
					createVSCodeApiFactoryOriginal(accessor);

				// Return our augmented factory function.
				return (
					// For CJS (desc) or ESM (URI)
					extensionDescOrUri: IRelaxedExtensionDescription | URI,

					// Optional overrides
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
						// For ESM imports, resolve URI to extension
						const parentUri = extensionDescOrUri;

						// Uses TernarySearchTree
						const foundExt = extensionPaths.findSubstr(parentUri);

						if (foundExt) {
							extDescription = foundExt;
						} else {
							logService?.warn(
								`[Cocoon API Factory] Could not identify extension for ESM import from URI: ${parentUri.toString()}. ` +
									`Using nullExtensionDescription, which may limit API access.`,
							);
						}
					} else if (extensionDescOrUri) {
						// For CJS require, description is passed directly
						extDescription = extensionDescOrUri;
					}

					// Get the base `vscode` API object from VS Code's original factory.
					const vscodeApiBase = originalVSCodeFactory(
						extDescription,

						finalExtensionRegistries,

						finalConfigProvider,
					);

					// --- Augment/Override with Cocoon's DI-managed shims ---
					// This ensures that when an extension calls `vscode.commands.executeCommand`,

					// it invokes Cocoon's `ShimExtHostCommands.executeCommand`, etc.
					const commandsShim = accessor.get(IExtHostCommands);

					const workspaceShim = accessor.get(IExtHostWorkspace);

					const languagesShimService = accessor.get(
						IExtHostLanguageFeatures,

						// This is ShimLanguageFeatures
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

					// Provides vscode.extensions
					const extensionsShim = accessor.get(IExtHostExtensions);

					// Provides vscode.debug
					const debugShim = accessor.get(IExtHostDebugService);

					// Provides vscode.tasks
					const tasksShim = accessor.get(IExtHostTaskService);

					// For misc vscode.window parts
					const windowPartsShim = accessor.get(IExtHostWindowParts);

					// Construct the final `vscode` API object for the extension.
					const completeVscodeApi = {
						// Start with VS Code's base API object
						...vscodeApiBase,

						// Override with Cocoon's shim
						commands: commandsShim as VscodeCommandsAPIType,

						// Override
						workspace: workspaceShim as VscodeWorkspaceAPIType,

						languages: {
							// Augment/override vscode.languages
							...(vscodeApiBase.languages || {}),

							// Provider registration methods delegate to ShimLanguageFeatures
							registerHoverProvider:
								languagesShimService.registerHoverProvider.bind(
									languagesShimService,
								),

							registerCompletionItemProvider:
								languagesShimService.registerCompletionItemProvider.bind(
									languagesShimService,
								),

							registerDefinitionProvider:
								languagesShimService.registerDefinitionProvider.bind(
									languagesShimService,
								),

							registerCodeActionsProvider:
								languagesShimService.registerCodeActionsProvider.bind(
									languagesShimService,
								),

							registerCodeLensProvider:
								languagesShimService.registerCodeLensProvider.bind(
									languagesShimService,
								),

							registerDeclarationProvider:
								languagesShimService.registerDeclarationProvider.bind(
									languagesShimService,
								),

							registerDocumentFormattingEditProvider:
								languagesShimService.registerDocumentFormattingEditProvider.bind(
									languagesShimService,
								),

							registerDocumentHighlightProvider:
								languagesShimService.registerDocumentHighlightProvider.bind(
									languagesShimService,
								),

							registerDocumentLinkProvider:
								languagesShimService.registerDocumentLinkProvider.bind(
									languagesShimService,
								),

							registerDocumentRangeFormattingEditProvider:
								languagesShimService.registerDocumentRangeFormattingEditProvider.bind(
									languagesShimService,
								),

							registerOnTypeFormattingEditProvider:
								languagesShimService.registerOnTypeFormattingEditProvider.bind(
									languagesShimService,
								),

							registerReferenceProvider:
								languagesShimService.registerReferenceProvider.bind(
									languagesShimService,
								),

							registerRenameProvider:
								languagesShimService.registerRenameProvider.bind(
									languagesShimService,
								),

							registerSignatureHelpProvider:
								languagesShimService.registerSignatureHelpProvider.bind(
									languagesShimService,
								),

							registerImplementationProvider:
								languagesShimService.registerImplementationProvider.bind(
									languagesShimService,
								),

							registerTypeDefinitionProvider:
								languagesShimService.registerTypeDefinitionProvider.bind(
									languagesShimService,
								),

							registerWorkspaceSymbolProvider:
								languagesShimService.registerWorkspaceSymbolProvider.bind(
									languagesShimService,
								),

							registerSelectionRangeProvider:
								languagesShimService.registerSelectionRangeProvider.bind(
									languagesShimService,
								),

							registerCallHierarchyProvider:
								languagesShimService.registerCallHierarchyProvider.bind(
									languagesShimService,
								),

							registerTypeHierarchyProvider:
								languagesShimService.registerTypeHierarchyProvider.bind(
									languagesShimService,
								),

							registerLinkedEditingRangeProvider:
								languagesShimService.registerLinkedEditingRangeProvider.bind(
									languagesShimService,
								),

							registerInlayHintsProvider:
								languagesShimService.registerInlayHintsProvider.bind(
									languagesShimService,
								),

							registerDocumentColorProvider:
								languagesShimService.registerDocumentColorProvider.bind(
									languagesShimService,
								),

							registerFoldingRangeProvider:
								languagesShimService.registerFoldingRangeProvider.bind(
									languagesShimService,
								),

							// Other languages API methods (from ShimLanguages, which uses ShimLanguageFeatures)
							getLanguages:
								languagesShimService.getLanguages.bind(
									languagesShimService,
								),

							setTextDocumentsLanguage:
								languagesShimService.setTextDocumentsLanguage.bind(
									languagesShimService,
								),

							match: languagesShimService.match.bind(
								languagesShimService,
							),

							createDiagnosticCollection: (name?: string) =>
								diagnosticServiceShim.createDiagnosticCollection(
									name,
								),

							get onDidChangeDiagnostics() {
								return diagnosticServiceShim.onDidChangeDiagnostics;
							},

							setLanguageStatus:
								languagesShimService.setLanguageStatus.bind(
									languagesShimService,
								),

							createLanguageStatusItem:
								languagesShimService.createLanguageStatusItem.bind(
									languagesShimService,
								),
						} as VscodeLanguagesAPIType,

						window: {
							// Augment/override vscode.window
							...(vscodeApiBase.window || {}),

							// Methods from specific UI/Interaction shims
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

								// Cast due to complex overloads
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
									| {
											log?: boolean;

											languageId?: string;

											file?: VscodeUriPublic;
									  },
							) =>
								outputServiceShim.createOutputChannel(
									name,

									optsOrLangId as any,
								),

							// Terminal methods from ShimExtHostTerminalService
							createTerminal: (options?: any) =>
								// `any` to match vscode.d.ts flexibility
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

							// Miscellaneous window parts from ShimExtHostWindowPartsService
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
							) as any,

							registerTreeDataProvider:
								windowPartsShim.registerTreeDataProvider.bind(
									windowPartsShim,
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

							// TODO: Ensure activeTextEditor, visibleTextEditors (from IExtHostDocumentsAndEditors / CocoonDocumentService)
							// are correctly part of vscodeApiBase.window or need to be explicitly added here.
							// They are typically on vscodeApiBase.window already.
						} as VscodeWindowAPIType,

						// Override with Cocoon's env shim
						env: envShim as VscodeEnvAPIType,

						// Override
						extensions: extensionsShim as VscodeExtensionsAPIType,

						// Override
						debug: debugShim as VscodeDebugAPIType,

						// Override
						tasks: tasksShim as VscodeTasksAPIType,

						// --- Re-export core VS Code API classes and enums directly on the `vscode` object ---
						// This makes them available as `vscode.Uri`, `vscode.Position`, etc., to extensions.
						// These are imported from Cocoon's `./vscode.ts` which re-exports from `../Shim/out/vscode.js`.
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

						// This is VS Code's Emitter, not Node's
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

					// Cast to the full `vscode` module type
					return completeVscodeApi as typeof import("vscode");
				};
			});

		logService.info("[Cocoon] API Factory Provider configured and ready.");

		// --- Setup CJS NodeRequireInterceptor ---
		logService.info("[Cocoon] Setting up CJS NodeRequireInterceptor...");

		const cjsModuleInterceptor = cocoonDI.createInstance(
			NodeRequireInterceptor,

			// The factory function itself
			apiFactoryProvider,

			{
				// Context for VSCodeNodeModuleFactory
				extensionRegistry: () => preResolvedExtensionRegistries,

				extensionPaths: () => extensionPaths,

				configProvider: () => configProvider,
			},
		);

		// Register factories with the CJS interceptor
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

			// For aliases like 'vsCODE_TEXT_BUFFER'
		);

		// For require('fs')
		cjsModuleInterceptor.register(new FsModuleShimFactory());

		// For other Node built-ins like 'os', 'crypto'
		cjsModuleInterceptor.register(new NodeBuiltinsShimFactory());

		logService.info("[Cocoon] Installing CJS NodeRequireInterceptor...");

		await cjsModuleInterceptor.install();

		logService.info(
			"[Cocoon] CJS NodeRequireInterceptor installed successfully.",
		);

		// --- Setup ESM Interceptor ---
		logService.info(
			"[Cocoon] Setting up ESM Interceptor for 'import vscode'...",
		);

		const esmInterceptorContext: CocoonESMInterceptorContext = {
			apiFactory: apiFactoryProvider,

			// Note: If apiFactoryProvider needs more context for ESM (e.g., IExtHostExtensionService),

			// it must get it via its `accessor` or this context needs to provide it.
		};

		const esmModuleInterceptor = cocoonDI.createInstance(
			CocoonNodeModuleESMInterceptor,

			esmInterceptorContext,
		);

		// This registers the Node.js loader hook
		await esmModuleInterceptor.install();

		logService.info("[Cocoon] ESM Interceptor installed successfully.");

		// --- Install Global Error Handlers ---
		logService.info("[Cocoon] Installing global error handlers...");

		const errorHandlerInstance = cocoonDI.createInstance(ErrorHandler);

		// For errors during early init
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

		logService.info(
			"[Cocoon] Global error handlers (uncaughtException, unhandledRejection) installed.",
		);

		// --- Initialize the Real ExtHostExtensionService ---
		// This service will load and activate extensions.
		logService.info(
			"[Cocoon] Initializing real ExtHostExtensionService (this will load and activate extensions)...",
		);

		await extHostExtensionService.initialize();

		logService.info(
			"[Cocoon] Real ExtHostExtensionService initialized successfully. Extensions are being activated.",
		);

		// Upgrade error handler to full capabilities now that services are ready.
		ErrorHandler.installFullHandler(errorHandlerInstance, cocoonDI);

		logService.info("[Cocoon] Full ErrorHandler capabilities installed.");

		console.log(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);

		logService.info(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);

		// Notify Mountain
		ipcApiInstance.sendNotificationToMountain("extHostInitialized", {});
	} catch (hostError: any) {
		// Set flag to allow process.exit if bootstrap patch is active
		initializationFailedOrExited = true;

		const finalError =
			hostError instanceof Error
				? hostError
				: new Error(String(hostError));

		console.error(
			"\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
				"[Cocoon] FATAL ERROR: Failed to initialize Cocoon Extension Host Environment:\n" +
				`Message: ${finalError.message}\n` +
				`Stack: ${finalError.stack || "No stack available"}\n` +
				"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n",
		);

		logService?.error(
			"[Cocoon] FATAL ERROR during Cocoon initialization:",

			finalError,

			// Use logger if available
		);

		try {
			ipcApiInstance.sendNotificationToMountain("extHostError", {
				message: `Cocoon initialization failed catastrophically: ${finalError.message}`,

				stack: finalError.stack,

				name: finalError.name,
			});
		} catch (sendError: any) {
			console.error(
				"[Cocoon] Additionally, failed to send the fatal initialization error notification to Mountain:",

				sendError,
			);
		}

		// Terminate with error code
		process.exit(1);
	}
}

// --- Main Message Listener & Readiness Signal ---
let isInitializationStarted = false;

console.log(
	"[Cocoon] Setting up main IPC message listener for 'initExtensionHost' command from Mountain...",
);

ipcApiInstance.onMessageFromMountain((message: VineMessage) => {
	if (isInitializationStarted && message.method !== "rpcData") {
		// Allow rpcData through even after init starts
		// console.debug(`[Cocoon] IPC message received after init started, but not rpcData. Method: ${message?.method}. Ignoring.`);

		return;
	}

	if (
		message?.msg_type === 1 /* Request */ &&
		message.method === "initExtensionHost" &&
		message.params
	) {
		if (isInitializationStarted) {
			console.warn(
				"[Cocoon] Received 'initExtensionHost' command again after initialization has already started. Ignoring duplicate request.",
			);

			return;
		}

		console.log(
			"[Cocoon] Received 'initExtensionHost' command from Mountain with initialization data.",
		);

		isInitializationStarted = true;

		// Use a temporary, basic logger for the initial data revival if the main one isn't up yet.
		const earlyLogService = new ShimLogService(
			LogLevel.Info,

			"CocoonInitDataReviver",
		);

		earlyLogService.info(
			"[Cocoon] Reviving URIs in raw initData from Mountain (pre-DI phase)...",
		);

		const revivedParamsForEarlyStage =
			transformUrisInObjectForEarlyInitData(
				message.params,

				earlyLogService,
			);

		earlyLogService.info(
			"[Cocoon] Preliminary initData URI revival complete.",
		);

		initializeCocoonHost(revivedParamsForEarlyStage).catch((err: any) => {
			// This catch block is for unhandled promise rejections specifically from the
			// `initializeCocoonHost` async function itself, not for errors caught within it.
			if (!initializationFailedOrExited) {
				// Ensure we only process and exit once for fatal errors.
				initializationFailedOrExited = true;

				const finalError =
					err instanceof Error ? err : new Error(String(err));

				console.error(
					"\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
						"[Cocoon] CATASTROPHIC UNHANDLED ERROR during async initializeCocoonHost execution:\n" +
						`Message: ${finalError.message}\n` +
						`Stack: ${finalError.stack || "No stack available"}\n` +
						"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n",
				);

				try {
					ipcApiInstance.sendNotificationToMountain("extHostError", {
						message: `Cocoon async initialization catastrophically failed (unhandled): ${finalError.message}`,

						stack: finalError.stack,

						name: finalError.name,
					});
				} catch (sendError: any) {
					console.error(
						"[Cocoon] Additionally, failed to send the catastrophic async init error notification to Mountain:",

						sendError,
					);
				}

				// Terminate due to unrecoverable error in core initialization.
				process.exit(1);
			}
		});
	} else if (
		message &&
		message.msg_type !== 6 /* Notification */ &&
		message.method !== "rpcData" &&
		!isInitializationStarted
	) {
		// Log unexpected messages received *before* initExtensionHost, unless they are RPC data which might arrive early.
		console.warn(
			`[Cocoon] Unexpected IPC message received before 'initExtensionHost' command. This might indicate an issue with the host (Mountain) communication sequence or an unexpected early message. ` +
				`Method='${message?.method}', Type=${message?.msg_type}. Discarding.`,
		);
	}
});

// Notify Mountain that Cocoon is ready to receive the 'initExtensionHost' command.
ipcApiInstance.sendNotificationToMountain("extHostReadyForInit", {});

console.log(
	"[Cocoon] Cocoon sidecar process is ready and waiting for the 'initExtensionHost' command from Mountain.",
);
