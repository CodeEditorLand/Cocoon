/*---------------------------------------------------------------------------------------------
 * Cocoon Language Features Shim (shims/language-features-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `ExtHostLanguageFeaturesShape` interface, handling both registration/unregistration
 * requests for language providers (hover, completion, etc.) AND the execution requests (`$provide*`)
 * originating from Mountain when a feature is invoked by the user.
 *
 * Responsibilities:
 * - Storing registered provider objects locally keyed by a generated handle.
 * - Implementing `$register*Provider` methods (called internally by vscode.languages):
 *   - Generates a local handle.
 *   - Stores the provider object locally (`#providerHandles`).
 *   - Sends an RPC request to `MainThreadLanguageFeatures` on Mountain to register
 *     the provider metadata (selector, handle, trigger chars, etc.) centrally.
 *   - Returns the local handle.
 * - Implementing `$unregisterProvider` method:
 *   - Removes the provider locally.
 *   - Sends an RPC request to `MainThreadLanguageFeatures` to remove the registration.
 * - Implementing `$provide*` methods (e.g., `$provideHover`, `$provideCompletionItems`):
 *   - Called *by Mountain* via RPC when a feature needs data.
 *   - Receives handle, document URI, position, context, token.
 *   - Looks up the corresponding provider object locally using the handle.
 *   - Retrieves the `vscode.TextDocument` using the injected `ExtHostDocuments` service.
 *   - Calls the actual provider method (e.g., `provider.provideHover(...)`).
 *   - Marshals the result back to Mountain.
 *
 * Key Interactions:
 * - `$register*Provider` methods are called internally by `vscode.languages` implementation.
 * - `$provide*` methods are called by Mountain via RPC when features are invoked.
 * - Interacts with `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadLanguageFeatures)`.
 * - Interacts with injected `ExtHostDocuments` service.
 * - Manages local state of registered providers (`#providerHandles`).
 *--------------------------------------------------------------------------------------------*/

import {
	CancellationToken,
	CancellationTokenSource,
} from "vs/base/common/cancellation";
// For return type if needed
import { Disposable, IDisposable } from "vs/base/common/lifecycle";
import {
	ExtHostContext,
	MainContext,
	// Import specific DTOs and shapes from extHost.protocol if available
	// For example:
	// IRawLanguageFeaturesDocumentSelector as DocumentSelector, (if it's a specific DTO)
	// IRawHover, IRawCompletionList, IRawLocation, etc. for provider results
	// ICancellationTokenDto,
	// Needs bundling
} from "vs/workbench/api/common/extHost.protocol";

// Assuming from 'vscode' shim
import {
	CallHierarchyProvider,
	CodeActionProvider,
	CodeLensProvider,
	CompletionContext,
	CompletionItem,
	CompletionItemProvider,
	CompletionList,
	DeclarationProvider,
	Definition,
	DefinitionProvider,
	DocumentFormattingEditProvider,
	DocumentHighlightProvider,
	DocumentLink,
	DocumentLinkProvider,
	DocumentRangeFormattingEditProvider,
	DocumentSelector,
	Hover,
	HoverProvider,
	ImplementationProvider,
	LinkedEditingRangeProvider,
	Location,
	OnTypeFormattingEditProvider,
	Position,
	ReferenceProvider,
	RenameProvider,
	SelectionRangeProvider,
	SignatureHelpProvider,
	SymbolInformation,
	TextDocument,
	TypeDefinitionProvider,
	TypeHierarchyProvider,
	Uri,
	WorkspaceSymbolProvider,
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
	refineError,
} from "./_baseShim";
// Assuming ShimDocumentService is exported from document-shim.ts
import { ShimDocumentService } from "./document-shim";

// --- Type definitions based on vscode API and extHost.protocol ---

// For provider registration details stored locally
interface ProviderRegistration {
	// The actual provider object (e.g., HoverProvider, CompletionItemProvider)
	provider: any;

	selector: DocumentSelector;

	// e.g., "Hover", "Completion"
	type: string;

	triggerCharacters?: string[];

	// For providers like CodeActionProvider, SignatureHelpProvider
	metadata?: any;
}

// For MainThreadLanguageFeatures RPC proxy (define methods based on usage)
interface MainThreadLanguageFeaturesShape {
	$registerHoverProvider(
		handle: number,

		selector: DocumentSelector,
	): Promise<void>;

	$registerCompletionProvider(
		handle: number,

		selector: DocumentSelector,

		triggerCharacters: string[],
	): Promise<void>;

	$registerDefinitionProvider(
		handle: number,

		selector: DocumentSelector,
	): Promise<void>;

	// ... add other $register*Provider methods
	$registerCodeLensProvider?(
		handle: number,

		selector: DocumentSelector,

		eventHandle?: number,
	): Promise<void>;

	$registerCodeActionProvider?(
		handle: number,

		selector: DocumentSelector,

		metadata?: any /* CodeActionProviderMetadataDto */,
	): Promise<void>;

	// ... and so on for all provider types

	$unregisterProvider(handle: number): Promise<void>;

	// $resolveCodeLens?

	// $resolveDocumentLink?

	// $resolveWorkspaceSymbol?
}

// ExtHostLanguageFeaturesShape (methods called BY Mountain)
interface ExtHostLanguageFeaturesShape {
	// Registration methods called by vscode.languages API implementation (ShimLanguages)

	// These are now directly taking the provider object

	$registerHoverProvider(
		selector: DocumentSelector,

		provider: HoverProvider,
	): Promise<number>;

	$registerCompletionProvider(
		selector: DocumentSelector,

		provider: CompletionItemProvider,

		triggerCharacters: string[],
	): Promise<number>;

	$registerDefinitionProvider(
		selector: DocumentSelector,

		provider: DefinitionProvider,
	): Promise<number>;

	// ... other $register* methods

	// This one is still for unregistering
	$unregisterProvider(handle: number): Promise<void>;

	// Provider execution methods called BY Mountain

	$provideHover(
		handle: number,

		uriComponents: any,

		position: Position,

		tokenDto: any /* ICancellationTokenDto */,
	): Promise<Hover | undefined>;

	$provideCompletionItems(
		handle: number,

		uriComponents: any,

		position: Position,

		contextDto: any /* CompletionContextDto */,

		tokenDto: any,
	): Promise<CompletionList | CompletionItem[] | undefined>;

	$resolveCompletionItem(
		handle: number,

		itemDto: CompletionItem,

		tokenDto: any,
	): Promise<CompletionItem | undefined>;

	// DefinitionLink[] also possible
	$provideDefinition(
		handle: number,

		uriComponents: any,

		position: Position,

		tokenDto: any,
	): Promise<Definition | Definition[] | undefined>;

	// ... other $provide* and $resolve* methods
	$resolveDocumentLink?(
		handle: number,

		link: DocumentLink,

		tokenDto: any,
	): Promise<DocumentLink | undefined>;

	$resolveWorkspaceSymbol?(
		handle: number,

		symbol: SymbolInformation,

		tokenDto: any,
	): Promise<SymbolInformation | undefined>;

	$resolveCodeLens?(
		handle: number,

		codeLens: any /* CodeLensDto */,

		tokenDto: any,
	): Promise<any /* CodeLensDto */ | undefined>;
}

export class ShimLanguageFeatures
	extends BaseCocoonShim
	implements ExtHostLanguageFeaturesShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadLanguageFeaturesProxy: MainThreadLanguageFeaturesShape | null =
		null;

	#providerHandlePool: number = 0;

	#providerHandles = new Map<number, ProviderRegistration>();

	// Injected ShimDocumentService instance
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
				"ExtHostDocuments service is required but was not provided!",
			);

			// This is a critical dependency, consider throwing or ensuring it's always present.
		}

		this.#extHostDocuments = extHostDocuments;

		if (this._rpcService) {
			this.#mainThreadLanguageFeaturesProxy = this._getProxy(
				MainContext.MainThreadLanguageFeatures as ProxyIdentifier<MainThreadLanguageFeaturesShape>,
			);
		}

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"Failed to get MainThreadLanguageFeatures proxy! Provider registration will fail.",
			);
		}

		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostLanguageFeatures as ProxyIdentifier<ExtHostLanguageFeaturesShape>,

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
		} else {
			this._logError(
				"RPCService not available, cannot set ExtHostLanguageFeatures for RPC.",
			);
		}
	}

	// --- Registration Methods (Called by ShimLanguages / vscode.languages implementation) ---
	// These methods now receive the actual provider *object*.

	public async $registerHoverProvider(
		selector: DocumentSelector,

		provider: HoverProvider,
	): Promise<number> {
		this._log(
			`Registering HoverProvider locally: selector=${JSON.stringify(selector)}`,
		);

		const handle = ++this.#providerHandlePool;

		this.#providerHandles.set(handle, {
			provider,

			selector,

			type: "Hover",
		});

		if (!this.#mainThreadLanguageFeaturesProxy) {
			// Clean up local registration
			this.#providerHandles.delete(handle);

			throw new Error(
				"Cannot register hover provider, RPC proxy unavailable.",
			);
		}

		try {
			await this.#mainThreadLanguageFeaturesProxy.$registerHoverProvider(
				handle,

				selector,
			);

			this._log(
				`Hover provider registration notification sent for handle: ${handle}`,
			);

			return handle;
		} catch (e: any) {
			this.#providerHandles.delete(handle);

			this._logError(
				"Failed to send hover provider registration via RPC:",

				e,
			);

			throw refineError(e, this._logService, "registerHoverProvider");
		}
	}

	public async $registerCompletionProvider(
		selector: DocumentSelector,

		provider: CompletionItemProvider,

		triggerCharacters: string[],
	): Promise<number> {
		this._log(
			`Registering CompletionProvider locally: selector=${JSON.stringify(selector)}, triggers=${triggerCharacters.join("")}`,
		);

		const handle = ++this.#providerHandlePool;

		this.#providerHandles.set(handle, {
			provider,

			selector,

			triggerCharacters,

			type: "Completion",
		});

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this.#providerHandles.delete(handle);

			throw new Error(
				"Cannot register completion provider, RPC proxy unavailable.",
			);
		}

		try {
			await this.#mainThreadLanguageFeaturesProxy.$registerCompletionProvider(
				handle,

				selector,

				triggerCharacters,
			);

			this._log(
				`Completion provider registration notification sent for handle: ${handle}`,
			);

			return handle;
		} catch (e: any) {
			this.#providerHandles.delete(handle);

			this._logError(
				"Failed to send completion provider registration via RPC:",

				e,
			);

			throw refineError(
				e,

				this._logService,

				"registerCompletionProvider",
			);
		}
	}

	public async $registerDefinitionProvider(
		selector: DocumentSelector,

		provider: DefinitionProvider,
	): Promise<number> {
		this._log(
			`Registering DefinitionProvider locally: selector=${JSON.stringify(selector)}`,
		);

		const handle = ++this.#providerHandlePool;

		this.#providerHandles.set(handle, {
			provider,

			selector,

			type: "Definition",
		});

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this.#providerHandles.delete(handle);

			throw new Error(
				"Cannot register definition provider, RPC proxy unavailable.",
			);
		}

		try {
			await this.#mainThreadLanguageFeaturesProxy.$registerDefinitionProvider(
				handle,

				selector,
			);

			this._log(
				`Definition provider registration notification sent for handle: ${handle}`,
			);

			return handle;
		} catch (e: any) {
			this.#providerHandles.delete(handle);

			this._logError(
				"Failed to send definition provider registration via RPC:",

				e,
			);

			throw refineError(
				e,

				this._logService,

				"registerDefinitionProvider",
			);
		}
	}

	// --- Stubs for other registration methods ---

	// (Implement fully by calling corresponding this.#mainThreadLanguageFeaturesProxy.$register... method)

	private async _simpleRegister<P>(
		type: string,

		selector: DocumentSelector,

		provider: P,

		metadata?: any,
	): Promise<number> {
		this._logWarnOnce(
			`Registration not fully implemented via RPC for: $register${type}Provider`,
		);

		const handle = ++this.#providerHandlePool;

		const regData: ProviderRegistration = {
			provider,

			selector,

			type,

			metadata,
		};

		// Example for triggerChars for completion
		if (type === "Completion" && metadata?.triggerCharacters) {
			regData.triggerCharacters = metadata.triggerCharacters;
		}

		this.#providerHandles.set(handle, regData);

		const mainThreadMethodName =
			`$register${type}Provider` as keyof MainThreadLanguageFeaturesShape;

		if (
			this.#mainThreadLanguageFeaturesProxy &&
			typeof this.#mainThreadLanguageFeaturesProxy[
				mainThreadMethodName
			] === "function"
		) {
			try {
				// Call the specific RPC method, adapting arguments as needed

				// For example, $registerCodeActionProvider might take metadata

				if (
					type === "CodeAction" &&
					(this.#mainThreadLanguageFeaturesProxy as any)[
						mainThreadMethodName
					]
				) {
					await (this.#mainThreadLanguageFeaturesProxy as any)[
						mainThreadMethodName
					](handle, selector, metadata);
				} else if (
					type === "Completion" &&
					(this.#mainThreadLanguageFeaturesProxy as any)[
						mainThreadMethodName
					]
				) {
					await (this.#mainThreadLanguageFeaturesProxy as any)[
						mainThreadMethodName
					](handle, selector, regData.triggerCharacters || []);
				} else if (
					(this.#mainThreadLanguageFeaturesProxy as any)[
						mainThreadMethodName
					]
				) {
					await (this.#mainThreadLanguageFeaturesProxy as any)[
						mainThreadMethodName
					](handle, selector);
				}

				this._log(
					`${type}Provider registration notification potentially sent for handle: ${handle}`,
				);
			} catch (e: any) {
				// Clean up if RPC failed
				this.#providerHandles.delete(handle);

				this._logError(
					`Failed to send ${type}Provider registration via RPC:`,

					e,
				);

				throw refineError(
					e,

					this._logService,

					`register${type}Provider`,
				);
			}
		} else {
			this._logWarn(
				`No RPC method ${mainThreadMethodName} on proxy, or proxy unavailable. ${type}Provider not registered on main thread.`,
			);
		}

		return handle;
	}

	public $registerCodeLensProvider = async (
		selector: DocumentSelector,

		provider: CodeLensProvider,
	): Promise<number> => this._simpleRegister("CodeLens", selector, provider);

	public $registerCodeActionProvider = async (
		selector: DocumentSelector,

		provider: CodeActionProvider,

		metadata?: any,
	): Promise<number> =>
		this._simpleRegister("CodeAction", selector, provider, metadata);

	public $registerDocumentHighlightProvider = async (
		selector: DocumentSelector,

		provider: DocumentHighlightProvider,
	): Promise<number> =>
		this._simpleRegister("DocumentHighlight", selector, provider);

	public $registerDocumentLinkProvider = async (
		selector: DocumentSelector,

		provider: DocumentLinkProvider,
	): Promise<number> =>
		this._simpleRegister("DocumentLink", selector, provider);

	public $registerDocumentFormattingEditProvider = async (
		selector: DocumentSelector,

		provider: DocumentFormattingEditProvider,
	): Promise<number> =>
		this._simpleRegister("DocumentFormattingEdit", selector, provider);

	public $registerDocumentRangeFormattingEditProvider = async (
		selector: DocumentSelector,

		provider: DocumentRangeFormattingEditProvider,
	): Promise<number> =>
		this._simpleRegister("DocumentRangeFormattingEdit", selector, provider);

	// Pass triggers via metadata
	public $registerOnTypeFormattingEditProvider = async (
		selector: DocumentSelector,

		provider: OnTypeFormattingEditProvider,

		triggerCharacters: string[],
	): Promise<number> =>
		this._simpleRegister("OnTypeFormattingEdit", selector, provider, {
			triggerCharacters,
		});

	public $registerReferenceProvider = async (
		selector: DocumentSelector,

		provider: ReferenceProvider,
	): Promise<number> => this._simpleRegister("Reference", selector, provider);

	public $registerRenameProvider = async (
		selector: DocumentSelector,

		provider: RenameProvider,
	): Promise<number> => this._simpleRegister("Rename", selector, provider);

	public $registerSignatureHelpProvider = async (
		selector: DocumentSelector,

		provider: SignatureHelpProvider,

		metadata: any /* SignatureHelpProviderMetadataDto */,
	): Promise<number> =>
		this._simpleRegister("SignatureHelp", selector, provider, metadata);

	public $registerImplementationProvider = async (
		selector: DocumentSelector,

		provider: ImplementationProvider,
	): Promise<number> =>
		this._simpleRegister("Implementation", selector, provider);

	public $registerTypeDefinitionProvider = async (
		selector: DocumentSelector,

		provider: TypeDefinitionProvider,
	): Promise<number> =>
		this._simpleRegister("TypeDefinition", selector, provider);

	// Selector is not applicable
	public $registerWorkspaceSymbolProvider = async (
		provider: WorkspaceSymbolProvider,
	): Promise<number> =>
		this._simpleRegister("WorkspaceSymbol", null as any, provider);

	public $registerDeclarationProvider = async (
		selector: DocumentSelector,

		provider: DeclarationProvider,
	): Promise<number> =>
		this._simpleRegister("Declaration", selector, provider);

	public $registerSelectionRangeProvider = async (
		selector: DocumentSelector,

		provider: SelectionRangeProvider,
	): Promise<number> =>
		this._simpleRegister("SelectionRange", selector, provider);

	public $registerCallHierarchyProvider = async (
		selector: DocumentSelector,

		provider: CallHierarchyProvider,
	): Promise<number> =>
		this._simpleRegister("CallHierarchy", selector, provider);

	public $registerTypeHierarchyProvider = async (
		selector: DocumentSelector,

		provider: TypeHierarchyProvider,
	): Promise<number> =>
		this._simpleRegister("TypeHierarchy", selector, provider);

	public $registerLinkedEditingRangeProvider = async (
		selector: DocumentSelector,

		provider: LinkedEditingRangeProvider,
	): Promise<number> =>
		this._simpleRegister("LinkedEditingRange", selector, provider);

	// Add InlayHints, DocumentColor, FoldingRange etc.

	// --- Unregistration ---
	public async $unregisterProvider(handle: number): Promise<void> {
		this._log(`$unregisterProvider called: handle=${handle}`);

		const registration = this.#providerHandles.get(handle);

		if (this.#providerHandles.delete(handle)) {
			this._log(
				`Locally unregistered provider handle: ${handle} (Type: ${registration?.type})`,
			);
		} else {
			this._logWarn(
				`Attempted to unregister non-existent local provider handle: ${handle}`,
			);
		}

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"Cannot send unregister request, RPC proxy unavailable.",
			);

			// Don't throw for unregister typically
			return;
		}

		try {
			await this.#mainThreadLanguageFeaturesProxy.$unregisterProvider(
				handle,
			);

			this._log(
				`Unregistration request sent to main thread for handle ${handle}.`,
			);
		} catch (e: any) {
			this._logError(
				`Failed to send unregister request for handle ${handle} via RPC:`,

				e,
			);

			// Log refined error but don't rethrow
			refineError(e, this._logService, "unregisterProvider");
		}
	}

	// --- Provider Execution Methods (Called BY Mountain via RPC) ---

	private _getProviderMethod<M extends keyof P, P = any>(
		handle: number,

		methodName: M,

		expectedType: string,
	): P[M] | null {
		const registration = this.#providerHandles.get(handle);

		if (!registration) {
			this._logWarn(
				`No registration found for handle: ${handle} (expected ${expectedType})`,
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
				`${expectedType}Provider found for handle ${handle}, but method '${String(methodName)}' is missing or not a function.`,
			);

			return null;
		}

		return (provider[methodName] as Function).bind(provider) as P[M];
	}

	private _getDocOrLog(revivedUri: Uri | undefined): TextDocument | null {
		if (!revivedUri) return null;

		// Gets ShimDocumentData
		const documentData = this.#extHostDocuments.getDocument(revivedUri);

		if (!documentData) {
			this._logError(
				`Document not found for URI: ${revivedUri.toString()}`,
			);

			return null;
		}

		// Return the vscode.TextDocument facade
		return documentData.document;
	}

	// Helper to create CancellationToken from DTO (if DTO is used)

	private _createCancellationToken(
		tokenDto: any /* ICancellationTokenDto */,
	): CancellationToken {
		// For MVP, if tokenDto is not complex, CancellationToken.None might suffice.

		// If tokenDto has an id for a CancellationTokenSource on the main thread,

		// it's more complex to proxy cancellation.

		// Basic check
		if (tokenDto && typeof tokenDto.isCancellationRequested === "boolean") {
			// This implies tokenDto itself might be a CancellationToken-like object

			// Or we need to create one that polls $isCancelled(tokenId)

			this._logWarnOnce(
				"CancellationToken handling in providers is basic (uses CancellationToken.None or direct DTO properties).",
			);
		}

		// Placeholder
		return CancellationToken.None;
	}

	// --- Revivers for RPC arguments (using base shim helpers) ---
	protected _reviveUri(uriComponents: any): Uri | undefined {
		return super._reviveApiArgument<Uri>(uriComponents);
	}

	protected _revivePosition(posDto: any): Position | undefined {
		return super._reviveApiArgument<Position>(posDto);
	}

	protected _reviveRange(rangeDto: any): Range | undefined {
		return super._reviveApiArgument<Range>(rangeDto);
	}

	protected _reviveLocation(locDto: any): Location | undefined {
		return super._reviveApiArgument<Location>(locDto);
	}

	protected _reviveCompletionContext(
		contextDto: any,
	): CompletionContext | undefined {
		// CompletionContext has triggerKind and triggerCharacter

		// This might need specific revival if it's not a plain object.

		if (!contextDto) return undefined;

		return {
			// Assuming these are direct properties
			triggerKind: contextDto.triggerKind,

			triggerCharacter: contextDto.triggerCharacter,
		} as CompletionContext;
	}

	public async $provideHover(
		handle: number,

		uriComponents: any,

		positionDto: any,

		tokenDto: any,
	): Promise<Hover | undefined> {
		this._log(`Received $provideHover request for handle ${handle}`);

		const provideHoverMethod = this._getProviderMethod<
			"provideHover",
			HoverProvider
		>(handle, "provideHover", "Hover");

		if (!provideHoverMethod) return undefined;

		const revivedUri = this._reviveUri(uriComponents);

		const revivedPosition = this._revivePosition(positionDto);

		const document = this._getDocOrLog(revivedUri);

		if (!document || !revivedPosition) return undefined;

		const token = this._createCancellationToken(tokenDto);

		try {
			const result = await provideHoverMethod(
				document,

				revivedPosition,

				token,
			);

			this._log(
				`HoverProvider result received for handle ${handle}: ${result ? "{...Hover...}" : result}`,
			);

			// Marshal result for sending back
			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing provideHover for handle ${handle}:`,

				err,
			);

			return undefined;
		}
	}

	public async $provideCompletionItems(
		handle: number,

		uriComponents: any,

		positionDto: any,

		contextDto: any,

		tokenDto: any,
	): Promise<CompletionList | CompletionItem[] | undefined> {
		this._log(
			`Received $provideCompletionItems request for handle ${handle}`,
		);

		const provideItemsMethod = this._getProviderMethod<
			"provideCompletionItems",
			CompletionItemProvider
		>(handle, "provideCompletionItems", "Completion");

		if (!provideItemsMethod) return undefined;

		const revivedUri = this._reviveUri(uriComponents);

		const revivedPosition = this._revivePosition(positionDto);

		const revivedContext = this._reviveCompletionContext(contextDto);

		const document = this._getDocOrLog(revivedUri);

		if (!document || !revivedPosition || !revivedContext) return undefined;

		const token = this._createCancellationToken(tokenDto);

		try {
			const result = await provideItemsMethod(
				document,

				revivedPosition,

				token,

				revivedContext,
			);

			this._log(
				`CompletionProvider result received for handle ${handle}`,
			);

			// Marshal CompletionList or CompletionItem[]
			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing provideCompletionItems for handle ${handle}:`,

				err,
			);

			return undefined;
		}
	}

	public async $resolveCompletionItem(
		handle: number,

		itemDto: any,

		tokenDto: any,
	): Promise<CompletionItem | undefined> {
		this._log(
			`Received $resolveCompletionItem request for handle ${handle}`,
		);

		const resolveMethod = this._getProviderMethod<
			"resolveCompletionItem",
			CompletionItemProvider
		>(handle, "resolveCompletionItem", "Completion");

		if (!resolveMethod) {
			// If provider doesn't have resolve, return the original item DTO (already marshalled by main thread)

			this._logWarn(
				`No CompletionItemProvider.resolveCompletionItem found for handle ${handle}, returning original item DTO.`,
			);

			// itemDto is already the marshalled form from main thread
			return itemDto;
		}

		const token = this._createCancellationToken(tokenDto);

		try {
			// Revive the item DTO to a vscode.CompletionItem instance for the provider

			const revivedItem =
				this._reviveApiArgument<CompletionItem>(itemDto);

			if (!revivedItem) {
				this._logError(
					`Failed to revive CompletionItem DTO for handle ${handle}`,
				);

				// Return original DTO on revival failure
				return itemDto;
			}

			const result = await resolveMethod(revivedItem, token);

			this._log(`CompletionItem resolved for handle ${handle}`);

			// Marshal resolved CompletionItem
			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing resolveCompletionItem for handle ${handle}:`,

				err,
			);

			// Return original DTO on error
			return itemDto;
		}
	}

	public async $provideDefinition(
		handle: number,

		uriComponents: any,

		positionDto: any,

		tokenDto: any,
	): Promise<Definition | Definition[] | undefined> {
		this._log(`Received $provideDefinition request for handle ${handle}`);

		const provideDefMethod = this._getProviderMethod<
			"provideDefinition",
			DefinitionProvider
		>(handle, "provideDefinition", "Definition");

		if (!provideDefMethod) return undefined;

		const revivedUri = this._reviveUri(uriComponents);

		const revivedPosition = this._revivePosition(positionDto);

		const document = this._getDocOrLog(revivedUri);

		if (!document || !revivedPosition) return undefined;

		const token = this._createCancellationToken(tokenDto);

		try {
			const result = await provideDefMethod(
				document,

				revivedPosition,

				token,
			);

			this._log(
				`DefinitionProvider result received for handle ${handle}`,
			);

			// Marshal Location | Location[] | DefinitionLink[]
			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing provideDefinition for handle ${handle}:`,

				err,
			);

			return undefined;
		}
	}

	// --- Stubs for other provider execution methods ---

	public async $resolveDocumentLink(
		handle: number,

		linkDto: any,

		tokenDto: any,
	): Promise<DocumentLink | undefined> {
		this._logWarnOnce(
			`Provider execution not implemented: $resolveDocumentLink (handle: ${handle})`,
		);

		// Revive linkDto to DocumentLink, call provider.resolveDocumentLink, marshal result

		// Basic: return revived DTO if no resolve
		return this._reviveApiArgument(linkDto);
	}

	public async $resolveWorkspaceSymbol(
		handle: number,

		symbolDto: any,

		tokenDto: any,
	): Promise<SymbolInformation | undefined> {
		this._logWarnOnce(
			`Provider execution not implemented: $resolveWorkspaceSymbol (handle: ${handle})`,
		);

		return this._reviveApiArgument(symbolDto);
	}

	public async $resolveCodeLens(
		handle: number,

		codeLensDto: any,

		tokenDto: any,
	): Promise<any | undefined> {
		this._logWarnOnce(
			`Provider execution not implemented: $resolveCodeLens (handle: ${handle})`,
		);

		return this._reviveApiArgument(codeLensDto);
	}

	// TODO: Implement other $provide* and $resolve* methods similarly.
}

// Class is already exported
// export { ShimLanguageFeatures };
