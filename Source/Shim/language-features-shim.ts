/*---------------------------------------------------------------------------------------------
 * Cocoon Language Features Shim (shims/language-features-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `VscodeExtHostLanguageFeaturesShape` (from `extHost.protocol.ts`), which is
 * the ExtHost-side counterpart for language feature providers. This service is central to
 * enabling features like IntelliSense (hover, completion), navigation (go to definition),
 * code actions, formatting, and more.
 *
 * It acts as a registry for language providers contributed by extensions and as an RPC
 * endpoint for the MainThread (Mountain) to invoke these providers.
 *
 * Responsibilities:
 * - Provider Registration (methods called by `ShimLanguages` - the `vscode.languages` API shim):
 *   - Provides `$register*Provider` methods (e.g., `$registerHoverProvider`,
 *     `$registerCompletionItemProvider`).
 *   - When a provider is registered:
 *     - It generates a unique handle for the provider.
 *     - Stores the provider instance, its document selector, and any metadata locally.
 *     - Notifies `MainThreadLanguageFeatures` (on Mountain) via an RPC call, passing
 *       the handle, selector (as DTOs), and any relevant provider metadata DTOs.
 * - Provider Unregistration:
 *   - Implements `$unregisterProvider(handle)` to remove a provider locally and notify
 *     the MainThread via RPC.
 * - Provider Execution (RPC methods called BY Mountain):
 *   - Implements `$provide*` and `$resolve*` methods (e.g., `$provideHover`,
 *     `$provideCompletionItems`, `$resolveCompletionItem`).
 *   - When Mountain requests a language feature (e.g., hover information for a
 *     specific document position):
 *     - It retrieves the appropriate registered provider based on the handle.
 *     - Obtains the relevant `vscode.TextDocument` from `CocoonDocumentService`.
 *     - Revives RPC arguments (like position, context DTOs) into VS Code API types.
 *     - Calls the provider's method (e.g., `provider.provideHover(...)`).
 *     - Marshals the result from the provider (VS Code API types) back into DTOs
 *       suitable for RPC transmission to Mountain.
 * - Argument/Result Marshalling: Relies on `BaseCocoonShim` utilities and placeholder
 *   `typeConvert` functions for converting between VS Code API types and RPC DTOs.
 *   Full, accurate conversion requires a more complete `typeConverter` implementation.
 *
 * Key Interactions:
 * - An instance of `ShimLanguageFeatures` is registered with DI in `Cocoon/index.ts`
 *   as `IExtHostLanguageFeatures`.
 * - The `vscode.languages` API object (provided by `ShimLanguages`) delegates all
 *   provider registration calls to this service.
 * - Communicates extensively with `MainContext.MainThreadLanguageFeatures` on Mountain
 *   via RPC for provider registration/unregistration and for receiving execution requests.
 * - Is itself an RPC service target for calls from Mountain, identified by
 *   `ExtHostContext.ExtHostLanguageFeatures`.
 * - Depends on `CocoonDocumentService` to resolve URIs to `vscode.TextDocument` instances.
 * - Uses `BaseCocoonShim` for common utilities.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vs/base/common/cancellation";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle"; // For NOP disposables
import { MarshalledId } from "vs/base/common/marshalling"; // For URI DTO checks
import {
	ExtHostContext, // For registering this service for RPC from MainThread
	MainContext, // For proxying to MainThreadLanguageFeatures
	// Provider registration DTOs & RPC Shapes from extHost.protocol.ts
	type CodeActionProviderMetadataDto,
	type CompletionContextDto as ExtHostCompletionContextDto,
	type SignatureHelpContextDto as ExtHostSignatureHelpContextDto,
	type IDocumentFilterDto,
	type IPosition, // Protocol DTO for position (0-based)
	// Result DTOs from protocol (examples)
	type ICodeActionDto as RpcCodeAction,
	type ICodeActionListDto as RpcCodeActionList,
	type ICodeLensDto as RpcCodeLens,
	type ICodeLensListDto as RpcCodeLensList,
	type ICommandDto as RpcCommand,
	type ILinkDto as RpcLink,
	type ILinksListDto as RpcLinksList,
	type ILocationLinkDto as RpcLocationLink,
	type ISuggestDataDto as RpcSuggestData, // DTO for a single completion item
	type ISuggestResultDto as RpcSuggestResult, // DTO for a list of completion items / CompletionList
	type IWorkspaceEditDto as RpcWorkspaceEdit, // For CodeAction.edit or RenameProvider.provideRenameEdits
	type SignatureHelpProviderMetadataDto,
	type ExtHostLanguageFeaturesShape as VscodeExtHostLanguageFeaturesShape, // This service implements this RPC shape
	type IRange as VscodeInternalRange, // Protocol DTO for range (0-based)
	type UriComponents as VSCodeInternalUriComponents,
	type MainThreadLanguageFeaturesShape as VscodeMainThreadLanguageFeaturesShape, // Proxy to MainThread
} from "vs/workbench/api/common/extHost.protocol";

// Import vscode API types (from ../Shim/out/vscode or actual vscode namespace)
import {
	// Provider Interfaces (these are what extensions implement)
	CallHierarchyProvider,
	CodeActionProvider,
	CodeLensProvider,
	CompletionItemProvider,
	DeclarationProvider,
	DefinitionProvider,
	DocumentColorProvider,
	DocumentFormattingEditProvider,
	DocumentHighlightProvider,
	DocumentLinkProvider,
	DocumentRangeFormattingEditProvider,
	FoldingRangeProvider,
	HoverProvider,
	ImplementationProvider,
	InlayHintsProvider,
	LinkedEditingRangeProvider,
	OnTypeFormattingEditProvider,
	ReferenceProvider,
	RenameProvider,
	SelectionRangeProvider,
	SignatureHelpProvider,
	TypeDefinitionProvider,
	TypeHierarchyProvider,
	Uri as VscodeApiUri, // API type
	// vscode API types used in provider methods and results
	CodeActionContext as VscodeCodeActionContext, // Distinguish from DTO
	CompletionContext as VscodeCompletionContext, // Distinguish from DTO
	Location as VscodeLocation,
	Position as VscodePosition, // API type (0-based)
	Range as VscodeRange, // API type (0-based)
	SignatureHelpContext as VscodeSignatureHelpContext, // Distinguish from DTO
	WorkspaceSymbolProvider,
	type CallHierarchyIncomingCall,
	type CallHierarchyItem,
	type CallHierarchyOutgoingCall,
	type DocumentHighlight,
	type DocumentSelector,
	type FoldingRange,
	type FormattingOptions,
	type Implementation,
	type InlayHint,
	type LinkedEditingRanges,
	type OnTypeFormattingEditProviderOptions,
	type ReferenceContext,
	type RenameLocation,
	type SelectionRange,
	type SymbolInformation,
	type TextDocument,
	type TextEdit,
	type TypeDefinition,
	type TypeHierarchyItem,
	type CodeAction as VscodeCodeAction,
	type CodeActionProviderMetadata as VscodeCodeActionProviderMetadata, // API type
	type CodeLens as VscodeCodeLens,
	type Command as VscodeCommand, // API type
	type CompletionItem as VscodeCompletionItem,
	type CompletionList as VscodeCompletionList,
	type Declaration as VscodeDeclaration, // Usually Definition | Location | LocationLink | (Definition | Location | LocationLink)[]
	type Definition as VscodeDefinition, // Usually Location | LocationLink | (Location | LocationLink)[]
	type DefinitionLink as VscodeDefinitionLink,
	type DocumentLink as VscodeDocumentLink,
	type Hover as VscodeHover,
	type SignatureHelp as VscodeSignatureHelp,
	type SignatureHelpProviderMetadata as VscodeSignatureHelpProviderMetadata, // API type
	// WorkspaceEdit is also an API type
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
import type { CocoonDocumentService } from "./document-shim"; // Use concrete class

// --- Placeholder for extHostTypeConverters ---
// In a real VS Code ExtHost, this would be `import * as typeConverters from 'vs/workbench/api/common/extHostTypeConverters';`
// This MOCK will not perform real conversions for complex types.
// TODO: Implement or integrate proper type converters for full fidelity.
const localTypeConverters = {
	DocumentSelector: {
		from: (
			selector: DocumentSelector | null,
			_uriTransformer?: any,
		): IDocumentFilterDto[] => {
			if (!selector) return [];
			const selectors = Array.isArray(selector) ? selector : [selector];
			return selectors
				.map((s) => {
					if (typeof s === "string")
						return {
							language: s,
							scheme: undefined,
							pattern: undefined,
						} as IDocumentFilterDto;
					if (typeof s === "object" && s !== null) {
						// LanguageFilter
						return {
							language: s.language,
							scheme: s.scheme,
							pattern:
								typeof s.pattern === "string"
									? s.pattern
									: (s.pattern as any)?.toString(), // Handle GlobPattern
							notebookType: s.notebookType, // Added in newer APIs
							exclusive: s.exclusive, // Added in newer APIs
						} as IDocumentFilterDto;
					}
					return undefined;
				})
				.filter(Boolean) as IDocumentFilterDto[];
		},
	},
	CompletionContext: {
		to: (dto: ExtHostCompletionContextDto): VscodeCompletionContext =>
			dto as any,
	},
	CodeActionContext: {
		to: (dto: ExtHostCodeActionContextDto): VscodeCodeActionContext =>
			dto as any,
	},
	SignatureHelpContext: {
		to: (dto: ExtHostSignatureHelpContextDto): VscodeSignatureHelpContext =>
			dto as any,
	},
	Range: {
		// Already used by document-shim, should be consistent
		to: (rangeDto: VscodeInternalRange | undefined): VscodeRange => {
			if (!rangeDto) return new VscodeRange(0, 0, 0, 0);
			return new VscodeRange(
				rangeDto.startLineNumber,
				rangeDto.startColumn,
				rangeDto.endLineNumber,
				rangeDto.endColumn,
			);
		},
	},
	DefinitionLink: {
		// Example: Needs proper marshalling of URIs within the link
		from: (
			link: VscodeDefinitionLink | VscodeLocation,
			base: BaseCocoonShim,
		): RpcLocationLink | undefined => {
			if (!link) return undefined;
			const item = Array.isArray(link) ? link[0] : link; // Handle if provider returns array for single Definition
			if (!item) return undefined;

			if ("targetUri" in item && "targetRange" in item) {
				// VscodeDefinitionLink
				return {
					uri: base._convertApiArgToInternal(item.targetUri), // Use BaseCocoonShim marshaller
					range: item.targetRange, // Range is already 0-based, DTO compatible
					targetSelectionRange: item.targetSelectionRange,
					originSelectionRange: item.originSelectionRange,
				} as RpcLocationLink;
			} else if ("uri" in item && "range" in item) {
				// VscodeLocation (can be part of VscodeDefinition)
				return {
					uri: base._convertApiArgToInternal(item.uri),
					range: item.range,
				} as RpcLocationLink;
			}
			return undefined;
		},
		fromMany: (
			items: ReadonlyArray<VscodeDefinitionLink | VscodeLocation>,
			base: BaseCocoonShim,
		): RpcLocationLink[] => {
			if (!items) return [];
			return items
				.map((i) => localTypeConverters.DefinitionLink.from(i, base))
				.filter(Boolean) as RpcLocationLink[];
		},
	},
	CodeAction: {
		// Example
		fromMany: (
			actions: ReadonlyArray<VscodeCommand | VscodeCodeAction>,
			base: BaseCocoonShim,
		): (RpcCommand | RpcCodeAction)[] => {
			return actions.map((a) => base._convertApiArgToInternal(a)) as (
				| RpcCommand
				| RpcCodeAction
			)[];
		},
	},
	CodeLens: {
		// Example
		fromMany: (
			lenses: ReadonlyArray<VscodeCodeLens>,
			base: BaseCocoonShim,
		): RpcCodeLens[] => {
			return lenses.map((l) =>
				base._convertApiArgToInternal(l),
			) as RpcCodeLens[];
		},
	},
	CodeActionProviderMetadata: {
		toDto: (
			metadata?: VscodeCodeActionProviderMetadata,
		): CodeActionProviderMetadataDto | undefined => {
			if (!metadata) return undefined;
			return {
				providedCodeActionKinds: metadata.providedCodeActionKinds?.map(
					(kind) => kind.value,
				),
				documentation: metadata.documentation?.map((doc) => ({
					value: doc.value,
					kind: doc.kind.value,
				})), // Assuming doc.kind is CodeActionTriggerKind with a value
			} as CodeActionProviderMetadataDto;
		},
	},
	SignatureHelpProviderMetadata: {
		toDto: (
			metadata?: VscodeSignatureHelpProviderMetadata,
		): SignatureHelpProviderMetadataDto | undefined => {
			if (!metadata) return undefined;
			return {
				triggerCharacters: metadata.triggerCharacters,
				retriggerCharacters: metadata.retriggerCharacters,
			} as SignatureHelpProviderMetadataDto;
		},
	},
	// TODO: Add converters for all other complex types passed via RPC for language features.
	// Hover, CompletionItem/List, SignatureHelp, DocumentLink, TextEdit, WorkspaceEdit, etc.
};

/** Dummy Extension ID for registrations made by the shim itself if needed. */
const SENDER_EXTENSION_ID_FOR_REGISTRATION: ExtensionIdentifier =
	new ExtensionIdentifier("cocoon.languagefeatures.shim_internal");

/**
 * Internal structure for storing language provider registration details.
 */
interface ProviderRegistrationEntry {
	provider: any; // The actual language provider instance (e.g., HoverProvider, CompletionItemProvider)
	selector: DocumentSelector | null; // The DocumentSelector for this provider, null for workspace-wide providers
	type: string; // A string identifying the provider type (e.g., "Hover", "Completion")
	// Provider-specific options/metadata stored with registration:
	triggerCharacters?: ReadonlyArray<string>; // For CompletionItemProvider, SignatureHelpProvider
	completionOptions?: { supportsResolveDetails?: boolean }; // For CompletionItemProvider
	codeActionOptions?: {
		metadataDto?: CodeActionProviderMetadataDto;
		displayName?: string;
	}; // For CodeActionProvider
	signatureHelpOptions?: { metadataDto?: SignatureHelpProviderMetadataDto }; // For SignatureHelpProvider
	codeLensEventHandle?: number; // Handle for onDidChangeCodeLenses event, if applicable
	inlayHintsEventHandle?: number; // Handle for onDidChangeInlayHints event
}

/**
 * Cocoon's implementation of `VscodeExtHostLanguageFeaturesShape`.
 * It manages language feature provider registrations and executes provider methods
 * when invoked by Mountain via RPC.
 */
export class ShimLanguageFeatures
	extends BaseCocoonShim
	implements VscodeExtHostLanguageFeaturesShape
{
	public readonly _serviceBrand: undefined; // For IExtHostLanguageFeatures DI

	readonly #mainThreadLanguageFeaturesProxy: VscodeMainThreadLanguageFeaturesShape | null =
		null;
	#providerHandlePool = 0; // Counter for generating unique provider handles
	readonly #providerStore = new Map<number, ProviderRegistrationEntry>(); // Stores registered providers by handle
	readonly #extHostDocuments: CocoonDocumentService; // For resolving document URIs

	/**
	 * Creates an instance of ShimLanguageFeatures.
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 * @param extHostDocuments The document service for resolving URIs to TextDocuments.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		extHostDocuments: CocoonDocumentService,
	) {
		super("ExtHostLanguageFeatures", rpcService, logService);
		this._log("Initializing...");

		if (!extHostDocuments) {
			// Critical dependency
			this._logError(
				"CRITICAL: CocoonDocumentService (extHostDocuments) not provided! Language features will be severely impaired.",
			);
		}
		this.#extHostDocuments = extHostDocuments;

		if (this._rpcService) {
			this.#mainThreadLanguageFeaturesProxy = this._getProxy(
				MainContext.MainThreadLanguageFeatures as ProxyIdentifier<VscodeMainThreadLanguageFeaturesShape>,
			);
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostLanguageFeatures as ProxyIdentifier<VscodeExtHostLanguageFeaturesShape>,
					this,
				);
				this._log(
					"Registered self for incoming RPC calls (ExtHostLanguageFeatures).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostLanguageFeatures):",
					e,
				);
			}
		}

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"Failed to get MainThreadLanguageFeatures RPC proxy! Provider registration and execution will be impaired or fail.",
			);
		}
	}

	/** Generic helper to register a language provider with the MainThread. */
	private async _registerProviderOnMainThread<P>(
		providerTypeString: string,
		providerInstance: P,
		selector: DocumentSelector | null,
		// Function that takes the proxy, handle, selector DTO, and specific args DTO, then calls the actual MainThread RPC method.
		mainThreadRegisterRpcCall: (
			proxy: VscodeMainThreadLanguageFeaturesShape,
			handle: number,
			selectorDto: IDocumentFilterDto[],
			providerSpecificArgsForDto?: any,
			extensionIdForRpc?: ExtensionIdentifier, // Pass ExtensionIdentifier for MainThread
		) => Promise<void>,
		providerSpecificArgsForStorageAndDto?: any, // Args needed for DTO conversion or local storage
		extensionIdForRegistration: ExtensionIdentifier = SENDER_EXTENSION_ID_FOR_REGISTRATION, // Extension registering this provider
	): Promise<number> {
		// Returns the handle
		const handle = ++this.#providerHandlePool;
		const registrationEntry: ProviderRegistrationEntry = {
			provider: providerInstance,
			selector,
			type: providerTypeString,
			...providerSpecificArgsForStorageAndDto, // Store relevant options like triggerChars, metadata
		};
		this.#providerStore.set(handle, registrationEntry);
		// this._log(`Locally registered ${providerTypeString}Provider (Handle: ${handle}). Selector: ${JSON.stringify(selector)}`);

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this.#providerStore.delete(handle); // Rollback local registration
			const errorMsg = `Cannot register ${providerTypeString}Provider with MainThread: RPC proxy unavailable.`;
			this._logError(errorMsg);
			throw new Error(errorMsg);
		}

		try {
			const selectorDtoArray = localTypeConverters.DocumentSelector.from(
				selector,
				undefined /* uriTransformer not used here */,
			);
			await mainThreadRegisterRpcCall(
				this.#mainThreadLanguageFeaturesProxy,
				handle,
				selectorDtoArray,
				providerSpecificArgsForStorageAndDto, // Pass args needed for the specific DTO
				extensionIdForRegistration,
			);
			// this._log(`${providerTypeString}Provider (Handle: ${handle}) registration request sent to MainThread.`);
			return handle;
		} catch (e: any) {
			this.#providerStore.delete(handle); // Rollback on RPC failure
			this._logError(
				`RPC failed for ${providerTypeString}Provider (Handle: ${handle}) registration:`,
				e,
			);
			throw refineErrorForShim(
				e,
				this._logService,
				`register${providerTypeString}Provider`,
			);
		}
	}

	// --- $register*Provider Methods (Called by ShimLanguages) ---
	// These methods are part of VscodeExtHostLanguageFeaturesShape but are called locally by ShimLanguages,
	// not typically over RPC from MainThread to ExtHost.

	public $registerHoverProvider(
		selector: DocumentSelector,
		provider: HoverProvider,
		extensionId: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread(
			"Hover",
			provider,
			selector,
			(proxy, h, selDto, _args, extId) =>
				proxy.$registerHoverProvider(h, selDto, extId!),
			undefined,
			extensionId,
		);
	}

	public $registerCompletionItemProvider(
		selector: DocumentSelector,
		provider: CompletionItemProvider,
		triggerCharacters: string[],
		extensionId: ExtensionIdentifier,
	): Promise<number> {
		const supportsResolveDetails =
			typeof provider.resolveCompletionItem === "function";
		const storageAndDtoArgs = {
			triggerCharacters,
			completionOptions: { supportsResolveDetails },
		};
		return this._registerProviderOnMainThread(
			"Completion",
			provider,
			selector,
			(proxy, h, selDto, args, extId) =>
				proxy.$registerCompletionsProvider(
					h,
					selDto,
					args.triggerCharacters,
					args.completionOptions.supportsResolveDetails,
					extId!,
				),
			storageAndDtoArgs,
			extensionId,
		);
	}

	public $registerDefinitionProvider(
		selector: DocumentSelector,
		provider: DefinitionProvider,
		extensionId: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread(
			"Definition",
			provider,
			selector,
			(proxy, h, selDto, _args, extId) =>
				proxy.$registerDefinitionProvider(h, selDto, extId!), // Protocol uses $registerDefinitionProvider
			undefined,
			extensionId,
		);
	}

	public $registerCodeLensProvider(
		selector: DocumentSelector,
		provider: CodeLensProvider,
		extensionId: ExtensionIdentifier,
	): Promise<number> {
		// TODO: Handle onDidChangeCodeLenses event from provider if it exists.
		// This would involve creating an event handle to send to MainThread.
		// const eventHandle = provider.onDidChangeCodeLenses ? wireUpProviderEeventAndGetHandle(provider.onDidChangeCodeLenses, '$emitCodeLensEvent') : undefined;
		const eventHandle: number | undefined = undefined; // Placeholder

		if (!this.#mainThreadLanguageFeaturesProxy?.$registerCodeLensProvider) {
			// Check if specific method exists
			this._logWarnOnce(
				`MainThreadLanguageFeatures.$registerCodeLensProvider not available. CodeLensProvider for ext '${extensionId.value}' might only be registered locally or use a generic method.`,
			);
			// Fallback to generic registration or local only if specific RPC method isn't on proxy
			const handle = ++this.#providerHandlePool;
			this.#providerStore.set(handle, {
				provider,
				selector,
				type: "CodeLens",
			});
			return Promise.resolve(handle);
		}
		return this._registerProviderOnMainThread(
			"CodeLens",
			provider,
			selector,
			(proxy, h, selDto, _args, extId) =>
				proxy.$registerCodeLensProvider!(
					h,
					selDto,
					eventHandle,
					extId!,
				),
			undefined,
			extensionId,
		);
	}

	public $registerCodeActionProvider(
		selector: DocumentSelector,
		provider: CodeActionProvider,
		metadata: VscodeCodeActionProviderMetadata | undefined,
		extensionId: ExtensionIdentifier,
	): Promise<number> {
		const metadataDto =
			localTypeConverters.CodeActionProviderMetadata.toDto(metadata);
		const displayName =
			typeof (provider as any).displayName === "string"
				? (provider as any).displayName
				: undefined; // VS Code internal property
		const storageAndDtoArgs = {
			codeActionOptions: { metadataDto, displayName },
		};

		if (
			!this.#mainThreadLanguageFeaturesProxy?.$registerCodeActionProvider
		) {
			this._logWarnOnce(
				`MainThreadLanguageFeatures.$registerCodeActionProvider not available. CodeActionProvider for ext '${extensionId.value}' might only be registered locally.`,
			);
			const handle = ++this.#providerHandlePool;
			this.#providerStore.set(handle, {
				provider,
				selector,
				type: "CodeAction",
				...storageAndDtoArgs,
			});
			return Promise.resolve(handle);
		}
		return this._registerProviderOnMainThread(
			"CodeAction",
			provider,
			selector,
			(proxy, h, selDto, args, extId) =>
				proxy.$registerCodeActionProvider!(
					h,
					selDto,
					args.codeActionOptions.metadataDto,
					args.codeActionOptions.displayName,
					extId!,
					undefined /* onDidChangeCodeActions handle - TODO */,
				),
			storageAndDtoArgs,
			extensionId,
		);
	}

	// TODO: Implement ALL other $register*Provider methods from VscodeExtHostLanguageFeaturesShape:
	// $registerDeclarationProvider, $registerDocumentFormattingEditProvider, $registerDocumentHighlightProvider,
	// $registerDocumentLinkProvider, $registerDocumentRangeFormattingEditProvider, $registerOnTypeFormattingEditProvider,
	// $registerReferenceProvider, $registerRenameProvider, $registerSignatureHelpProvider,
	// $registerImplementationProvider, $registerTypeDefinitionProvider, $registerWorkspaceSymbolProvider,
	// $registerSelectionRangeProvider, $registerCallHierarchyProvider, $registerTypeHierarchyProvider,
	// $registerLinkedEditingRangeProvider, $registerInlayHintsProvider, $registerDocumentColorProvider,
	// $registerFoldingRangeProvider.
	// Each will follow the pattern:
	// 1. Extract provider-specific options/metadata (e.g., trigger chars, event handles).
	// 2. Call `_registerProviderOnMainThread` with the correct type string, provider, selector, RPC call lambda, options, and extensionId.
	// 3. The RPC call lambda must match the signature of the corresponding `$register<Feature>Provider` on `VscodeMainThreadLanguageFeaturesShape`.

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$unregister} */
	public async $unregister(handle: number): Promise<void> {
		// Note: protocol uses generic $unregister
		// this._logService?.trace(`RPC $unregisterProvider called for Handle: ${handle}`);
		const registration = this.#providerStore.get(handle);
		if (this.#providerStore.delete(handle)) {
			// this._log(`Locally unregistered provider (Handle: ${handle}, Type: ${registration?.type})`);
			// TODO: If provider had an onDidChange event associated with an eventHandle, dispose its subscription/emitter here.
		} else {
			this._logWarn(
				`Attempted to unregister non-existent local provider (Handle: ${handle})`,
			);
		}

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"Cannot send unregister request for provider: MainThreadLanguageFeatures RPC proxy unavailable.",
			);
			return; // Don't throw, just log and fail to unregister on main.
		}
		try {
			await this.#mainThreadLanguageFeaturesProxy.$unregister(handle); // MainThread uses generic $unregister
			// this._log(`Unregistration request sent to MainThread for Handle ${handle}.`);
		} catch (e: any) {
			this._logError(
				`Failed to send unregister request for Handle ${handle} via RPC:`,
				e,
			);
			// Don't rethrow from unregister, but log the error.
			refineErrorForShim(
				e,
				this._logService,
				`unregisterProvider(${handle})`,
			);
		}
	}

	// --- Provider Execution Methods (Called BY Mountain via RPC as part of VscodeExtHostLanguageFeaturesShape) ---

	/** Internal helper to retrieve a registered provider and its specified method. */
	private _getProviderAndMethodInternal<P, M extends keyof P>(
		handle: number,
		methodName: M,
		expectedProviderType: string,
	): {
		provider: P;
		method: P[M];
		registration: ProviderRegistrationEntry;
	} | null {
		const registration = this.#providerStore.get(handle);
		if (!registration) {
			this._logError(
				`Provider execution failed: No registration found for Handle ${handle} (expected type: ${expectedProviderType}).`,
			);
			return null;
		}
		if (registration.type !== expectedProviderType) {
			this._logError(
				`Provider execution failed: Handle ${handle} type mismatch. Expected '${expectedProviderType}', but found '${registration.type}'.`,
			);
			return null;
		}
		const provider = registration.provider as P;
		if (!provider || typeof provider[methodName] !== "function") {
			this._logError(
				`Provider execution failed: ${expectedProviderType}Provider (Handle ${handle}) or its method '${String(methodName)}' is missing or not a function.`,
			);
			return null;
		}
		return { provider, method: provider[methodName] as P[M], registration };
	}

	/** Internal helper to get a TextDocument from URI components received via RPC. */
	private _getTextDocumentFromRpc(
		uriComponents: VSCodeInternalUriComponents | undefined,
	): TextDocument | null {
		if (!uriComponents) {
			this._logError(
				"Cannot get document for provider execution: URI components are undefined.",
			);
			return null;
		}
		const revivedVscodeApiUri =
			this._reviveApiArgument<VscodeApiUri>(uriComponents); // Uses BaseCocoonShim revival
		if (!revivedVscodeApiUri) {
			this._logError(
				"Failed to revive URI from DTO for getTextDocumentFromRpc.",
				uriComponents,
			);
			return null;
		}
		const documentData =
			this.#extHostDocuments.getDocumentData(revivedVscodeApiUri); // getDocumentData expects VscodeApiUri
		if (!documentData?.document) {
			this._logError(
				`Document not found in local cache for provider execution: URI='${revivedVscodeApiUri.toString()}'`,
			);
			return null;
		}
		return documentData.document;
	}

	/** Internal helper to resolve a CancellationToken DTO (currently a NOP). */
	private _resolveTokenFromDto(
		tokenDto: any /* DTO for CancellationToken from protocol */,
	): CancellationToken {
		// TODO: Implement proper CancellationToken creation/lookup if Mountain sends a tokenId
		// that can be used to create a linked CancellationTokenSource.
		if (
			tokenDto &&
			(typeof tokenDto === "number" ||
				(typeof tokenDto === "object" && tokenDto.id !== undefined))
		) {
			this._logWarnOnce(
				"CancellationToken DTO received from MainThread, but full cancellation propagation (linking tokens) is not yet implemented in ShimLanguageFeatures. Using CancellationToken.None.",
			);
			// Example: return this.#cancellationRegistry.getToken(tokenDto.id || tokenDto);
		}
		return CancellationToken.None; // Default to a non-cancellable token for MVP.
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideHover} */
	public async $provideHover(
		handle: number,
		uriComponents: VSCodeInternalUriComponents,
		positionDto: IPosition,
		tokenDto: any,
	): Promise<VscodeHover | undefined> {
		const providerInfo = this._getProviderAndMethodInternal<
			HoverProvider,
			"provideHover"
		>(handle, "provideHover", "Hover");
		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);
		const position = this._reviveApiArgument<VscodePosition>(positionDto); // Revive IPosition DTO
		if (!document || !position) return undefined;

		const token = this._resolveTokenFromDto(tokenDto);
		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,
				document,
				position,
				token,
			);
			// Result is VscodeHover | undefined. Marshal it for RPC.
			return this._convertApiArgToInternal(result); // BaseCocoonShim marshaller
		} catch (err: any) {
			this._logError(
				`Error executing provideHover (Handle ${handle}):`,
				err,
			);
			return undefined;
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideCompletionItems} */
	public async $provideCompletionItems(
		handle: number,
		uriComponents: VSCodeInternalUriComponents,
		positionDto: IPosition,
		contextDto: ExtHostCompletionContextDto,
		tokenDto: any,
	): Promise<RpcSuggestResult | undefined> {
		const providerInfo = this._getProviderAndMethodInternal<
			CompletionItemProvider,
			"provideCompletionItems"
		>(handle, "provideCompletionItems", "Completion");
		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);
		const position = this._reviveApiArgument<VscodePosition>(positionDto);
		const context = localTypeConverters.CompletionContext.to(contextDto); // Use placeholder converter
		if (!document || !position || !context) return undefined;

		const token = this._resolveTokenFromDto(tokenDto);
		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,
				document,
				position,
				token,
				context,
			); // Note: VS Code API has token before context
			// Result is VscodeCompletionList | VscodeCompletionItem[] | undefined
			// This needs to be marshalled to RpcSuggestResult DTO.
			// _convertApiArgToInternal needs to be smart enough or use a specific converter.
			return this._convertApiArgToInternal(result) as
				| RpcSuggestResult
				| undefined;
		} catch (err: any) {
			this._logError(
				`Error executing provideCompletionItems (Handle ${handle}):`,
				err,
			);
			return undefined;
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$resolveCompletionItem} */
	public async $resolveCompletionItem(
		handle: number,
		itemDto: RpcSuggestData,
		tokenDto: any,
	): Promise<RpcSuggestData | undefined> {
		const providerInfo = this._getProviderAndMethodInternal<
			CompletionItemProvider,
			"resolveCompletionItem"
		>(handle, "resolveCompletionItem", "Completion");
		const providerMethod = providerInfo?.method as Function | undefined;

		if (!providerMethod) {
			// If provider or method doesn't exist, VS Code often returns the original (unresolved) item.
			// this._logWarn(`No resolveCompletionItem method for Handle ${handle}. Returning original DTO.`);
			return itemDto; // Return original DTO if no resolver
		}

		const itemToResolve =
			this._reviveApiArgument<VscodeCompletionItem>(itemDto); // Revive RpcSuggestData to VscodeCompletionItem
		if (!itemToResolve) {
			this._logError(
				`Failed to revive CompletionItem DTO for resolve (Handle ${handle}):`,
				itemDto,
			);
			return itemDto; // Return original DTO on revival failure
		}

		const token = this._resolveTokenFromDto(tokenDto);
		try {
			const result = await providerMethod.call(
				providerInfo!.provider,
				itemToResolve,
				token,
			);
			// Marshal resolved VscodeCompletionItem back to RpcSuggestData DTO
			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing resolveCompletionItem (Handle ${handle}):`,
				err,
			);
			// On error, VS Code might return the original unresolved item (DTO form).
			return this._convertApiArgToInternal(itemToResolve); // Marshal the revived-but-unresolved item
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideDefinition} */
	public async $provideDefinition(
		handle: number,
		uriComponents: VSCodeInternalUriComponents,
		positionDto: IPosition,
		tokenDto: any,
	): Promise<RpcLocationLink[] | undefined> {
		const providerInfo = this._getProviderAndMethodInternal<
			DefinitionProvider,
			"provideDefinition"
		>(handle, "provideDefinition", "Definition");
		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);
		const position = this._reviveApiArgument<VscodePosition>(positionDto);
		if (!document || !position) return undefined;

		const token = this._resolveTokenFromDto(tokenDto);
		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,
				document,
				position,
				token,
			);
			// Result is VscodeDefinition | VscodeDefinitionLink[] (which can be Location(s) or LocationLink(s))
			if (!result) return undefined;
			const resultArr = Array.isArray(result) ? result : [result];
			return localTypeConverters.DefinitionLink.fromMany(resultArr, this); // Pass `this` (BaseCocoonShim) for marshalling URIs
		} catch (err: any) {
			this._logError(
				`Error executing provideDefinition (Handle ${handle}):`,
				err,
			);
			return undefined;
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideCodeLenses} */
	public async $provideCodeLenses(
		handle: number,
		uriComponents: VSCodeInternalUriComponents,
		tokenDto: any,
	): Promise<RpcCodeLensList | undefined> {
		const providerInfo = this._getProviderAndMethodInternal<
			CodeLensProvider,
			"provideCodeLenses"
		>(handle, "provideCodeLenses", "CodeLens");
		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);
		if (!document) return undefined;

		const token = this._resolveTokenFromDto(tokenDto);
		try {
			const result = (await (providerInfo.method as Function).call(
				providerInfo.provider,
				document,
				token,
			)) as VscodeCodeLens[] | undefined;
			if (result && result.length > 0) {
				// Marshal VscodeCodeLens[] to RpcCodeLens[] then wrap in RpcCodeLensList DTO.
				const lensesDto = localTypeConverters.CodeLens.fromMany(
					result,
					this,
				); // Pass `this` for marshalling
				return { lenses: lensesDto, dispose: () => {} }; // dispose on DTO is for main thread to call back
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error executing provideCodeLenses (Handle ${handle}):`,
				err,
			);
			return undefined;
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$resolveCodeLens} */
	public async $resolveCodeLens(
		handle: number,
		codeLensDto: RpcCodeLens,
		tokenDto: any,
	): Promise<RpcCodeLens | undefined> {
		const providerInfo = this._getProviderAndMethodInternal<
			CodeLensProvider,
			"resolveCodeLens"
		>(handle, "resolveCodeLens", "CodeLens");
		const providerMethod = providerInfo?.method as Function | undefined;

		if (!providerMethod) return codeLensDto; // No resolver, return original DTO

		const codeLensToResolve =
			this._reviveApiArgument<VscodeCodeLens>(codeLensDto);
		if (!codeLensToResolve) {
			this._logError(
				`Failed to revive CodeLens DTO for resolve (Handle ${handle}):`,
				codeLensDto,
			);
			return codeLensDto;
		}
		const token = this._resolveTokenFromDto(tokenDto);
		try {
			const result = await providerMethod.call(
				providerInfo!.provider,
				codeLensToResolve,
				token,
			);
			return this._convertApiArgToInternal(result); // Marshal resolved VscodeCodeLens to RpcCodeLens DTO
		} catch (err: any) {
			this._logError(
				`Error executing resolveCodeLens (Handle ${handle}):`,
				err,
			);
			return this._convertApiArgToInternal(codeLensToResolve); // Marshal revived-but-unresolved
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideCodeActions} */
	public async $provideCodeActions(
		handle: number,
		uriComponents: VSCodeInternalUriComponents,
		rangeDto: VscodeInternalRange,
		contextDto: ExtHostCodeActionContextDto,
		tokenDto: any,
	): Promise<RpcCodeActionList | undefined> {
		const providerInfo = this._getProviderAndMethodInternal<
			CodeActionProvider,
			"provideCodeActions"
		>(handle, "provideCodeActions", "CodeAction");
		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);
		const range = localTypeConverters.Range.to(rangeDto); // Use local placeholder converter
		const context = localTypeConverters.CodeActionContext.to(contextDto);
		if (!document || !range || !context) return undefined;

		const token = this._resolveTokenFromDto(tokenDto);
		try {
			const result = (await (providerInfo.method as Function).call(
				providerInfo.provider,
				document,
				range,
				context,
				token,
			)) as (VscodeCommand | VscodeCodeAction)[] | undefined;
			if (result && result.length > 0) {
				const actionsDto = localTypeConverters.CodeAction.fromMany(
					result,
					this,
				); // Pass `this` for marshalling
				return { actions: actionsDto, dispose: () => {} }; // dispose on DTO for main thread
			}
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error executing provideCodeActions (Handle ${handle}):`,
				err,
			);
			return undefined;
		}
	}

	// TODO: Implement ALL other $provide* and $resolve* methods from VscodeExtHostLanguageFeaturesShape.
	// Each will follow a similar pattern as above:
	// 1. Get provider: `_getProviderAndMethodInternal`.
	// 2. Get document: `_getTextDocumentFromRpc` (if applicable).
	// 3. Revive arguments: `_reviveApiArgument` for simple DTOs (Position, Range), or specific `localTypeConverters` for complex DTOs.
	// 4. Resolve token: `_resolveTokenFromDto`.
	// 5. Call provider method in try/catch.
	// 6. Marshal result: `_convertApiArgToInternal` for simple API types, or specific `localTypeConverters` to RPC DTOs.

	/** Disposes of resources held by this shim instance, primarily clearing the provider store. */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim, handles _instanceDisposables
		this.#providerStore.clear(); // Clear all registered providers
		this._log("Disposed ShimLanguageFeatures and cleared provider store.");
	}
}
