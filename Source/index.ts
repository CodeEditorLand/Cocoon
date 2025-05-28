/*---------------------------------------------------------------------------------------------
 * Cocoon Main Entry Point (index.ts)
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
 *   Mountain host process over standard input/output (stdio).
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

// --- Standard Node.js Module Imports ---
import * as fs from "fs"; // File System module for path existence checks.
import * as path from "path"; // Path module for path manipulation.
import { performance } from "perf_hooks"; // For performance marking during startup.

// --- VS Code Base Module Imports ---
// These are core utilities from VS Code's `base` layer.
import { Barrier } from "vs/base/common/async"; // For synchronization barriers, if needed.
import { VSBuffer } from "vs/base/common/buffer"; // For handling binary data buffers.
import { CancellationTokenSource } from "vs/base/common/cancellation"; // For creating cancellation tokens.
import { MarshalledId, revive } from "vs/base/common/marshalling"; // For reviving complex objects (like URIs) from DTOs.
import { Schemas } from "vs/base/common/network"; // Defines common URI schemes (e.g., 'file', 'untitled').
import {
	URI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// VS Code's internal URI implementation.
import { type IURITransformer } from "vs/base/common/uriIpc"; // Interface for URI transformation in RPC.

// --- VS Code Platform Module Imports ---
// These are from VS Code's `platform` layer, dealing with extensions, DI, logging, etc.
import {
	ExtensionIdentifier, // Class for uniquely identifying extensions.
	nullExtensionDescription, // A default placeholder for unknown extensions.
	type IExtensionDescription, // Interface for detailed extension metadata.
	type IRelaxedExtensionDescription, // A less strict version for API factory input.
} from "vs/platform/extensions/common/extensions";
import { getSingletonServiceDescriptors } from "vs/platform/instantiation/common/extensions"; // For registering standard DI services.
import {
	createDecorator, // Utility for creating DI service identifiers.
	InstantiationService, // VS Code's Dependency Injection container.
	type IInstantiationService, // Interface for the InstantiationService.
} from "vs/platform/instantiation/common/instantiationService";
import {
	ServiceCollection,
	SyncDescriptor,
} from "vs/platform/instantiation/common/serviceCollection";
// For DI setup.
import {
	ILoggerService,
	ILogService,
	LogLevel,
	parseLogLevel,
} from "vs/platform/log/common/log";
// Logging services and utilities.

// --- VS Code Workbench API (ExtHost) Module Imports ---
// These are specific to the extension host environment.
import { ErrorHandler } from "vs/workbench/api/common/extensionHostMain"; // Global error handling.
import {
	createApiFactory as createVSCodeApiFactoryOriginal, // VS Code's original factory for the `vscode` API object.
	type IExtensionApiFactory, // Type for the API factory function.
	type IExtensionRegistries, // Type for extension registry data passed to the API factory.
} from "vs/workbench/api/common/extHost.api.impl";
import { ExtHostContext } from "vs/workbench/api/common/extHost.protocol"; // Enum for ExtHost RPC targets.
import { IExtHostApiDeprecationService } from "vs/workbench/api/common/extHostApiDeprecationService"; // Service for API deprecation warnings.
import { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication"; // Service for authentication.
import { IExtHostCommands } from "vs/workbench/api/common/extHostCommands"; // Service for commands.
import {
	IExtHostConfiguration,
	type ExtHostConfigProvider,
} from "vs/workbench/api/common/extHostConfiguration";
// Service for configuration.
import { IExtHostDiagnostics } from "vs/workbench/api/common/extHostDiagnostics"; // Service for diagnostics (problems).
import {
	IExtHostDocuments,
	IExtHostDocumentsAndEditors,
} from "vs/workbench/api/common/extHostDocuments";
// Services for text documents and editors.
import {
	ExtensionPaths, // Utility for extension path lookups.
	IExtHostExtensionService, // DI Key for the REAL ExtHostExtensionService.
	IHostUtils, // Service for host utility functions (like clipboard, UI focus).
} from "vs/workbench/api/common/extHostExtensionService";
import { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo"; // Service for file system information.
import {
	IExtHostInitDataService,
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
// Service for initial data from MainThread.
import { IExtHostLanguageFeatures } from "vs/workbench/api/common/extHostLanguageFeatures"; // Service for language features.
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels"; // Service for language models.
import { IExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService"; // Service for localization (NLS).
import { IExtHostManagedSockets } from "vs/workbench/api/common/extHostManagedSockets"; // Service for managed sockets.
import { IExtHostOutputService } from "vs/workbench/api/common/extHostOutput"; // Service for output channels.
import { IExtHostRpcService } from "vs/workbench/api/common/extHostRpcService"; // Service for RPC communication.
import { IExtHostSecretState } from "vs/workbench/api/common/extHostSecretState"; // Service for secret storage.
import { IExtHostStorage } from "vs/workbench/api/common/extHostStorage"; // Service for extension storage (Memento).
import { IExtensionStoragePaths } from "vs/workbench/api/common/extHostStoragePaths"; // Service for storage paths.
import { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry"; // Service for telemetry.
import { IExtHostTerminalService } from "vs/workbench/api/common/extHostTerminalService"; // Service for terminals.
import { IURITransformerService } from "vs/workbench/api/common/extHostUriTransformerService"; // Service for URI transformation.
import { IExtHostWorkspace } from "vs/workbench/api/common/extHostWorkspace"; // Service for workspace information.
import {
	NodeModuleAliasingModuleFactory, // Factory for aliasing Node modules (e.g., 'vscode-textmate').
	NodeRequireInterceptor, // Interceptor for CJS `require()` calls.
	ExtHostExtensionService as RealExtHostExtensionService, // The real ExtHostExtensionService implementation.
	VSCodeNodeModuleFactory, // Factory for the `require('vscode')` CJS module.
} from "vs/workbench/api/node/extHostExtensionService";
import { IWorkbenchExtensionEnablementService } from "vs/workbench/services/extensionManagement/common/extensionManagement"; // Service for extension enablement state.
import { IExtensionHostKindPicker } from "vs/workbench/services/extensions/common/extensionHostKind"; // Service for picking extension host kind.
import {
	RPCProtocol,
	type IRPCProtocolLogger,
} from "vs/workbench/services/extensions/common/rpcProtocol";

// VS Code's RPC protocol implementation.

import { CancellationTokenRegistry } from "./cancellation-token-registry"; // Registry for managing cancellation tokens.

// --- Cocoon Specific Shim Imports ---
// These are Cocoon's implementations or adaptations of VS Code services and utilities.
import * as bootstrapUtils from "./cocoon-bootstrap"; // Utilities for bootstrapping the Cocoon process.

import {
	CocoonNodeModuleESMInterceptor,
	type CocoonESMInterceptorContext,
} from "./cocoon-esm-interceptor";
// Interceptor for ESM `import` statements.
import ipcApiInstance, {
	type CocoonPrimaryIpc, // Type for Cocoon's primary IPC interface.
	type ConfigurationChangedEventPayload, // Payload type for configuration change events.
	type VineMessage, // Type for messages in the Vine IPC protocol.
	type WorkspaceFoldersChangedEventPayload, // Payload type for workspace folder change events.
} from "./cocoon-ipc";
// Cocoon's IPC implementation.
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
import { ShimFileSystemApi } from "./shims/fs-api-shim"; // Shim for `vscode.workspace.fs`.
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
import { NodeModuleShimFactory as NodeBuiltinsShimFactory } from "./shims/node-module-shim-factory"; // Factory for shimming/blocking Node.js built-ins.
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
// --- VS Code API Namespace Type Import ---
// This imports the module that defines the shape of `import * as vscode from "vscode"`.
// It's used to ensure type consistency for the API factory's return type.
import type * as vscode from "./vscode";
// Re-import key classes and enums from `./vscode` (Cocoon's `vscode` API facade)
// specifically for use within the API factory. This ensures they are the public API versions.
import {
	LogLevel as VscodeApiLogLevelEnumPublic, // Renamed in ./vscode to avoid conflict with platform LogLevel.
	CallHierarchyItem as VscodeCallHierarchyItemPublic,
	CancellationError as VscodeCancellationErrorPublic,
	CancellationToken as VscodeCancellationTokenPublic,
	CancellationTokenSource as VscodeCancellationTokenSourcePublic,
	CodeActionKind as VscodeCodeActionKindPublic,
	CodeAction as VscodeCodeActionPublic,
	CodeLens as VscodeCodeLensPublic,
	Command as VscodeCommandPublic, // This is the interface, not the namespace.
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
	EventEmitter as VscodeEmitterPublic, // VS Code's public Emitter class.
	EndOfLine as VscodeEndOfLinePublic,
	ExtensionKind as VscodeExtensionKindPublic,
	ExtensionMode as VscodeExtensionModePublic,
	FileSystemError as VscodeFileSystemErrorPublic, // Renamed in ./vscode.
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
	// Types for the structure of the `vscode` API object.
	type Commands as VscodeCommandsAPIType,
	type Debug as VscodeDebugAPIType,
	type Env as VscodeEnvAPIType,
	type Extensions as VscodeExtensionsAPIType,
	type Languages as VscodeLanguagesAPIType,
	type Tasks as VscodeTasksAPIType,
	type Window as VscodeWindowAPIType,
	type Workspace as VscodeWorkspaceAPIType,
} from "./vscode";

// --- Local Type Definition for API Factory Context ---
// This combines types from different shims that require context about the calling extension.
// It's used within the API factory to pass consistent source information to shims.
type ApiFactoryExtensionSourceInfo = EnvExtensionSourceInfo &
	MessageExtensionSourceInfo;

// --- Startup Logging & Performance Mark ---
console.log("[Cocoon] Node.js Sidecar Process Starting...");

performance.mark(`code/extHost/willConnectToRenderer`); // Marks the beginning of connection attempt to MainThread.

// --- Module Path Setup for VS Code Internal Dependencies ---
// This section configures Node.js's module resolution to find VS Code's internal modules
// (e.g., 'vs/base/common/uri') which are needed by the real ExtHost services.
const VSCODE_OUT_DIR_ENV_VAR = "VSCODE_OUT_DIR"; // Environment variable to specify VS Code's 'out' directory.
const configuredVsCodeOutDir = process.env[VSCODE_OUT_DIR_ENV_VAR]; // Read from environment.
// Default path if the environment variable is not set. Adjust this if VS Code's structure changes.
const defaultVsCodeOutDir = path.resolve(
	__dirname,
	"../../../Dependency/Microsoft/Dependency/Editor/out",
);

const vsCodeOutDirectory = configuredVsCodeOutDir || defaultVsCodeOutDir; // Use configured path or default.

// Log the determined path for VS Code's 'out' directory.
if (configuredVsCodeOutDir) {
	console.log(
		`[Cocoon] Using VS Code 'out' directory from environment variable ${VSCODE_OUT_DIR_ENV_VAR}: ${vsCodeOutDirectory}`,
	);
} else {
	console.log(
		`[Cocoon] Using default VS Code 'out' directory for internal module resolution: ${vsCodeOutDirectory}`,
	);
}

// Check if the directory exists and attempt to add it to Node's module search paths.
if (fs.existsSync(vsCodeOutDirectory)) {
	if (Array.isArray((module as any).paths)) {
		(module as any).paths.unshift(vsCodeOutDirectory); // Prepend to give it priority.
		console.log(
			"[Cocoon] VS Code 'out' directory successfully prepended to module.paths for CJS resolution.",
		);
	} else {
		// This case should be rare in standard Node.js environments.
		console.warn(
			"[Cocoon] `module.paths` is not an array. Cannot prepend VS Code 'out' directory. Internal module resolution might fail.",
		);
	}
} else {
	// This is a critical failure. Cocoon cannot proceed without VS Code's base modules.
	console.error(
		`[Cocoon] CRITICAL FAILURE: VS Code 'out' directory NOT FOUND at path: ${vsCodeOutDirectory}. ` +
			`This path was derived from ${configuredVsCodeOutDir ? `env var ${VSCODE_OUT_DIR_ENV_VAR}` : "a default location"}. ` +
			`Extensions and core ExtHost services may fail to load their internal dependencies (e.g., 'vs/base/common/uri'). ` +
			`Ensure VS Code dependencies are correctly bundled or linked, or set the ${VSCODE_OUT_DIR_ENV_VAR} environment variable.`,
	);

	process.exit(1); // Terminate the Cocoon process.
}

// --- Global State Variables ---
let cocoonDI: IInstantiationService | null = null; // The main DI container for Cocoon.
let cocoonRpcProtocol: RPCProtocol | null = null; // The RPC protocol instance for communication with Mountain.
const cocoonIpcAdapter = ipcApiInstance.createHostProtocolInterface(); // Adapter for the underlying IPC mechanism.
let initializationFailedOrExited = false; // Flag to track if initialization has failed or if an exit is signaled.

// Patch global `process.exit` early using cocoon-bootstrap utilities.
// This allows controlled exits based on the `initializationFailedOrExited` flag.
bootstrapUtils.patchProcess(() => {
	// The callback determines if an exit is allowed.
	// True means exit is allowed; false means the patched `process.exit` will be a no-op.
	return initializationFailedOrExited;
});

// --- Early URI Revival Function (Pre-DI, Pre-RPC Transformer) ---
// This function is a temporary, simplified URI reviver used ONLY for the raw `initDataFromMountain`
// BEFORE the main RPCProtocol and its full IURITransformerService are set up.
// It handles basic URI DTOs and string paths.
// TODO: The ideal solution is to initialize IURITransformerService earlier to use VS Code's
// standard `revive` function (which leverages the global RPC protocol) for all DTOs.
function reviveUrisInObjectForEarlyInitData(
	// The object (or part of it) to revive URIs in.
	objectToRevive: any,
	// An optional early logger for debugging this revival process.
	earlyLogService?: ILogService,
): any {
	// Base cases: if null, already a URI/Buffer/TokenSource, or not an object, return as is.
	if (
		!objectToRevive ||
		objectToRevive instanceof URI ||
		objectToRevive instanceof VSBuffer ||
		objectToRevive instanceof CancellationTokenSource ||
		typeof objectToRevive !== "object"
	) {
		return objectToRevive;
	}

	// If it's an array, revive each item recursively.
	if (Array.isArray(objectToRevive)) {
		return objectToRevive
			.map((item) =>
				reviveUrisInObjectForEarlyInitData(item, earlyLogService),
			)
			.filter((item) => item !== undefined);
	}

	// Check if the object itself looks like a URI DTO (has scheme, path, and potentially $mid).
	if (
		typeof objectToRevive.scheme === "string" &&
		objectToRevive.path !== undefined &&
		(objectToRevive.$mid === MarshalledId.Uri ||
			objectToRevive.$mid === MarshalledId.UriSimple ||
			!objectToRevive.$mid)
	) {
		try {
			// Attempt to revive using VSCodeInternalURI.revive, which is robust for standard URI DTOs.
			const revivedUri = URI.revive(
				objectToRevive as VSCodeInternalUriComponents,
			);

			// earlyLogService?.trace(`[Cocoon Early Revival] Revived URI DTO: ${JSON.stringify(objectToRevive)} -> ${revivedUri.toString()}`);

			return revivedUri;
		} catch (error: any) {
			earlyLogService?.warn(
				`[Cocoon Early URI Revival] Failed to revive potential URI component: ${JSON.stringify(objectToRevive)}. Error: ${error.message}`,
			);

			// Fall through to property-based revival if direct revival fails but it still looks like a DTO that might contain URIs.
		}
	}

	// If it's a generic object, iterate over its properties and revive them recursively.
	const newObject: { [key: string]: any } = {};

	for (const key in objectToRevive) {
		if (Object.prototype.hasOwnProperty.call(objectToRevive, key)) {
			newObject[key] = reviveUrisInObjectForEarlyInitData(
				objectToRevive[key],
				earlyLogService,
			);
		}
	}
	return newObject;
}

// --- Define DI Service Identifiers for Cocoon-specific or Granular Shims ---
// These are used to register and retrieve shims from the DI container.
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
	createDecorator<IExtHostExtensionsShape>("extHostExtensions"); // For `vscode.extensions` API
export const IExtHostDebugService = createDecorator<IExtHostDebugServiceShape>(
	"extHostDebugService",
); // For `vscode.debug` API
export const IExtHostTaskService =
	createDecorator<IExtHostTaskServiceShape>("extHostTaskService"); // For `vscode.tasks` API
export const IExtHostWindowParts =
	createDecorator<IExtHostWindowPartsServiceShape>("extHostWindowParts"); // For miscellaneous `vscode.window` parts
export const ICocoonExtHostProposedApis =
	createDecorator<CocoonIExtHostProposedApis>("cocoonExtHostProposedApis"); // For proposed APIs
export const ICancellationTokenRegistry =
	createDecorator<CancellationTokenRegistry>("cancellationTokenRegistry"); // DI Key for CancellationTokenRegistry

// --- Main Initialization Function for Cocoon Extension Host ---
// This function orchestrates the entire setup of the Cocoon extension host environment.
async function initializeCocoonHost(
	// Raw initialization data received from the Mountain host process.
	// This data will be revived before full use.
	rawInitDataFromMountain: any,
): Promise<void> {
	console.log("[Cocoon] Initializing Cocoon Extension Host Environment...");

	performance.mark(`code/extHost/didWaitForInitData`); // Mark completion of waiting for init data.

	// If initialization has already failed or an exit is signaled, skip.
	if (initializationFailedOrExited) {
		console.warn(
			"[Cocoon] Initialization skipped: Cocoon host has already failed or received an exit signal.",
		);

		return;
	}

	let logService: ILogService | undefined; // To be initialized and used for logging.
	// let cancellationTokenRegistry: CancellationTokenRegistry | undefined; // Declared if instantiated directly here.

	try {
		// --- Step 1: Setup Early URI Transformer & RPC Protocol ---
		// Initialize the URI Transformer Service. For local MVP, if `remote.authority` is undefined,
		// it often acts as a NO-OP transformer. However, it's essential for the RPCProtocol.
		const uriTransformerServiceInstance = new ShimUriTransformerService(
			rawInitDataFromMountain?.remote?.authority, // Pass remote authority if available in early init data.
		);

		// Optional logger for verbose RPC debugging. Set to `null` for no RPC logging.
		const rpcLogger: IRPCProtocolLogger | null = null;

		console.log(
			"[Cocoon] Creating final RPCProtocol instance with configured URI transformer...",
		);

		// Create the RPCProtocol instance using Cocoon's IPC adapter and the URI transformer.
		cocoonRpcProtocol = new RPCProtocol(
			cocoonIpcAdapter!, // Non-null assertion: adapter must be created by this point.
			rpcLogger,
			uriTransformerServiceInstance, // Pass the IURITransformer instance.
		);

		// Make the RPCProtocol instance globally available (as `__ラクマ_RPC_PROTOCOL__`).
		// This is how VS Code's `revive` function (from `vs/base/common/marshalling`)
		// finds the URI transformer when `MarshalledId.Uri` is encountered in DTOs.
		(globalThis as any).__COC_RPC_PROTOCOL__ = cocoonRpcProtocol;

		console.log(
			"[Cocoon] RPCProtocol instance created and set globally for URI revival during DTO unmarshalling.",
		);

		// --- Step 2: Full InitData Revival using RPCProtocol's Transformer ---
		console.log(
			"[Cocoon] Reviving URIs in raw initData from Mountain using global RPCProtocol's transformer...",
		);

		// Now that the global RPC protocol (and its transformer) is set, use VS Code's standard `revive`
		// to fully unmarshal the `initDataFromMountain`, correctly handling all URI components.
		const revivedFullyInitData = revive(
			rawInitDataFromMountain,
		) as ExtHostInitData;

		console.log(
			`[Cocoon] InitData URIs fully revived. Example - Logs Location: ${revivedFullyInitData.logsLocation.toString()}. ` +
				`Workspace: ${revivedFullyInitData.workspace?.id ?? "none"}`,
		);

		// --- Step 3: Setup Dependency Injection (DI) ServiceCollection ---
		console.log(
			"[Cocoon] Setting up ServiceCollection and registering core services and shims...",
		);

		const services = new ServiceCollection(); // Collection to hold service registrations.

		// Determine the final log level from the (now fully revived) initData.
		const finalLogLevel = revivedFullyInitData.logLevel
			? (parseLogLevel(revivedFullyInitData.logLevel) ?? LogLevel.Info)
			: LogLevel.Info;

		logService = new ShimLogService(finalLogLevel, "CocoonMainLog"); // Main logger for Cocoon.
		services.set(ILogService, logService); // Register ILogService.
		services.set(ILoggerService, new ShimLoggerService(logService)); // Register ILoggerService (factory for named loggers).
		logService.info(
			`[Cocoon] Main LogService initialized. Logging Level: ${LogLevel[finalLogLevel]}.`,
		);

		// Instantiate CancellationTokenRegistry and register it for DI.
		// This registry will be injected into services like ShimLanguageFeatures.
		const cancellationTokenRegistryInstance = new CancellationTokenRegistry(
			logService,
		);

		services.set(
			ICancellationTokenRegistry,
			cancellationTokenRegistryInstance,
		);

		logService.info(
			"[Cocoon] CancellationTokenRegistry initialized and registered for DI.",
		);

		// Register core ExtHost services with their DI keys.
		const initDataServiceInstance = {
			_serviceBrand: undefined,
			value: revivedFullyInitData,
		};

		services.set(IExtHostInitDataService, initDataServiceInstance); // Provides access to ExtHostInitData.
		services.set(IExtHostRpcService, cocoonRpcProtocol); // Provides access to the RPC protocol.
		services.set(IURITransformerService, uriTransformerServiceInstance); // Provides URI transformation.
		const fileSystemInfoService = new ShimExtHostFileSystemInfo(
			cocoonRpcProtocol,
			logService,
		);

		services.set(IExtHostFileSystemInfo, fileSystemInfoService); // Provides file system scheme info.

		// Register shims for storage-related services.
		// ShimExtHostStorage and ShimExtHostSecretState are often factories/contextual,
		// used by ExtHostExtensionService to create per-extension Memento/SecretStorage.
		// Registering them here makes their DI types available if needed by other services,
		// and allows the real ExtHostExtensionService to potentially retrieve them if it expects these specific types.
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
		); // Placeholder for global context.

		// Register other essential shims.
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

		// Create the main DI container (InstantiationService).
		cocoonDI = new InstantiationService(
			services,
			true /* strict mode: true */,
		);

		logService.info(
			"[Cocoon] InstantiationService created with initial services.",
		);

		// --- Step 4: Instantiate and Register Shims that Require DI or Are Central ---
		// These shims might have dependencies that need to be resolved by `cocoonDI`.

		// HostUtils: Provides utility functions (e.g., clipboard, focus).
		// Constructor: rpcProtocol, logService, instantiationService.
		const hostUtilsInstance = new ShimHostUtils(
			cocoonRpcProtocol,
			logService,
			cocoonDI,
		);

		cocoonDI.set(IHostUtils, hostUtilsInstance);

		// ExtensionStoragePaths: Provides paths for extension storage.
		// Constructor: rpc(opt), environment, log, instantiationService.
		const extensionStoragePathsInstance = new ShimExtensionStoragePaths(
			undefined,
			revivedFullyInitData.environment,
			logService,
			cocoonDI,
		);

		cocoonDI.set(IExtensionStoragePaths, extensionStoragePathsInstance);

		// DocumentService: Manages text documents.
		// Constructor: rpcProtocol, logService, instantiationService (for events).
		const documentServiceInstance = cocoonDI.createInstance(
			CocoonDocumentService,
		);

		cocoonDI.set(IExtHostDocuments, documentServiceInstance); // For `vscode.workspace.textDocuments`, `onDidOpenTextDocument`, etc.
		cocoonDI.set(
			IExtHostDocumentsAndEditors,
			documentServiceInstance as any,
		); // Cast if it fully implements both interfaces.

		// FileSystem API Shim (`vscode.workspace.fs`).
		// Constructor: logService, fileSystemInfoService.
		const fsApiShimInstance = cocoonDI.createInstance(
			ShimFileSystemApi,
			fileSystemInfoService,
		);

		// Register granular UI/Env shims with DI.
		cocoonDI.set(
			IExtHostMessageService,
			cocoonDI.createInstance(ShimExtHostMessageService),
		); // For `vscode.window.showXMessage`.
		cocoonDI.set(
			IExtHostQuickInput,
			cocoonDI.createInstance(ShimExtHostQuickInputService),
		); // For `vscode.window.showQuickPick`, `showInputBox`.
		cocoonDI.set(
			IExtHostDialogs,
			cocoonDI.createInstance(ShimExtHostDialogService),
		); // For `vscode.window.showOpenDialog`, `showSaveDialog`.
		const clipboardServiceInstance = cocoonDI.createInstance(
			ShimExtHostClipboardService,
		); // For `vscode.env.clipboard`.
		cocoonDI.set(IExtHostClipboard, clipboardServiceInstance);

		// EnvService: Provides environment information (`vscode.env`).
		// Constructor: rpcService, logService, initDataService, clipboardService.
		const envServiceInstance = new ShimExtHostEnvService(
			cocoonRpcProtocol,
			logService,
			initDataServiceInstance,
			clipboardServiceInstance,
		);

		cocoonDI.set(IExtHostEnv, envServiceInstance);

		cocoonDI.set(
			IExtHostWindowParts,
			cocoonDI.createInstance(ShimExtHostWindowPartsService),
		); // For status bar, tree views, etc.

		// WorkspaceService: Provides workspace information (`vscode.workspace`).
		// Constructor needs: rpc, initDataService, fsInfo, log, docs, fsApi, instantiationService.
		const workspaceShimInstance = new ShimExtHostWorkspace(
			cocoonRpcProtocol,
			initDataServiceInstance,
			fileSystemInfoService,
			logService,
			documentServiceInstance,
			fsApiShimInstance,
			cocoonDI,
		);

		cocoonDI.set(IExtHostWorkspace, workspaceShimInstance);

		// ConfigurationService: Provides access to configuration (`vscode.workspace.getConfiguration`).
		// Constructor needs: rpc, initialConfiguration, logService.
		const configServiceInstance = new ShimExtHostConfiguration(
			cocoonRpcProtocol,
			revivedFullyInitData.configuration,
			logService,
		);

		cocoonDI.set(IExtHostConfiguration, configServiceInstance);

		// Register other functional shims.
		cocoonDI.set(
			IExtHostCommands,
			cocoonDI.createInstance(
				ShimExtHostCommands,
				cocoonDI.get(IExtHostTelemetry),
			),
		); // Pass IExtHostTelemetry.
		cocoonDI.set(
			IExtHostOutputService,
			cocoonDI.createInstance(ShimOutputService),
		); // For `vscode.window.createOutputChannel`.
		cocoonDI.set(
			IExtHostDiagnostics,
			cocoonDI.createInstance(ShimDiagnosticsService),
		); // For `vscode.languages.createDiagnosticCollection`.
		cocoonDI.set(
			IExtHostTerminalService,
			cocoonDI.createInstance(ShimExtHostTerminalService),
		); // For `vscode.window.createTerminal`.
		cocoonDI.set(
			IExtHostAuthentication,
			cocoonDI.createInstance(ShimExtHostAuthentication),
		); // For `vscode.authentication`.
		cocoonDI.set(
			IExtHostLanguageModels,
			cocoonDI.createInstance(
				ShimExtHostLanguageModels,
				cocoonDI.get(IExtHostAuthentication),
			),
		); // For `vscode.lm`.
		// LanguageFeaturesService: Manages language feature providers (`vscode.languages.register*Provider`).
		// Constructor needs: rpc, log, docs, cancellationTokenRegistry.
		cocoonDI.set(
			IExtHostLanguageFeatures,
			cocoonDI.createInstance(
				ShimLanguageFeatures,
				documentServiceInstance,
				cancellationTokenRegistryInstance,
			),
		);

		// --- Step 5: Register the REAL ExtHostExtensionService ---
		// This is crucial for actual extension loading and lifecycle management.
		// It's registered using a SyncDescriptor, which tells the DI container how to instantiate it.
		// Parameters for RealExtHostExtensionService constructor:
		// [isInitialProbed, rpc, instantiationService, ...other optional services via DI]
		cocoonDI.set(
			IExtHostExtensionService,
			new SyncDescriptor(RealExtHostExtensionService, [
				false, // `isInitialProbed` - false for normal Cocoon startup.
				ipcApiInstance as CocoonPrimaryIpc, // Pass Cocoon's IPC implementation.
				cocoonDI, // Pass the IInstantiationService instance itself.
			]),
		);

		logService.info(
			"[Cocoon] Real IExtHostExtensionService registered with DI using SyncDescriptor.",
		);

		// Register shims that depend on IExtHostExtensionService (e.g., for getting extension info).
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
		); // For `vscode.extensions` API.

		// Register remaining shims and standard VS Code services.
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
		); // For proposed APIs.
		cocoonDI.set(
			IExtHostDebugService,
			cocoonDI.createInstance(ShimExtHostDebugService),
		); // For `vscode.debug` API.
		cocoonDI.set(
			IExtHostTaskService,
			cocoonDI.createInstance(ShimExtHostTaskService),
		); // For `vscode.tasks` API.

		// Register any other singleton services from VS Code's platform layer that might be needed
		// by other platform code or the real ExtHostExtensionService.
		for (const [
			serviceIdentifier,
			serviceDescriptor,
		] of getSingletonServiceDescriptors()) {
			if (!cocoonDI.has(serviceIdentifier)) {
				// Only register if not already provided by Cocoon.
				cocoonDI.set(serviceIdentifier, serviceDescriptor);
			}
		}
		logService.info(
			"[Cocoon] Standard VS Code singleton services registered if not already present.",
		);

		// --- Step 6: Prepare API Factory Provider ---
		// This factory will create the `vscode` API object for each extension.
		const extHostExtensionService = cocoonDI.get(IExtHostExtensionService); // Get the real service instance.
		const extHostConfigService = cocoonDI.get(IExtHostConfiguration); // Get the config shim.

		performance.mark("code/extHost/willWaitForConfigAndPaths");

		// Fetch necessary data for the API factory (extension paths, config provider, registries).
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

		// Pre-resolved extension registries for the API factory.
		const preResolvedExtensionRegistries: IExtensionRegistries = {
			mine: localExtensionRegistry,
			all: globalExtensionRegistry,
		};

		logService.info(
			"[Cocoon] Preparing API Factory Provider by augmenting VS Code's original factory...",
		);

		// Create the API factory provider using `cocoonDI.invokeFunction` to resolve `accessor`.
		const apiFactoryProvider =
			cocoonDI.invokeFunction<IExtensionApiFactory>((accessor) => {
				// Get VS Code's original API factory.
				const originalVSCodeApiFactory =
					createVSCodeApiFactoryOriginal(accessor);

				// Return the augmented factory function.
				return (
					// Description of the extension for which the API is being created, or URI for ESM imports.
					extensionDescriptionOrUri:
						| IRelaxedExtensionDescription
						| URI,
					// Optional override for extension registries.
					extensionRegistriesOverride?: IExtensionRegistries,
					// Optional override for config provider.
					configProviderOverride?: ExtHostConfigProvider,
				): typeof import("vscode") => {
					// Returns the `vscode` API object.
					let actualExtensionDescription: IRelaxedExtensionDescription =
						nullExtensionDescription as any;

					const finalExtensionRegistriesToUse =
						extensionRegistriesOverride ||
						preResolvedExtensionRegistries;

					const finalConfigProviderToUse =
						configProviderOverride || configProvider;

					// Determine the extension description.
					if (extensionDescriptionOrUri instanceof URI) {
						// If a URI is provided (typically for ESM imports), find the extension description.
						const parentModuleUri = extensionDescriptionOrUri;

						const foundExtension =
							extensionPaths.findSubstr(parentModuleUri);

						if (foundExtension) {
							actualExtensionDescription = foundExtension;
						} else {
							logService?.warn(
								`[Cocoon API Factory] Could not identify extension for ESM import from URI: ${parentModuleUri.toString()}. ` +
									`Using nullExtensionDescription, which may limit API access or cause issues.`,
							);
						}
					} else if (extensionDescriptionOrUri) {
						// If an extension description object is provided directly.
						actualExtensionDescription = extensionDescriptionOrUri;
					}

					// Create the base `vscode` API object using VS Code's original factory.
					const vscodeApiBaseObject = originalVSCodeApiFactory(
						actualExtensionDescription,
						finalExtensionRegistriesToUse,
						finalConfigProviderToUse,
					);

					// Prepare source information for shims that need the calling extension's identity.
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

					// Retrieve shim instances from DI to override/augment parts of the `vscode` API.
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

					const windowPartsServiceShim = accessor.get(
						IExtHostWindowPartsService,
					);

					const terminalServiceShim = accessor.get(
						IExtHostTerminalService,
					);

					// Construct the final, complete `vscode` API object for the extension.
					const completeVscodeApiObject = {
						...vscodeApiBaseObject, // Start with VS Code's base API object.

						// Override `vscode.commands` with Cocoon's shim.
						commands: accessor.get(
							IExtHostCommands,
						) as VscodeCommandsAPIType,
						// Override `vscode.workspace` with Cocoon's shim (which includes `.fs`).
						workspace: accessor.get(
							IExtHostWorkspace,
						) as VscodeWorkspaceAPIType,

						// Override `vscode.languages` namespace.
						languages: {
							...(vscodeApiBaseObject.languages || {}), // Include any base language properties.
							// Bind provider registration methods to the LanguageFeatures shim instance,
							// and pass the current extension's identifier for context.
							registerHoverProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.HoverProvider,
							) =>
								languageFeaturesServiceShim.$registerHoverProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerCompletionItemProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.CompletionItemProvider,
								...triggerChars: string[]
							) =>
								languageFeaturesServiceShim.$registerCompletionItemProvider(
									selector,
									provider,
									triggerChars,
									actualExtensionDescription.identifier,
								),
							registerDefinitionProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.DefinitionProvider,
							) =>
								languageFeaturesServiceShim.$registerDefinitionProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerCodeActionsProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.CodeActionProvider,
								metadata?: vscode.CodeActionProviderMetadata,
							) =>
								languageFeaturesServiceShim.$registerCodeActionProvider(
									selector,
									provider,
									metadata,
									actualExtensionDescription.identifier,
								),
							registerCodeLensProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.CodeLensProvider,
							) =>
								languageFeaturesServiceShim.$registerCodeLensProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerDeclarationProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.DeclarationProvider,
							) =>
								languageFeaturesServiceShim.$registerDeclarationProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerDocumentFormattingEditProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.DocumentFormattingEditProvider,
							) =>
								languageFeaturesServiceShim.$registerDocumentFormattingEditProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerDocumentHighlightProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.DocumentHighlightProvider,
							) =>
								languageFeaturesServiceShim.$registerDocumentHighlightProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerDocumentLinkProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.DocumentLinkProvider,
							) =>
								languageFeaturesServiceShim.$registerDocumentLinkProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerDocumentRangeFormattingEditProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.DocumentRangeFormattingEditProvider,
							) =>
								languageFeaturesServiceShim.$registerDocumentRangeFormattingEditProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerOnTypeFormattingEditProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.OnTypeFormattingEditProvider,
								firstTriggerCharacter: string,
								...moreTriggerCharacters: string[]
							) =>
								languageFeaturesServiceShim.$registerOnTypeFormattingEditProvider(
									selector,
									provider,
									[
										firstTriggerCharacter,
										...moreTriggerCharacters,
									],
									undefined /* options */,
									actualExtensionDescription.identifier,
								),
							registerReferenceProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.ReferenceProvider,
							) =>
								languageFeaturesServiceShim.$registerReferenceProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerRenameProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.RenameProvider,
							) =>
								languageFeaturesServiceShim.$registerRenameProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerSignatureHelpProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.SignatureHelpProvider,
								metadata?:
									| vscode.SignatureHelpProviderMetadata
									| string[],
							) =>
								languageFeaturesServiceShim.$registerSignatureHelpProvider(
									selector,
									provider,
									metadata,
									actualExtensionDescription.identifier,
								),
							registerImplementationProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.ImplementationProvider,
							) =>
								languageFeaturesServiceShim.$registerImplementationProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerTypeDefinitionProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.TypeDefinitionProvider,
							) =>
								languageFeaturesServiceShim.$registerTypeDefinitionProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerWorkspaceSymbolProvider: (
								provider: vscode.WorkspaceSymbolProvider, // No selector for workspace symbols.
							) =>
								languageFeaturesServiceShim.$registerWorkspaceSymbolProvider(
									provider,
									actualExtensionDescription.identifier,
								),
							registerSelectionRangeProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.SelectionRangeProvider,
							) =>
								languageFeaturesServiceShim.$registerSelectionRangeProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerCallHierarchyProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.CallHierarchyProvider,
							) =>
								languageFeaturesServiceShim.$registerCallHierarchyProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerTypeHierarchyProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.TypeHierarchyProvider,
							) =>
								languageFeaturesServiceShim.$registerTypeHierarchyProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerLinkedEditingRangeProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.LinkedEditingRangeProvider,
							) =>
								languageFeaturesServiceShim.$registerLinkedEditingRangeProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerInlayHintsProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.InlayHintsProvider,
							) =>
								languageFeaturesServiceShim.$registerInlayHintsProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerDocumentColorProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.DocumentColorProvider,
							) =>
								languageFeaturesServiceShim.$registerDocumentColorProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),
							registerFoldingRangeProvider: (
								selector: vscode.DocumentSelector,
								provider: vscode.FoldingRangeProvider,
							) =>
								languageFeaturesServiceShim.$registerFoldingRangeProvider(
									selector,
									provider,
									actualExtensionDescription.identifier,
								),

							// Other language utilities.
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
							// Diagnostics related APIs.
							createDiagnosticCollection: (name?: string) =>
								diagnosticsServiceShim.createDiagnosticCollection(
									name,
								), // ExtId is handled by the service.
							get onDidChangeDiagnostics() {
								return diagnosticsServiceShim.onDidChangeDiagnostics;
							},
							// Language status related APIs.
							setLanguageStatus:
								languageFeaturesServiceShim.setLanguageStatus.bind(
									languageFeaturesServiceShim,
								), // Needs extId if service method requires it.
							createLanguageStatusItem:
								languageFeaturesServiceShim.createLanguageStatusItem.bind(
									languageFeaturesServiceShim,
								), // Needs extId.
						} as VscodeLanguagesAPIType,

						// Override `vscode.window` namespace.
						window: {
							...(vscodeApiBaseObject.window || {}), // Include any base window properties.
							// Message display methods, passing sourceInfo for context.
							showInformationMessage: (
								message: string,
								...rawUserArguments: Array<
									| vscode.MessageOptions
									| string
									| vscode.MessageItem
								>
							) => {
								const optionsArgument =
									rawUserArguments.length > 0 &&
									typeof rawUserArguments[0] === "object" &&
									rawUserArguments[0] !== null &&
									!(rawUserArguments[0] as vscode.MessageItem)
										.title &&
									!(
										rawUserArguments[0] as ApiFactoryExtensionSourceInfo
									)?.id
										? (rawUserArguments.shift() as vscode.MessageOptions)
										: {};

								return messageServiceShim.showInformationMessage(
									message,
									optionsArgument,
									extensionSourceInfo,
									...(rawUserArguments as Array<
										string | vscode.MessageItem
									>),
								);
							},
							showWarningMessage: (
								message: string,
								...rawUserArguments: Array<
									| vscode.MessageOptions
									| string
									| vscode.MessageItem
								>
							) => {
								const optionsArgument =
									rawUserArguments.length > 0 &&
									typeof rawUserArguments[0] === "object" &&
									rawUserArguments[0] !== null &&
									!(rawUserArguments[0] as vscode.MessageItem)
										.title &&
									!(
										rawUserArguments[0] as ApiFactoryExtensionSourceInfo
									)?.id
										? (rawUserArguments.shift() as vscode.MessageOptions)
										: {};

								return messageServiceShim.showWarningMessage(
									message,
									optionsArgument,
									extensionSourceInfo,
									...(rawUserArguments as Array<
										string | vscode.MessageItem
									>),
								);
							},
							showErrorMessage: (
								message: string,
								...rawUserArguments: Array<
									| vscode.MessageOptions
									| string
									| vscode.MessageItem
								>
							) => {
								const optionsArgument =
									rawUserArguments.length > 0 &&
									typeof rawUserArguments[0] === "object" &&
									rawUserArguments[0] !== null &&
									!(rawUserArguments[0] as vscode.MessageItem)
										.title &&
									!(
										rawUserArguments[0] as ApiFactoryExtensionSourceInfo
									)?.id
										? (rawUserArguments.shift() as vscode.MessageOptions)
										: {};

								return messageServiceShim.showErrorMessage(
									message,
									optionsArgument,
									extensionSourceInfo,
									...(rawUserArguments as Array<
										string | vscode.MessageItem
									>),
								);
							},
							// QuickInput, Dialogs.
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
							// OutputChannel, passing extension identifier.
							createOutputChannel: (
								name: string,
								optionsOrLanguageId?: bootstrapUtils.CreateOutputChannelOptions, // `bootstrapUtils.CreateOutputChannelOptions` might need to be `string | { log: boolean }` from `vscode` namespace for `options`.
							) =>
								outputServiceShim.createOutputChannel(
									name,
									optionsOrLanguageId as any,
									actualExtensionDescription.identifier,
								), // Pass extensionId.
							// Terminals.
							createTerminal: accessor
								.get(IExtHostTerminalService)
								.createTerminal.bind(
									terminalServiceShim,
								) as any, // ExtId might be implicit in options for PTY.
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
							// Other window parts (status bar, tree views, webviews, URI handlers).
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

						// Other top-level API namespaces.
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

						// --- Re-export core VS Code API classes and enums from `./vscode` ---
						// This ensures extensions get the correct, publicly defined types.
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

					// Return the fully constructed and shimmed `vscode` API object.
					return completeVscodeApiObject as typeof import("vscode");
				};
			});

		logService.info("[Cocoon] API Factory Provider configured and ready.");

		// --- Step 7: Setup CJS NodeRequireInterceptor ---
		logService.info("[Cocoon] Setting up CJS NodeRequireInterceptor...");

		// Create the interceptor instance, providing the API factory and context.
		const cjsModuleInterceptor = cocoonDI.createInstance(
			NodeRequireInterceptor,
			apiFactoryProvider,
			{
				extensionRegistry: () => preResolvedExtensionRegistries,
				extensionPaths: () => extensionPaths,
				configProvider: () => finalConfigProviderToUse, // Use the one from API factory context
			},
		);

		// Register the factory for `require('vscode')`.
		cjsModuleInterceptor.register(
			new VSCodeNodeModuleFactory(
				apiFactoryProvider,
				extensionPaths,
				preResolvedExtensionRegistries,
				finalConfigProviderToUse,
				logService!,
			),
		);

		// Register factory for aliased Node modules.
		cjsModuleInterceptor.register(
			cocoonDI.createInstance(NodeModuleAliasingModuleFactory),
		);

		// Register factory for shimming/blocking Node.js built-ins (handles 'os', 'crypto', blocks 'fs', etc.).
		cjsModuleInterceptor.register(new NodeBuiltinsShimFactory());

		logService.info("[Cocoon] Installing CJS NodeRequireInterceptor...");

		await cjsModuleInterceptor.install(); // Install the interceptor.
		logService.info(
			"[Cocoon] CJS NodeRequireInterceptor installed successfully.",
		);

		// --- Step 8: Setup ESM Interceptor ---
		logService.info(
			"[Cocoon] Setting up ESM Interceptor for 'import vscode'...",
		);

		const esmInterceptorContext: CocoonESMInterceptorContext = {
			apiFactory: apiFactoryProvider,
		};

		const esmModuleInterceptor = cocoonDI.createInstance(
			CocoonNodeModuleESMInterceptor,
			esmInterceptorContext,
		);

		await esmModuleInterceptor.install(); // Registers Node.js loader hook for ESM.
		logService.info("[Cocoon] ESM Interceptor installed successfully.");

		// --- Step 9: Install Global Error Handlers ---
		logService.info("[Cocoon] Installing global error handlers...");

		const errorHandlerInstance = cocoonDI.createInstance(ErrorHandler);

		// Install early handler for errors during DI instantiation or very early init.
		ErrorHandler.installEarlyHandler(errorHandlerInstance, cocoonDI);

		// Listen for uncaught exceptions and unhandled promise rejections.
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

		logService.info(
			"[Cocoon] Global error handlers (uncaughtException, unhandledRejection) installed.",
		);

		// --- Step 10: Initialize the Real ExtHostExtensionService ---
		// This is the point where extensions are actually loaded and activated.
		logService.info(
			"[Cocoon] Initializing real ExtHostExtensionService (this will load and activate extensions)...",
		);

		await extHostExtensionService.initialize();

		logService.info(
			"[Cocoon] Real ExtHostExtensionService initialized successfully. Extensions are being activated.",
		);

		// Signal that NLS (National Language Support) bundles for initially activated extensions can now be processed.
		// The localization service might queue NLS requests until this signal.
		localizationServiceInstance.signalLocalizationInitialized();

		logService.info(
			"[Cocoon] Signaled localization service that NLS initialization can proceed for activated extensions.",
		);

		// Upgrade the error handler to its full capabilities now that more services are available.
		ErrorHandler.installFullHandler(errorHandlerInstance, cocoonDI);

		logService.info("[Cocoon] Full ErrorHandler capabilities installed.");

		// --- Step 11: Signal Mountain that Initialization is Complete ---
		console.log(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);

		logService.info(
			"[Cocoon] Cocoon Extension Host Environment Initialized Successfully.",
		);

		// Send notification to Mountain.
		ipcApiInstance.sendNotificationToMountain("extHostInitialized", {});
	} catch (hostInitializationError: any) {
		// --- Fatal Error Handling during Initialization ---
		initializationFailedOrExited = true; // Allow process.exit if bootstrap patch is active.
		const finalError =
			hostInitializationError instanceof Error
				? hostInitializationError
				: new Error(String(hostInitializationError));

		const errorMessageToLogAndSend =
			`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n` +
			`[Cocoon] FATAL ERROR: Failed to initialize Cocoon Extension Host Environment:\n` +
			`Message: ${finalError.message}\n` +
			`Stack: ${finalError.stack || "No stack available"}\n` +
			`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`;

		console.error(errorMessageToLogAndSend); // Log to stderr.
		logService?.error(
			"[Cocoon] FATAL ERROR during Cocoon initialization:",
			finalError,
		); // Log using ShimLogService if available.

		// Attempt to send the error details to Mountain.
		try {
			ipcApiInstance.sendNotificationToMountain("extHostError", {
				message: `Cocoon initialization failed catastrophically: ${finalError.message}`,
				stack: finalError.stack,
				name: finalError.name,
			});
		} catch (errorSendingNotification: any) {
			console.error(
				"[Cocoon] Additionally, failed to send the fatal initialization error notification to Mountain:",
				errorSendingNotification,
			);
		}
		process.exit(1); // Terminate the Cocoon process with an error code.
	}
}

// --- Main IPC Message Listener & Readiness Signal ---
let isInitializationStarted = false; // Flag to prevent re-initialization.
console.log(
	"[Cocoon] Setting up main IPC message listener for 'initExtensionHost' command from Mountain...",
);

// Listen for messages from the Mountain host process.
ipcApiInstance.onMessageFromMountain((ipcMessage: VineMessage) => {
	// Allow `rpcData` (part of ongoing RPC communication) and notifications (method starting with '$')
	// to pass through even after initialization has started.
	if (
		isInitializationStarted &&
		ipcMessage.method !== "rpcData" &&
		ipcMessage.msg_type !== 6 /* Notification (Vine specific) */
	) {
		// console.debug(
		// 	`[Cocoon] IPC message received after init started. Method: ${ipcMessage?.method}. Type: ${ipcMessage?.msg_type}. ` +
		// 	`Ignoring if not rpcData or notification.`
		// );

		return; // Ignore other messages if init already started.
	}

	// Check for the 'initExtensionHost' command from Mountain.
	if (
		ipcMessage?.msg_type === 1 /* Request (Vine specific) */ &&
		ipcMessage.method === "initExtensionHost" &&
		ipcMessage.params
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

		isInitializationStarted = true; // Set flag to prevent re-entry.

		// Use a temporary, basic logger for the initial data revival if the main one isn't up yet.
		const earlyLogServiceForRevival = new ShimLogService(
			LogLevel.Info,
			"CocoonEarlyInitDataReviver",
		);

		earlyLogServiceForRevival.info(
			"[Cocoon] Attempting to revive URIs in raw initData from Mountain (pre-DI phase)...",
		);

		// Perform early URI revival on the parameters.
		const revivedParametersForEarlyStage =
			reviveUrisInObjectForEarlyInitData(
				ipcMessage.params,
				earlyLogServiceForRevival,
			);

		earlyLogServiceForRevival.info(
			"[Cocoon] Preliminary initData URI revival attempt complete. Proceeding with full host initialization.",
		);

		// Start the main initialization process with the (partially) revived parameters.
		initializeCocoonHost(revivedParametersForEarlyStage).catch(
			(unhandledErrorInAsyncInit: any) => {
				// This catch block is a safety net for unhandled promise rejections from `initializeCocoonHost` itself.
				if (!initializationFailedOrExited) {
					// Check flag to avoid redundant error handling.
					initializationFailedOrExited = true;

					const finalError =
						unhandledErrorInAsyncInit instanceof Error
							? unhandledErrorInAsyncInit
							: new Error(String(unhandledErrorInAsyncInit));

					const errorMessageToLogAndSend =
						`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n` +
						`[Cocoon] CATASTROPHIC UNHANDLED ERROR during async initializeCocoonHost execution:\n` +
						`Message: ${finalError.message}\n` +
						`Stack: ${finalError.stack || "No stack available"}\n` +
						`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`;

					console.error(errorMessageToLogAndSend);

					// Attempt to send error to Mountain.
					try {
						ipcApiInstance.sendNotificationToMountain(
							"extHostError",
							{
								message: `Cocoon async initialization catastrophically failed (unhandled): ${finalError.message}`,
								stack: finalError.stack,
								name: finalError.name,
							},
						);
					} catch (errorSendingNotification: any) {
						console.error(
							"[Cocoon] Additionally, failed to send the catastrophic async init error notification to Mountain:",
							errorSendingNotification,
						);
					}
					process.exit(1); // Terminate due to unrecoverable error.
				}
			},
		);
	} else if (
		ipcMessage &&
		ipcMessage.msg_type !== 6 /* Notification */ &&
		ipcMessage.method !== "rpcData" &&
		!isInitializationStarted
	) {
		// Log a warning for unexpected messages received before initialization.
		console.warn(
			`[Cocoon] Unexpected IPC message received before 'initExtensionHost' command. This might indicate an issue with the host (Mountain) communication sequence or an unexpected early message. ` +
				`Method='${ipcMessage?.method}', Type=${ipcMessage?.msg_type}. Discarding.`,
		);
	}
});

// Send a notification to Mountain indicating that the Cocoon sidecar is ready for initialization.
ipcApiInstance.sendNotificationToMountain("extHostReadyForInit", {});

console.log(
	"[Cocoon] Cocoon sidecar process is ready and waiting for the 'initExtensionHost' command from Mountain.",
);
