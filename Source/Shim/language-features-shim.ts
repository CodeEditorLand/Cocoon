/*---------------------------------------------------------------------------------------------
 * Cocoon Language Features Shim (shims/language-features-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `VscodeExtHostLanguageFeaturesShape` (from `extHost.protocol.ts`). It handles
 * registration/unregistration of language providers (called by `ShimLanguages`) and
 * executes provider methods when invoked by Mountain via RPC.
 *
 * Responsibilities:
 * - Storing registered provider objects locally.
 * - Implementing `$register*Provider` methods (called by `ShimLanguages`):
 *   - Generates a handle, stores the provider, and notifies `MainThreadLanguageFeatures` via RPC.
 * - Implementing `$unregisterProvider`: Removes provider locally and notifies main thread.
 * - Implementing `$provide*` / `$resolve*` methods (called by Mountain via RPC):
 *   - Retrieves the provider, document, and calls the provider method.
 *   - Marshals/revives arguments and results, guided by `extHostTypeConverters.ts` and `rpcProtocol.ts`.
 *
 * Key Interactions:
 * - Methods prefixed with `$` (except `$register*Provider`) are part of the RPC interface
 *   called by Mountain's `MainThreadLanguageFeatures`.
 * - `$register*Provider` methods are called by `ShimLanguages` (the `vscode.languages` API shim).
 * - Uses `BaseCocoonShim` for RPC, logging, marshalling, and revival.
 * - Depends on `ShimDocumentService` to get `TextDocument` instances.
 *--------------------------------------------------------------------------------------------*/

import {
	CancellationToken,
	// Not directly used in merged logic, CancellationToken.None is common
	// CancellationTokenSource,
} from "vs/base/common/cancellation";
// Not directly returned by this shim
// import { IDisposable } from "vs/base/common/lifecycle";

import {
	ExtHostContext,
	MainContext,
	// For registration
	type CodeActionProviderMetadataDto,
	// DTO for CodeActionContext
	type CodeActionContextDto as ExtHostCodeActionContextDto,
	// DTO for CompletionContext
	type CompletionContextDto as ExtHostCompletionContextDto,
	// DTO for SignatureHelpContext
	type SignatureHelpContextDto as ExtHostSignatureHelpContextDto,
	// DTOs from extHost.protocol.ts
	type IDocumentFilterDto,
	// Renamed to avoid conflict with vscode.Position
	type IPosition,
	// For results
	type ICodeActionDto as RpcCodeAction,
	// For results
	type ICodeActionListDto as RpcCodeActionList,
	// For results if specific DTOs are used
	type ICodeLensDto as RpcCodeLens,
	// For results if specific DTOs are used
	type ICodeLensListDto as RpcCodeLensList,
	// For results
	type ICommandDto as RpcCommand,
	// Assuming Hover result is marshalled directly or via specific DTO
	// type HoverWithId as RpcHoverWithId,
	type ILinkDto as RpcLink,
	type ILocationLinkDto as RpcLocationLink,
	// type IRange,

	// type ISelection,
	type ISuggestDataDto as RpcSuggestData,
	type ISuggestResultDto as RpcSuggestResult,
	// For registration
	type SignatureHelpProviderMetadataDto,
	// type ILinksListDto as RpcLinksList,

	// type IWorkspaceEditDto as RpcWorkspaceEdit,

	// Actual RPC shapes
	type ExtHostLanguageFeaturesShape as VscodeExtHostLanguageFeaturesShape,
	type UriComponents as VSCodeInternalUriComponents,
	type MainThreadLanguageFeaturesShape as VscodeMainThreadLanguageFeaturesShape,
} from "vs/workbench/api/common/extHost.protocol";

import {
	// Provider Interfaces
	CallHierarchyProvider,
	DeclarationProvider,
	DocumentFormattingEditProvider,
	DocumentHighlightProvider,
	DocumentRangeFormattingEditProvider,
	ImplementationProvider,
	LinkedEditingRangeProvider,
	OnTypeFormattingEditProvider,
	ReferenceProvider,
	RenameProvider,
	SelectionRangeProvider,
	TypeDefinitionProvider,
	TypeHierarchyProvider,
	// vscode API types
	type CallHierarchyIncomingCall,
	type CallHierarchyItem,
	type CallHierarchyOutgoingCall,
	type CodeActionProvider,
	type CodeLensProvider,
	type CompletionItemProvider,
	type Declaration,
	type DefinitionProvider,
	type DocumentHighlight,
	type DocumentLinkProvider,
	type FormattingOptions,
	type HoverProvider,
	type Implementation,
	type LinkedEditingRanges,
	type ReferenceContext,
	type RenameLocation,
	type SelectionRange,
	type SignatureHelpProvider,
	type SymbolInformation,
	type TextEdit,
	type TypeDefinition,
	type TypeHierarchyItem,
	type CodeAction as VscodeCodeAction,
	type CodeActionProviderMetadata as VscodeCodeActionProviderMetadata,
	type CodeLens as VscodeCodeLens,
	type Command as VscodeCommand,
	type CompletionContext as VscodeCompletionContext,
	type CompletionItem as VscodeCompletionItem,
	type CompletionList as VscodeCompletionList,
	type Definition as VscodeDefinition,
	type DefinitionLink as VscodeDefinitionLink,
	type DocumentLink as VscodeDocumentLink,
	type DocumentSelector as VscodeDocumentSelector,
	type Hover as VscodeHover,
	type Location as VscodeLocation,
	type Position as VscodePosition,
	type Range as VscodeRange,
	type SignatureHelp as VscodeSignatureHelp,
	type SignatureHelpContext as VscodeSignatureHelpContext,
	type SignatureHelpProviderMetadata as VscodeSignatureHelpProviderMetadata,
	// Not directly used in provider method signatures here
	// SymbolKind,
	type TextDocument as VscodeTextDocument,
	type Uri as VscodeUri,
	type WorkspaceSymbolProvider,
} from "../Shim/out/vscode";
// Assuming path to vscode API shim
import {
	BaseCocoonShim,
	// Using refineError from file 1, can be swapped with refineErrorForShim if different
	refineError,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
} from "./_baseShim";
import type { ShimDocumentService } from "./document-shim";

// --- Placeholder for extHostTypeConverters and ExtensionIdentifier ---
// These would typically be provided by the VS Code extension host environment.
// This is a MOCK and will not perform real conversions.
const typeConvert = {
	DocumentSelector: {
		from: (
			selector: VscodeDocumentSelector | null,

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

							// Simplified
						} as IDocumentFilterDto;

					// Assume it's already a filter-like object
					return s as IDocumentFilterDto;
				})
				.filter(Boolean) as IDocumentFilterDto[];
		},
	},

	CompletionContext: {
		to: (dto: ExtHostCompletionContextDto): VscodeCompletionContext =>
			// MOCK
			dto as any as VscodeCompletionContext,
	},

	CodeActionContext: {
		to: (
			dto: ExtHostCodeActionContextDto,

			// MOCK
		): any /* vscode.CodeActionContext */ => dto as any,
	},

	SignatureHelpContext: {
		to: (dto: ExtHostSignatureHelpContextDto): VscodeSignatureHelpContext =>
			// MOCK
			dto as any as VscodeSignatureHelpContext,
	},

	DefinitionLink: {
		from: (
			link: VscodeDefinitionLink | VscodeDefinition,

			_uriTransformer?: any,
		): RpcLocationLink | undefined => {
			// MOCK: This needs a proper converter to turn VscodeDefinition(Link) into RpcLocationLink
			if (!link) return undefined;

			// Handle if provider returns Location
			const item = Array.isArray(link) ? link[0] : link;

			if (!item) return undefined;

			if ("targetUri" in item && "targetRange" in item) {
				// VscodeDefinitionLink
				return {
					// Needs marshalling
					uri: this._convertApiArgToInternal(item.targetUri),

					range: item.targetRange,

					targetSelectionRange: item.targetSelectionRange,

					originSelectionRange: item.originSelectionRange,
				} as RpcLocationLink;
			} else if ("uri" in item && "range" in item) {
				// VscodeLocation (can be part of VscodeDefinition)
				return {
					// Needs marshalling
					uri: this._convertApiArgToInternal(item.uri),

					range: item.range,
				} as RpcLocationLink;
			}

			return undefined;
		},

		fromMany: (
			items: ReadonlyArray<VscodeDefinitionLink | VscodeDefinition>,

			uriTransformer?: any,
		): RpcLocationLink[] => {
			if (!items) return [];

			return items
				.map((i) => typeConvert.DefinitionLink.from(i, uriTransformer))
				.filter(Boolean) as RpcLocationLink[];
		},
	},

	CodeAction: {
		fromMany: (
			actions: ReadonlyArray<VscodeCommand | VscodeCodeAction>,
		): (RpcCommand | RpcCodeAction)[] => {
			// MOCK: needs proper conversion
			return actions.map((a) => this._convertApiArgToInternal(a)) as (
				| RpcCommand
				| RpcCodeAction
			)[];
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

					// Assuming doc.kind is a string compatible with DTO
					kind: doc.kind,
				})),
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

	// Other converters would be defined here
};

type ExtensionIdentifier = { id: string; uuid?: string };

const SENDER_EXTENSION_ID: ExtensionIdentifier = {
	id: "cocoon.languagefeatures.shim",
};

// --- End Placeholder ---

interface ProviderRegistrationEntry {
	// The actual language provider instance
	provider: any;

	// Null for workspace-wide providers
	selector: VscodeDocumentSelector | null;

	// e.g., "Hover", "Completion"
	type: string;

	// Provider-specific options/metadata stored with registration
	// For Completion, SignatureHelp
	triggerCharacters?: ReadonlyArray<string>;

	completionOptions?: { supportsResolveDetails?: boolean };

	codeActionOptions?: {
		// DTO form
		metadataDto?: CodeActionProviderMetadataDto;

		displayName?: string;
	};

	// DTO form
	signatureHelpOptions?: { metadataDto?: SignatureHelpProviderMetadataDto };

	// TODO: Add event emitters for providers like CodeLensProvider if they have onDidChangeCodeLenses
	// And corresponding eventHandle
	// onDidChangeCodeLensesEmitter?: VscodeEmitter<void>;
}

export class ShimLanguageFeatures
	extends BaseCocoonShim
	implements VscodeExtHostLanguageFeaturesShape
{
	public readonly _serviceBrand: undefined;

	readonly #mainThreadProxy: VscodeMainThreadLanguageFeaturesShape | null =
		null;

	#providerHandlePool = 0;

	readonly #providerStore = new Map<number, ProviderRegistrationEntry>();

	readonly #extHostDocuments: ShimDocumentService;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,

		extHostDocuments: ShimDocumentService,
	) {
		super("ExtHostLanguageFeatures", rpcService, logService);

		this._log("Initializing Language Features Shim...");

		if (!extHostDocuments) {
			this._logError(
				"ExtHostDocuments service is critical and was not provided!",
			);
		}

		this.#extHostDocuments = extHostDocuments;

		if (this._rpcService) {
			this.#mainThreadProxy = this._getProxy(
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
					"Failed to set ExtHostLanguageFeatures for RPC:",

					e,
				);
			}
		}

		if (!this.#mainThreadProxy) {
			this._logError(
				"Failed to get MainThreadLanguageFeatures proxy! Provider registration and execution will be impaired.",
			);
		}
	}

	private async _registerProviderOnMainThread<P>(
		providerType: string,

		provider: P,

		selector: VscodeDocumentSelector | null,

		mainThreadRegisterFn: (
			proxy: VscodeMainThreadLanguageFeaturesShape,

			handle: number,

			selectorDto: IDocumentFilterDto[],

			providerSpecificDto?: any,
		) => Promise<void>,

		// Arguments used for DTO and local storage
		providerSpecificArgsForStorageAndDto?: any,
	): Promise<number> {
		const handle = ++this.#providerHandlePool;

		const registrationEntry: ProviderRegistrationEntry = {
			provider,

			selector,

			type: providerType,

			// Store relevant options
			...providerSpecificArgsForStorageAndDto,
		};

		this.#providerStore.set(handle, registrationEntry);

		this._log(
			`Locally registered ${providerType}Provider with handle ${handle}. Selector: ${JSON.stringify(selector)}`,
		);

		if (!this.#mainThreadProxy) {
			// Rollback
			this.#providerStore.delete(handle);

			const errorMsg = `Cannot register ${providerType}Provider, RPC proxy to MainThreadLanguageFeatures unavailable.`;

			this._logError(errorMsg);

			throw new Error(errorMsg);
		}

		try {
			// Convert VscodeDocumentSelector to IDocumentFilterDto[] for RPC
			const selectorDto = typeConvert.DocumentSelector.from(
				selector,

				/* uriTransformer */ undefined,
			);

			await mainThreadRegisterFn(
				this.#mainThreadProxy,

				handle,

				selectorDto,

				// Pass args that might be needed for DTO in the fn
				providerSpecificArgsForStorageAndDto,
			);

			this._log(
				`${providerType}Provider (handle ${handle}) registration sent to main thread.`,
			);

			return handle;
		} catch (e: any) {
			// Rollback
			this.#providerStore.delete(handle);

			this._logError(
				`RPC failed for ${providerType}Provider (handle ${handle}) registration:`,

				e,
			);

			throw refineError(
				e,

				this._logService,

				`register${providerType}Provider`,
			);
		}
	}

	// --- $register*Provider Methods (Called by ShimLanguages) ---
	public $registerHoverProvider(
		selector: VscodeDocumentSelector,

		provider: HoverProvider,
	): Promise<number> {
		return this._registerProviderOnMainThread(
			"Hover",

			provider,

			selector,

			(proxy, h, selDto) =>
				proxy.$registerHoverProvider(h, selDto, SENDER_EXTENSION_ID),
		);
	}

	public $registerCompletionProvider(
		selector: VscodeDocumentSelector,

		provider: CompletionItemProvider,

		triggerCharacters: string[],
	): Promise<number> {
		const supportsResolveDetails =
			typeof provider.resolveCompletionItem === "function";

		const options = {
			triggerCharacters,

			completionOptions: { supportsResolveDetails },
		};

		return this._registerProviderOnMainThread(
			"Completion",

			provider,

			selector,

			(proxy, h, selDto, args) =>
				proxy.$registerCompletionsProvider(
					h,

					selDto,

					// from options
					args.triggerCharacters,

					// from options
					args.completionOptions.supportsResolveDetails,

					SENDER_EXTENSION_ID,
				),

			options,
		);
	}

	public $registerDefinitionProvider(
		selector: VscodeDocumentSelector,

		provider: DefinitionProvider,
	): Promise<number> {
		return this._registerProviderOnMainThread(
			"Definition",

			provider,

			selector,

			(proxy, h, selDto) =>
				proxy.$registerDefinitionSupport(
					h,

					selDto,

					SENDER_EXTENSION_ID,
				),
		);
	}

	public $registerCodeLensProvider(
		selector: VscodeDocumentSelector,

		provider: CodeLensProvider,
	): Promise<number> {
		// const eventHandle = provider.onDidChangeCodeLenses ? wireUpEmitterAndGetHandle(provider.onDidChangeCodeLenses) : undefined;

		// Placeholder
		const eventHandle: number | undefined = undefined;

		if (!this.#mainThreadProxy?.$registerCodeLensSupport) {
			this._logWarnOnce(
				"MainThreadLanguageFeatures.$registerCodeLensSupport not available. Local registration only.",
			);

			// Fallback to simple local registration if method doesn't exist on proxy
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

			(proxy, h, selDto) =>
				proxy.$registerCodeLensSupport!(
					h,

					selDto,

					eventHandle,

					SENDER_EXTENSION_ID,
				),
		);
	}

	public $registerCodeActionProvider(
		selector: VscodeDocumentSelector,

		provider: CodeActionProvider,

		metadata?: VscodeCodeActionProviderMetadata,
	): Promise<number> {
		const metadataDto =
			typeConvert.CodeActionProviderMetadata.toDto(metadata);

		const displayName =
			typeof provider.displayName === "string"
				? provider.displayName
				: undefined;

		const options = {
			codeActionOptions: { metadataDto, displayName },
		};

		if (!this.#mainThreadProxy?.$registerCodeActionSupport) {
			this._logWarnOnce(
				"MainThreadLanguageFeatures.$registerCodeActionSupport not available. Local registration only.",
			);

			const handle = ++this.#providerHandlePool;

			this.#providerStore.set(handle, {
				provider,

				selector,

				type: "CodeAction",

				...options,
			});

			return Promise.resolve(handle);
		}

		return this._registerProviderOnMainThread(
			"CodeAction",

			provider,

			selector,

			(proxy, h, selDto, args) =>
				proxy.$registerCodeActionSupport!(
					h,

					selDto,

					args.codeActionOptions.metadataDto,

					args.codeActionOptions.displayName,

					SENDER_EXTENSION_ID,

					// Protocol might also want a handle for `onDidChangeCodeActions` if supported
				),

			options,
		);
	}

	// TODO: Implement ALL other $register*Provider methods from VscodeExtHostLanguageFeaturesShape

	public async $unregisterProvider(handle: number): Promise<void> {
		this._log(`$unregisterProvider called for handle: ${handle}`);

		const registration = this.#providerStore.get(handle);

		if (this.#providerStore.delete(handle)) {
			this._log(
				`Locally unregistered provider handle: ${handle} (Type: ${registration?.type})`,
			);

			// TODO: If provider had an onDidChange event, dispose its emitter/subscription here.
		} else {
			this._logWarn(
				`Attempted to unregister non-existent local provider handle: ${handle}`,
			);
		}

		if (!this.#mainThreadProxy) {
			this._logError(
				"Cannot send unregister request, RPC proxy unavailable.",
			);

			return;
		}

		try {
			// VscodeMainThreadLanguageFeaturesShape uses a generic $unregister
			await this.#mainThreadProxy.$unregister(handle);

			this._log(
				`Unregistration request sent to main thread for handle ${handle}.`,
			);
		} catch (e: any) {
			this._logError(
				`Failed to send unregister request for handle ${handle} via RPC:`,

				e,
			);

			refineError(e, this._logService, "unregisterProvider");
		}
	}

	// --- Provider Execution Methods (Called BY Mountain via RPC) ---

	private _getProviderAndMethodInternal<P, M extends keyof P>(
		handle: number,

		methodName: M,

		expectedType: string,
	): {
		provider: P;

		method: P[M];

		registration: ProviderRegistrationEntry;
	} | null {
		const registration = this.#providerStore.get(handle);

		if (!registration) {
			this._logWarn(
				`No registration for handle ${handle} (expected ${expectedType})`,
			);

			return null;
		}

		if (registration.type !== expectedType) {
			this._logWarn(
				`Handle ${handle} type mismatch: Expected ${expectedType}, got ${registration.type}`,
			);

			return null;
		}

		const provider = registration.provider as P;

		if (!provider || typeof provider[methodName] !== "function") {
			this._logWarn(
				`${expectedType}Provider (handle ${handle}) method '${String(methodName)}' is missing/not function.`,
			);

			return null;
		}

		return { provider, method: provider[methodName] as P[M], registration };
	}

	private _getTextDocumentFromRpc(
		uriComponents: VSCodeInternalUriComponents | undefined,
	): VscodeTextDocument | null {
		if (!uriComponents) {
			this._logError(
				"Cannot get document, URI components are undefined.",
			);

			return null;
		}

		// Use BaseCocoonShim's _reviveApiArgument for URI revival
		const revivedUri = this._reviveApiArgument<VscodeUri>(uriComponents);

		if (!revivedUri) {
			this._logError(
				"Failed to revive URI for getTextDocumentFromRpc",

				uriComponents,
			);

			return null;
		}

		// ShimDocumentService expects vscode.Uri
		// .getDocumentData if it returns { document }

		const documentData = this.#extHostDocuments.getDocumentData(revivedUri);

		if (!documentData || !documentData.document) {
			this._logError(`Document not found: ${revivedUri.toString()}`);

			return null;
		}

		return documentData.document;
	}

	private _resolveToken(
		tokenDto: any /* DTO for CancellationToken */,
	): CancellationToken {
		// TODO: Implement proper CancellationToken creation/lookup if Mountain sends a tokenId.
		if (tokenDto && typeof tokenDto === "object" && tokenDto.id) {
			this._logWarnOnce(
				"CancellationToken DTO received, but full proxying not implemented. Using CancellationToken.None.",
			);

			// Example: return this.#cancellationRegistry.getToken(tokenDto.id);
		}

		return CancellationToken.None;
	}

	public async $provideHover(
		handle: number,

		uriComponents: VSCodeInternalUriComponents,

		positionDto: IPosition,

		tokenDto: any,
	): Promise<VscodeHover | undefined> {
		// Protocol returns Hover directly, not RpcHoverWithId for this
		const providerInfo = this._getProviderAndMethodInternal<
			HoverProvider,
			"provideHover"
		>(handle, "provideHover", "Hover");

		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);

		const position = this._reviveApiArgument<VscodePosition>(positionDto);

		if (!document || !position) return undefined;

		const token = this._resolveToken(tokenDto);

		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				position,

				token,
			);

			// Marshals VscodeHover
			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing provideHover (handle ${handle}):`,

				err,
			);

			return undefined;
		}
	}

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

		// Use converter
		const context = typeConvert.CompletionContext.to(contextDto);

		if (!document || !position || !context) return undefined;

		const token = this._resolveToken(tokenDto);

		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				position,

				context,

				token,
			);

			// Result is VscodeCompletionList | VscodeCompletionItem[]
			// _convertApiArgToInternal should produce a marshallable object (RpcSuggestResult DTO)
			return this._convertApiArgToInternal(result) as
				| RpcSuggestResult
				| undefined;
		} catch (err: any) {
			this._logError(
				`Error executing provideCompletionItems (handle ${handle}):`,

				err,
			);

			return undefined;
		}
	}

	public async $resolveCompletionItem(
		handle: number,

		// This is ISuggestData from protocol
		itemDto: RpcSuggestData,

		tokenDto: any,
	): Promise<RpcSuggestData | undefined> {
		// Returns ISuggestData
		const providerInfo = this._getProviderAndMethodInternal<
			CompletionItemProvider,
			"resolveCompletionItem"
		>(handle, "resolveCompletionItem", "Completion");

		// If provider or resolveCompletionItem method doesn't exist, VS Code often returns the original (unresolved) item.
		const providerMethod = providerInfo?.method as
			| ((
					item: VscodeCompletionItem,

					token: CancellationToken,
			  ) =>
					| VscodeCompletionItem
					| Promise<VscodeCompletionItem | undefined>)
			| undefined;

		if (!providerMethod) {
			// this._logWarn(`No resolveCompletionItem method for handle ${handle}. Returning original DTO.`);

			// Return original DTO
			return itemDto;
		}

		const itemToResolve =
			this._reviveApiArgument<VscodeCompletionItem>(itemDto);

		if (!itemToResolve) {
			this._logError(
				`Failed to revive CompletionItem DTO for resolve (handle ${handle}):`,

				itemDto,
			);

			// Return original DTO
			return itemDto;
		}

		const token = this._resolveToken(tokenDto);

		try {
			const result = await providerMethod.call(
				providerInfo!.provider,

				itemToResolve,

				token,
			);

			// Marshal VscodeCompletionItem to RpcSuggestData
			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing resolveCompletionItem (handle ${handle}):`,

				err,
			);

			// On error, VS Code might return the original unresolved item.
			// Marshal the *revived but unresolved* item
			return this._convertApiArgToInternal(itemToResolve);
		}
	}

	public async $provideDefinition(
		handle: number,

		uriComponents: VSCodeInternalUriComponents,

		positionDto: IPosition,

		tokenDto: any,
	): Promise<RpcLocationLink[] | undefined> {
		// Protocol expects RpcLocationLink[]
		const providerInfo = this._getProviderAndMethodInternal<
			DefinitionProvider,
			"provideDefinition"
		>(handle, "provideDefinition", "Definition");

		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);

		const position = this._reviveApiArgument<VscodePosition>(positionDto);

		if (!document || !position) return undefined;

		const token = this._resolveToken(tokenDto);

		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				position,

				token,

				// Result is VscodeDefinition | VscodeDefinitionLink[]
			);

			if (!result) return undefined;

			// Convert result to RpcLocationLink[] DTO array
			// This needs extHostTypeConverters.DefinitionLink.fromMany or similar
			const resultArr = Array.isArray(result) ? result : [result];

			return typeConvert.DefinitionLink.fromMany(
				resultArr,

				/* uriTransformer */ undefined,
			);
		} catch (err: any) {
			this._logError(
				`Error executing provideDefinition (handle ${handle}):`,

				err,
			);

			return undefined;
		}
	}

	public async $provideCodeLenses(
		handle: number,

		uriComponents: VSCodeInternalUriComponents,

		tokenDto: any,
	): Promise<RpcCodeLensList | undefined> {
		// Protocol: $provideCodeLenses(handle, uri, token): Promise<ICodeLensListDto | undefined>
		const providerInfo = this._getProviderAndMethodInternal<
			CodeLensProvider,
			"provideCodeLenses"
		>(handle, "provideCodeLenses", "CodeLens");

		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);

		if (!document) return undefined;

		const token = this._resolveToken(tokenDto);

		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				token,

				// VscodeCodeLens[]
			);

			// Marshal to RpcCodeLensList. BaseCocoonShim's _convertApiArgToInternal should handle array of CodeLens.
			// If specific DTO { lenses: RpcCodeLens[] } is needed, it might require custom marshalling step.
			// Assuming _convertApiArgToInternal produces RpcCodeLens[] and protocol expects ICodeLensListDto = { lenses, dispose }

			// Or MainThread side wraps it. For now, let's assume direct marshalling of array.
			if (result) {
				const lenses = this._convertApiArgToInternal(
					result,
				) as RpcCodeLens[];

				// Wrap in list DTO
				return { lenses } as RpcCodeLensList;
			}

			return undefined;
		} catch (err: any) {
			this._logError(
				`Error executing provideCodeLenses (handle ${handle}):`,

				err,
			);

			return undefined;
		}
	}

	public async $resolveCodeLens(
		handle: number,

		// Protocol: $resolveCodeLens(handle, codeLens: ICodeLensDto, token): Promise<ICodeLensDto | undefined>
		codeLensDto: RpcCodeLens,

		tokenDto: any,
	): Promise<RpcCodeLens | undefined> {
		const providerInfo = this._getProviderAndMethodInternal<
			CodeLensProvider,
			"resolveCodeLens"
		>(handle, "resolveCodeLens", "CodeLens");

		const providerMethod = providerInfo?.method as
			| ((
					codeLens: VscodeCodeLens,

					token: CancellationToken,
			  ) => VscodeCodeLens | Promise<VscodeCodeLens | undefined>)
			| undefined;

		if (!providerMethod) {
			// this._logWarn(`No resolveCodeLens method for handle ${handle}. Returning original DTO.`);

			// Return original DTO if no resolver
			return codeLensDto;
		}

		const codeLensToResolve =
			this._reviveApiArgument<VscodeCodeLens>(codeLensDto);

		if (!codeLensToResolve) {
			this._logError(
				`Failed to revive CodeLens DTO for resolve (handle ${handle}):`,

				codeLensDto,
			);

			return codeLensDto;
		}

		const token = this._resolveToken(tokenDto);

		try {
			const result = await providerMethod.call(
				providerInfo!.provider,

				codeLensToResolve,

				token,
			);

			// Marshal VscodeCodeLens to RpcCodeLens
			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing resolveCodeLens (handle ${handle}):`,

				err,
			);

			// Return revived but unresolved on error
			return this._convertApiArgToInternal(codeLensToResolve);
		}
	}

	public async $provideCodeActions(
		handle: number,

		uriComponents: VSCodeInternalUriComponents,

		// Protocol is IRange, VscodeRange is compatible after revival
		rangeDto: VscodeRange,

		contextDto: ExtHostCodeActionContextDto,

		tokenDto: any,
	): Promise<RpcCodeActionList | undefined> {
		// Protocol: $provideCodeActions(..): Promise<ICodeActionListDto | undefined>;

		const providerInfo = this._getProviderAndMethodInternal<
			CodeActionProvider,
			"provideCodeActions"
		>(handle, "provideCodeActions", "CodeAction");

		if (!providerInfo) return undefined;

		const document = this._getTextDocumentFromRpc(uriComponents);

		// Already VscodeRange, but ensure proper revival if complex
		const range = this._reviveApiArgument<VscodeRange>(rangeDto);

		// Use converter
		const context = typeConvert.CodeActionContext.to(contextDto);

		if (!document || !range || !context) return undefined;

		const token = this._resolveToken(tokenDto);

		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				range,

				context,

				token,

				// Result is (VscodeCommand | VscodeCodeAction)[] | undefined
			);

			if (result) {
				// Convert to (RpcCommand | RpcCodeAction)[] and wrap in RpcCodeActionList
				const actions = typeConvert.CodeAction.fromMany(
					result as (VscodeCommand | VscodeCodeAction)[],
				);

				return { actions } as RpcCodeActionList;
			}

			return undefined;
		} catch (err: any) {
			this._logError(
				`Error executing provideCodeActions (handle ${handle}):`,

				err,
			);

			return undefined;
		}
	}

	// Placeholder for $resolveCodeAction if it exists in VscodeExtHostLanguageFeaturesShape
	// public async $resolveCodeAction?(handle: number, codeActionDto: RpcCodeAction, tokenDto: any): Promise<RpcCodeAction | undefined> { ... }

	// Stubs for other provider execution methods, to be implemented fully
	public async $resolveDocumentLink(
		handle: number,

		// Protocol is ILinkDto
		linkDto: RpcLink,

		tokenDto: any,
	): Promise<RpcLink | undefined> {
		// Protocol is ILinkDto
		this._logWarnOnce(
			`$resolveDocumentLink for handle ${handle} - STUBBED/Partial`,
		);

		const providerInfo = this._getProviderAndMethodInternal<
			DocumentLinkProvider,
			"resolveDocumentLink"
		>(
			handle,

			"resolveDocumentLink",

			// Assuming "DocumentLink" is the type string
			"DocumentLink",
		);

		const providerMethod = providerInfo?.method as
			| ((
					link: VscodeDocumentLink,

					token: CancellationToken,
			  ) => VscodeDocumentLink | Promise<VscodeDocumentLink | undefined>)
			| undefined;

		// Return original if no resolver
		if (!providerMethod) return linkDto;

		const linkToResolve =
			this._reviveApiArgument<VscodeDocumentLink>(linkDto);

		if (!linkToResolve) return linkDto;

		const token = this._resolveToken(tokenDto);

		try {
			const result = await providerMethod.call(
				providerInfo!.provider,

				linkToResolve,

				token,
			);

			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing $resolveDocumentLink (handle ${handle}):`,

				err,
			);

			return this._convertApiArgToInternal(linkToResolve);
		}
	}

	public async $resolveWorkspaceSymbol(
		handle: number,

		// Protocol is WorkspaceSymbolDto (actual type needed)
		symbolDto: any,

		tokenDto: any,
	): Promise<SymbolInformation | undefined> {
		// Protocol is WorkspaceSymbolDto
		this._logWarnOnce(
			`$resolveWorkspaceSymbol for handle ${handle} - STUBBED/Partial`,
		);

		const providerInfo = this._getProviderAndMethodInternal<
			WorkspaceSymbolProvider,
			"resolveWorkspaceSymbol"
		>(
			handle,

			"resolveWorkspaceSymbol",

			// Assuming "WorkspaceSymbol"
			"WorkspaceSymbol",
		);

		const providerMethod = providerInfo?.method as
			| ((
					symbol: SymbolInformation,

					token: CancellationToken,
			  ) => SymbolInformation | Promise<SymbolInformation | undefined>)
			| undefined;

		// Revive or return DTO
		if (!providerMethod) return this._reviveApiArgument(symbolDto);

		const symbolToResolve =
			this._reviveApiArgument<SymbolInformation>(symbolDto);

		if (!symbolToResolve) return this._reviveApiArgument(symbolDto);

		const token = this._resolveToken(tokenDto);

		try {
			const result = await providerMethod.call(
				providerInfo!.provider,

				symbolToResolve,

				token,
			);

			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing $resolveWorkspaceSymbol (handle ${handle}):`,

				err,
			);

			return this._convertApiArgToInternal(symbolToResolve);
		}
	}

	// TODO: Implement ALL other $provide* and $resolve* methods from VscodeExtHostLanguageFeaturesShape.
	// Each will follow a similar pattern:
	// 1. Get provider method using _getProviderAndMethodInternal.
	// 2. Get TextDocument if URI is an argument using _getTextDocumentFromRpc.
	// 3. Revive arguments (Position, Range, Context DTOs) using _reviveApiArgument or specific typeConvert methods.
	// 4. Get CancellationToken using _resolveToken.
	// 5. Call the provider method within a try/catch.
	// 6. Marshal the result using _convertApiArgToInternal or specific typeConvert methods to the DTO expected by the protocol.

	public dispose(): void {
		super.dispose();

		this.#providerStore.clear();

		this._log("Disposed ShimLanguageFeatures.");
	}
}
