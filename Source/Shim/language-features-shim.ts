/*---------------------------------------------------------------------------------------------
 * Cocoon Language Features Shim (shims/language-features-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `ExtHostLanguageFeaturesShape` interface. It handles registration/unregistration
 * of language providers (hover, completion, etc.) and executes provider methods when invoked
 * by Mountain via RPC.
 *
 * Responsibilities:
 * - Storing registered provider objects locally.
 * - Implementing `$register*Provider` methods (called by `ShimLanguages`):
 *   - Generates a handle, stores the provider, and notifies `MainThreadLanguageFeatures` via RPC.
 * - Implementing `$unregisterProvider`: Removes provider locally and notifies main thread.
 * - Implementing `$provide*` / `$resolve*` methods (called by Mountain via RPC):
 *   - Retrieves the provider, document, and calls the provider method.
 *   - Marshals/revives arguments and results.
 *
 * Key Interactions:
 * - Methods prefixed with `$` (except `$register*Provider`) are part of the RPC interface
 *   called by Mountain's `MainThreadLanguageFeatures`.
 * - `$register*Provider` methods are called by `ShimLanguages` (the `vscode.languages` API shim).
 * - Uses `BaseCocoonShim` for RPC, logging, marshalling, and revival.
 * - Depends on `ShimDocumentService` to get `TextDocument` instances.
 *--------------------------------------------------------------------------------------------*/

// IDisposable is not directly returned by this shim's $register methods, but by ShimLanguages.
// import { IDisposable } from "vs/base/common/lifecycle";

import {
	CancellationToken,
	CancellationTokenSource,
} from "vs/base/common/cancellation";
import {
	ExtHostContext,
	MainContext,
	// TODO: Import specific DTOs from extHost.protocol.ts if defined (e.g., IRawDocumentSelector, IRawHover)
	// For now, using `any` or vscode types directly for DTOs, assuming they are compatible or revived.
} from "vs/workbench/api/common/extHost.protocol";

import {
	CallHierarchyIncomingCall,
	CallHierarchyItem,
	CallHierarchyOutgoingCall,
	CallHierarchyProvider,
	type CodeAction,
	type CodeActionProvider,
	type CodeLens,
	type CodeLensProvider,
	type CompletionContext,
	type CompletionItem,
	type CompletionItemProvider,
	type CompletionList,
	Declaration,
	DeclarationProvider,
	type Definition,
	type DefinitionLink,
	type DefinitionProvider,
	DocumentFormattingEditProvider,
	DocumentHighlight,
	DocumentHighlightProvider,
	type DocumentLink,
	DocumentLinkProvider,
	DocumentRangeFormattingEditProvider,
	type DocumentSelector,
	FormattingOptions,
	type Hover,
	type HoverProvider,
	Implementation,
	ImplementationProvider,
	LinkedEditingRangeProvider,
	LinkedEditingRanges,
	OnTypeFormattingEditProvider,
	ReferenceContext,
	ReferenceProvider,
	RenameLocation,
	RenameProvider,
	SelectionRange,
	SelectionRangeProvider,
	SignatureHelp,
	SignatureHelpContext,
	SignatureHelpProvider,
	type SymbolInformation,
	SymbolKind,
	type TextDocument,
	TextEdit,
	TypeDefinition,
	TypeDefinitionProvider,
	TypeHierarchyItem,
	TypeHierarchyProvider,
	Location as VscodeLocation,
	type Position as VscodePosition,
	Range as VscodeRange,
	// vscode API types used by providers
	type Uri as VscodeUri,
	WorkspaceSymbolProvider,
	// TODO: Add other provider types and their result types (InlayHint, ColorInformation, FoldingRange, etc.)
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
	refineError,
} from "./_baseShim";
// Assuming from 'vscode' API shim or real types

// For IExtHostDocuments functionality
import type { ShimDocumentService } from "./document-shim";

// --- Type Definitions ---

interface ProviderRegistrationData {
	// The actual language provider object
	provider: any;

	// Null for workspace-wide providers like WorkspaceSymbolProvider
	selector: DocumentSelector | null;

	// e.g., "Hover", "Completion"
	type: string;

	triggerCharacters?: string[];

	// For CodeActionProviderMetadata, SignatureHelpProviderMetadata, etc.
	metadata?: any;

	// TODO: Add event emitters for providers like CodeLensProvider if they have onDidChangeCodeLenses
	// onDidChangeCodeLensesEmitter?: VscodeEmitter<void>;
}

// RPC Shape for MainThreadLanguageFeatures
// TODO: This MUST align with the actual MainThreadLanguageFeatures service in Mountain.
interface MainThreadLanguageFeaturesShape {
	$registerHoverProvider(
		handle: number,

		selector: DocumentSelector,
	): Promise<void>;

	$registerCompletionProvider(
		handle: number,

		selector: DocumentSelector,

		triggerCharacters: ReadonlyArray<string>,

		supportsResolveDetails?: boolean,
	): Promise<void>;

	$registerDefinitionProvider(
		handle: number,

		selector: DocumentSelector,
	): Promise<void>;

	$registerCodeLensProvider(
		handle: number,

		selector: DocumentSelector,

		eventHandle?: number,

		// eventHandle for onDidChangeCodeLenses
	): Promise<void>;

	$registerCodeActionProvider(
		handle: number,

		selector: DocumentSelector,

		metadata?: any /* CodeActionProviderMetadataDto */,

		displayName?: string,
	): Promise<void>;

	// TODO: Add $register methods for ALL other provider types. Ensure signatures (metadata, trigger chars, event handles) match protocol.
	// e.g., $registerDocumentLinkProvider(handle: number, selector: DocumentSelector, supportsResolve?: boolean): Promise<void>;

	$unregisterProvider(handle: number): Promise<void>;
}

// RPC Shape for ExtHostLanguageFeatures (methods on this class called BY Mountain)
// TODO: This MUST align with VS Code's `ExtHostLanguageFeaturesShape` (from extHost.protocol.ts)
export interface ExtHostLanguageFeaturesServiceShape {
	// Renamed to avoid conflict if VS Code type is imported
	// These are the methods called by ShimLanguages (which is vscode.languages)
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

	$registerCodeLensProvider(
		selector: DocumentSelector,

		provider: CodeLensProvider,
	): Promise<number>;

	$registerCodeActionProvider(
		selector: DocumentSelector,

		provider: CodeActionProvider,

		metadata?: any /* CodeActionProviderMetadata from vscode API */,
	): Promise<number>;

	// TODO: Add ALL other $register*Provider methods that ShimLanguages will call.

	$unregisterProvider(handle: number): Promise<void>;

	// These are the methods called BY Mountain to execute providers
	$provideHover(
		handle: number,

		uriComponents: any,

		positionDto: any,

		tokenDto: any,
	): Promise<Hover | undefined /* IRawHover | undefined */>;

	$provideCompletionItems(
		handle: number,

		uriComponents: any,

		positionDto: any,

		contextDto: any,

		tokenDto: any,
	): Promise<
		| CompletionList
		| CompletionItem[]
		| undefined /* IRawCompletionList | undefined */
	>;

	$resolveCompletionItem(
		handle: number,

		itemDto: any /* IRawCompletionItem */,

		tokenDto: any,
	): Promise<CompletionItem | undefined /* IRawCompletionItem | undefined */>;

	$provideDefinition(
		handle: number,

		uriComponents: any,

		positionDto: any,

		tokenDto: any,
	): Promise<
		| Definition
		| DefinitionLink[]
		| undefined /* IRawLocationDto | IRawLocationDto[] | DefinitionLinkDto[] */
	>;

	// TODO: Add ALL other $provide* and $resolve* methods.
	$provideCodeLenses?(
		handle: number,

		uriComponents: any,

		tokenDto: any,
	): Promise<CodeLens[] | undefined /* IRawCodeLensList | undefined */>;

	$resolveCodeLens?(
		handle: number,

		codeLensDto: any /* IRawCodeLens */,

		tokenDto: any,
	): Promise<CodeLens | undefined /* IRawCodeLens | undefined */>;

	$provideCodeActions?(
		handle: number,

		uriComponents: any,

		rangeDto: any,

		contextDto: any,

		tokenDto: any,
	): Promise<
		| (Command | CodeAction)[]
		| undefined /* (CommandDto | CodeActionDto)[] */
	>;

	// ... and so on for all provider execution methods.
}

export class ShimLanguageFeatures
	extends BaseCocoonShim
	implements ExtHostLanguageFeaturesServiceShape
{
	// For ExtHostLanguageFeaturesShape DI type
	public readonly _serviceBrand: undefined;

	readonly #mainThreadLanguageFeaturesProxy: MainThreadLanguageFeaturesShape | null =
		null;

	#providerHandlePool = 0;

	readonly #providerHandles = new Map<number, ProviderRegistrationData>();

	// Type is concrete ShimDocumentService
	readonly #extHostDocuments: ShimDocumentService;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,

		// Inject concrete shim
		extHostDocuments: ShimDocumentService,
	) {
		super("ExtHostLanguageFeatures", rpcService, logService);

		this._log("Initializing...");

		if (!extHostDocuments) {
			this._logError(
				"ExtHostDocuments service is critical and was not provided!",
			);

			// Consider throwing if this is an unrecoverable state.
		}

		this.#extHostDocuments = extHostDocuments;

		if (this._rpcService) {
			this.#mainThreadLanguageFeaturesProxy = this._getProxy(
				MainContext.MainThreadLanguageFeatures as ProxyIdentifier<MainThreadLanguageFeaturesShape>,
			);

			// Register self for RPC calls from Mountain
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostLanguageFeatures as ProxyIdentifier<ExtHostLanguageFeaturesServiceShape>,

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

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"Failed to get MainThreadLanguageFeatures proxy! Provider registration and execution will be impaired.",
			);
		}
	}

	// --- Generic Registration Helper (Internal to this class, called by $register* methods) ---
	private async _doRegisterProvider<P>(
		providerType: string,

		provider: P,

		// Null for workspace-wide providers
		selector: DocumentSelector | null,

		mainThreadCall: (
			handle: number,

			selector: DocumentSelector | null,

			providerSpecificArgs?: any,
		) => Promise<void>,

		// e.g., triggerCharacters, metadata, eventHandle
		providerSpecificArgs?: any,
	): Promise<number> {
		const handle = ++this.#providerHandlePool;

		this.#providerHandles.set(handle, {
			provider,

			selector,

			type: providerType,

			...providerSpecificArgs,
		});

		this._log(
			`Locally registered ${providerType}Provider with handle ${handle}. Selector: ${JSON.stringify(selector)}`,
		);

		if (!this.#mainThreadLanguageFeaturesProxy) {
			// Rollback local registration
			this.#providerHandles.delete(handle);

			const errorMsg = `Cannot register ${providerType}Provider, RPC proxy to MainThreadLanguageFeatures unavailable.`;

			this._logError(errorMsg);

			throw new Error(errorMsg);
		}

		try {
			await mainThreadCall.call(
				this.#mainThreadLanguageFeaturesProxy,

				handle,

				selector,

				providerSpecificArgs,
			);

			this._log(
				`${providerType}Provider (handle ${handle}) registration sent to main thread.`,
			);

			return handle;
		} catch (e: any) {
			// Rollback local registration
			this.#providerHandles.delete(handle);

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
		selector: DocumentSelector,

		provider: HoverProvider,
	): Promise<number> {
		return this._doRegisterProvider("Hover", provider, selector, (h, sel) =>
			this.#mainThreadLanguageFeaturesProxy!.$registerHoverProvider(
				h,

				sel!,

				// sel cannot be null for hover
			),
		);
	}

	public $registerCompletionProvider(
		selector: DocumentSelector,

		provider: CompletionItemProvider,

		triggerCharacters: string[],
	): Promise<number> {
		const supportsResolve =
			typeof provider.resolveCompletionItem === "function";

		return this._doRegisterProvider(
			"Completion",

			provider,

			selector,

			(h, sel, args) =>
				this.#mainThreadLanguageFeaturesProxy!.$registerCompletionProvider(
					h,

					sel!,

					args.triggerCharacters,

					args.supportsResolve,
				),

			{ triggerCharacters, supportsResolve },
		);
	}

	public $registerDefinitionProvider(
		selector: DocumentSelector,

		provider: DefinitionProvider,
	): Promise<number> {
		return this._doRegisterProvider(
			"Definition",

			provider,

			selector,

			(h, sel) =>
				this.#mainThreadLanguageFeaturesProxy!.$registerDefinitionProvider(
					h,

					sel!,
				),
		);
	}

	public $registerCodeLensProvider(
		selector: DocumentSelector,

		provider: CodeLensProvider,
	): Promise<number> {
		// TODO: Handle onDidChangeCodeLenses event if provider has it. This involves creating an event emitter,

		// getting a handle for it, and passing that eventHandle to the main thread.
		// const eventHandle = provider.onDidChangeCodeLenses ? someWayToGetEventHandle(provider.onDidChangeCodeLenses) : undefined;

		// Placeholder
		const eventHandle = undefined;

		if (!this.#mainThreadLanguageFeaturesProxy?.$registerCodeLensProvider) {
			this._logWarnOnce(
				"MainThreadLanguageFeatures.$registerCodeLensProvider not available/defined on proxy.",
			);

			// Fallback to local-only registration
			return this._simpleLocalRegister("CodeLens", provider, selector);
		}

		return this._doRegisterProvider(
			"CodeLens",

			provider,

			selector,

			(h, sel) =>
				this.#mainThreadLanguageFeaturesProxy!
					.$registerCodeLensProvider!(h, sel!, eventHandle),
		);
	}

	public $registerCodeActionProvider(
		selector: DocumentSelector,

		provider: CodeActionProvider,

		metadata?: any /* vscode.CodeActionProviderMetadata */,
	): Promise<number> {
		// TODO: Convert vscode.CodeActionProviderMetadata to the DTO expected by $registerCodeActionProvider.
		// Assuming direct pass-through for now or metadata is already DTO
		const metadataDto = metadata;

		const displayName =
			typeof provider.displayName === "string"
				? provider.displayName
				: undefined;

		if (
			!this.#mainThreadLanguageFeaturesProxy?.$registerCodeActionProvider
		) {
			this._logWarnOnce(
				"MainThreadLanguageFeatures.$registerCodeActionProvider not available/defined on proxy.",
			);

			return this._simpleLocalRegister(
				"CodeAction",

				provider,

				selector,

				metadataDto,
			);
		}

		return this._doRegisterProvider(
			"CodeAction",

			provider,

			selector,

			(h, sel, args) =>
				this.#mainThreadLanguageFeaturesProxy!
					.$registerCodeActionProvider!(
					h,

					sel!,

					args.metadataDto,

					args.displayName,
				),

			{ metadataDto, displayName },
		);
	}

	// Fallback for providers where main thread registration is not yet implemented or proxy method is missing
	private async _simpleLocalRegister<P>(
		type: string,

		provider: P,

		selector: DocumentSelector | null,

		metadata?: any,
	): Promise<number> {
		this._logWarnOnce(
			`Using simple local registration for ${type}Provider. Main thread notification might be missing or partial.`,
		);

		const handle = ++this.#providerHandlePool;

		this.#providerHandles.set(handle, {
			provider,

			selector,

			type,

			...metadata,
		});

		return handle;
	}

	// TODO: Implement ALL other $register*Provider methods from ExtHostLanguageFeaturesServiceShape
	// For example:
	// public $registerDocumentLinkProvider = ...
	// Each should call _doRegisterProvider with the correct main thread proxy method and arguments.

	// --- $unregisterProvider ---
	public async $unregisterProvider(handle: number): Promise<void> {
		// Implementation from previous step, seems fine.
		// Consider if unregistering a provider with an active onDidChange event emitter needs special cleanup.
		this._log(`$unregisterProvider called for handle: ${handle}`);

		const registration = this.#providerHandles.get(handle);

		if (this.#providerHandles.delete(handle)) {
			this._log(
				`Locally unregistered provider handle: ${handle} (Type: ${registration?.type})`,
			);

			// TODO: If provider had an onDidChange event (e.g. CodeLens), dispose its emitter/subscription here.
		} else {
			this._logWarn(
				`Attempted to unregister non-existent local provider handle: ${handle}`,
			);
		}

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"Cannot send unregister request, RPC proxy unavailable.",
			);

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

			refineError(e, this._logService, "unregisterProvider");
		}
	}

	// --- Provider Execution Methods (Called BY Mountain via RPC) ---

	private _getProviderAndMethod<P, M extends keyof P>(
		handle: number,

		methodName: M,

		expectedType: string,
	): { provider: P; method: P[M] } | null {
		const registration = this.#providerHandles.get(handle);

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

		return { provider, method: provider[methodName] as P[M] };
	}

	private _getTextDocument(uriComponents: any): TextDocument | null {
		// uriComponents is DTO
		// Use VscodeUri for vscode.TextDocument
		const revivedUri = this._reviveApiArgument<VscodeUri>(uriComponents);

		if (!revivedUri) {
			this._logError(
				"Failed to revive URI for getTextDocument",

				uriComponents,
			);

			return null;
		}

		// getDocument expects vscode.Uri
		const documentData = this.#extHostDocuments.getDocument(revivedUri);

		if (!documentData) {
			this._logError(`Document not found: ${revivedUri.toString()}`);

			return null;
		}

		// This is vscode.TextDocument
		return documentData.document;
	}

	// TODO: Implement proper CancellationToken creation if Mountain sends a tokenId or other DTO for it.
	// This might involve a CancellationTokenRegistry on the ExtHost side.
	private _getCancellationToken(tokenDto: any): CancellationToken {
		if (tokenDto && typeof tokenDto === "object" && tokenDto.id) {
			this._logWarnOnce(
				"CancellationToken DTO received, but full proxying not implemented. Using CancellationToken.None.",
			);

			// Example: return this.#cancellationRegistry.getToken(tokenDto.id);
		}

		// Default if no DTO or not implemented
		return CancellationToken.None;
	}

	public async $provideHover(
		handle: number,

		uriComponents: any,

		positionDto: any,

		tokenDto: any,
	): Promise<Hover | undefined> {
		const providerInfo = this._getProviderAndMethod<
			HoverProvider,
			"provideHover"
		>(handle, "provideHover", "Hover");

		if (!providerInfo) return undefined;

		const document = this._getTextDocument(uriComponents);

		const position = this._reviveApiArgument<VscodePosition>(positionDto);

		if (!document || !position) return undefined;

		const token = this._getCancellationToken(tokenDto);

		try {
			const result = await providerInfo.method.call(
				providerInfo.provider,

				document,

				position,

				token,
			);

			// this._log(`HoverProvider (handle ${handle}) result: ${result ? "Hover" : "undefined"}`);

			// Marshal result
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

		uriComponents: any,

		positionDto: any,

		contextDto: any,

		tokenDto: any,
	): Promise<CompletionList | CompletionItem[] | undefined> {
		const providerInfo = this._getProviderAndMethod<
			CompletionItemProvider,
			"provideCompletionItems"
		>(handle, "provideCompletionItems", "Completion");

		if (!providerInfo) return undefined;

		const document = this._getTextDocument(uriComponents);

		const position = this._reviveApiArgument<VscodePosition>(positionDto);

		// TODO: Ensure CompletionContext revival is correct
		const context = this._reviveApiArgument<CompletionContext>(contextDto);

		if (!document || !position || !context) return undefined;

		const token = this._getCancellationToken(tokenDto);

		try {
			const result = await providerInfo.method.call(
				providerInfo.provider,

				document,

				position,

				context,

				token,
			);

			// this._log(`CompletionProvider (handle ${handle}) result: ${result ? (Array.isArray(result) ? result.length + " items" : "CompletionList") : "undefined"}`);

			return this._convertApiArgToInternal(result);
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

		itemDto: any,

		tokenDto: any,
	): Promise<CompletionItem | undefined> {
		const providerInfo = this._getProviderAndMethod<
			CompletionItemProvider,
			"resolveCompletionItem"
		>(handle, "resolveCompletionItem", "Completion");

		// If provider or resolveCompletionItem method doesn't exist, VS Code often returns the original (unresolved) item.
		if (!providerInfo?.method) {
			this._logWarn(
				`No resolveCompletionItem method for handle ${handle}. Returning unrevived DTO or revived item if possible.`,
			);

			// itemDto is from main thread, potentially already marshalled. If we need to return it, it should be as is.
			// Or, if it was a *revived* item initially sent from ext host, then revive it.
			// The contract here is tricky. Let's assume itemDto is what main thread sent (marshalled).
			// Return DTO as is if no resolver
			return itemDto;
		}

		const itemToResolve = this._reviveApiArgument<CompletionItem>(itemDto);

		if (!itemToResolve) {
			this._logError(
				`Failed to revive CompletionItem DTO for resolve (handle ${handle}):`,

				itemDto,
			);

			// Return original DTO
			return itemDto;
		}

		const token = this._getCancellationToken(tokenDto);

		try {
			const result = await providerInfo.method.call(
				providerInfo.provider,

				itemToResolve,

				token,
			);

			// this._log(`resolveCompletionItem (handle ${handle}) result: ${result ? "Resolved Item" : "undefined"}`);

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

		uriComponents: any,

		positionDto: any,

		tokenDto: any,
	): Promise<Definition | DefinitionLink[] | undefined> {
		const providerInfo = this._getProviderAndMethod<
			DefinitionProvider,
			"provideDefinition"
		>(handle, "provideDefinition", "Definition");

		if (!providerInfo) return undefined;

		const document = this._getTextDocument(uriComponents);

		const position = this._reviveApiArgument<VscodePosition>(positionDto);

		if (!document || !position) return undefined;

		const token = this._getCancellationToken(tokenDto);

		try {
			const result = await providerInfo.method.call(
				providerInfo.provider,

				document,

				position,

				token,
			);

			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing provideDefinition (handle ${handle}):`,

				err,
			);

			return undefined;
		}
	}

	// TODO: Implement ALL other $provide* and $resolve* methods from ExtHostLanguageFeaturesServiceShape.
	// Each will follow a similar pattern:
	// 1. Get provider method using _getProviderAndMethod.
	// 2. Get TextDocument if URI is an argument.
	// 3. Revive arguments (Position, Range, Context objects, specific DTOs) using _reviveApiArgument.
	// 4. Get CancellationToken.
	// 5. Call the provider method within a try/catch.
	// 6. Marshal the result using _convertApiArgToInternal.
	// Example stubs for remaining:
	public async $provideCodeLenses(
		handle: number,

		uriComponents: any,

		tokenDto: any,
	): Promise<CodeLens[] | undefined> {
		this._logWarnOnce(`$provideCodeLenses for handle ${handle} - STUBBED`);

		return undefined;
	}

	public async $resolveCodeLens(
		handle: number,

		codeLensDto: any,

		tokenDto: any,
	): Promise<CodeLens | undefined> {
		this._logWarnOnce(`$resolveCodeLens for handle ${handle} - STUBBED`);

		// Basic: return revived DTO
		return this._reviveApiArgument(codeLensDto);
	}

	// ... and so on for DocumentLinks, CodeActions, Highlights, Formatting, References, Rename, SignatureHelp, etc.

	// These were in original JS, ensure they are on ExtHostLanguageFeaturesServiceShape if still used
	public async $resolveDocumentLink(
		handle: number,

		linkDto: any,

		tokenDto: any,
	): Promise<DocumentLink | undefined> {
		this._logWarnOnce(
			`Provider execution not implemented: $resolveDocumentLink (handle: ${handle})`,
		);

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

	// BaseCocoonShim's _convertApiArgToInternal and _reviveApiArgument are used for marshalling.
}
