/*
 * File: Cocoon/Source/Shim/LanguageFeatures.ts
 * Responsibility: Implements the VS Code language features interface to manage IntelliSense, formatting, and navigation providers, enabling seamless integration of VS Code extensions within the Land editor by bridging extension API calls to the native backend.
 * Modified: 2025-06-07 00:57:41 UTC
 * Dependency: ../cancellation-token-registry, ../cocoon-type-converters, ../index, ./commands-shim, ./document-shim, vs/base/common/cancellation, vs/base/common/uuid, vs/platform/log/common/log, vscode
 * Export: ShimLanguageFeatures
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Language Features Shim
 * --------------------------------------------------------------------------------------------
 * This file implements the `VscodeExtHostLanguageFeaturesShape` interface, which is defined
 * in `extHost.protocol.ts`. This class acts as the counterpart on the Extension Host side
 * for managing language feature providers that are contributed by VS Code extensions.
 *
 * The service implemented here is crucial for enabling a wide variety of advanced editor
 * functionalities. These include, but are not limited to:
 * - IntelliSense features: Such as displaying hovers with information, providing completion items.
 * - Code Navigation: Facilitating "Go to Definition", "Find All References", etc.
 * - Code Actions and Refactorings: Offering quick fixes, refactorings, and source actions.
 * - Formatting: Enabling document and selection formatting.
 * - Outlining and Symbol Discovery: Providing document symbol lists and workspace symbol search.
 * - And many other language-specific features like signature help, color picking, etc.
 *
 * It primarily serves two roles:
 * 1. A registry for various language provider types (e.g., `HoverProvider`,
 *    `CompletionItemProvider`, `DefinitionProvider`). Extensions register their
 *    provider implementations through the `vscode.languages` API.
 * 2. An RPC (Remote Procedure Call) endpoint. The MainThread (referred to as Mountain,
 *    representing the renderer/UI side) can invoke methods on this service to execute
 *    the registered providers to obtain language-specific information or to perform actions.
 *
 * Core Responsibilities:
 * - Provider Registration (methods typically invoked by `ShimLanguages`, which is the
 *   shim for the `vscode.languages` API):
 *   - This class provides a comprehensive suite of `$register*Provider` methods (e.g.,
 *     `$registerHoverProvider`, `$registerCompletionItemProvider`).
 *   - When an extension calls, for example, `vscode.languages.registerHoverProvider(...)`:
 *     - This service generates a unique numerical handle for that specific provider registration.
 *     - It stores the provider instance itself, its associated `vscode.DocumentSelector` (which
 *       defines for which documents the provider is active), its `IExtensionDescription`,
 *       a `CommandsConverter` instance specific to this registration, a `DisposableStore`
 *       for managing resources related to this registration (like `onDidChange` event subscriptions
 *       or command argument disposables), and any provider-specific metadata/options.
 *     - It then notifies the `MainThreadLanguageFeatures` service (running on the Mountain side)
 *       via an RPC call. This notification includes the handle, the `DocumentSelector`
 *       (converted to an array of `IDocumentFilterDto` objects suitable for RPC), and any
 *       relevant provider metadata DTOs, along with the extension's identifier.
 *
 * - Provider Unregistration:
 *   - It implements the `$unregister(handle)` method. When called, this method removes
 *     the provider registration locally from its internal store and disposes associated resources.
 *   - It also notifies the `MainThreadLanguageFeatures` service via RPC to unregister the
 *     provider on the MainThread side, ensuring consistency.
 *
 * - Provider Execution (RPC methods called BY the MainThread/Mountain):
 *   - It implements a corresponding suite of `$provide*` and `$resolve*` methods (e.g.,
 *     `$provideHover`, `$provideCompletionItems`, `$resolveCompletionItem`).
 *   - When Mountain needs language-specific information:
 *     - It retrieves the appropriate registered provider instance using the handle that
 *       Mountain supplies. It also gets the associated `CommandsConverter` and a new
 *       `DisposableStore` for the current invocation.
 *     - It obtains the relevant `vscode.TextDocument` instance using the injected `CocoonDocumentService`.
 *     - It revives (unmarshals) RPC arguments (DTOs) into VS Code API types using a comprehensive
 *       `TypeConverters` module (e.g., `TypeConverters.Position.to`, `TypeConverters.CompletionContext.toApiType`).
 *     - It calls the provider method (e.g., `provider.provideHover(...)`) with the prepared arguments,
 *       a `CancellationToken` (from `CancellationTokenRegistry`), and the `CommandsConverter` if needed.
 *     - It marshals the result from the provider (VS Code API types) back into DTOs using
 *       `TypeConverters` (e.g., `TypeConverters.Hover.fromApiType`, `TypeConverters.CompletionConverter.fromApiCompletionList`).
 *       This marshalling may involve the `CommandsConverter` (for `vscode.Command` instances) and the
 *       invocation's `DisposableStore` (for caching complex command arguments).
 *     - It may also pass `this` (as `IVersionInformationProviderForConverters`) and `this._uriTransformer`
 *       to converters that handle `WorkspaceEdit`s or other URI-sensitive types.
 *
 * - Hierarchy Session Management:
 *   - For features like Call Hierarchy and Type Hierarchy, it manages sessions (`CocoonHierarchySession`).
 *   - `prepare` methods create sessions, store root API items, and return DTOs with session/item IDs.
 *   - Subsequent `provide*Incoming/Outgoing/Super/Subtypes` methods use these session/item IDs to
 *     retrieve the API item and call the provider. New items discovered are added to the session.
 *   - `release*Session` methods are provided for MainThread to signal session cleanup.
 *
 * - Argument/Result Marshalling and Type Conversion:
 *   - This shim relies heavily on a `TypeConverters` module (e.g., `../cocoon-type-converters`)
 *     for accurate marshalling and unmarshalling between VS Code API types and RPC DTOs.
 *     This includes handling `vscode.Uri`, `vscode.Range`, `vscode.Position`, `vscode.Command`,
 *     `vscode.WorkspaceEdit`, and all language feature-specific types (`Hover`, `CompletionItem`, etc.).
 *   - `CommandsConverter` is used to manage the lifecycle of `vscode.Command` arguments that might
 *     be complex and need to be cached/disposed.
 *
 * Key Interactions and Dependencies:
 * - `ShimLanguages`: Delegates provider registration calls to this service.
 * - `MainContext.MainThreadLanguageFeatures`: RPC proxy for communication to MainThread.
 * - `ExtHostContext.ExtHostLanguageFeatures`: RPC context for this service itself.
 * - `CocoonDocumentService`: For resolving URIs to `vscode.TextDocument` instances.
 * - `BaseCocoonShim`: For common utilities (logging, RPC proxy acquisition, URI transformation).
 * - `CancellationTokenRegistry`: For managing cancellation tokens.
 * - `ExtHostCommands`: Dependency for `CommandsConverter`.
 * - `ILogService`: For logging.
 * - `TypeConverters` (external module): For all complex type conversions.
 * - `IExtensionDescription`: Passed during registration to provide context.
 *
 * Implemented Features (Summary):
 * - Registration for most standard language providers (Hover, Completion, Definition, CodeAction,
 *   CodeLens, Formatting, Symbols, References, Rename, Hierarchies, Inlay Hints, etc.).
 * - Invocation for these providers, including resolve methods where applicable.
 * - Handling of `onDidChange*` events for providers like CodeLens, FoldingRange, InlayHints.
 * - Session-based management for Call Hierarchy and Type Hierarchy.
 * - Integration points for `CommandsConverter` and `IVersionInformationProviderForConverters`.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vs/base/common/cancellation";
import {
	Disposable,
	DisposableStore,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";
import {
	URI,
	type UriComponents as VSCodeUriComponents,
} from "vs/base/common/uri";
// VS Code internal URI
import { generateUuid } from "vs/base/common/uuid";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
	IExtensionIdentifier,
} from "vs/platform/extensions/common/extensions";
import { ILogService } from "vs/platform/log/common/log";
import {
	ExtHostContext,
	MainContext,
	Selection, // Protocol Selection namespace (for isISelection)
	type CodeActionProviderMetadataDto,
	type DocumentSymbolProviderMetadataDto,
	type ExtHostCodeActionContextDto,
	type CompletionContextDto as ExtHostCompletionContextDto, // This is languages.CompletionContext from protocol
	type SignatureHelpContextDto as ExtHostSignatureHelpContextDto, // This is languages.SignatureHelpContext from protocol
	type FoldingRangeProviderMetadataDto,
	type ICallHierarchyItemDto,
	type IColorPresentationDto,
	type IDeclarationDto, // Not directly used in provide methods usually; result is LocationLink[]
	type IDocumentFilterDto,
	type IDocumentHighlightDto,
	type IEditsDto, // Represents WorkspaceEditDto or TextEdit[] for some results
	type IFoldingRangeDto,
	type IImplementationDto, // Not directly used; result is LocationLink[]
	type IIncomingCallDto,
	type IInlayHintDto,
	type IInlayHintsDto, // List wrapper for IInlayHintDto
	type ILinkDto,
	type ILinkedEditingRangesDto,
	type ILinksListDto, // List wrapper for ILinkDto
	type ILocationDto, // Protocol DTO for vscode.Location
	type IOutgoingCallDto,
	type IPosition,
	type IPrepareRenameResult, // DTO for { range: IRange, placeholder: string }
	type IRawColorInfoDto,
	type IReferenceContext,
	type IReferenceDto, // Not directly used; result is LocationDto[]
	type IRenameLocationDto, // Not directly used; result is WorkspaceEditDto or PrepareRenameResult
	type ISelection, // Protocol DTO for vscode.Selection
	type ISelectionRangeDto,
	type ISemanticTokensDto,
	type ISemanticTokensEditsDto,
	type ISignatureHelpDto,
	type ITypeDefinitionDto, // Not directly used; result is LocationLink[]
	type ITypeHierarchyItemDto,
	type ITypeHierarchySubtypesDto, // Not directly used; result is TypeHierarchyItemDto[]
	type ITypeHierarchySupertypesDto, // Not directly used; result is TypeHierarchyItemDto[]
	type ILocationLinkDto as RpcLocationLink, // Protocol DTO for vscode.LocationLink / DefinitionLink
	type ISuggestDataDto as RpcSuggestData, // CompletionItem DTO
	type ISuggestResultDto as RpcSuggestResult, // CompletionList DTO
	type IWorkspaceEditDto as RpcWorkspaceEdit,
	type IWorkspaceSymbolDto as RpcWorkspaceSymbolDto,
	type SignatureHelpProviderMetadataDto,
	type ExtHostLanguageFeaturesShape as VscodeExtHostLanguageFeaturesShape,
	type IRange as VscodeInternalRange, // Protocol IRange
	type MainThreadLanguageFeaturesShape as VscodeMainThreadLanguageFeaturesShape,
	type WorkspaceSymbolProviderMetadataDto,
	// Specific DTOs for provider registration options, if defined in extHost.protocol.ts
	// e.g., languages.CompletionOptionsDto, languages.CodeActionOptionsDto etc.
	// These are often embedded in the main $registerXYZ calls.
} from "vs/workbench/api/common/extHost.protocol";
// VS Code API types (ensure this path resolves to Cocoon's 'vscode' shim or equivalent)
import * as vscode from "vscode";
import * as extHostTypes from "vscode"; // For SemanticTokens, Range, etc. used as types. vscode namespace is preferred for instances.

import { CancellationTokenRegistry } from "../cancellation-token-registry";
// Import type converters - these are CRITICAL
import * as TypeConverters from "../cocoon-type-converters"; // Main module
import { CommandsConverter } from "../cocoon-type-converters"; // Specific converter
import type { IVersionInformationProviderForConverters } from "../cocoon-type-converters"; // Interface for WorkspaceEdit converter
import { ICancellationTokenRegistry } from "../index"; // Assuming this DI key for registry if needed elsewhere
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim, // BaseCocoonShim expects this, but we use ILogService directly
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
import type { ExtHostCommands } from "./commands-shim";
import type { CocoonDocumentService } from "./document-shim";

// Matches definition in VS Code's extHostLanguageFeatures.ts
// Used to store provider-specific options DTOs or flags for registration.
// Field names here use snake_case to align with potential Rust DTOs (ProviderOptionsDto)
// but ensure the values are prepared for the camelCase fields expected by extHost.protocol.ts MainThread methods.
interface ProviderOptionsDtoForCocoon {
	on_did_change_code_lenses_event_handle?: number;
	on_did_change_inlay_hints_event_handle?: number;
	on_did_change_folding_ranges_event_handle?: number;

	trigger_characters?: string[];
	completion_supports_resolve_details?: boolean;

	// Note: extHost.protocol.ts uses CodeActionProviderMetadataDto directly.
	// This DTO is for internal Shim use if needed, conversion to protocol DTO happens before RPC.
	code_action_metadata_dto?: CodeActionProviderMetadataDto;
	code_action_supports_resolve?: boolean;

	// display_name is used for various providers: CodeAction, Formatting, DocumentSymbol, InlayHints, etc.
	// The specific protocol DTO might call it 'label' or 'displayName'.
	display_name?: string;

	// Note: extHost.protocol.ts uses SignatureHelpProviderMetadataDto directly.
	signature_help_metadata_dto?: SignatureHelpProviderMetadataDto;

	inlay_hints_supports_resolve?: boolean;

	document_link_supports_resolve?: boolean;

	formatter_can_format_multiple_ranges?: boolean;

	rename_supports_resolve_location?: boolean;

	workspace_symbol_supports_resolve?: boolean;
}

interface ProviderRegistrationEntry<P = any> {
	provider: P;
	selector: vscode.DocumentSelector | null;
	extensionId: ExtensionIdentifier;
	type: string; // For logging/debugging, e.g., "Hover"
	optionsDto?: ProviderOptionsDtoForCocoon; // Stores the constructed options
	commandsConverterContext: CommandsConverter;
	registrationDisposables: DisposableStore;
}

// Internal session classes for hierarchy features
class CocoonHierarchySession<API_ITEM_TYPE, PROVIDER_TYPE> {
	private static _nextSessionId = 1;
	readonly sessionId: string = String(
		CocoonHierarchySession._nextSessionId++,
	);
	private _itemIds = 0;
	private readonly _items = new Map<string, API_ITEM_TYPE>(); // Store API items by their generated _itemId

	constructor(
		readonly provider: PROVIDER_TYPE,
		rootItems: API_ITEM_TYPE[], // The initial items from prepareXYZ
		private readonly _logService?: ILogService,
	) {
		for (const item of rootItems) {
			const internalItem = item as any as
				| vscode.CallHierarchyItem
				| vscode.TypeHierarchyItem; // Cast to access internal VS Code properties
			if (!(internalItem as any)._sessionId)
				(internalItem as any)._sessionId = this.sessionId;
			if (!(internalItem as any)._itemId)
				(internalItem as any)._itemId = `item_${this._itemIds++}`;
			this._items.set((internalItem as any)._itemId, item);
		}
		this._logService?.trace(
			`[HierarchySession ${this.sessionId}] Created with ${rootItems.length} root items.`,
		);
	}

	getItem(itemId: string): API_ITEM_TYPE | undefined {
		return this._items.get(itemId);
	}

	keepItem(item: API_ITEM_TYPE): string {
		// Returns itemId
		const internalItem = item as any as
			| vscode.CallHierarchyItem
			| vscode.TypeHierarchyItem;
		if (!(internalItem as any)._sessionId)
			(internalItem as any)._sessionId = this.sessionId;
		if (!(internalItem as any)._itemId)
			(internalItem as any)._itemId = `item_${this._itemIds++}`;
		this._items.set((internalItem as any)._itemId, item);
		return (internalItem as any)._itemId;
	}

	dispose() {
		this._logService?.trace(
			`[HierarchySession ${this.sessionId}] Disposed, clearing ${this._items.size} items.`,
		);
		this._items.clear();
	}
}

// Helper to manage onDidChange event subscriptions for providers
function manageProviderOnDidChangeEvent<E>(
	provider: { onDidChange?: vscode.Event<E> } | any, // Use 'any' for untyped onDidChange access
	eventHandle: number | undefined,
	mainThreadEmitter: (eventHandle: number, event?: E | any) => Promise<void>, // RPC method on MainThread proxy
	disposables: DisposableStore,
	logService?: ILogService,
	providerType?: string,
	extensionId?: ExtensionIdentifier,
): void {
	if (eventHandle !== undefined && provider.onDidChange) {
		const subscription = provider.onDidChange(async (e: E) => {
			logService?.trace(
				`[${providerType}Provider][Ext: ${extensionId?.value}] onDidChange event fired (handle ${eventHandle}). Emitting to MainThread.`,
			);
			try {
				// Note: 'e' might need conversion to a DTO if it's a complex type not directly serializable.
				// For simple events (like `void`), `e` might be undefined.
				await mainThreadEmitter(eventHandle, e);
			} catch (err) {
				logService?.error(
					`[${providerType}Provider][Ext: ${extensionId?.value}] Error emitting onDidChange event (handle ${eventHandle}) to MainThread:`,
					err,
				);
			}
		});
		disposables.add(subscription);
	} else if (eventHandle && providerType !== "CodeAction") {
		// CodeAction onDidChange is newer and might not be on `provider.onDidChange`
		logService?.warn(
			`[${providerType}Provider][Ext: ${extensionId?.value}] Provider was expected to have onDidChange event for handle ${eventHandle}, but it was not found.`,
		);
	}
}

function isDefined<T>(value: T | undefined | null): value is T {
	return value !== undefined && value !== null;
}

function _warnStub(
	name: string,
	context: "rpc" | "internal",
	message: string = "",
) {
	console.warn(
		`[Cocoon Shim STUB] ${name} (context: ${context}) is a STUB and needs full implementation. ${message}`,
	);
}

export class ShimLanguageFeatures
	extends BaseCocoonShim
	implements
		VscodeExtHostLanguageFeaturesShape,
		IVersionInformationProviderForConverters
{
	public readonly _serviceBrand: undefined;
	readonly #mainThreadLanguageFeaturesProxy: VscodeMainThreadLanguageFeaturesShape | null =
		null;
	#providerHandlePool: number = 0;
	readonly #providerStore = new Map<number, ProviderRegistrationEntry>();

	readonly #documents: CocoonDocumentService;
	readonly #cancellationTokenRegistry: CancellationTokenRegistry;
	readonly #commands: ExtHostCommands;
	readonly #logServiceForShim: ILogService;

	// Hierarchy session stores
	readonly #callHierarchySessions = new Map<
		string,
		CocoonHierarchySession<
			vscode.CallHierarchyItem,
			vscode.CallHierarchyProvider
		>
	>();
	readonly #typeHierarchySessions = new Map<
		string,
		CocoonHierarchySession<
			vscode.TypeHierarchyItem,
			vscode.TypeHierarchyProvider
		>
	>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogService, // Use ILogService from platform
		documents: CocoonDocumentService,
		cancellationRegistry: CancellationTokenRegistry,
		commands: ExtHostCommands,
		// uriTransformer needs to be injected if BaseCocoonShim doesn't handle it itself
	) {
		super("ExtHostLanguageFeatures", rpcService, logService as any); // Cast for BaseCocoonShim's ILogServiceForShim
		this.#logServiceForShim = logService;
		this._logInfo("Initializing ShimLanguageFeatures...");

		if (!documents)
			this._logError(
				"CRITICAL DEPENDENCY MISSING: CocoonDocumentService not provided.",
			);
		this.#documents = documents;
		if (!cancellationRegistry)
			this._logError(
				"CRITICAL DEPENDENCY MISSING: CancellationTokenRegistry not provided.",
			);
		this.#cancellationTokenRegistry = cancellationRegistry;
		if (!commands)
			this._logError(
				"CRITICAL DEPENDENCY MISSING: ExtHostCommands not provided.",
			);
		this.#commands = commands;

		if (this._rpcService) {
			this.#mainThreadLanguageFeaturesProxy = this._getProxy(
				MainContext.MainThreadLanguageFeatures as ProxyIdentifier<VscodeMainThreadLanguageFeaturesShape>,
			);
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostLanguageFeatures as ProxyIdentifier<VscodeExtHostLanguageFeaturesShape>,
					this,
				);
				this._logInfo(
					"Successfully registered self (ShimLanguageFeatures) for incoming RPC calls from MainThread.",
				);
			} catch (error: any) {
				this._logError(
					"Failed to register self (ShimLanguageFeatures) as RPC target:",
					error,
				);
			}
		}
		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"MainThreadLanguageFeatures RPC proxy NOT available. Provider registration and feature invocation will fail.",
			);
		}
		TypeConverters.initializeConverterLogger(this._logService); // Ensure type converters can log
	}

	private _nextHandle(): number {
		return ++this.#providerHandlePool;
	}
	private _peekNextHandle(): number {
		// Helper for onDidChange event handle allocation before registration
		return this.#providerHandlePool + 1;
	}

	private _transformDocumentSelector(
		extension: IExtensionDescription,
		selector: vscode.DocumentSelector | null,
	): IDocumentFilterDto[] {
		// Using VS Code's extHostTypeConverters.DocumentSelector.from logic as a template.
		// This requires URI transformation for patterns if they are URIs.
		// For MVP, this is a simplified version. A full version would use extension.extensionLocation for relative patterns.
		if (!selector) return [];

		const result: IDocumentFilterDto[] = [];
		const selectors = Array.isArray(selector) ? selector : [selector];

		for (const s of selectors) {
			if (typeof s === "string") {
				result.push({
					$serialized: true,
					language: s,
					isBuiltin: extension.isBuiltin,
				});
			} else if (s) {
				result.push({
					$serialized: true,
					language: s.language,
					scheme: s.scheme,
					pattern: s.pattern
						? TypeConverters.GlobPattern.from(s.pattern)
						: undefined,
					notebookType: s.notebookType,
					exclusive: s.exclusive,
					isBuiltin: extension.isBuiltin,
				});
			}
		}
		return result;
	}

	// Helper to get provider, its registration entry, and crucial context like CommandsConverter
	private _getResolvedProviderContext<P>(
		handle: number,
		expectedType: string,
	): {
		provider: P;
		entry: ProviderRegistrationEntry<P>;
		commandsConverter: CommandsConverter;
		registrationDisposables: DisposableStore;
		disposablesForCall: DisposableStore;
	} | null {
		const entry = this.#providerStore.get(handle);
		if (!entry || entry.type !== expectedType) {
			this._logError(
				`No '${expectedType}' provider found for handle ${handle}. Found: ${entry?.type}`,
			);
			return null;
		}
		const disposablesForCall = new DisposableStore(); // For this specific invocation
		return {
			provider: entry.provider as P,
			entry,
			commandsConverter: entry.commandsConverterContext,
			registrationDisposables: entry.registrationDisposables, // Disposables tied to the provider's registration lifetime
			disposablesForCall,
		};
	}
	// Simplified version if only provider and entry are needed, not command context for this call.
	private _getProviderInstanceAndContext<P>(
		handle: number,
		expectedType: string,
	): {
		provider: P;
		entry: ProviderRegistrationEntry<P>;
		disposablesForCall: DisposableStore;
	} | null {
		const entry = this.#providerStore.get(handle);
		if (!entry || entry.type !== expectedType) {
			this._logError(
				`No '${expectedType}' provider found for handle ${handle}. Found: ${entry?.type}`,
			);
			return null;
		}
		const disposablesForCall = new DisposableStore();
		return { provider: entry.provider as P, entry, disposablesForCall };
	}

	// IVersionInformationProviderForConverters implementation
	public getTextDocumentVersion(uri: vscode.Uri): number | undefined {
		const doc = this.#documents.getDocument(uri);
		return doc?.version;
	}
	public getNotebookDocumentVersion(uri: vscode.Uri): number | undefined {
		// STUBBED: Requires notebook document service integration
		_warnStub(
			"ShimLanguageFeatures.getNotebookDocumentVersion",
			"internal",
			"Notebook versioning STUBBED.",
		);
		return undefined;
	}

	private async _registerProviderInternal<P>(
		providerTypeString: string,
		providerInstance: P,
		extension: IExtensionDescription,
		selector: vscode.DocumentSelector | null,
		providerSpecificOptionsDto: ProviderOptionsDtoForCocoon | undefined, // For storage and construction aid
		// The RPC lambda's signature (args passed to proxy) MUST MATCH extHost.protocol.ts
		rpcRegisterFn: (
			proxy: VscodeMainThreadLanguageFeaturesShape,
			handle: number,
			// These are the args for the *specific* MainThread...$registerXYZ method
			...rpcArgument: any[]
		) => Promise<void> | void, // Some proxy methods are void
	): Promise<number> {
		const handle = this._nextHandle();
		const registrationDisposables = new DisposableStore();
		const commandsConverterForThisRegistration = new CommandsConverter(
			this.#commands,
			this.#logServiceForShim,
			(id: string) => (this.#commands as any)._apiCommands?.get(id), // HACKY access to api command map
			this._uriTransformer, // Pass URI transformer
		);
		// Do not add commandsConverter to disposables unless it itself is disposable and needs cleanup
		// registrationDisposables.add(commandsConverterForThisRegistration);

		this.#providerStore.set(handle, {
			provider: providerInstance,
			selector,
			extensionId: extension.identifier,
			type: providerTypeString,
			optionsDto: providerSpecificOptionsDto,
			commandsConverterContext: commandsConverterForThisRegistration,
			registrationDisposables,
		});
		this._logDebug(
			`Locally registered ${providerTypeString}Provider for ext '${extension.identifier.value}' (Handle: ${handle}). Options:`,
			providerSpecificOptionsDto,
		);

		if (this.#mainThreadLanguageFeaturesProxy) {
			const selectorDtoArray = this._transformDocumentSelector(
				extension,
				selector,
			);
			// The rpcArgument for the specific proxy method will be constructed by the calling $registerXYZ method.
			// The rpcRegisterFn will be a lambda like:
			// (proxy, h, ...args) => proxy.$specificRegisterMethod(h, ...args)
			try {
				// The `rpcArgument` are passed through from the specific `$registerXYZ` method's lambda.
				// The lambda defined in each $register method now takes `proxy` as its first arg.
				// Example: (proxy, h, selDto, opts, extIdDto) => proxy.$registerHoverProvider(h, selDto, extIdDto)
				// The `...rpcArgument` here would be `selDto, opts, extIdDto`.
				// Let's make `rpcRegisterFn` directly call the proxy method with appropriate args.
				// The proxy, handle, selectorDtoArray, and extensionIdDto are common.
				// Provider-specific options are embedded in ...rpcArgument by the caller.

				// Simplification: The rpcRegisterFn lambda itself will construct the full list of args for the proxy call.
				// It will receive (proxy, handle, selectorDtoArray, providerSpecificOptionsDto_from_storage, extensionIdDto_for_rpc)
				// and then it picks what it needs for the actual proxy.$method call.

				const extensionIdDtoForRpc: IExtensionIdentifier = {
					value: extension.identifier.value,
					uuid: extension.identifier.uuid,
				};

				// The lambda passed to _registerProviderInternal will define how to call the proxy.
				// It will use `handle`, `selectorDtoArray`, `providerSpecificOptionsDto`, `extensionIdDtoForRpc`
				// to form the arguments for the specific MainThread proxy method.
				// Example:
				// For $registerHoverProvider, rpcRegisterFn = (proxy, h, sel, _opts, extId) => proxy.$registerHoverProvider(h, sel, extId)
				await rpcRegisterFn(
					this.#mainThreadLanguageFeaturesProxy,
					handle,
					selectorDtoArray,
					providerSpecificOptionsDto,
					extensionIdDtoForRpc,
				);

				this._logDebug(
					`${providerTypeString}Provider (H:${handle}) registration sent to MainThread.`,
				);
			} catch (err: any) {
				this.#providerStore.delete(handle);
				registrationDisposables.dispose();
				this._logError(
					`RPC to register ${providerTypeString}Provider (Handle: ${handle}, Ext: ${extension.identifier.value}) with MainThread FAILED:`,
					refineErrorForShim(err, this._logService),
				);
				throw err;
			}
		} else if (rpcRegisterFn) {
			this.#providerStore.delete(handle);
			registrationDisposables.dispose();
			const errMessage = `Cannot register ${providerTypeString}Provider: MainThread proxy unavailable.`;
			this._logError(errMessage);
			throw new Error(errMessage);
		}
		return handle;
	}

	// --- Provider Registration Methods ---
	// Ensure these match extHost.protocol.ts MainThreadLanguageFeaturesShape method signatures for the proxy calls.

	public $registerHoverProvider(
		s: vscode.DocumentSelector,
		p: vscode.HoverProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"Hover",
			p,
			e,
			s,
			undefined,
			(proxy, h, selDto, _opts, extIdDto) =>
				proxy.$registerHoverProvider(h, selDto, extIdDto),
		);
	}

	public $registerCompletionItemProvider(
		s: vscode.DocumentSelector,
		p: vscode.CompletionItemProvider,
		t: string[],
		e: IExtensionDescription,
	): Promise<number> {
		const optsDto: ProviderOptionsDtoForCocoon = {
			trigger_characters: t,
			completion_supports_resolve_details:
				typeof p.resolveCompletionItem === "function",
		};
		return this._registerProviderInternal(
			"Completion",
			p,
			e,
			s,
			optsDto,
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerCompletionsProvider(
					h,
					selDto,
					optsFromStorage?.trigger_characters || [],
					optsFromStorage?.completion_supports_resolve_details ||
						false,
					extIdDto,
				),
		);
	}

	public $registerDefinitionProvider(
		s: vscode.DocumentSelector,
		p: vscode.DefinitionProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"Definition",
			p,
			e,
			s,
			undefined,
			// $registerDefinitionSupport(handle: number, selector: IDocumentFilterDto[]): void; (no extId in protocol)
			(proxy, h, selDto, _opts, _extIdDto) =>
				proxy.$registerDefinitionSupport(h, selDto),
		);
	}

	public $registerDeclarationProvider(
		s: vscode.DocumentSelector,
		p: vscode.DeclarationProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"Declaration",
			p,
			e,
			s,
			undefined,
			// $registerDeclarationSupport(handle: number, selector: IDocumentFilterDto[]): void;
			(proxy, h, selDto, _opts, _extIdDto) =>
				proxy.$registerDeclarationSupport(h, selDto),
		);
	}

	public $registerImplementationProvider(
		s: vscode.DocumentSelector,
		p: vscode.ImplementationProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"Implementation",
			p,
			e,
			s,
			undefined,
			// $registerImplementationSupport(handle: number, selector: IDocumentFilterDto[]): void;
			(proxy, h, selDto, _opts, _extIdDto) =>
				proxy.$registerImplementationSupport(h, selDto),
		);
	}

	public $registerTypeDefinitionProvider(
		s: vscode.DocumentSelector,
		p: vscode.TypeDefinitionProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"TypeDefinition",
			p,
			e,
			s,
			undefined,
			// $registerTypeDefinitionSupport(handle: number, selector: IDocumentFilterDto[]): void;
			(proxy, h, selDto, _opts, _extIdDto) =>
				proxy.$registerTypeDefinitionSupport(h, selDto),
		);
	}

	public $registerCodeLensProvider(
		s: vscode.DocumentSelector,
		p: vscode.CodeLensProvider,
		e: IExtensionDescription,
	): Promise<number> {
		const eventHandle =
			typeof p.onDidChangeCodeLenses === "function"
				? this._nextHandle()
				: undefined;
		const optsDto: ProviderOptionsDtoForCocoon = {
			on_did_change_code_lenses_event_handle: eventHandle,
		};

		const registrationPromise = this._registerProviderInternal(
			"CodeLens",
			p,
			e,
			s,
			optsDto,
			// $registerCodeLensSupport(handle: number, selector: IDocumentFilterDto[], eventHandle: number | undefined): void;
			(proxy, h, selDto, optsFromStorage, _extIdDto) =>
				proxy.$registerCodeLensSupport(
					h,
					selDto,
					optsFromStorage?.on_did_change_code_lenses_event_handle,
				),
		);
		registrationPromise
			.then((handle) => {
				const entry = this.#providerStore.get(handle);
				if (entry) {
					manageProviderOnDidChangeEvent(
						p,
						eventHandle,
						(hdl, _ev) =>
							this.#mainThreadLanguageFeaturesProxy!.$emitCodeLensEvent(
								hdl,
								undefined,
							), // Protocol $emitCodeLensEvent(handle, event?)
						entry.registrationDisposables,
						this.#logServiceForShim,
						"CodeLens",
						e.identifier,
					);
				}
			})
			.catch(() => {
				/* error already logged */
			});
		return registrationPromise;
	}

	public $registerCodeActionProvider(
		s: vscode.DocumentSelector,
		p: vscode.CodeActionProvider,
		m: vscode.CodeActionProviderMetadata | undefined,
		e: IExtensionDescription,
	): Promise<number> {
		const metadataDtoForRpc = m
			? TypeConverters.CodeActionProviderMetadata.toDto(m)
			: undefined;
		// onDidChangeCodeActions event handle (new in VS Code)
		let onDidChangeCodeActionsEventHandle: number | undefined = undefined;
		if (typeof (p as any).onDidChangeCodeActions === "function") {
			onDidChangeCodeActionsEventHandle = this._nextHandle();
		}

		const optsDto: ProviderOptionsDtoForCocoon = {
			code_action_metadata_dto: metadataDtoForRpc,
			code_action_supports_resolve:
				typeof p.resolveCodeAction === "function",
			display_name: e.displayName || e.name,
			// on_did_change_code_actions_event_handle: onDidChangeCodeActionsEventHandle // If storing this
		};

		const registrationPromise = this._registerProviderInternal(
			"CodeAction",
			p,
			e,
			s,
			optsDto,
			// $registerCodeActionSupport(handle: number, selector: IDocumentFilterDto[], metadata: CodeActionProviderMetadataDto | undefined, displayName: string, extensionId: string, supportsResolve?: boolean, onDidChangeCodeActionsEventHandle?: number): void;
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerCodeActionSupport(
					h,
					selDto,
					optsFromStorage?.code_action_metadata_dto,
					optsFromStorage?.display_name || e.name,
					extIdDto.value, // Protocol uses string extensionId here
					optsFromStorage?.code_action_supports_resolve || false,
					onDidChangeCodeActionsEventHandle,
				),
		);

		registrationPromise
			.then((handle) => {
				const entry = this.#providerStore.get(handle);
				if (
					entry &&
					onDidChangeCodeActionsEventHandle &&
					typeof (p as any).onDidChangeCodeActions === "function"
				) {
					manageProviderOnDidChangeEvent(
						p as { onDidChangeCodeActions?: vscode.Event<void> }, // Cast to expected type
						onDidChangeCodeActionsEventHandle,
						(hdl) =>
							this.#mainThreadLanguageFeaturesProxy!.$emitCodeActionEvent(
								hdl,
							), // $emitCodeActionEvent(handle)
						entry.registrationDisposables,
						this.#logServiceForShim,
						"CodeAction",
						e.identifier,
					);
				}
			})
			.catch(() => {});
		return registrationPromise;
	}

	public $registerDocumentFormattingEditProvider(
		s: vscode.DocumentSelector,
		p: vscode.DocumentFormattingEditProvider,
		e: IExtensionDescription,
	): Promise<number> {
		const optsDto: ProviderOptionsDtoForCocoon = {
			display_name: e.displayName || e.name,
		};
		return this._registerProviderInternal(
			"DocumentFormattingEdit",
			p,
			e,
			s,
			optsDto,
			// $registerDocumentFormattingSupport(handle: number, selector: IDocumentFilterDto[], extensionId: IExtensionIdentifier, displayName: string): void;
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerDocumentFormattingSupport(
					h,
					selDto,
					extIdDto,
					optsFromStorage?.display_name || e.name,
				),
		);
	}

	public $registerDocumentRangeFormattingEditProvider(
		s: vscode.DocumentSelector,
		p: vscode.DocumentRangeFormattingEditProvider,
		e: IExtensionDescription,
	): Promise<number> {
		const optsDto: ProviderOptionsDtoForCocoon = {
			display_name: e.displayName || e.name,
			// Check if provider has provideDocumentRangesFormattingEdits for canFormatMultipleRanges
			formatter_can_format_multiple_ranges:
				typeof (p as any).provideDocumentRangesFormattingEdits ===
					"function" || (p as any).canFormatMultipleRanges === true,
		};
		return this._registerProviderInternal(
			"DocumentRangeFormattingEdit",
			p,
			e,
			s,
			optsDto,
			// $registerRangeFormattingSupport(handle: number, selector: IDocumentFilterDto[], extensionId: IExtensionIdentifier, displayName: string, canFormatRanges?: boolean): void;
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerRangeFormattingSupport(
					h,
					selDto,
					extIdDto,
					optsFromStorage?.display_name || e.name,
					optsFromStorage?.formatter_can_format_multiple_ranges ||
						false,
				),
		);
	}

	public $registerOnTypeFormattingEditProvider(
		s: vscode.DocumentSelector,
		p: vscode.OnTypeFormattingEditProvider,
		t: string[],
		_o: vscode.OnTypeFormattingEditProviderOptions | undefined,
		e: IExtensionDescription,
	): Promise<number> {
		const optsDto: ProviderOptionsDtoForCocoon = { trigger_characters: t };
		return this._registerProviderInternal(
			"OnTypeFormattingEdit",
			p,
			e,
			s,
			optsDto,
			// $registerOnTypeFormattingSupport(handle: number, selector: IDocumentFilterDto[], autoFormatTriggerCharacters: string[], extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerOnTypeFormattingSupport(
					h,
					selDto,
					optsFromStorage?.trigger_characters || [],
					extIdDto,
				),
		);
	}

	public $registerDocumentHighlightProvider(
		s: vscode.DocumentSelector,
		p: vscode.DocumentHighlightProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"DocumentHighlight",
			p,
			e,
			s,
			undefined,
			// $registerDocumentHighlightProvider(handle: number, selector: IDocumentFilterDto[], extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, _opts, extIdDto) =>
				proxy.$registerDocumentHighlightProvider(h, selDto, extIdDto),
		);
	}

	public $registerDocumentLinkProvider(
		s: vscode.DocumentSelector,
		p: vscode.DocumentLinkProvider,
		e: IExtensionDescription,
	): Promise<number> {
		const optsDto: ProviderOptionsDtoForCocoon = {
			document_link_supports_resolve:
				typeof p.resolveDocumentLink === "function",
		};
		return this._registerProviderInternal(
			"DocumentLink",
			p,
			e,
			s,
			optsDto,
			// $registerDocumentLinkProvider(handle: number, selector: IDocumentFilterDto[], supportsResolve: boolean, extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerDocumentLinkProvider(
					h,
					selDto,
					optsFromStorage?.document_link_supports_resolve || false,
					extIdDto,
				),
		);
	}

	public $registerDocumentColorProvider(
		s: vscode.DocumentSelector,
		p: vscode.DocumentColorProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"DocumentColor",
			p,
			e,
			s,
			undefined,
			// $registerDocumentColorProvider(handle: number, selector: IDocumentFilterDto[], extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, _opts, extIdDto) =>
				proxy.$registerDocumentColorProvider(h, selDto, extIdDto),
		);
	}

	public $registerFoldingRangeProvider(
		s: vscode.DocumentSelector,
		p: vscode.FoldingRangeProvider,
		e: IExtensionDescription,
	): Promise<number> {
		const eventHandle =
			typeof p.onDidChangeFoldingRanges === "function"
				? this._nextHandle()
				: undefined;
		const optsDto: ProviderOptionsDtoForCocoon = {
			on_did_change_folding_ranges_event_handle: eventHandle,
		};
		const regPromise = this._registerProviderInternal(
			"FoldingRange",
			p,
			e,
			s,
			optsDto,
			// $registerFoldingRangeProvider(handle: number, selector: IDocumentFilterDto[], extensionId: IExtensionIdentifier, eventHandle: number | undefined, metadata?: FoldingRangeProviderMetadataDto): void;
			// Assuming metadata is optional and not used here for simplicity, or part of optsDto if needed.
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerFoldingRangeProvider(
					h,
					selDto,
					extIdDto,
					optsFromStorage?.on_did_change_folding_ranges_event_handle,
				),
		);
		regPromise
			.then((hdlNum) => {
				const entry = this.#providerStore.get(hdlNum);
				if (entry)
					manageProviderOnDidChangeEvent(
						p,
						eventHandle,
						(eh) =>
							this.#mainThreadLanguageFeaturesProxy!.$emitFoldingRangeEvent(
								eh,
							),
						entry.registrationDisposables,
						this.#logServiceForShim,
						"FoldingRange",
						e.identifier,
					);
			})
			.catch(() => {});
		return regPromise;
	}

	public $registerReferenceProvider(
		s: vscode.DocumentSelector,
		p: vscode.ReferenceProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"Reference",
			p,
			e,
			s,
			undefined,
			// $registerReferenceSupport(handle: number, selector: IDocumentFilterDto[]): void;
			(proxy, h, selDto, _opts, _extIdDto) =>
				proxy.$registerReferenceSupport(h, selDto),
		);
	}

	public $registerRenameProvider(
		s: vscode.DocumentSelector,
		p: vscode.RenameProvider,
		e: IExtensionDescription,
	): Promise<number> {
		const optsDto: ProviderOptionsDtoForCocoon = {
			rename_supports_resolve_location:
				typeof p.prepareRename === "function",
		};
		return this._registerProviderInternal(
			"Rename",
			p,
			e,
			s,
			optsDto,
			// $registerRenameSupport(handle: number, selector: IDocumentFilterDto[], supportResolveLocation: boolean, extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerRenameSupport(
					h,
					selDto,
					optsFromStorage?.rename_supports_resolve_location || false,
					extIdDto,
				),
		);
	}

	public $registerSignatureHelpProvider(
		s: vscode.DocumentSelector,
		p: vscode.SignatureHelpProvider,
		m: string[] | vscode.SignatureHelpProviderMetadata | undefined,
		e: IExtensionDescription,
	): Promise<number> {
		const metadataForRpc: SignatureHelpProviderMetadataDto =
			typeof m === "object" && !Array.isArray(m) && m !== null
				? TypeConverters.SignatureHelpProviderMetadata.toDto(
						m as vscode.SignatureHelpProviderMetadata,
					)
				: {
						triggerCharacters: Array.isArray(m)
							? m
							: (m as vscode.SignatureHelpProviderMetadata)
									?.triggerCharacters || [],
						retriggerCharacters:
							(m as vscode.SignatureHelpProviderMetadata)
								?.retriggerCharacters || [],
					};

		const optsDto: ProviderOptionsDtoForCocoon = {
			signature_help_metadata_dto: metadataForRpc,
		};
		return this._registerProviderInternal(
			"SignatureHelp",
			p,
			e,
			s,
			optsDto,
			// $registerSignatureHelpProvider(handle: number, selector: IDocumentFilterDto[], metadata: SignatureHelpProviderMetadataDto, extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerSignatureHelpProvider(
					h,
					selDto,
					optsFromStorage?.signature_help_metadata_dto!,
					extIdDto,
				),
		);
	}

	public $registerWorkspaceSymbolProvider(
		p: vscode.WorkspaceSymbolProvider,
		e: IExtensionDescription,
	): Promise<number> {
		const metadataForRpc: WorkspaceSymbolProviderMetadataDto = {
			supportsResolve: typeof p.resolveWorkspaceSymbol === "function",
		};
		const optsDto: ProviderOptionsDtoForCocoon = {
			workspace_symbol_supports_resolve: metadataForRpc.supportsResolve,
		};
		return this._registerProviderInternal(
			"WorkspaceSymbol",
			p,
			e,
			null,
			optsDto,
			// $registerNavigateTypeSupport(handle: number, metadata: WorkspaceSymbolProviderMetadataDto, extensionId: IExtensionIdentifier): void;
			// This is VS Code's name for workspace symbol registration to main thread.
			(proxy, h, _selDto, _optsFromStorage, extIdDto) =>
				proxy.$registerNavigateTypeSupport(h, metadataForRpc, extIdDto),
		);
	}

	public $registerDocumentSymbolProvider(
		s: vscode.DocumentSelector,
		p: vscode.DocumentSymbolProvider,
		m: vscode.DocumentSymbolProviderMetadata | undefined,
		e: IExtensionDescription,
	): Promise<number> {
		const metadataForRpc: DocumentSymbolProviderMetadataDto = {
			label: m?.label || e.displayName || e.name,
		};
		const optsDto: ProviderOptionsDtoForCocoon = {
			display_name: metadataForRpc.label,
		};
		return this._registerProviderInternal(
			"DocumentSymbol",
			p,
			e,
			s,
			optsDto,
			// $registerDocumentSymbolProvider(handle: number, selector: IDocumentFilterDto[], metadata: DocumentSymbolProviderMetadataDto, extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, _optsFromStorage, extIdDto) =>
				proxy.$registerDocumentSymbolProvider(
					h,
					selDto,
					metadataForRpc,
					extIdDto,
				),
		);
	}

	public $registerSelectionRangeProvider(
		s: vscode.DocumentSelector,
		p: vscode.SelectionRangeProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"SelectionRange",
			p,
			e,
			s,
			undefined,
			// $registerSelectionRangeSupport(handle: number, selector: IDocumentFilterDto[]): void;
			(proxy, h, selDto, _opts, _extIdDto) =>
				proxy.$registerSelectionRangeSupport(h, selDto),
		);
	}

	public $registerCallHierarchyProvider(
		s: vscode.DocumentSelector,
		p: vscode.CallHierarchyProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"CallHierarchy",
			p,
			e,
			s,
			undefined,
			// $registerCallHierarchySupport(handle: number, selector: IDocumentFilterDto[]): void;
			(proxy, h, selDto, _opts, _extIdDto) =>
				proxy.$registerCallHierarchySupport(h, selDto),
		);
	}

	public $registerTypeHierarchyProvider(
		s: vscode.DocumentSelector,
		p: vscode.TypeHierarchyProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"TypeHierarchy",
			p,
			e,
			s,
			undefined,
			// $registerTypeHierarchySupport(handle: number, selector: IDocumentFilterDto[]): void;
			(proxy, h, selDto, _opts, _extIdDto) =>
				proxy.$registerTypeHierarchySupport(h, selDto),
		);
	}

	public $registerLinkedEditingRangeProvider(
		s: vscode.DocumentSelector,
		p: vscode.LinkedEditingRangeProvider,
		e: IExtensionDescription,
	): Promise<number> {
		return this._registerProviderInternal(
			"LinkedEditingRange",
			p,
			e,
			s,
			undefined,
			// $registerLinkedEditingRangeProvider(handle: number, selector: IDocumentFilterDto[], extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, _opts, extIdDto) =>
				proxy.$registerLinkedEditingRangeProvider(h, selDto, extIdDto),
		);
	}

	public $registerInlayHintsProvider(
		s: vscode.DocumentSelector,
		p: vscode.InlayHintsProvider,
		e: IExtensionDescription,
	): Promise<number> {
		const eventHandle =
			typeof p.onDidChangeInlayHints === "function"
				? this._nextHandle()
				: undefined;
		const label = e.displayName || e.name; // Protocol uses 'label' for InlayHintProvider registration
		const optsDto: ProviderOptionsDtoForCocoon = {
			inlay_hints_supports_resolve:
				typeof p.resolveInlayHint === "function",
			on_did_change_inlay_hints_event_handle: eventHandle,
			display_name: label,
		};
		const regPromise = this._registerProviderInternal(
			"InlayHints",
			p,
			e,
			s,
			optsDto,
			// $registerInlayHintsProvider(handle: number, selector: IDocumentFilterDto[], supportsResolve: boolean, eventHandle: number | undefined, label: string, extensionId: IExtensionIdentifier): void;
			(proxy, h, selDto, optsFromStorage, extIdDto) =>
				proxy.$registerInlayHintsProvider(
					h,
					selDto,
					optsFromStorage?.inlay_hints_supports_resolve || false,
					optsFromStorage?.on_did_change_inlay_hints_event_handle,
					optsFromStorage?.display_name || e.name,
					extIdDto,
				),
		);
		regPromise
			.then((hdlNum) => {
				const entry = this.#providerStore.get(hdlNum);
				if (entry)
					manageProviderOnDidChangeEvent(
						p,
						eventHandle,
						(eh) =>
							this.#mainThreadLanguageFeaturesProxy!.$emitInlayHintsEvent(
								eh,
							),
						entry.registrationDisposables,
						this.#logServiceForShim,
						"InlayHints",
						e.identifier,
					);
			})
			.catch(() => {});
		return regPromise;
	}

	// TODO: Semantic Tokens ($registerDocumentSemanticTokensProvider, $registerDocumentRangeSemanticTokensProvider)
	// TODO: Paste Edit ($registerPasteEditProvider, $preparePasteEdit, $providePasteEdits)
	// TODO: Drop Edit ($registerDocumentOnDropEditProvider, $provideDocumentOnDropEdits)

	public async $unregister(providerHandle: number): Promise<void> {
		this._logDebug(
			`RPC method $unregister called for Provider Handle: ${providerHandle}`,
		);
		const entry = this.#providerStore.get(providerHandle);
		if (entry) {
			entry.registrationDisposables.dispose(); // Dispose commands, event listeners, etc.
			this.#providerStore.delete(providerHandle);
			this._logDebug(
				`Locally unregistered provider (Handle: ${providerHandle}, Type: ${entry?.type}, Ext: ${entry?.extensionId.value})`,
			);
		} else {
			this._logWarn(
				`Attempted to unregister provider with Handle ${providerHandle}, but no local registration found.`,
			);
		}

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				`Cannot send unregister for Handle ${providerHandle} to MainThread: RPC proxy unavailable.`,
			);
			return;
		}
		try {
			await this.#mainThreadLanguageFeaturesProxy.$unregister(
				providerHandle,
			);
			this._logDebug(
				`Unregistration request sent to MainThread for Handle ${providerHandle}.`,
			);
		} catch (error: any) {
			this._logError(
				`Failed to send unregister request for Handle ${providerHandle} to MainThread:`,
				refineErrorForShim(error, this._logService),
			);
		}
	}

	// --- RPC Methods called BY Mountain (Provider Invocation) ---

	public async $provideHover(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		_contextDto: ExtHostContextDto.HoverContextDto | undefined, // Verbosity context still stubbed
		tokenDto: { id?: number } | undefined,
	): Promise<extHostProtocol.IHoverDto | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.HoverProvider>(
				providerHandle,
				"Hover",
			);
		if (!providerCtx) return undefined;

		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;

		try {
			const revivedUri =
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto);
			if (!revivedUri) {
				this._logError(
					`$provideHover: Failed to revive URI for handle ${providerHandle}`,
				);
				return undefined;
			}
			const document = this.#documents.getDocument(revivedUri);
			if (!document) {
				this._logWarn(
					`$provideHover: TextDocument not found for URI ${revivedUri.toString()}, handle ${providerHandle}.`,
				);
				return undefined;
			}

			const position = TypeConverters.Position.to(positionDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const vscodeHoverContext: vscode.HoverContext | undefined =
				undefined; // Verbosity STUBBED

			this._logDebug(
				`$provideHover: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value}) for doc ${document.uri.fsPath}`,
			);
			const result: vscode.Hover | undefined | null =
				await provider.provideHover(
					document,
					position,
					token,
					vscodeHoverContext,
				);

			if (result) {
				this._logDebug(
					`$provideHover: Provider (Handle ${providerHandle}) returned a result. Marshalling...`,
				);
				return TypeConverters.Hover.fromApiType(
					result,
					commandsConverter,
					disposablesForCall,
				);
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error executing HoverProvider.provideHover (Handle ${providerHandle}, Ext: ${entry.extensionId.value || "unknown"}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideCompletionItems(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		contextDto: ExtHostCompletionContextDto,
		tokenDto: { id?: number } | undefined,
	): Promise<RpcSuggestResult | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.CompletionItemProvider>(
				providerHandle,
				"Completion",
			);
		if (!providerCtx) {
			this._logWarn(
				`$provideCompletionItems: No CompletionProvider found for handle ${providerHandle}.`,
			);
			return undefined;
		}

		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;

		try {
			const revivedUri =
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto);
			if (!revivedUri) {
				this._logError(
					`$provideCompletionItems: Failed to revive URI for handle ${providerHandle}`,
				);
				return undefined;
			}
			const document = this.#documents.getDocument(revivedUri);
			if (!document) {
				this._logWarn(
					`$provideCompletionItems: TextDocument not found for URI ${revivedUri.toString()}, handle ${providerHandle}.`,
				);
				return undefined;
			}

			const position = TypeConverters.Position.to(positionDto);
			const context =
				TypeConverters.CompletionContext.toApiType(contextDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$provideCompletionItems: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value}) for doc ${document.uri.fsPath}`,
			);
			const result:
				| vscode.CompletionList
				| vscode.CompletionItem[]
				| undefined
				| null = await provider.provideCompletionItems(
				document,
				position,
				token,
				context,
			);

			if (result) {
				const resultLength = Array.isArray(result)
					? result.length
					: result.items.length;
				this._logDebug(
					`$provideCompletionItems: Provider (Handle ${providerHandle}) returned ${resultLength} items. Marshalling...`,
				);
				const wordRange = document.getWordRangeAtPosition(position);
				const defaultReplaceRange =
					wordRange || new vscode.Range(position, position);
				const defaultInsertRange = defaultReplaceRange.with({
					end: position,
				});

				return TypeConverters.CompletionConverter.fromApiCompletionList(
					result,
					this._nextHandle(), // Generate a new cache ID for this *list*
					defaultReplaceRange,
					defaultInsertRange,
					commandsConverter,
					disposablesForCall, // Disposables for commands created for *this specific call's results*
				);
			}
			this._logDebug(
				`$provideCompletionItems: Provider (Handle ${providerHandle}) returned no result.`,
			);
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in CompletionItemProvider.provideCompletionItems (Handle ${providerHandle}, Ext: ${entry.extensionId.value || "unknown"}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $resolveCompletionItem(
		providerHandle: number,
		itemDtoFromMain: RpcSuggestData,
		tokenDto: { id?: number } | undefined,
	): Promise<RpcSuggestData | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.CompletionItemProvider>(
				providerHandle,
				"Completion",
			);
		if (
			!providerCtx ||
			typeof providerCtx.provider.resolveCompletionItem !== "function"
		) {
			this._logDebug(
				`$resolveCompletionItem: No resolver or provider for handle ${providerHandle}. Returning original DTO.`,
			);
			return itemDtoFromMain;
		}

		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;
		let revivedItemForError: vscode.CompletionItem | undefined = undefined;

		try {
			const apiItemToResolve =
				TypeConverters.CompletionConverter.toApiCompletionItem(
					itemDtoFromMain,
					commandsConverter,
				);
			revivedItemForError = apiItemToResolve;
			if (!apiItemToResolve) {
				this._logError(
					`$resolveCompletionItem (Handle ${providerHandle}): Failed to convert DTO to API CompletionItem.`,
				);
				return itemDtoFromMain;
			}

			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$resolveCompletionItem: Calling provider.resolve (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const resolvedApiItem = await provider.resolveCompletionItem(
				apiItemToResolve,
				token,
			);

			if (!resolvedApiItem) {
				this._logDebug(
					`$resolveCompletionItem: Provider (Handle ${providerHandle}) returned no resolved item. Returning original DTO.`,
				);
				return itemDtoFromMain;
			}
			this._logDebug(
				`$resolveCompletionItem: Provider (Handle ${providerHandle}) returned resolved item. Marshalling...`,
			);

			const resolvedItemDto =
				TypeConverters.CompletionConverter.fromApiCompletionItem(
					resolvedApiItem,
					commandsConverter,
					disposablesForCall,
				);
			resolvedItemDto.x = itemDtoFromMain.x; // IMPORTANT: Preserve the original ChainedCacheId
			return resolvedItemDto;
		} catch (err: any) {
			this._logError(
				`Error in CompletionItemProvider.resolveCompletionItem (Handle ${providerHandle}, Ext: ${entry.extensionId.value || "unknown"}):`,
				refineErrorForShim(err, this._logService),
			);
			// Attempt to marshal the un-resolved (but revived) item back if an error occurred during resolve.
			return revivedItemForError
				? TypeConverters.CompletionConverter.fromApiCompletionItem(
						revivedItemForError,
						commandsConverter,
						disposablesForCall,
					)
				: itemDtoFromMain;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDefinition(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number } | undefined,
	): Promise<RpcLocationLink[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DefinitionProvider>(
				providerHandle,
				"Definition",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;

		try {
			const doc = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			const pos = TypeConverters.Position.to(positionDto);
			if (!doc || !pos) return undefined;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			const result = await provider.provideDefinition(doc, pos, token);
			if (!result) return undefined;

			return TypeConverters.DefinitionLink.fromApiArray(
				Array.isArray(result) ? result : [result],
				this._uriTransformer,
			);
		} catch (error: any) {
			this._logError(
				`Error executing DefinitionProvider.provideDefinition (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				refineErrorForShim(error, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDeclaration(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number },
	): Promise<RpcLocationLink[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DeclarationProvider>(
				providerHandle,
				"Declaration",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			const position = TypeConverters.Position.to(positionDto);
			if (!document || !position) return undefined;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideDeclaration(
				document,
				position,
				token,
			);
			return TypeConverters.DefinitionLink.fromApiArray(
				Array.isArray(result) ? result : [result],
				this._uriTransformer,
			);
		} catch (err: any) {
			this._logError(
				`Error in DeclarationProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideImplementation(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number },
	): Promise<RpcLocationLink[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.ImplementationProvider>(
				providerHandle,
				"Implementation",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			const position = TypeConverters.Position.to(positionDto);
			if (!document || !position) return undefined;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideImplementation(
				document,
				position,
				token,
			);
			return TypeConverters.DefinitionLink.fromApiArray(
				Array.isArray(result) ? result : [result],
				this._uriTransformer,
			);
		} catch (err: any) {
			this._logError(
				`Error in ImplementationProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideTypeDefinition(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number },
	): Promise<RpcLocationLink[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.TypeDefinitionProvider>(
				providerHandle,
				"TypeDefinition",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			const position = TypeConverters.Position.to(positionDto);
			if (!document || !position) return undefined;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideTypeDefinition(
				document,
				position,
				token,
			);
			return TypeConverters.DefinitionLink.fromApiArray(
				Array.isArray(result) ? result : [result],
				this._uriTransformer,
			);
		} catch (err: any) {
			this._logError(
				`Error in TypeDefinitionProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideCodeLenses(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		tokenDto: { id?: number } | undefined,
	): Promise<extHostProtocol.ICodeLensListDto | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.CodeLensProvider>(
				providerHandle,
				"CodeLens",
			);
		if (!providerCtx) return undefined;

		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;

		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			if (!document) return undefined;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$provideCodeLenses: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const result = await provider.provideCodeLenses(document, token);

			if (result) {
				this._logDebug(
					`$provideCodeLenses: Provider (Handle ${providerHandle}) returned ${result.length} items. Marshalling...`,
				);
				return TypeConverters.CodeLens.fromList(
					result,
					this._nextHandle(), // list cache ID
					commandsConverter,
					registrationDisposables, // Commands in CodeLenses are often tied to the provider's lifecycle
				);
			}
			return undefined;
		} catch (error: any) {
			this._logError(
				`Error executing CodeLensProvider.provideCodeLenses (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				refineErrorForShim(error, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $resolveCodeLens(
		providerHandle: number,
		codeLensDtoFromMain: extHostProtocol.ICodeLensDto,
		tokenDto: { id?: number } | undefined,
	): Promise<extHostProtocol.ICodeLensDto | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.CodeLensProvider>(
				providerHandle,
				"CodeLens",
			);
		if (
			!providerCtx ||
			typeof providerCtx.provider.resolveCodeLens !== "function"
		) {
			return codeLensDtoFromMain;
		}

		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;
		let revivedLensForError: vscode.CodeLens | undefined;

		try {
			const apiLensToResolve = TypeConverters.CodeLens.to(
				codeLensDtoFromMain,
				commandsConverter,
			);
			revivedLensForError = apiLensToResolve;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$resolveCodeLens: Calling provider.resolve (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const resolvedApiLens = await provider.resolveCodeLens(
				apiLensToResolve,
				token,
			);

			if (!resolvedApiLens) return codeLensDtoFromMain;

			this._logDebug(
				`$resolveCodeLens: Provider (Handle ${providerHandle}) returned resolved lens. Marshalling...`,
			);
			const resolvedDto = TypeConverters.CodeLens.from(
				resolvedApiLens,
				commandsConverter,
				disposablesForCall, // Use call-specific disposables if resolve can add new cached commands
			);
			resolvedDto.cacheId = codeLensDtoFromMain.cacheId; // Preserve original ChainedCacheId (if it was one)
			return resolvedDto;
		} catch (error: any) {
			this._logError(
				`Error executing CodeLensProvider.resolveCodeLens (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				refineErrorForShim(error, this._logService),
			);
			return revivedLensForError
				? TypeConverters.CodeLens.from(
						revivedLensForError,
						commandsConverter,
						disposablesForCall,
					)
				: codeLensDtoFromMain;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideCodeActions(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		rangeOrSelectionDto: VscodeInternalRange | ISelection,
		contextDto: ExtHostCodeActionContextDto,
		tokenDto: { id?: number } | undefined,
	): Promise<extHostProtocol.ICodeActionListDto | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.CodeActionProvider>(
				providerHandle,
				"CodeAction",
			);
		if (!providerCtx) return undefined;

		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;

		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			if (!document) return undefined;

			const rangeOrSelection = Selection.isISelection(rangeOrSelectionDto)
				? TypeConverters.Selection.to(rangeOrSelectionDto)
				: TypeConverters.Range.to(rangeOrSelectionDto)!;

			const context = TypeConverters.CodeActionContext.toApiType(
				contextDto,
				this._uriTransformer,
			);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$provideCodeActions: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const result = await provider.provideCodeActions(
				document,
				rangeOrSelection,
				context,
				token,
			);

			if (result) {
				this._logDebug(
					`$provideCodeActions: Provider (Handle ${providerHandle}) returned ${result.length} items. Marshalling...`,
				);
				return TypeConverters.CodeAction.fromList(
					result,
					this._nextHandle(), // list cache ID for this result set
					commandsConverter,
					registrationDisposables, // Disposables for commands defined in this list's actions
					this._uriTransformer || undefined,
					this, // Pass self as IVersionInformationProvider
				);
			}
			return undefined;
		} catch (error: any) {
			this._logError(
				`Error executing CodeActionProvider.provideCodeActions (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				refineErrorForShim(error, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $resolveCodeAction(
		providerHandle: number,
		codeActionDtoFromMain: extHostProtocol.ICodeActionDto,
		tokenDto: { id?: number } | undefined,
	): Promise<extHostProtocol.ICodeActionDto | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.CodeActionProvider>(
				providerHandle,
				"CodeAction",
			);
		if (
			!providerCtx ||
			typeof providerCtx.provider.resolveCodeAction !== "function"
		) {
			return codeActionDtoFromMain;
		}

		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;
		let revivedActionForError: vscode.CodeAction | undefined;

		try {
			const apiActionToResolve = TypeConverters.CodeAction.toApi(
				codeActionDtoFromMain,
				commandsConverter,
				this._uriTransformer,
			);
			revivedActionForError = apiActionToResolve;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$resolveCodeAction: Calling provider.resolve (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const resolvedApiAction = await provider.resolveCodeAction(
				apiActionToResolve,
				token,
			);

			if (!resolvedApiAction) return codeActionDtoFromMain;

			this._logDebug(
				`$resolveCodeAction: Provider (Handle ${providerHandle}) returned resolved action. Marshalling...`,
			);
			const resolvedDto = TypeConverters.CodeAction.from(
				resolvedApiAction,
				commandsConverter,
				disposablesForCall, // Use operation's disposables for resolved action's (potentially new) command
				this._uriTransformer || undefined,
				this, // Pass self as IVersionInformationProvider
			);
			resolvedDto.cacheId = codeActionDtoFromMain.cacheId; // Preserve original ChainedCacheId
			return resolvedDto;
		} catch (error: any) {
			this._logError(
				`Error executing CodeActionProvider.resolveCodeAction (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				refineErrorForShim(error, this._logService),
			);
			return revivedActionForError
				? TypeConverters.CodeAction.from(
						revivedActionForError,
						commandsConverter,
						disposablesForCall,
						this._uriTransformer,
						this,
					)
				: codeActionDtoFromMain;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDocumentFormattingEdits(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		optionsDto: extHostProtocol.languages.FormattingOptions,
		tokenDto: { id?: number } | undefined,
	): Promise<extHostProtocol.TextEdit[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DocumentFormattingEditProvider>(
				providerHandle,
				"DocumentFormattingEdit",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const options = TypeConverters.FormattingOptions.to(optionsDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideDocumentFormattingEdits(
				document,
				options,
				token,
			);
			return result?.map(TypeConverters.TextEdit.from);
		} catch (err: any) {
			this._logError(
				`Error in DocFormatProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDocumentRangeFormattingEdits(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		rangeDto: VscodeInternalRange,
		optionsDto: extHostProtocol.languages.FormattingOptions,
		tokenDto: { id?: number } | undefined,
	): Promise<extHostProtocol.TextEdit[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DocumentRangeFormattingEditProvider>(
				providerHandle,
				"DocumentRangeFormattingEdit",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const range = TypeConverters.Range.to(rangeDto)!;
			const options = TypeConverters.FormattingOptions.to(optionsDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideDocumentRangeFormattingEdits(
				document,
				range,
				options,
				token,
			);
			return result?.map(TypeConverters.TextEdit.from);
		} catch (err: any) {
			this._logError(
				`Error in DocRangeFormatProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideOnTypeFormattingEdits(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		positionDto: IPosition,
		ch: string,
		optionsDto: extHostProtocol.languages.FormattingOptions,
		tokenDto: { id?: number } | undefined,
	): Promise<extHostProtocol.TextEdit[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.OnTypeFormattingEditProvider>(
				providerHandle,
				"OnTypeFormattingEdit",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const position = TypeConverters.Position.to(positionDto);
			const options = TypeConverters.FormattingOptions.to(optionsDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideOnTypeFormattingEdits(
				document,
				position,
				ch,
				options,
				token,
			);
			return result?.map(TypeConverters.TextEdit.from);
		} catch (err: any) {
			this._logError(
				`Error in OnTypeFormatProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDocumentHighlights(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number } | undefined,
	): Promise<IDocumentHighlightDto[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DocumentHighlightProvider>(
				providerHandle,
				"DocumentHighlight",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const position = TypeConverters.Position.to(positionDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideDocumentHighlights(
				document,
				position,
				token,
			);
			return result?.map(TypeConverters.DocumentHighlight.from);
		} catch (err: any) {
			this._logError(
				`Error in DocHighlightProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDocumentLinks(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		tokenDto: { id?: number } | undefined,
	): Promise<ILinksListDto | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DocumentLinkProvider>(
				providerHandle,
				"DocumentLink",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideDocumentLinks(document, token);
			return TypeConverters.DocumentLink.fromList(
				result,
				this._uriTransformer,
			);
		} catch (err: any) {
			this._logError(
				`Error in DocLinkProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $resolveDocumentLink(
		providerHandle: number,
		linkDto: ILinkDto,
		tokenDto: { id?: number } | undefined,
	): Promise<ILinkDto | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DocumentLinkProvider>(
				providerHandle,
				"DocumentLink",
			);
		if (
			!providerCtx ||
			typeof providerCtx.provider.resolveDocumentLink !== "function"
		) {
			return linkDto;
		}
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const apiLink = TypeConverters.DocumentLink.to(
				linkDto,
				this._uriTransformer,
			);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.resolveDocumentLink(apiLink, token);
			return result
				? TypeConverters.DocumentLink.from(result, this._uriTransformer)
				: linkDto;
		} catch (err: any) {
			this._logError(
				`Error in resolveDocLink (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return linkDto;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideReferences(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		contextDto: IReferenceContext,
		tokenDto: { id?: number } | undefined,
	): Promise<ILocationDto[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.ReferenceProvider>(
				providerHandle,
				"Reference",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;

		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			if (!document) return undefined;
			const position = TypeConverters.Position.to(positionDto);
			const context =
				TypeConverters.ReferenceContextConverter.toApi(contextDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$provideReferences: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const result: vscode.Location[] | undefined | null =
				await provider.provideReferences(
					document,
					position,
					context,
					token,
				);

			if (result) {
				this._logDebug(
					`$provideReferences: Provider (Handle ${providerHandle}) returned ${result.length} items. Marshalling...`,
				);
				return result.map((loc) =>
					TypeConverters.location.from(loc, this._uriTransformer),
				);
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in ReferenceProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $prepareRename(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number } | undefined,
	): Promise<VscodeInternalRange | IPrepareRenameResult | undefined | null> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.RenameProvider>(
				providerHandle,
				"Rename",
			);
		if (
			!providerCtx ||
			typeof providerCtx.provider.prepareRename !== "function"
		) {
			this._logDebug(
				`$prepareRename: Provider (Handle ${providerHandle}) does not support prepareRename. Returning null.`,
			);
			return null;
		}
		const { provider, entry, disposablesForCall } = providerCtx;

		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			if (!document) return null;
			const position = TypeConverters.Position.to(positionDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$prepareRename: Calling provider.prepareRename (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const result = await provider.prepareRename(
				document,
				position,
				token,
			);

			if (result) {
				this._logDebug(
					`$prepareRename: Provider (Handle ${providerHandle}) returned result. Marshalling...`,
				);
				return TypeConverters.RenameConverter.fromApiPrepareRename(
					result,
				);
			}
			this._logDebug(
				`$prepareRename: Provider (Handle ${providerHandle}) returned no result (null/undefined).`,
			);
			return null;
		} catch (err: any) {
			if (
				err instanceof Error &&
				err.message &&
				(err.message.toLowerCase().includes("cannot be renamed") ||
					err.message.toLowerCase().includes("not a valid location"))
			) {
				this._logDebug(
					`$prepareRename: Provider (Handle ${providerHandle}) threw known 'cannot rename' error: ${err.message}. Returning null.`,
				);
				return null;
			}
			this._logError(
				`Error in RenameProvider.prepareRename (Handle ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return null;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideRenameEdits(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		positionDto: IPosition,
		newName: string,
		tokenDto: { id?: number } | undefined,
	): Promise<RpcWorkspaceEdit | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.RenameProvider>(
				providerHandle,
				"Rename",
			);
		if (!providerCtx) return undefined;
		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;

		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const position = TypeConverters.Position.to(positionDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$provideRenameEdits: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const result: vscode.WorkspaceEdit | undefined | null =
				await provider.provideRenameEdits(
					document,
					position,
					newName,
					token,
				);

			if (result) {
				this._logDebug(
					`$provideRenameEdits: Provider (Handle ${providerHandle}) returned WorkspaceEdit. Marshalling...`,
				);
				return TypeConverters.WorkspaceEdit.fromApi(
					result,
					this,
					commandsConverter,
					disposablesForCall,
					this._uriTransformer,
				);
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in RenameProvider.provideRenameEdits (Handle ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDocumentSymbols(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		tokenDto: { id?: number } | undefined,
	): Promise<RpcDocumentSymbolDto[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DocumentSymbolProvider>(
				providerHandle,
				"DocumentSymbol",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;

		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			if (!document) return undefined;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$provideDocumentSymbols: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const result = await provider.provideDocumentSymbols(
				document,
				token,
			);

			if (result) {
				// TypeConverters.DocumentSymbol.fromApiArray will handle SymbolInformation vs DocumentSymbol
				return TypeConverters.DocumentSymbol.fromApiArray(
					result,
					this._uriTransformer,
				);
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in DocumentSymbolProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideWorkspaceSymbols(
		providerHandle: number,
		query: string,
		tokenDto: { id?: number } | undefined,
	): Promise<RpcWorkspaceSymbolDto[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.WorkspaceSymbolProvider>(
				providerHandle,
				"WorkspaceSymbol",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;

		try {
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			this._logDebug(
				`$provideWorkspaceSymbols: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value}) with query "${query}"`,
			);
			const result = await provider.provideWorkspaceSymbols(query, token);

			if (result) {
				return result.map((info) =>
					TypeConverters.WorkspaceSymbol.fromApi(
						info,
						this._uriTransformer,
					),
				);
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in WorkspaceSymbolProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $resolveWorkspaceSymbol(
		providerHandle: number,
		symbolDto: RpcWorkspaceSymbolDto,
		tokenDto: { id?: number } | undefined,
	): Promise<RpcWorkspaceSymbolDto | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.WorkspaceSymbolProvider>(
				providerHandle,
				"WorkspaceSymbol",
			);
		if (
			!providerCtx ||
			typeof providerCtx.provider.resolveWorkspaceSymbol !== "function"
		) {
			return symbolDto;
		}
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const apiSymbol = TypeConverters.WorkspaceSymbol.toApi(
				symbolDto,
				this._uriTransformer,
			);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const resolvedApiSymbol = await provider.resolveWorkspaceSymbol(
				apiSymbol,
				token,
			);
			return resolvedApiSymbol
				? TypeConverters.WorkspaceSymbol.fromApi(
						resolvedApiSymbol,
						this._uriTransformer,
					)
				: symbolDto;
		} catch (err: any) {
			this._logError(
				`Error in resolveWorkspaceSymbol (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return symbolDto;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideSignatureHelp(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		contextDto: ExtHostSignatureHelpContextDto,
		tokenDto: { id?: number } | undefined,
	): Promise<ISignatureHelpDto | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.SignatureHelpProvider>(
				providerHandle,
				"SignatureHelp",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;

		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			if (!document) return undefined;
			const position = TypeConverters.Position.to(positionDto);
			const context =
				TypeConverters.SignatureHelp.contextToApi(contextDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;

			this._logDebug(
				`$provideSignatureHelp: Calling provider (Handle ${providerHandle}, Ext: ${entry.extensionId.value})`,
			);
			const result = await provider.provideSignatureHelp(
				document,
				position,
				token,
				context,
			);

			if (result) {
				return TypeConverters.SignatureHelp.fromApi(result);
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in SignatureHelpProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideFoldingRanges(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		contextDto: extHostProtocol.languages.FoldingContext,
		tokenDto: { id?: number } | undefined,
	): Promise<IFoldingRangeDto[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.FoldingRangeProvider>(
				providerHandle,
				"FoldingRange",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const apiContext: vscode.FoldingContext = contextDto as any; // STUB: requires FoldingContext DTO and TypeConverter
			_warnStub(
				"ShimLanguageFeatures.$provideFoldingRanges",
				"internal",
				"FoldingContext DTO conversion STUBBED.",
			);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideFoldingRanges(
				document,
				apiContext,
				token,
			);
			return result
				? TypeConverters.FoldingRange.fromApiArray(result)
				: undefined;
		} catch (err: any) {
			this._logError(
				`Error in FoldingRangeProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideSelectionRanges(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		positionsDto: IPosition[],
		tokenDto: { id?: number } | undefined,
	): Promise<ISelectionRangeDto[][] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.SelectionRangeProvider>(
				providerHandle,
				"SelectionRange",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const positions = positionsDto.map(TypeConverters.Position.to);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideSelectionRanges(
				document,
				positions,
				token,
			);
			return result?.map(TypeConverters.SelectionRange.fromApiArray);
		} catch (err: any) {
			this._logError(
				`Error in SelRangeProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideLinkedEditingRanges(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number } | undefined,
	): Promise<ILinkedEditingRangesDto | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.LinkedEditingRangeProvider>(
				providerHandle,
				"LinkedEditingRange",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const position = TypeConverters.Position.to(positionDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideLinkedEditingRanges(
				document,
				position,
				token,
			);
			return TypeConverters.LinkedEditingRanges.fromApi(result);
		} catch (err: any) {
			this._logError(
				`Error in LinkedEditProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDocumentSemanticTokens(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		previousResultId: string | undefined,
		tokenDto: { id?: number } | undefined,
	): Promise<ISemanticTokensDto | ISemanticTokensEditsDto | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DocumentSemanticTokensProvider>(
				providerHandle,
				"DocumentSemanticTokens",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			this._logDebug(
				`$provideDocumentSemanticTokens: Calling provider (H ${providerHandle}, E ${entry.extensionId.value})`,
			);
			let result:
				| vscode.SemanticTokens
				| vscode.SemanticTokensEdits
				| undefined
				| null = undefined;

			if (
				previousResultId &&
				typeof provider.provideDocumentSemanticTokensEdits ===
					"function"
			) {
				// STUB: Actual previous result needs to be fetched/cached by its ID.
				// For now, assume it means "provide edits if you can".
				const pseudoPreviousResult = new extHostTypes.SemanticTokens(
					new Uint32Array(),
					previousResultId,
				);
				this._logWarnOnce(
					"[SemanticTokens] provideDocumentSemanticTokensEdits previousResult STUBBED with pseudo-result.",
				);
				result = await provider.provideDocumentSemanticTokensEdits(
					document,
					pseudoPreviousResult,
					token,
				);
			}
			if (
				!result &&
				typeof provider.provideDocumentSemanticTokens === "function"
			) {
				// Fallback to full tokens
				result = await provider.provideDocumentSemanticTokens(
					document,
					token,
				);
			}

			if (result instanceof extHostTypes.SemanticTokens) {
				return TypeConverters.SemanticTokens.fromApi(result);
			} else if (result instanceof extHostTypes.SemanticTokensEdits) {
				return TypeConverters.SemanticTokensEdits.fromApi(result);
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in DocSemanticTokensProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideDocumentRangeSemanticTokens(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		rangeDto: VscodeInternalRange,
		tokenDto: { id?: number } | undefined,
	): Promise<ISemanticTokensDto | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.DocumentRangeSemanticTokensProvider>(
				providerHandle,
				"DocumentRangeSemanticTokens",
			);
		if (
			!providerCtx ||
			typeof providerCtx.provider.provideDocumentRangeSemanticTokens !==
				"function"
		)
			return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const range = TypeConverters.Range.to(rangeDto)!;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			const result = await provider.provideDocumentRangeSemanticTokens(
				document,
				range,
				token,
			);
			return result
				? TypeConverters.SemanticTokens.fromApi(result)
				: undefined;
		} catch (err: any) {
			this._logError(
				`Error in DocRangeSemanticTokensProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideInlayHints(
		providerHandle: number,
		uriDto: VSCodeUriComponents,
		rangeDto: VscodeInternalRange,
		tokenDto: { id?: number } | undefined,
	): Promise<IInlayHintsDto | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.InlayHintsProvider>(
				providerHandle,
				"InlayHints",
			);
		if (!providerCtx) return undefined;
		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriDto),
			);
			if (!document) return undefined;
			const range = TypeConverters.Range.to(rangeDto)!;
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			this._logDebug(
				`$provideInlayHints: Calling provider (H ${providerHandle}, E ${entry.extensionId.value})`,
			);
			const result: vscode.InlayHint[] | undefined | null =
				await provider.provideInlayHints(document, range, token);
			if (result) {
				this._logDebug(
					`$provideInlayHints: Provider (H ${providerHandle}) returned ${result.length} hints. Marshalling...`,
				);
				return TypeConverters.InlayHint.fromApiList(
					result,
					this._nextHandle(),
					commandsConverter,
					registrationDisposables,
					this._uriTransformer,
				);
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in InlayHintsProvider (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $resolveInlayHint(
		providerHandle: number,
		hintDtoFromMain: IInlayHintDto,
		tokenDto: { id?: number } | undefined,
	): Promise<IInlayHintDto | undefined> {
		const providerCtx =
			this._getResolvedProviderContext<vscode.InlayHintsProvider>(
				providerHandle,
				"InlayHints",
			);
		if (
			!providerCtx ||
			typeof providerCtx.provider.resolveInlayHint !== "function"
		) {
			return hintDtoFromMain;
		}
		const {
			provider,
			entry,
			commandsConverter,
			registrationDisposables,
			disposablesForCall,
		} = providerCtx;
		try {
			const apiHintToResolve = TypeConverters.InlayHint.toApi(
				hintDtoFromMain,
				commandsConverter,
				this._uriTransformer,
			);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			this._logDebug(
				`$resolveInlayHint: Calling provider.resolve (H ${providerHandle}, E ${entry.extensionId.value})`,
			);
			const resolvedApiHint = await provider.resolveInlayHint(
				apiHintToResolve,
				token,
			);
			if (!resolvedApiHint) return hintDtoFromMain;
			this._logDebug(
				`$resolveInlayHint: Provider (H ${providerHandle}) returned resolved hint. Marshalling...`,
			);
			const resolvedDto = TypeConverters.InlayHint.fromApi(
				resolvedApiHint,
				commandsConverter,
				disposablesForCall,
				this._uriTransformer,
			);
			(resolvedDto as any).data = (hintDtoFromMain as any).data; // Preserve original cacheId
			return resolvedDto;
		} catch (err: any) {
			this._logError(
				`Error in resolveInlayHint (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return hintDtoFromMain;
		} finally {
			disposablesForCall.dispose();
		}
	}

	// --- Hierarchy Methods ---
	public async $prepareCallHierarchy(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number } | undefined,
	): Promise<ICallHierarchyItemDto[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.CallHierarchyProvider>(
				providerHandle,
				"CallHierarchy",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			if (!document) return undefined;
			const position = TypeConverters.Position.to(positionDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			this._logDebug(
				`$prepareCallHierarchy: Calling provider (H ${providerHandle}, E ${entry.extensionId.value})`,
			);
			const result:
				| vscode.CallHierarchyItem
				| vscode.CallHierarchyItem[]
				| undefined
				| null = await provider.prepareCallHierarchy(
				document,
				position,
				token,
			);
			if (!result) return undefined;
			const items = Array.isArray(result) ? result : [result];
			if (items.length === 0) return [];

			const session = new CocoonHierarchySession<
				vscode.CallHierarchyItem,
				vscode.CallHierarchyProvider
			>(provider, items, this.#logServiceForShim);
			this.#callHierarchySessions.set(session.sessionId, session);
			this._logDebug(
				`$prepareCallHierarchy: Created CallHierarchy session ${session.sessionId} for Handle ${providerHandle}.`,
			);
			return items.map((item) =>
				TypeConverters.CallHierarchyItem.fromApi(
					item,
					session.sessionId,
					(item as any)._itemId,
					this._uriTransformer,
				),
			);
		} catch (err: any) {
			this._logError(
				`Error in prepareCallHierarchy (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideCallHierarchyIncomingCalls(
		itemDto: ICallHierarchyItemDto,
		tokenDto: { id?: number } | undefined,
	): Promise<IIncomingCallDto[] | undefined> {
		if (!itemDto._sessionId || !itemDto._itemId) {
			this._logError(
				"$provideCHIncoming: Item DTO missing session/item ID.",
				itemDto,
			);
			return undefined;
		}
		const session = this.#callHierarchySessions.get(itemDto._sessionId);
		if (!session) {
			this._logError(
				`$provideCHIncoming: No session ${itemDto._sessionId}.`,
			);
			return undefined;
		}
		const item = session.getItem(itemDto._itemId);
		if (!item) {
			this._logError(
				`$provideCHIncoming: Item ${itemDto._itemId} not in session ${itemDto._sessionId}.`,
			);
			return undefined;
		}
		if (
			typeof session.provider.provideCallHierarchyIncomingCalls !==
			"function"
		)
			return [];

		const operationDisposables = new DisposableStore();
		try {
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					operationDisposables,
				).token;
			this._logDebug(
				`$provideCHIncoming: Calling provider for '${item.name}' (S ${session.sessionId})`,
			);
			const result =
				await session.provider.provideCallHierarchyIncomingCalls(
					item,
					token,
				);
			if (result) {
				return result.map((call) => ({
					from: TypeConverters.CallHierarchyItem.fromApi(
						call.from,
						session.sessionId,
						session.keepItem(call.from),
						this._uriTransformer,
					),
					fromRanges: call.fromRanges.map(
						(r) => TypeConverters.Range.from(r)!,
					),
				}));
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in provideCHIncoming (S ${session.sessionId}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}

	public async $provideCallHierarchyOutgoingCalls(
		itemDto: ICallHierarchyItemDto,
		tokenDto: { id?: number } | undefined,
	): Promise<IOutgoingCallDto[] | undefined> {
		if (!itemDto._sessionId || !itemDto._itemId) {
			this._logError(
				"$provideCHOutgoing: Item DTO missing session/item ID.",
				itemDto,
			);
			return undefined;
		}
		const session = this.#callHierarchySessions.get(itemDto._sessionId);
		if (!session) {
			this._logError(
				`$provideCHOutgoing: No session ${itemDto._sessionId}.`,
			);
			return undefined;
		}
		const item = session.getItem(itemDto._itemId);
		if (!item) {
			this._logError(
				`$provideCHOutgoing: Item ${itemDto._itemId} not in session ${itemDto._sessionId}.`,
			);
			return undefined;
		}
		if (
			typeof session.provider.provideCallHierarchyOutgoingCalls !==
			"function"
		)
			return [];

		const operationDisposables = new DisposableStore();
		try {
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					operationDisposables,
				).token;
			this._logDebug(
				`$provideCHOutgoing: Calling provider for '${item.name}' (S ${session.sessionId})`,
			);
			const result =
				await session.provider.provideCallHierarchyOutgoingCalls(
					item,
					token,
				);
			if (result) {
				return result.map((call) => ({
					to: TypeConverters.CallHierarchyItem.fromApi(
						call.to,
						session.sessionId,
						session.keepItem(call.to),
						this._uriTransformer,
					),
					fromRanges: call.fromRanges.map(
						(r) => TypeConverters.Range.from(r)!,
					),
				}));
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error in provideCHOutgoing (S ${session.sessionId}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}

	public async $releaseCallHierarchySession(
		sessionId: string,
	): Promise<void> {
		const session = this.#callHierarchySessions.get(sessionId);
		if (session) {
			this._logDebug(`Releasing CallHierarchy session: ${sessionId}`);
			session.dispose();
			this.#callHierarchySessions.delete(sessionId);
		}
	}

	public async $prepareTypeHierarchy(
		providerHandle: number,
		uriComponentsDto: VSCodeUriComponents,
		positionDto: IPosition,
		tokenDto: { id?: number } | undefined,
	): Promise<ITypeHierarchyItemDto[] | undefined> {
		const providerCtx =
			this._getProviderInstanceAndContext<vscode.TypeHierarchyProvider>(
				providerHandle,
				"TypeHierarchy",
			);
		if (!providerCtx) return undefined;
		const { provider, entry, disposablesForCall } = providerCtx;
		try {
			const document = this.#documents.getDocument(
				this._reviveApiArgument<vscode.Uri>(uriComponentsDto),
			);
			if (!document) return undefined;
			const position = TypeConverters.Position.to(positionDto);
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					disposablesForCall,
				).token;
			this._logDebug(
				`$prepareTypeHierarchy: Calling provider (H ${providerHandle}, E ${entry.extensionId.value})`,
			);
			const result = await provider.prepareTypeHierarchy(
				document,
				position,
				token,
			);
			if (!result) return undefined;
			const items = Array.isArray(result) ? result : [result];
			if (items.length === 0) return [];

			const session = new CocoonHierarchySession<
				vscode.TypeHierarchyItem,
				vscode.TypeHierarchyProvider
			>(provider, items, this.#logServiceForShim);
			this.#typeHierarchySessions.set(session.sessionId, session);
			this._logDebug(
				`$prepareTypeHierarchy: Created TypeHierarchy session ${session.sessionId} for Handle ${providerHandle}.`,
			);
			return items.map((item) =>
				TypeConverters.TypeHierarchyItem.fromApi(
					item,
					session.sessionId,
					(item as any)._itemId,
					this._uriTransformer,
				),
			);
		} catch (err: any) {
			this._logError(
				`Error in prepareTypeHierarchy (H ${providerHandle}, E ${entry.extensionId.value}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			disposablesForCall.dispose();
		}
	}

	public async $provideTypeHierarchySupertypes(
		itemDto: ITypeHierarchyItemDto,
		tokenDto: { id?: number } | undefined,
	): Promise<ITypeHierarchyItemDto[] | undefined> {
		if (!itemDto._sessionId || !itemDto._itemId) {
			this._logError(
				"$provideTHSuper: Item DTO missing session/item ID.",
				itemDto,
			);
			return undefined;
		}
		const session = this.#typeHierarchySessions.get(itemDto._sessionId);
		if (!session) {
			this._logError(
				`$provideTHSuper: No session ${itemDto._sessionId}.`,
			);
			return undefined;
		}
		const item = session.getItem(itemDto._itemId);
		if (!item) {
			this._logError(
				`$provideTHSuper: Item ${itemDto._itemId} not in session ${itemDto._sessionId}.`,
			);
			return undefined;
		}
		if (
			typeof session.provider.provideTypeHierarchySupertypes !==
			"function"
		)
			return [];

		const operationDisposables = new DisposableStore();
		try {
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					operationDisposables,
				).token;
			this._logDebug(
				`$provideTHSuper: Calling provider for '${item.name}' (S ${session.sessionId})`,
			);
			const result =
				await session.provider.provideTypeHierarchySupertypes(
					item,
					token,
				);
			return result?.map((supertype) =>
				TypeConverters.TypeHierarchyItem.fromApi(
					supertype,
					session.sessionId,
					session.keepItem(supertype),
					this._uriTransformer,
				),
			);
		} catch (err: any) {
			this._logError(
				`Error in provideTHSuper (S ${session.sessionId}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}

	public async $provideTypeHierarchySubtypes(
		itemDto: ITypeHierarchyItemDto,
		tokenDto: { id?: number } | undefined,
	): Promise<ITypeHierarchyItemDto[] | undefined> {
		if (!itemDto._sessionId || !itemDto._itemId) {
			this._logError(
				"$provideTHSub: Item DTO missing session/item ID.",
				itemDto,
			);
			return undefined;
		}
		const session = this.#typeHierarchySessions.get(itemDto._sessionId);
		if (!session) {
			this._logError(`$provideTHSub: No session ${itemDto._sessionId}.`);
			return undefined;
		}
		const item = session.getItem(itemDto._itemId);
		if (!item) {
			this._logError(
				`$provideTHSub: Item ${itemDto._itemId} not in session ${itemDto._sessionId}.`,
			);
			return undefined;
		}
		if (typeof session.provider.provideTypeHierarchySubtypes !== "function")
			return [];

		const operationDisposables = new DisposableStore();
		try {
			const token =
				this.#cancellationTokenRegistry.obtainTokenAndDisposable(
					tokenDto?.id || 0,
					operationDisposables,
				).token;
			this._logDebug(
				`$provideTHSub: Calling provider for '${item.name}' (S ${session.sessionId})`,
			);
			const result = await session.provider.provideTypeHierarchySubtypes(
				item,
				token,
			);
			return result?.map((subtype) =>
				TypeConverters.TypeHierarchyItem.fromApi(
					subtype,
					session.sessionId,
					session.keepItem(subtype),
					this._uriTransformer,
				),
			);
		} catch (err: any) {
			this._logError(
				`Error in provideTHSub (S ${session.sessionId}):`,
				refineErrorForShim(err, this._logService),
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}

	public async $releaseTypeHierarchySession(
		sessionId: string,
	): Promise<void> {
		const session = this.#typeHierarchySessions.get(sessionId);
		if (session) {
			this._logDebug(`Releasing TypeHierarchy session: ${sessionId}`);
			session.dispose();
			this.#typeHierarchySessions.delete(sessionId);
		}
	}

	// TODO: Document Colors ($provideDocumentColors, $provideColorPresentations)
	// TODO: Paste Edit ($preparePasteEdit, $providePasteEdits)
	// TODO: Drop Edit ($provideDocumentOnDropEdits)

	public override dispose(): void {
		super.dispose();
		this.#providerStore.forEach((entry) =>
			entry.registrationDisposables.dispose(),
		);
		this.#providerStore.clear();
		this.#callHierarchySessions.forEach((session) => session.dispose());
		this.#callHierarchySessions.clear();
		this.#typeHierarchySessions.forEach((session) => session.dispose());
		this.#typeHierarchySessions.clear();
		this._logInfo(
			"ShimLanguageFeatures disposed: Provider store and hierarchy sessions cleared, base resources released.",
		);
	}
}
