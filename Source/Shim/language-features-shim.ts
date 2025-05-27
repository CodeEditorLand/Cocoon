/*---------------------------------------------------------------------------------------------
 * Cocoon Language Features Shim (language-features-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `VscodeExtHostLanguageFeaturesShape` (from `extHost.protocol.ts`),
 *
 * which serves as the ExtHost-side counterpart for managing language feature providers.
 * This service is central to enabling a wide array of editor functionalities, including
 * IntelliSense (hovers, completions), code navigation (go to definition, find references),
 *
 * code actions, formatting, outlining, and many others.
 *
 * It acts as a registry for various language provider types (e.g., `HoverProvider`,
 *
 * `CompletionItemProvider`) contributed by extensions. It also serves as an RPC endpoint,
 *
 * allowing the MainThread (Mountain) to invoke these registered providers to get language-
 * specific information or perform actions.
 *
 * Responsibilities:
 * - Provider Registration (methods typically called by `ShimLanguages` - the `vscode.languages` API shim):
 *   - Provides a suite of `$register*Provider` methods (e.g., `$registerHoverProvider`,
 *
 *     `$registerCompletionItemProvider`, `$registerDefinitionProvider`).
 *   - When an extension registers a provider via `vscode.languages.register*Provider`:
 *     - This service generates a unique handle for the provider registration.
 *     - It stores the provider instance, its associated `DocumentSelector`, and any
 *       provider-specific metadata (like trigger characters for completions) locally.
 *     - It then notifies `MainThreadLanguageFeatures` (on Mountain) via an RPC call,
 *
 *       passing the handle, selector (converted to `IDocumentFilterDto[]`), and any
 *       relevant provider metadata DTOs.
 * - Provider Unregistration:
 *   - Implements `$unregister(handle)` to remove a provider registration locally and
 *     notify the MainThread via RPC to also unregister it there.
 * - Provider Execution (RPC methods called BY Mountain):
 *   - Implements a corresponding suite of `$provide*` and `$resolve*` methods (e.g.,
 *
 *     `$provideHover`, `$provideCompletionItems`, `$resolveCompletionItem`).
 *   - When Mountain requests a language feature (e.g., hover information for a specific
 *     document position and URI):
 *     - It retrieves the appropriate registered provider using the handle supplied by Mountain.
 *     - It obtains the relevant `vscode.TextDocument` instance from the injected
 *       `CocoonDocumentService` using the provided URI components.
 *     - It revives RPC arguments received from Mountain (like position DTOs, context DTOs)
 *       into VS Code API types (e.g., `vscode.Position`, `vscode.CompletionContext`).
 *     - It calls the provider's method (e.g., `provider.provideHover(...)`) with the
 *       prepared arguments and a `CancellationToken`.
 *     - It marshals the result returned by the provider (which are VS Code API types)
 *       back into DTOs suitable for RPC transmission to Mountain.
 * - Argument/Result Marshalling and Type Conversion:
 *   - **CRITICAL LIMITATION (MVP):** This shim currently uses placeholder type converters
 *     (`localTypeConverters`). For full fidelity, a comprehensive type conversion
 *     mechanism (akin to VS Code's `extHostTypeConverters.ts`) is required to accurately
 *     marshal and unmarshal all complex data structures used by language features
 *     (e.g., `Hover`, `CompletionItem`, `CompletionList`, `CodeAction`, `WorkspaceEdit`).
 *   - It relies on `BaseCocoonShim` utilities for basic argument marshalling/revival
 *     (e.g., for URIs, Positions, Ranges where DTOs are simple).
 *
 * Key Interactions:
 * - An instance of `ShimLanguageFeatures` is registered with Dependency Injection (DI)
 *   in `Cocoon/index.ts` as `IExtHostLanguageFeatures`.
 * - The `vscode.languages` API object (typically provided by a `ShimLanguages` facade)
 *   delegates all provider registration calls to this service.
 * - Communicates extensively with `MainContext.MainThreadLanguageFeatures` on Mountain
 *   via RPC for provider registration/unregistration and for receiving execution requests.
 * - Is itself an RPC service target for calls from Mountain, identified by
 *   `ExtHostContext.ExtHostLanguageFeatures`.
 * - Depends on `CocoonDocumentService` to resolve document URIs to `vscode.TextDocument` instances.
 * - Uses `BaseCocoonShim` for common utilities (logging, RPC proxy, basic marshalling).
 *
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vs/base/common/cancellation";
// For NOP disposables
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
// For URI DTO checks, if needed beyond BaseCocoonShim
// import { MarshalledId } from "vs/base/common/marshalling";

import {
	// For registering this service for RPC from MainThread
	ExtHostContext,
	// For proxying to MainThreadLanguageFeatures
	MainContext,
	type CodeActionProviderMetadataDto,
	// Renamed to avoid conflict with vscode.CompletionContext
	type CompletionContextDto as ExtHostCompletionContextDto,
	// Renamed
	type SignatureHelpContextDto as ExtHostSignatureHelpContextDto,
	// DTO for DocumentSelector
	type IDocumentFilterDto,
	// Protocol DTO for position (0-based)
	type IPosition,
	// Result DTOs from protocol (examples for marshalling target)
	type ICodeActionDto as RpcCodeAction,
	type ICodeActionListDto as RpcCodeActionList,
	type ICodeLensDto as RpcCodeLens,
	type ICodeLensListDto as RpcCodeLensList,
	type ICommandDto as RpcCommand,
	// For Document Links
	// type ILinkDto as RpcLink,

	// For Document Links
	// type ILinksListDto as RpcLinksList,

	// For Definitions, Declarations, etc.
	type ILocationLinkDto as RpcLocationLink,
	// DTO for a single completion item
	type ISuggestDataDto as RpcSuggestData,
	// DTO for a list of completion items / CompletionList
	type ISuggestResultDto as RpcSuggestResult,
	// For CodeAction.edit or RenameProvider.provideRenameEdits
	type IWorkspaceEditDto as RpcWorkspaceEdit,
	type SignatureHelpProviderMetadataDto,
	// This service implements this RPC shape
	type ExtHostLanguageFeaturesShape as VscodeExtHostLanguageFeaturesShape,
	// Protocol DTO for range (0-based)
	type IRange as VscodeInternalRange,
	// DTO for URI components
	type UriComponents as VSCodeInternalUriComponents,
	// Proxy to MainThread
	type MainThreadLanguageFeaturesShape as VscodeMainThreadLanguageFeaturesShape,
} from "vs/workbench/api/common/extHost.protocol";

// Import vscode API types (from ../Shim/out/vscode or actual vscode namespace for type checking)
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
	// API URI type
	Uri as VscodeApiUri,
	// vscode API types used in provider methods and results
	CodeActionContext as VscodeCodeActionContext,
	CompletionContext as VscodeCompletionContext,
	Location as VscodeLocation,
	// API type (0-based)
	Position as VscodePosition,
	// API type (0-based)
	Range as VscodeRange,
	SignatureHelpContext as VscodeSignatureHelpContext,
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
	type CodeActionProviderMetadata as VscodeCodeActionProviderMetadata,
	type CodeLens as VscodeCodeLens,
	type Command as VscodeCommand,
	type CompletionItem as VscodeCompletionItem,
	type CompletionList as VscodeCompletionList,
	type Declaration as VscodeDeclaration,
	type Definition as VscodeDefinition,
	type DefinitionLink as VscodeDefinitionLink,
	type DocumentLink as VscodeDocumentLink,
	type Hover as VscodeHover,
	type SignatureHelp as VscodeSignatureHelp,
	type SignatureHelpProviderMetadata as VscodeSignatureHelpProviderMetadata,
	// Already imported via RpcWorkspaceEdit if structures are compatible
	// type WorkspaceEdit as VscodeWorkspaceEdit,
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
// Use concrete class for dependency
import type { CocoonDocumentService } from "./document-shim";

// --- Placeholder for Full extHostTypeConverters ---
// In a real VS Code ExtHost, this would be `import * as typeConverters from 'vs/workbench/api/common/extHostTypeConverters';`
// This MOCK implementation provides basic conversions or stubs.
// TODO: CRITICAL - Implement or integrate proper type converters for full fidelity of all language features.
// This is a major undertaking and essential for complex types like CompletionItem, Hover, CodeAction, WorkspaceEdit etc.
const localTypeConverters = {
	DocumentSelector: {
		fromDtoArray: (
			selector: DocumentSelector | null,

			_uriTransformer?: any,
		): IDocumentFilterDto[] => {
			// This converts a vscode.DocumentSelector (string, LanguageFilter, or array of these)
			// to an array of IDocumentFilterDto for RPC.
			if (!selector) return [];

			const selectors = Array.isArray(selector) ? selector : [selector];

			return (
				selectors
					.map((s) => {
						if (typeof s === "string") {
							// Language ID string
							return {
								language: s,

								scheme: undefined,

								pattern: undefined,

								notebookType: undefined,

								exclusive: undefined,
							} as IDocumentFilterDto;
						}

						if (typeof s === "object" && s !== null) {
							// LanguageFilter object
							return {
								language: s.language,

								scheme: s.scheme,

								// Handle GlobPattern which might be an object with a pattern string or a simple string
								pattern:
									typeof s.pattern === "string"
										? s.pattern
										: (s.pattern as any)?.toString(),

								// Added in newer VS Code APIs
								notebookType: s.notebookType,

								// Added in newer VS Code APIs
								exclusive: s.exclusive,
							} as IDocumentFilterDto;
						}

						// Invalid selector component
						console.warn(
							"[TypeConverter] Invalid DocumentSelector component:",

							s,
						);

						return undefined;
					})
					// Filter out any undefined from invalid components
					.filter(
						(dto): dto is IDocumentFilterDto => dto !== undefined,
					)
			);
		},
	},

	CompletionContext: {
		toApiType: (
			dto: ExtHostCompletionContextDto,
		): VscodeCompletionContext => {
			// TODO: Full conversion needed. This is a stub.
			// `dto.triggerKind` (number) needs to map to `vscode.CompletionTriggerKind` (enum).
			// `dto.triggerCharacter` is a string.
			return {
				// Assuming enum values match for now.
				triggerKind: dto.triggerKind,

				triggerCharacter: dto.triggerCharacter,
			} as VscodeCompletionContext;
		},
	},

	CodeActionContext: {
		toApiType: (
			dto: ExtHostCodeActionContextDto,
		): VscodeCodeActionContext => {
			// TODO: Full conversion needed (diagnostics, triggerKind). This is a stub.
			// `dto.diagnostics` are RpcMarkerData[], need conversion to vscode.Diagnostic[].
			// `dto.triggerKind` (number) needs to map to `vscode.CodeActionTriggerKind` (enum).
			return {
				// Placeholder
				diagnostics: [],

				// Assuming CodeActionKind.value if only is string
				only: dto.only ? new VscodeCodeActionKind(dto.only) : undefined,

				// Assuming enum values match
				triggerKind: dto.triggerKind,
			} as VscodeCodeActionContext;
		},
	},

	SignatureHelpContext: {
		toApiType: (
			dto: ExtHostSignatureHelpContextDto,
		): VscodeSignatureHelpContext => {
			// TODO: Full conversion (triggerKind, activeSignatureHelp). This is a stub.
			return dto as any;
		},
	},

	Range: {
		// For converting IRange DTO (0-based) to vscode.Range (0-based)
		toApiRange: (
			rangeDto: VscodeInternalRange | undefined,
		): VscodeRange => {
			// Default for safety
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
		// For marshalling VscodeDefinitionLink or VscodeLocation to RpcLocationLink DTO
		fromApiType: (
			link: VscodeDefinitionLink | VscodeLocation,

			baseShim: BaseCocoonShim,
		): RpcLocationLink | undefined => {
			if (!link) return undefined;

			// Handle if provider returns array for single Definition
			const item = Array.isArray(link) ? link[0] : link;

			if (!item) return undefined;

			if ("targetUri" in item && "targetRange" in item) {
				// VscodeDefinitionLink
				const targetUriDto = baseShim._convertApiArgToInternal(
					item.targetUri,
				);

				if (!targetUriDto) {
					console.warn(
						"[TypeConverter] Failed to marshal targetUri in VscodeDefinitionLink. Skipping item.",

						item.targetUri,
					);

					return undefined;
				}

				return {
					// Marshalled URI DTO
					uri: targetUriDto,

					// vscode.Range is 0-based, DTO compatible
					range: item.targetRange,

					targetSelectionRange: item.targetSelectionRange,

					originSelectionRange: item.originSelectionRange,
				} as RpcLocationLink;
			} else if ("uri" in item && "range" in item) {
				// VscodeLocation (can be part of VscodeDefinition)
				const uriDto = baseShim._convertApiArgToInternal(item.uri);

				if (!uriDto) {
					console.warn(
						"[TypeConverter] Failed to marshal uri in VscodeLocation. Skipping item.",

						item.uri,
					);

					return undefined;
				}

				return {
					// Marshalled URI DTO
					uri: uriDto,

					// vscode.Range DTO compatible
					range: item.range,

					// Other fields for RpcLocationLink might be undefined if source is just VscodeLocation
				} as RpcLocationLink;
			}

			console.warn(
				"[TypeConverter] Unrecognized DefinitionLink/Location structure for marshalling:",

				item,
			);

			return undefined;
		},

		fromApiTypeMany: (
			items: ReadonlyArray<VscodeDefinitionLink | VscodeLocation>,

			baseShim: BaseCocoonShim,
		): RpcLocationLink[] => {
			if (!items) return [];

			return items
				.map((i) =>
					localTypeConverters.DefinitionLink.fromApiType(i, baseShim),
				)
				.filter((link): link is RpcLocationLink => !!link);
		},
	},

	CodeAction: {
		// For marshalling VscodeCommand or VscodeCodeAction to DTOs
		fromApiTypeMany: (
			actions: ReadonlyArray<VscodeCommand | VscodeCodeAction>,

			baseShim: BaseCocoonShim,
		): (RpcCommand | RpcCodeAction)[] => {
			// TODO: This needs specific DTO conversion for VscodeCodeAction (especially its `edit: WorkspaceEdit` property).
			// `_convertApiArgToInternal` is a generic fallback and might not be sufficient for complex types.
			console.warn(
				"[TypeConverter] CodeAction.fromApiTypeMany uses generic _convertApiArgToInternal. Full WorkspaceEdit marshalling is needed.",
			);

			return actions.map((a) => baseShim._convertApiArgToInternal(a)) as (
				| RpcCommand
				| RpcCodeAction
			)[];
		},
	},

	CodeLens: {
		// For marshalling VscodeCodeLens to RpcCodeLens DTO
		fromApiTypeMany: (
			lenses: ReadonlyArray<VscodeCodeLens>,

			baseShim: BaseCocoonShim,
		): RpcCodeLens[] => {
			// TODO: VscodeCodeLens.command needs proper marshalling to RpcCommand.
			console.warn(
				"[TypeConverter] CodeLens.fromApiTypeMany uses generic _convertApiArgToInternal. Full Command marshalling needed.",
			);

			return lenses.map((l) =>
				baseShim._convertApiArgToInternal(l),
			) as RpcCodeLens[];
		},
	},

	CodeActionProviderMetadata: {
		// For converting VscodeCodeActionProviderMetadata to DTO
		toDto: (
			metadata?: VscodeCodeActionProviderMetadata,
		): CodeActionProviderMetadataDto | undefined => {
			if (!metadata) return undefined;

			return {
				providedCodeActionKinds: metadata.providedCodeActionKinds?.map(
					(kind) => kind.value,

					// CodeActionKind.value is the string
				),

				documentation: metadata.documentation?.map((doc) => ({
					// Assuming doc.value is string
					value: doc.value,

					// Assuming doc.kind is vscode.CodeActionTriggerKind which has a string `value`
					kind: doc.kind.value,
				})),

				// Cast as DTO might need more specific field mapping
			} as CodeActionProviderMetadataDto;
		},
	},

	SignatureHelpProviderMetadata: {
		// For converting VscodeSignatureHelpProviderMetadata to DTO
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

	// TODO: Add specific converters for Hover, CompletionItem/List, SignatureHelp, DocumentLink, TextEdit, WorkspaceEdit, etc.
	// These are essential for robust language feature support.
};

/** Dummy Extension ID for registrations made by the shim itself, if needed (e.g., internal providers). */
const INTERNAL_SHIM_EXTENSION_ID: ExtensionIdentifier = new ExtensionIdentifier(
	"cocoon.languagefeatures.internal_provider",
);

/**
 * Internal structure for storing language provider registration details.
 */
interface ProviderRegistrationEntry {
	// The actual language provider instance (e.g., HoverProvider).
	provider: any;

	// The DocumentSelector for this provider. Null for workspace-wide providers.
	selector: DocumentSelector | null;

	// A string identifying the provider type (e.g., "Hover", "Completion") for logging/debugging.
	type: string;

	// The extension that registered this provider.
	extensionId: ExtensionIdentifier;

	// Provider-specific options/metadata stored with registration:
	// For CompletionItemProvider, SignatureHelpProvider.
	triggerCharacters?: ReadonlyArray<string>;

	// For CompletionItemProvider.
	completionOptions?: { supportsResolveDetails?: boolean };

	codeActionOptions?: {
		metadataDto?: CodeActionProviderMetadataDto;

		displayName?: string;

		// For CodeActionProvider.
	};

	// For SignatureHelpProvider.
	signatureHelpOptions?: { metadataDto?: SignatureHelpProviderMetadataDto };

	// Handles for provider-specific onDidChange events (e.g., onDidChangeCodeLenses).
	codeLensEventHandle?: number;

	inlayHintsEventHandle?: number;

	// Add other event handles as needed (e.g., for diagnostics if handled here, though unlikely).
}

/**
 * Cocoon's implementation of `VscodeExtHostLanguageFeaturesShape`.
 * This service manages the registration of language feature providers by extensions
 * and handles RPC calls from Mountain (MainThread) to execute these providers.
 */
export class ShimLanguageFeatures
	extends BaseCocoonShim
	implements VscodeExtHostLanguageFeaturesShape
{
	// For IExtHostLanguageFeatures DI.
	public readonly _serviceBrand: undefined;

	readonly #mainThreadLanguageFeaturesProxy: VscodeMainThreadLanguageFeaturesShape | null =
		null;

	// Counter for generating unique provider handles.
	#providerHandlePool = 0;

	// Stores registered providers, keyed by their unique handle.
	readonly #providerStore = new Map<number, ProviderRegistrationEntry>();

	// For resolving document URIs to TextDocument instances.
	readonly #extHostDocuments: CocoonDocumentService;

	/**
	 * Creates an instance of ShimLanguageFeatures.
	 * @param rpcService The RPC service adapter for communication with MainThreadLanguageFeatures.
	 * @param logService The logging service instance.
	 * @param extHostDocuments The document service, crucial for providing TextDocument context to providers.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		extHostDocuments: CocoonDocumentService,
	) {
		super("ExtHostLanguageFeatures", rpcService, logService);

		// Use Info for major lifecycle events.
		this._logInfo("Initializing...");

		if (!extHostDocuments) {
			// This is a critical dependency.
			this._logError(
				"CRITICAL DEPENDENCY MISSING: CocoonDocumentService (extHostDocuments) was not provided. " +
					"Language feature providers will not be able to operate correctly as they cannot get TextDocument context. " +
					"This will lead to failures or severely impaired functionality.",
			);

			// Consider throwing an error here to halt initialization if this critical dependency is missing.
		}

		this.#extHostDocuments = extHostDocuments;

		if (this._rpcService) {
			this.#mainThreadLanguageFeaturesProxy = this._getProxy(
				MainContext.MainThreadLanguageFeatures as ProxyIdentifier<VscodeMainThreadLanguageFeaturesShape>,
			);

			try {
				this._rpcService.set(
					// Register self to handle RPC calls from MainThread.
					ExtHostContext.ExtHostLanguageFeatures as ProxyIdentifier<VscodeExtHostLanguageFeaturesShape>,

					this,
				);

				this._logInfo(
					"Registered self for incoming RPC calls from MainThread (ExtHostLanguageFeatures).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostLanguageFeatures:",

					e,
				);
			}
		}

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"Failed to obtain MainThreadLanguageFeatures RPC proxy. " +
					"Provider registration with MainThread and execution of language features requested by MainThread will be impaired or fail. " +
					"This is a critical issue for language feature functionality.",
			);
		}
	}

	/**
	 * Generic helper to register a language provider with the MainThread.
	 * This method handles common tasks like generating a handle, storing the provider,
	 *
	 * and making the RPC call to the MainThread.
	 * @template P The type of the provider instance.
	 * @param providerTypeString A string identifying the provider type (e.g., "Hover", "Completion"), for logging.
	 * @param providerInstance The actual language provider instance.
	 * @param selector The `DocumentSelector` for this provider, or `null` for workspace-wide providers.
	 * @param mainThreadRegisterRpcCall A lambda function that encapsulates the specific RPC call
	 *                                  to the MainThread for registering this type of provider.
	 *                                  It receives the proxy, handle, selector DTO, specific arguments DTO, and extension ID.
	 * @param providerSpecificArgsForStorageAndDto Any provider-specific arguments (like trigger characters or metadata)
	 *                                             that need to be stored with the registration or sent in the DTO.
	 * @param extensionIdForRegistration The `ExtensionIdentifier` of the extension registering this provider.
	 * @returns A promise resolving to the unique handle assigned to this provider registration.
	 * @throws An error if RPC proxy is unavailable or RPC call fails.
	 */
	private async _registerProviderOnMainThread<P>(
		providerTypeString: string,

		providerInstance: P,

		selector: DocumentSelector | null,

		mainThreadRegisterRpcCall: (
			proxy: VscodeMainThreadLanguageFeaturesShape,

			handle: number,

			selectorDtoArray: IDocumentFilterDto[],

			// Type based on what the specific RPC call needs
			providerSpecificArgsForDto?: any,

			extensionIdForRpc?: ExtensionIdentifier,
		) => Promise<void>,

		providerSpecificArgsForStorageAndDto?: any,

		// Default if not from an actual extension
		extensionIdForRegistration: ExtensionIdentifier = INTERNAL_SHIM_EXTENSION_ID,
	): Promise<number> {
		// Generate a new unique handle.
		const handle = ++this.#providerHandlePool;

		const registrationEntry: ProviderRegistrationEntry = {
			provider: providerInstance,

			selector,

			type: providerTypeString,

			extensionId: extensionIdForRegistration,

			// Store provider-specific options.
			...providerSpecificArgsForStorageAndDto,
		};

		this.#providerStore.set(handle, registrationEntry);

		this._logDebug(
			`Locally registered ${providerTypeString}Provider for extension '${extensionIdForRegistration.value}' (Handle: ${handle}). Selector: ${JSON.stringify(selector)}`,
		);

		if (!this.#mainThreadLanguageFeaturesProxy) {
			// Rollback local registration if RPC proxy is missing.
			this.#providerStore.delete(handle);

			const errorMsg = `Cannot register ${providerTypeString}Provider with MainThread: MainThreadLanguageFeatures RPC proxy is unavailable.`;

			this._logError(errorMsg);

			throw new Error(errorMsg);
		}

		try {
			// Convert vscode.DocumentSelector to IDocumentFilterDto[] for RPC.
			const selectorDtoArray =
				localTypeConverters.DocumentSelector.fromDtoArray(
					selector,

					undefined /* uriTransformer not used here */,
				);

			await mainThreadRegisterRpcCall(
				this.#mainThreadLanguageFeaturesProxy,

				handle,

				selectorDtoArray,

				// Pass arguments needed for the specific DTO.
				providerSpecificArgsForStorageAndDto,

				// Pass the extension ID to MainThread.
				extensionIdForRegistration,
			);

			this._logDebug(
				`${providerTypeString}Provider (Handle: ${handle}, Ext: ${extensionIdForRegistration.value}) registration request sent to MainThread.`,
			);

			// Return the handle for this registration.
			return handle;
		} catch (e: any) {
			// Rollback local registration on RPC failure.
			this.#providerStore.delete(handle);

			this._logError(
				`RPC call for ${providerTypeString}Provider (Handle: ${handle}, Ext: ${extensionIdForRegistration.value}) registration failed:`,

				refineErrorForShim(
					e,

					this._logService,

					`register${providerTypeString}Provider RPC`,
				),
			);

			// Rethrow the refined error.
			throw e;
		}
	}

	// --- $register*Provider Methods (Called by ShimLanguages, part of VscodeExtHostLanguageFeaturesShape) ---
	// These methods are part of the VscodeExtHostLanguageFeaturesShape, typically called by the
	// `vscode.languages.register*Provider` facade (implemented by `ShimLanguages.ts`).

	public $registerHoverProvider(
		selector: DocumentSelector,

		provider: HoverProvider,

		extensionId: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread(
			"Hover",

			provider,

			selector,

			(proxy, handle, selDto, _args, extId) =>
				proxy.$registerHoverProvider(handle, selDto, extId!),

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

			(proxy, handle, selDto, args, extId) =>
				proxy.$registerCompletionsProvider(
					handle,

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

			(proxy, handle, selDto, _args, extId) =>
				proxy.$registerDefinitionProvider(handle, selDto, extId!),

			undefined,

			extensionId,
		);
	}

	public $registerCodeLensProvider(
		selector: DocumentSelector,

		provider: CodeLensProvider,

		extensionId: ExtensionIdentifier,
	): Promise<number> {
		// TODO: Handle `provider.onDidChangeCodeLenses` event if it exists.
		// This would involve creating an event handle (numeric ID) to send to MainThread,

		// and when the event fires on the provider, call `$emitCodeLensEvent(eventHandle)` on the proxy.
		// Placeholder
		const eventHandleForDidChangeCodeLenses: number | undefined = undefined;

		if (!this.#mainThreadLanguageFeaturesProxy?.$registerCodeLensProvider) {
			this._logWarnOnce(
				`MainThreadLanguageFeatures.$registerCodeLensProvider RPC method is not available on the proxy. ` +
					`CodeLensProvider for extension '${extensionId.value}' might only be registered locally or rely on a generic registration method if available. ` +
					`Full functionality (like onDidChangeCodeLenses event propagation) may be impaired.`,
			);

			// Fallback: Register locally only if the specific RPC method is missing.
			// This means Mountain won't know about this provider explicitly through this call.
			const localHandle = ++this.#providerHandlePool;

			this.#providerStore.set(localHandle, {
				provider,

				selector,

				type: "CodeLens",

				extensionId,
			});

			return Promise.resolve(localHandle);
		}

		return this._registerProviderOnMainThread(
			"CodeLens",

			provider,

			selector,

			(proxy, handle, selDto, _args, extId) =>
				proxy.$registerCodeLensProvider!(
					// Non-null assertion if checked above
					handle,

					selDto,

					// Pass event handle if implemented
					eventHandleForDidChangeCodeLenses,

					extId!,
				),

			// Store for potential future use/dispose
			{ codeLensEventHandle: eventHandleForDidChangeCodeLenses },

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

		// `displayName` is an internal VS Code property on providers, not standard API, but sometimes used in protocol.
		const displayName =
			typeof (provider as any).displayName === "string"
				? (provider as any).displayName
				: undefined;

		const storageAndDtoArgs = {
			codeActionOptions: { metadataDto, displayName },
		};

		// TODO: Handle `provider.onDidChangeCodeActions` event if it exists.
		// Placeholder
		const onDidChangeCodeActionsHandle: number | undefined = undefined;

		if (
			!this.#mainThreadLanguageFeaturesProxy?.$registerCodeActionProvider
		) {
			this._logWarnOnce(
				`MainThreadLanguageFeatures.$registerCodeActionProvider RPC method is not available. ` +
					`CodeActionProvider for extension '${extensionId.value}' might only be registered locally.`,
			);

			const localHandle = ++this.#providerHandlePool;

			this.#providerStore.set(localHandle, {
				provider,

				selector,

				type: "CodeAction",

				extensionId,

				...storageAndDtoArgs,
			});

			return Promise.resolve(localHandle);
		}

		return this._registerProviderOnMainThread(
			"CodeAction",

			provider,

			selector,

			(proxy, handle, selDto, args, extId) =>
				proxy.$registerCodeActionProvider!(
					// Non-null assertion
					handle,

					selDto,

					args.codeActionOptions.metadataDto,

					args.codeActionOptions.displayName,

					extId!,

					// Pass event handle if implemented
					onDidChangeCodeActionsHandle,
				),

			storageAndDtoArgs,

			extensionId,
		);
	}

	// TODO: Implement ALL other $register*Provider methods from VscodeExtHostLanguageFeaturesShape.
	// Examples include (but are not limited to):
	// - $registerDeclarationProvider, $registerImplementationProvider, $registerTypeDefinitionProvider
	// - $registerDocumentFormattingEditProvider, $registerDocumentRangeFormattingEditProvider, $registerOnTypeFormattingEditProvider
	// - $registerDocumentHighlightProvider, $registerDocumentLinkProvider, $registerDocumentColorProvider
	// - $registerFoldingRangeProvider, $registerSelectionRangeProvider
	// - $registerReferenceProvider, $registerRenameProvider
	// - $registerSignatureHelpProvider
	// - $registerWorkspaceSymbolProvider
	// - $registerCallHierarchyProvider, $registerTypeHierarchyProvider
	// - $registerLinkedEditingRangeProvider, $registerInlayHintsProvider
	// Each implementation will follow a similar pattern:
	// 1. Extract any provider-specific options or metadata (e.g., trigger characters for SignatureHelp).
	// 2. Handle any provider-specific `onDidChange*` events by creating an event handle if applicable.
	// 3. Call `this._registerProviderOnMainThread(...)` with:
	//    - The correct provider type string (e.g., "Declaration", "DocumentFormattingEdit").
	//    - The provider instance, document selector.
	//    - A lambda function that calls the corresponding `$register<Feature>Provider` method on the `VscodeMainThreadLanguageFeaturesShape` proxy,

	//      passing the handle, selector DTO, any specific DTOs for options/metadata, and the extension ID.
	//    - The extracted provider-specific options/metadata for local storage and DTO conversion.
	//    - The `extensionId` of the registering extension.

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$unregister} */
	public async $unregister(handle: number): Promise<void> {
		this._logDebug(`RPC $unregisterProvider called for Handle: ${handle}`);

		const registration = this.#providerStore.get(handle);

		if (this.#providerStore.delete(handle)) {
			this._logDebug(
				`Locally unregistered provider (Handle: ${handle}, Type: ${registration?.type}, Ext: ${registration?.extensionId.value})`,
			);

			// TODO: If the provider had an onDidChange* event associated with an `eventHandle` (e.g., codeLensEventHandle),

			// ensure that any resources related to that event (like an Emitter subscription) are disposed here.
		} else {
			this._logWarn(
				`Attempted to unregister a provider with Handle ${handle}, but no such registration was found locally.`,
			);
		}

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				`Cannot send unregister request for provider (Handle: ${handle}) to MainThread: MainThreadLanguageFeatures RPC proxy is unavailable.`,
			);

			// Do not throw from unregister if proxy is missing, just log and fail to notify main.
			return;
		}

		try {
			// The MainThread protocol uses a generic $unregister(handle) call.
			await this.#mainThreadLanguageFeaturesProxy.$unregister(handle);

			this._logDebug(
				`Unregistration request sent to MainThread for Handle ${handle}.`,
			);
		} catch (e: any) {
			// Log the error but don't rethrow, as unregistration failure is usually not critical for the extension.
			const refinedError = refineErrorForShim(
				e,

				this._logService,

				`$unregisterProvider RPC(${handle})`,
			);

			this._logError(
				`Failed to send unregister request for Handle ${handle} to MainThread via RPC: ${refinedError.message}`,
			);
		}
	}

	// --- Provider Execution Methods (Called BY Mountain via RPC as part of VscodeExtHostLanguageFeaturesShape) ---

	/**
	 * Internal helper to retrieve a registered provider and a specific method from it.
	 * Validates the handle and provider type.
	 * @param handle The numeric handle of the provider.
	 * @param methodName The name of the method to retrieve from the provider.
	 * @param expectedProviderType A string descriptor for the expected provider type (for logging).
	 * @returns An object with the provider instance, method, and registration entry, or `null` if not found or type mismatch.
	 */
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
				`Provider execution failed: No registration found for Handle ${handle}. Expected provider type: ${expectedProviderType}.`,
			);

			return null;
		}

		if (registration.type !== expectedProviderType) {
			this._logError(
				`Provider execution failed: Handle ${handle} corresponds to a '${registration.type}' provider, ` +
					`but a '${expectedProviderType}' provider was expected for method '${String(methodName)}'.`,
			);

			return null;
		}

		const provider = registration.provider as P;

		if (!provider || typeof provider[methodName] !== "function") {
			this._logError(
				`Provider execution failed: ${expectedProviderType}Provider (Handle ${handle}, Ext: ${registration.extensionId.value}) ` +
					`or its method '${String(methodName)}' is missing or not a function.`,
			);

			return null;
		}

		return { provider, method: provider[methodName] as P[M], registration };
	}

	/**
	 * Internal helper to retrieve a `vscode.TextDocument` instance from URI components received via RPC.
	 * @param uriComponents The URI components DTO from the RPC call.
	 * @returns The `vscode.TextDocument` if found, or `null` if URI is invalid or document not cached.
	 */
	private _getTextDocumentFromRpc(
		uriComponents: VSCodeInternalUriComponents | undefined,
	): TextDocument | null {
		if (!uriComponents) {
			this._logError(
				"Cannot get TextDocument for provider execution: URI components DTO is undefined.",
			);

			return null;
		}

		// Revive URI DTO to vscode.Uri (API type) using BaseCocoonShim's utility.
		const revivedVscodeApiUri =
			this._reviveApiArgument<VscodeApiUri>(uriComponents);

		if (!revivedVscodeApiUri) {
			this._logError(
				"Failed to revive URI from DTO for _getTextDocumentFromRpc. URI Components:",

				uriComponents,
			);

			return null;
		}

		// Get document data from CocoonDocumentService (dependency).
		const documentData =
			this.#extHostDocuments.getDocumentData(revivedVscodeApiUri);

		if (!documentData?.document) {
			this._logError(
				`TextDocument not found in local cache for provider execution. URI='${revivedVscodeApiUri.toString()}'. Ensure document is opened and synced.`,
			);

			return null;
		}

		return documentData.document;
	}

	/**
	 * Internal helper to resolve a CancellationToken DTO received from MainThread.
	 * For MVP, this is a NOP and returns `CancellationToken.None`.
	 * @param tokenDto The DTO for the CancellationToken (structure depends on protocol, often a numeric ID).
	 * @returns A `CancellationToken` instance.
	 */
	private _resolveTokenFromDto(
		tokenDto: any /* DTO for CancellationToken from protocol */,
	): CancellationToken {
		// TODO: Implement proper CancellationToken creation/lookup if Mountain sends a tokenId
		// that can be used to create a linked CancellationTokenSource on the ExtHost side.
		// This would involve a CancellationTokenRegistry similar to what VS Code's ExtHostController uses.
		if (
			tokenDto &&
			(typeof tokenDto === "number" ||
				(typeof tokenDto === "object" && tokenDto.id !== undefined))
		) {
			this._logWarnOnce(
				"CancellationToken DTO received from MainThread, but full cancellation propagation (linking tokens across RPC) " +
					"is not yet implemented in ShimLanguageFeatures. Using CancellationToken.None for provider execution.",
			);

			// Example of how it might work:
			// const tokenId = typeof tokenDto === 'number' ? tokenDto : tokenDto.id;

			// return this.#cancellationRegistry.getToken(tokenId);
		}

		// Default to a non-cancellable token for MVP.
		return CancellationToken.None;
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

		// Revive IPosition DTO to vscode.Position
		const position = this._reviveApiArgument<VscodePosition>(positionDto);

		if (!document || !position) {
			this._logWarn(
				`$provideHover (Handle ${handle}): Failed to get document or position. Doc: ${!!document}, Pos: ${!!position}`,
			);

			return undefined;
		}

		const token = this._resolveTokenFromDto(tokenDto);

		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				position,

				token,
			);

			// Result is VscodeHover | undefined. Marshal it for RPC.
			// TODO: CRITICAL - Full marshalling of VscodeHover (which includes MarkdownString or IMarkdownString[]) is needed here.
			// `_convertApiArgToInternal` is a generic fallback.
			if (result) {
				this._logDebug(
					`$provideHover (Handle ${handle}) returned a result. Needs proper marshalling.`,
				);
			}

			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing HoverProvider.provideHover (Handle ${handle}, Ext: ${providerInfo.registration.extensionId.value}):`,

				err,
			);

			// API expects undefined on error or no result.
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

		const context =
			// Use placeholder converter
			localTypeConverters.CompletionContext.toApiType(contextDto);

		if (!document || !position || !context) {
			this._logWarn(
				`$provideCompletionItems (Handle ${handle}): Failed to get document, position, or context. Doc: ${!!document}, Pos: ${!!position}, Ctx: ${!!context}`,
			);

			return undefined;
		}

		const token = this._resolveTokenFromDto(tokenDto);

		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				position,

				// VS Code API order: document, position, token, context
				token,

				context,
			);

			// Result is VscodeCompletionList | VscodeCompletionItem[] | undefined.
			// This needs to be marshalled to RpcSuggestResult DTO.
			// TODO: CRITICAL - Full marshalling of VscodeCompletionItem/List to RpcSuggestResult DTO needed.
			// `_convertApiArgToInternal` is a generic fallback.
			if (result) {
				this._logDebug(
					`$provideCompletionItems (Handle ${handle}) returned ${Array.isArray(result) ? result.length + " items" : "a CompletionList"}. Needs proper marshalling to RpcSuggestResult.`,
				);
			}

			return this._convertApiArgToInternal(result) as
				| RpcSuggestResult
				| undefined;
		} catch (err: any) {
			this._logError(
				`Error executing CompletionItemProvider.provideCompletionItems (Handle ${handle}, Ext: ${providerInfo.registration.extensionId.value}):`,

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
			// If provider or its resolveCompletionItem method doesn't exist, VS Code often returns the original (unresolved) item.
			this._logDebug(
				`No resolveCompletionItem method for Handle ${handle} (Ext: ${providerInfo?.registration.extensionId.value}). Returning original DTO.`,
			);

			// Return original DTO if no resolver.
			return itemDto;
		}

		// TODO: CRITICAL - Full revival of RpcSuggestData to VscodeCompletionItem needed.
		const itemToResolve =
			this._reviveApiArgument<VscodeCompletionItem>(itemDto);

		if (!itemToResolve) {
			this._logError(
				`Failed to revive CompletionItem DTO (RpcSuggestData) for resolveCompletionItem (Handle ${handle}):`,

				itemDto,
			);

			// Return original DTO on revival failure.
			return itemDto;
		}

		const token = this._resolveTokenFromDto(tokenDto);

		try {
			const result = await providerMethod.call(
				providerInfo!.provider,

				itemToResolve,

				token,
			);

			// Marshal resolved VscodeCompletionItem back to RpcSuggestData DTO.
			// TODO: CRITICAL - Full marshalling of resolved VscodeCompletionItem to RpcSuggestData DTO needed.
			this._logDebug(
				`$resolveCompletionItem (Handle ${handle}) returned a result. Needs proper marshalling.`,
			);

			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing CompletionItemProvider.resolveCompletionItem (Handle ${handle}, Ext: ${providerInfo!.registration.extensionId.value}):`,

				err,
			);

			// On error, VS Code might return the original unresolved item. Marshal the revived-but-unresolved item back to DTO.
			return this._convertApiArgToInternal(itemToResolve);
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

		if (!document || !position) {
			this._logWarn(
				`$provideDefinition (Handle ${handle}): Failed to get document or position. Doc: ${!!document}, Pos: ${!!position}`,
			);

			return undefined;
		}

		const token = this._resolveTokenFromDto(tokenDto);

		try {
			const result = await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				position,

				token,
			);

			// Result type: VscodeDefinition | VscodeDefinitionLink[]
			// This can be: Location | Location[] | LocationLink[] | (Location | LocationLink)[] (if Definition is a union)
			// Needs proper marshalling to RpcLocationLink[] DTO.
			if (!result) return undefined;

			const resultArr = Array.isArray(result) ? result : [result];

			// `localTypeConverters.DefinitionLink.fromApiTypeMany` attempts this marshalling.
			// It relies on BaseCocoonShim._convertApiArgToInternal for URIs within Location/LocationLink.
			// TODO: Ensure this converter is robust for all VscodeDefinition variants.
			this._logDebug(
				`$provideDefinition (Handle ${handle}) returned ${resultArr.length} result(s). Marshalling to RpcLocationLink[].`,
			);

			return localTypeConverters.DefinitionLink.fromApiTypeMany(
				resultArr,

				this,
			);
		} catch (err: any) {
			this._logError(
				`Error executing DefinitionProvider.provideDefinition (Handle ${handle}, Ext: ${providerInfo.registration.extensionId.value}):`,

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

		if (!document) {
			this._logWarn(
				`$provideCodeLenses (Handle ${handle}): Failed to get document.`,
			);

			return undefined;
		}

		const token = this._resolveTokenFromDto(tokenDto);

		try {
			const result = (await (providerInfo.method as Function).call(
				providerInfo.provider,

				document,

				token,
			)) as VscodeCodeLens[] | undefined;

			if (result && result.length > 0) {
				// TODO: CRITICAL - Marshalling VscodeCodeLens[] (especially VscodeCodeLens.command) to RpcCodeLens[] is needed.
				// `localTypeConverters.CodeLens.fromApiTypeMany` is a placeholder.
				const lensesDto = localTypeConverters.CodeLens.fromApiTypeMany(
					result,

					this,
				);

				this._logDebug(
					`$provideCodeLenses (Handle ${handle}) returned ${lensesDto.length} lenses. Needs proper marshalling.`,
				);

				// The `dispose` on RpcCodeLensList is for MainThread to call back for cleanup if needed (not standard).
				return { lenses: lensesDto, dispose: () => {} };
			}

			// No lenses provided.
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error executing CodeLensProvider.provideCodeLenses (Handle ${handle}, Ext: ${providerInfo.registration.extensionId.value}):`,

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

		if (!providerMethod) {
			// No resolver method on the provider.
			this._logDebug(
				`No resolveCodeLens method for Handle ${handle} (Ext: ${providerInfo?.registration.extensionId.value}). Returning original CodeLens DTO.`,
			);

			return codeLensDto;
		}

		// TODO: CRITICAL - Full revival of RpcCodeLens DTO to VscodeCodeLens (API type) needed.
		const codeLensToResolve =
			this._reviveApiArgument<VscodeCodeLens>(codeLensDto);

		if (!codeLensToResolve) {
			this._logError(
				`Failed to revive CodeLens DTO (RpcCodeLens) for resolveCodeLens (Handle ${handle}):`,

				codeLensDto,
			);

			// Return original DTO on revival failure.
			return codeLensDto;
		}

		const token = this._resolveTokenFromDto(tokenDto);

		try {
			const result = await providerMethod.call(
				providerInfo!.provider,

				codeLensToResolve,

				token,
			);

			// TODO: CRITICAL - Marshal resolved VscodeCodeLens back to RpcCodeLens DTO.
			this._logDebug(
				`$resolveCodeLens (Handle ${handle}) returned a result. Needs proper marshalling.`,
			);

			return this._convertApiArgToInternal(result);
		} catch (err: any) {
			this._logError(
				`Error executing CodeLensProvider.resolveCodeLens (Handle ${handle}, Ext: ${providerInfo!.registration.extensionId.value}):`,

				err,
			);

			// On error, VS Code might return the original unresolved item. Marshal the revived-but-unresolved item.
			return this._convertApiArgToInternal(codeLensToResolve);
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

		// Use specific converter
		const range = localTypeConverters.Range.toApiRange(rangeDto);

		const context =
			// Use placeholder converter
			localTypeConverters.CodeActionContext.toApiType(contextDto);

		if (!document || !range || !context) {
			this._logWarn(
				`$provideCodeActions (Handle ${handle}): Failed to get document, range, or context. Doc: ${!!document}, Range: ${!!range}, Ctx: ${!!context}`,
			);

			return undefined;
		}

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
				// TODO: CRITICAL - Marshalling of VscodeCodeAction[] (esp. VscodeCodeAction.edit: WorkspaceEdit) to RpcCodeAction[] needed.
				// `localTypeConverters.CodeAction.fromApiTypeMany` is a placeholder.
				const actionsDto =
					localTypeConverters.CodeAction.fromApiTypeMany(
						result,

						this,
					);

				this._logDebug(
					`$provideCodeActions (Handle ${handle}) returned ${actionsDto.length} actions. Needs proper marshalling.`,
				);

				// `dispose` on DTO is for MainThread callback, not standard.
				return { actions: actionsDto, dispose: () => {} };
			}

			// No code actions provided.
			return undefined;
		} catch (err: any) {
			this._logError(
				`Error executing CodeActionProvider.provideCodeActions (Handle ${handle}, Ext: ${providerInfo.registration.extensionId.value}):`,

				err,
			);

			return undefined;
		}
	}

	// TODO: Implement ALL other $provide* and $resolve* methods from VscodeExtHostLanguageFeaturesShape.
	// Each will follow a similar pattern as the examples above:
	// 1. Retrieve provider: `_getProviderAndMethodInternal`.
	// 2. Get TextDocument: `_getTextDocumentFromRpc` (if the provider method takes a document).
	// 3. Revive arguments: Use `_reviveApiArgument` for simple DTOs (like Position, Range) or
	//    ensure `localTypeConverters` has appropriate `toApiType` methods for complex DTOs (like Context objects).
	// 4. Resolve CancellationToken: Use `_resolveTokenFromDto`.
	// 5. Call the provider's method within a try/catch block.
	// 6. Marshal the result: Use `_convertApiArgToInternal` for simple API types or ensure
	//    `localTypeConverters` has appropriate `fromApiType` or `toDto` methods to convert
	//    complex API result types (like Hover, CompletionList, WorkspaceEdit) to their RPC DTOs.
	//    This marshalling step is currently the biggest gap due to placeholder converters.

	/** Disposes of resources held by this shim instance, primarily clearing the provider store and disposing event emitters. */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables like RPC proxy cleanup.
		super.dispose();

		// Clear all registered language providers.
		this.#providerStore.clear();

		this._logInfo(
			"Disposed ShimLanguageFeatures and cleared all registered provider stores.",
		);
	}
}
