/*---------------------------------------------------------------------------------------------
 * Cocoon Language Features Shim (language-features-shim.ts)
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
 *     - It stores the provider instance itself, its associated `DocumentSelector` (which
 *       defines for which documents the provider is active), and any provider-specific
 *       metadata (like trigger characters for completion providers) in an internal collection.
 *     - It then notifies the `MainThreadLanguageFeatures` service (running on the Mountain side)
 *       via an RPC call. This notification includes the handle, the `DocumentSelector`
 *       (converted to an array of `IDocumentFilterDto` objects suitable for RPC), and any
 *       relevant provider metadata DTOs (Data Transfer Objects).
 *
 * - Provider Unregistration:
 *   - It implements the `$unregister(handle)` method. When called, this method removes
 *     the provider registration locally from its internal store.
 *   - It also notifies the `MainThreadLanguageFeatures` service via RPC to unregister the
 *     provider on the MainThread side, ensuring consistency.
 *
 * - Provider Execution (RPC methods called BY the MainThread/Mountain):
 *   - It implements a corresponding suite of `$provide*` and `$resolve*` methods (e.g.,
 *     `$provideHover`, `$provideCompletionItems`, `$resolveCompletionItem`).
 *   - When Mountain needs language-specific information (e.g., hover content for a
 *     specific document URI and position):
 *     - It retrieves the appropriate registered provider instance using the handle that
 *       Mountain supplies with the request.
 *     - It obtains the relevant `vscode.TextDocument` instance. This is done by using the
 *       injected `CocoonDocumentService` and the URI components provided in the RPC call.
 *     - It revives (unmarshals) the RPC arguments received from Mountain (which are often DTOs,
 *       like position DTOs or context DTOs) into the actual VS Code API types that
 *       providers expect (e.g., `vscode.Position`, `vscode.CompletionContext`).
 *     - It calls the specific method on the provider instance (e.g., `provider.provideHover(...)`)
 *       passing the prepared arguments and a `CancellationToken`. The `CancellationToken`
 *       is obtained from the `CancellationTokenRegistry` to allow cancellation signals
 *       from the MainThread to propagate to the provider.
 *     - It marshals the result returned by the provider (which are VS Code API types)
 *       back into DTOs that are suitable for RPC transmission to Mountain.
 *
 * - Argument/Result Marshalling and Type Conversion:
 *   - **CRITICAL LIMITATION (MVP Focus):** This shim currently employs placeholder type
 *     converters (`localTypeConverters`) or relies on generic utilities from `BaseCocoonShim`
 *     for marshalling and unmarshalling arguments and results. For full fidelity and
 *     correct behavior of all language features, a comprehensive and robust type conversion
 *     mechanism (akin to VS Code's `extHostTypeConverters.ts` or a dedicated
 *     `CocoonTypeConverters` module) is absolutely required. This is essential for accurately
 *     handling all complex data structures used by language features (e.g., `Hover`,
 *     `CompletionItem`, `CompletionList`, `CodeAction`, `WorkspaceEdit`, `LocationLink`, etc.).
 *
 * Key Interactions and Dependencies:
 * - An instance of `ShimLanguageFeatures` is typically registered with a Dependency Injection (DI)
 *   system (e.g., in `Cocoon/index.ts`) under the `IExtHostLanguageFeatures` identifier.
 * - The `vscode.languages` API object, usually provided by a `ShimLanguages` facade class,
 *   delegates all its provider registration calls (like `registerHoverProvider`) to this service.
 * - This service communicates extensively with `MainContext.MainThreadLanguageFeatures` on the
 *   Mountain (MainThread) side via RPC. This communication is for provider registration,
 *   unregistration, and for receiving execution requests for providers.
 * - It is itself an RPC service target for calls originating from Mountain, identified by
 *   the `ExtHostContext.ExtHostLanguageFeatures` context.
 * - It depends critically on `CocoonDocumentService` to resolve document URIs (received from
 *   Mountain) into live `vscode.TextDocument` instances, which are then passed to providers.
 * - It uses `BaseCocoonShim` for common utilities such as logging, obtaining RPC proxies,
 *   and basic argument marshalling/revival (e.g., for URIs, Positions, Ranges where DTOs
 *   are relatively simple).
 * - It depends on an `ICancellationTokenRegistry` (typically `CancellationTokenRegistry`) to manage
 *   cancellation tokens for provider executions, linking them to requests from the MainThread.
 *
 * TODO (Major Items):
 * - Integrate and fully implement a comprehensive `CocoonTypeConverters` module. This is the
 *   highest priority for achieving full language feature parity and correctness.
 * - Systematically implement all missing `$register*Provider`, `$provide*`, and `$resolve*`
 *   methods as defined in the `VscodeExtHostLanguageFeaturesShape` protocol.
 * - Implement robust handling of provider `onDidChange*` events (e.g., `onDidChangeCodeLenses`,
 *   `onDidChangeInlayHints`). This involves:
 *   - Detecting if a provider offers such an event.
 *   - Subscribing to the event on the Extension Host side.
 *   - Generating a unique event handle to send to the MainThread during registration.
 *   - When the event fires, notifying the MainThread via an RPC call (e.g., `$emitCodeLensEvent(eventHandle)`),
 *     so that the MainThread can request updated data.
 * - Review and ensure correct `displayName` or `label` generation for various provider registrations,
 *   using information from the `ExtensionIdentifier` or context where appropriate, to match
 *   VS Code's behavior for UI presentation.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import {
	CancellationToken,
	CancellationTokenSource,
} from "vs/base/common/cancellation";
import {
	Disposable,
	DisposableStore,
	type IDisposable,
} from "vs/base/common/lifecycle";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import {
	ExtHostContext,
	MainContext,
	type CodeActionProviderMetadataDto,
	type DocumentSymbolProviderMetadataDto,
	type ExtHostCodeActionContextDto,
	type CompletionContextDto as ExtHostCompletionContextDto,
	type SignatureHelpContextDto as ExtHostSignatureHelpContextDto,
	type FoldingRangeProviderMetadataDto,
	type ICallHierarchyItemDto,
	type IColorPresentationDto,
	type IDeclarationDto,
	type IDocumentFilterDto,
	type IDocumentHighlightDto,
	type IEditsDto,
	type IFoldingRangeDto,
	type IImplementationDto,
	type IIncomingCallDto,
	type IInlayHintDto,
	type IInlayHintsDto,
	type ILinkDto,
	type ILinkedEditingRangesDto,
	type ILinksListDto,
	type IOutgoingCallDto,
	type IPosition,
	type IRawColorInfoDto,
	type IReferenceDto,
	type IRenameLocationDto,
	type ISelectionRangeDto,
	type ITypeDefinitionDto,
	type ITypeHierarchyItemDto,
	type ITypeHierarchySubtypesDto,
	type ITypeHierarchySupertypesDto,
	type ICodeActionDto as RpcCodeAction,
	type ICodeActionListDto as RpcCodeActionList,
	type ICodeLensDto as RpcCodeLens,
	type ICodeLensListDto as RpcCodeLensList,
	type ICommandDto as RpcCommand,
	type IDocumentSymbolDto as RpcDocumentSymbolDto,
	type ILocationLinkDto as RpcLocationLink,
	type ISuggestDataDto as RpcSuggestData,
	type ISuggestResultDto as RpcSuggestResult,
	type IWorkspaceEditDto as RpcWorkspaceEdit,
	type IWorkspaceSymbolDto as RpcWorkspaceSymbolDto,
	type SignatureHelpProviderMetadataDto,
	type ExtHostLanguageFeaturesShape as VscodeExtHostLanguageFeaturesShape,
	type IRange as VscodeInternalRange,
	type UriComponents as VSCodeInternalUriComponents,
	type MainThreadLanguageFeaturesShape as VscodeMainThreadLanguageFeaturesShape,
	type WorkspaceSymbolProviderMetadataDto,
} from "vs/workbench/api/common/extHost.protocol";
// VS Code API types (ensure this path resolves to Cocoon's 'vscode' shim)
import {
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
	Uri as VscodeApiUri,
	CodeActionContext as VscodeCodeActionContext,
	CodeActionKind as VscodeCodeActionKind,
	CompletionContext as VscodeCompletionContext,
	DocumentSymbolProvider as VscodeDocumentSymbolProvider,
	Location as VscodeLocation,
	Position as VscodePosition,
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
	type InlayHint,
	type LinkedEditingRanges,
	type OnTypeFormattingEditProviderOptions,
	type RenameLocation,
	type SelectionRange,
	type TextDocument,
	type TextEdit,
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
	type DocumentSymbol as VscodeDocumentSymbol,
	type DocumentSymbolProviderMetadata as VscodeDocumentSymbolProviderMetadata,
	type Hover as VscodeHover,
	type Implementation as VscodeImplementation,
	type SignatureHelp as VscodeSignatureHelp,
	type SignatureHelpProviderMetadata as VscodeSignatureHelpProviderMetadata,
	type SymbolInformation as VscodeSymbolInformation,
	type TypeDefinition as VscodeTypeDefinition,
	type WorkspaceEdit as VscodeWorkspaceEdit,
} from "vscode";

import { CancellationTokenRegistry } from "../cancellation-token-registry"; // Assuming this path
import { ICancellationTokenRegistry } from "../index"; // Assuming this DI key
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
import type { CocoonDocumentService } from "./document-shim";

// Placeholder Type Converters - CRITICAL: Replace with comprehensive converters
const localTypeConverters = {
	DocumentSelector: {
		fromDtoArray: (
			selector: DocumentSelector | null,
			_uriTransformer?: any,
		): IDocumentFilterDto[] => {
			if (!selector) return [];
			const selectorsArray = Array.isArray(selector)
				? selector
				: [selector];
			return selectorsArray
				.map((s) => {
					if (typeof s === "string")
						return { language: s } as IDocumentFilterDto;
					if (typeof s === "object" && s !== null) {
						const filter = s as {
							language?: string;
							scheme?: string;
							pattern?: string | unknown;
							notebookType?: string;
							exclusive?: boolean;
						};
						return {
							language: filter.language,
							scheme: filter.scheme,
							pattern:
								typeof filter.pattern === "string"
									? filter.pattern
									: (filter.pattern as any)?.toString(),
							notebookType: filter.notebookType,
							exclusive: filter.exclusive,
						} as IDocumentFilterDto;
					}
					console.warn(
						"[TypeConverter Stub] Invalid DocumentSelector component:",
						s,
					);
					return undefined;
				})
				.filter((dto): dto is IDocumentFilterDto => dto !== undefined);
		},
	},
	CompletionContext: {
		toApiType: (
			dto: ExtHostCompletionContextDto,
		): VscodeCompletionContext => ({
			triggerKind: dto.triggerKind as any,
			triggerCharacter: dto.triggerCharacter,
		}),
	},
	CodeActionContext: {
		toApiType: (
			dto: ExtHostCodeActionContextDto,
		): VscodeCodeActionContext => ({
			diagnostics: [],
			only: dto.only ? new VscodeCodeActionKind(dto.only) : undefined,
			triggerKind: dto.triggerKind as any,
		}),
	},
	SignatureHelpContext: {
		toApiType: (
			dto: ExtHostSignatureHelpContextDto,
		): VscodeSignatureHelpContext => dto as any,
	},
	Range: {
		toApiRange: (dto: VscodeInternalRange | undefined): VscodeRange =>
			dto
				? new VscodeRange(
						dto.startLineNumber,
						dto.startColumn,
						dto.endLineNumber,
						dto.endColumn,
					)
				: new VscodeRange(0, 0, 0, 0),
	},
	DefinitionLink: {
		fromApiType: (
			item: VscodeDefinitionLink | VscodeLocation,
			base: BaseCocoonShim,
		): RpcLocationLink | undefined => {
			if (!item) return undefined;
			const single = Array.isArray(item) ? item[0] : item;
			if (!single) return undefined;
			if ("targetUri" in single && "targetRange" in single) {
				const targetUriDto = base._convertApiArgToInternal(
					single.targetUri,
				);
				if (!targetUriDto) return undefined;
				return {
					uri: targetUriDto,
					range: base._convertApiArgToInternal(single.targetRange),
					targetSelectionRange: base._convertApiArgToInternal(
						single.targetSelectionRange,
					),
					originSelectionRange: base._convertApiArgToInternal(
						single.originSelectionRange,
					),
				} as RpcLocationLink;
			} else if ("uri" in single && "range" in single) {
				const uriDto = base._convertApiArgToInternal(single.uri);
				if (!uriDto) return undefined;
				return {
					uri: uriDto,
					range: base._convertApiArgToInternal(single.range),
				} as RpcLocationLink;
			}
			return undefined;
		},
		fromApiTypeMany: (
			items: ReadonlyArray<VscodeDefinitionLink | VscodeLocation>,
			base: BaseCocoonShim,
		): RpcLocationLink[] => {
			if (!items) return [];
			return items
				.map((i) =>
					localTypeConverters.DefinitionLink.fromApiType(i, base),
				)
				.filter((l): l is RpcLocationLink => !!l);
		},
	},
	CodeAction: {
		fromApiTypeMany: (
			actions: ReadonlyArray<VscodeCommand | VscodeCodeAction>,
			base: BaseCocoonShim,
		): (RpcCommand | RpcCodeAction)[] =>
			actions.map((a) => base._convertApiArgToInternal(a)) as any,
	},
	CodeLens: {
		fromApiTypeMany: (
			lenses: ReadonlyArray<VscodeCodeLens>,
			base: BaseCocoonShim,
		): RpcCodeLens[] =>
			lenses.map((l) => base._convertApiArgToInternal(l)) as any,
	},
	CodeActionProviderMetadata: {
		toDto: (
			api?: VscodeCodeActionProviderMetadata,
		): CodeActionProviderMetadataDto | undefined =>
			api
				? ({
						providedCodeActionKinds:
							api.providedCodeActionKinds?.map((k) => k.value),
						documentation: api.documentation?.map((d) => ({
							value: d.value,
							kind: d.kind.value,
						})),
					} as CodeActionProviderMetadataDto)
				: undefined,
	},
	SignatureHelpProviderMetadata: {
		toDto: (
			api?: VscodeSignatureHelpProviderMetadata,
		): SignatureHelpProviderMetadataDto | undefined =>
			api
				? ({
						triggerCharacters: api.triggerCharacters,
						retriggerCharacters: api.retriggerCharacters,
					} as SignatureHelpProviderMetadataDto)
				: undefined,
	},
};

const INTERNAL_SHIM_EXTENSION_ID: ExtensionIdentifier = new ExtensionIdentifier(
	"cocoon.languagefeatures.internal_provider",
);

interface ProviderRegistrationEntry {
	provider: any;
	selector: DocumentSelector | null;
	type: string;
	extensionId: ExtensionIdentifier;
	triggerCharacters?: ReadonlyArray<string>;
	completionOptions?: { supportsResolveDetails?: boolean };
	codeActionOptions?: {
		metadataDto?: CodeActionProviderMetadataDto;
		displayName?: string;
	};
	signatureHelpOptions?: { metadataDto?: SignatureHelpProviderMetadataDto };
	renameOptions?: { supportsResolveLocation?: boolean };
	linkSupportOptions?: { supportsResolve?: boolean };
	inlayHintsOptions?: {
		supportsResolve?: boolean;
		onDidChangeInlayHintsEventHandle?: number;
		label?: string;
	};
	codeLensEventHandle?: number;
	inlayHintsEventHandle?: number;
	foldingRangeEventHandle?: number;
}

export class ShimLanguageFeatures
	extends BaseCocoonShim
	implements VscodeExtHostLanguageFeaturesShape
{
	public readonly _serviceBrand: undefined;
	readonly #mainThreadLanguageFeaturesProxy: VscodeMainThreadLanguageFeaturesShape | null =
		null;
	#providerHandlePool: number = 0;
	readonly #providerStore = new Map<number, ProviderRegistrationEntry>();
	readonly #extHostDocuments: CocoonDocumentService;
	readonly #cancellationTokenRegistry: CancellationTokenRegistry;

	constructor(
		rpcProtocolServiceAdapter: IRpcProtocolServiceAdapter | undefined,
		logServiceForShim: ILogServiceForShim | undefined,
		cocoonDocumentService: CocoonDocumentService,
		cancellationTokenRegistryInstance: CancellationTokenRegistry,
	) {
		super(
			"ExtHostLanguageFeatures",
			rpcProtocolServiceAdapter,
			logServiceForShim,
		);
		this._logInfo(
			"Initializing ShimLanguageFeatures with CancellationTokenRegistry support...",
		);
		if (!cocoonDocumentService)
			this._logError(
				"CRITICAL DEPENDENCY MISSING: CocoonDocumentService not provided.",
			);
		this.#extHostDocuments = cocoonDocumentService;
		if (!cancellationTokenRegistryInstance)
			this._logError(
				"CRITICAL DEPENDENCY MISSING: CancellationTokenRegistry not provided.",
			);
		this.#cancellationTokenRegistry = cancellationTokenRegistryInstance;

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
					"Failed to register self (ShimLanguageFeatures) as RPC target for ExtHostLanguageFeatures:",
					error,
				);
			}
		}
		if (!this.#mainThreadLanguageFeaturesProxy)
			this._logError(
				"Failed to obtain MainThreadLanguageFeatures RPC proxy. Language features will be impaired.",
			);
	}

	private async _registerProviderOnMainThread<ProviderType>(
		providerTypeString: string,
		providerInstance: ProviderType,
		documentSelector: DocumentSelector | null,
		mainThreadRegisterRpcCallLambda: (
			rpcProxy: VscodeMainThreadLanguageFeaturesShape,
			handle: number,
			selectorDtoArray: IDocumentFilterDto[],
			providerSpecificArgumentsForDto?: any,
			extensionIdentifierForRpc?: ExtensionIdentifier,
		) => Promise<void>,
		providerSpecificArgumentsForStorageAndDto?: any,
		extensionIdentifierForRegistration: ExtensionIdentifier = INTERNAL_SHIM_EXTENSION_ID,
	): Promise<number> {
		const registrationHandle: number = ++this.#providerHandlePool;
		const registrationEntry: ProviderRegistrationEntry = {
			provider: providerInstance,
			selector: documentSelector,
			type: providerTypeString,
			extensionId: extensionIdentifierForRegistration,
			...providerSpecificArgumentsForStorageAndDto,
		};
		this.#providerStore.set(registrationHandle, registrationEntry);
		this._logDebug(
			`Locally registered ${providerTypeString}Provider for extension '${extensionIdentifierForRegistration.value}' (Handle: ${registrationHandle}). Selector: ${JSON.stringify(documentSelector)}`,
		);

		if (!this.#mainThreadLanguageFeaturesProxy) {
			this.#providerStore.delete(registrationHandle);
			const errorMessage = `Cannot register ${providerTypeString}Provider with MainThread: RPC proxy unavailable.`;
			this._logError(errorMessage);
			throw new Error(errorMessage);
		}
		try {
			const selectorDtoArray: IDocumentFilterDto[] =
				localTypeConverters.DocumentSelector.fromDtoArray(
					documentSelector,
					undefined,
				);
			await mainThreadRegisterRpcCallLambda(
				this.#mainThreadLanguageFeaturesProxy,
				registrationHandle,
				selectorDtoArray,
				providerSpecificArgumentsForStorageAndDto,
				extensionIdentifierForRegistration,
			);
			this._logDebug(
				`${providerTypeString}Provider (Handle: ${registrationHandle}, Ext: ${extensionIdentifierForRegistration.value}) registration request sent to MainThread.`,
			);
			return registrationHandle;
		} catch (error: any) {
			this.#providerStore.delete(registrationHandle);
			this._logError(
				`RPC call for ${providerTypeString}Provider (Handle: ${registrationHandle}, Ext: ${extensionIdentifierForRegistration.value}) registration failed:`,
				refineErrorForShim(
					error,
					this._logService,
					`register${providerTypeString}Provider RPC`,
				),
			);
			throw error;
		}
	}

	public $registerHoverProvider(
		documentSelector: DocumentSelector,
		providerInstance: HoverProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<HoverProvider>(
			"Hover",
			providerInstance,
			documentSelector,
			(proxy, h, selDto, _args, extId) =>
				proxy.$registerHoverProvider(h, selDto, extId!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerCompletionItemProvider(
		documentSelector: DocumentSelector,
		providerInstance: CompletionItemProvider,
		triggerCharacters: string[],
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const completionArgs = {
			triggerCharacters,
			completionOptions: {
				supportsResolveDetails:
					typeof providerInstance.resolveCompletionItem ===
					"function",
			},
		};
		return this._registerProviderOnMainThread<CompletionItemProvider>(
			"Completion",
			providerInstance,
			documentSelector,
			(proxy, h, selDto, args, extId) =>
				proxy.$registerCompletionsProvider(
					h,
					selDto,
					args.triggerCharacters,
					args.completionOptions.supportsResolveDetails,
					extId!,
				),
			completionArgs,
			extensionIdentifier,
		);
	}
	public $registerDefinitionProvider(
		documentSelector: DocumentSelector,
		providerInstance: DefinitionProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<DefinitionProvider>(
			"Definition",
			providerInstance,
			documentSelector,
			(proxy, h, selDto, _args, extId) =>
				proxy.$registerDefinitionProvider(h, selDto, extId!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerCodeLensProvider(
		documentSelector: DocumentSelector,
		providerInstance: CodeLensProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const eventHandle =
			typeof providerInstance.onDidChangeCodeLenses === "function"
				? ++this.#providerHandlePool
				: undefined;
		if (eventHandle)
			this._logWarnOnce(
				`onDidChangeCodeLenses event for CodeLensProvider (Ext: ${extensionIdentifier.value}) STUBBED. Event Handle: ${eventHandle}.`,
			);
		const codeLensArgs = { codeLensEventHandle: eventHandle };
		return this._registerProviderOnMainThread<CodeLensProvider>(
			"CodeLens",
			providerInstance,
			documentSelector,
			(proxy, h, selDto, args, extId) =>
				proxy.$registerCodeLensProvider(
					h,
					selDto,
					args.codeLensEventHandle,
					extId!,
				),
			codeLensArgs,
			extensionIdentifier,
		);
	}
	public $registerCodeActionProvider(
		documentSelector: DocumentSelector,
		providerInstance: CodeActionProvider,
		providerMetadata: VscodeCodeActionProviderMetadata | undefined,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const metadataDto =
			localTypeConverters.CodeActionProviderMetadata.toDto(
				providerMetadata,
			);
		const displayName =
			typeof (providerInstance as any).displayName === "string"
				? (providerInstance as any).displayName
				: undefined;
		const codeActionArgs = {
			codeActionOptions: { metadataDto, displayName },
		};
		return this._registerProviderOnMainThread<CodeActionProvider>(
			"CodeAction",
			providerInstance,
			documentSelector,
			(proxy, h, selDto, args, extId) =>
				proxy.$registerCodeActionProvider(
					h,
					selDto,
					args.codeActionOptions.metadataDto,
					args.codeActionOptions.displayName,
					extId!,
					undefined /* onDidChangeCodeActions handle - TODO */,
				),
			codeActionArgs,
			extensionIdentifier,
		);
	}
	public $registerDeclarationProvider(
		documentSelector: DocumentSelector,
		providerInstance: DeclarationProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<DeclarationProvider>(
			"Declaration",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerDeclarationProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerImplementationProvider(
		documentSelector: DocumentSelector,
		providerInstance: ImplementationProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<ImplementationProvider>(
			"Implementation",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerImplementationProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerTypeDefinitionProvider(
		documentSelector: DocumentSelector,
		providerInstance: TypeDefinitionProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<TypeDefinitionProvider>(
			"TypeDefinition",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerTypeDefinitionProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerDocumentFormattingEditProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentFormattingEditProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const displayName =
			(extensionIdentifier as any).displayName ||
			(extensionIdentifier as any).name ||
			extensionIdentifier.value;
		return this._registerProviderOnMainThread<DocumentFormattingEditProvider>(
			"DocumentFormattingEdit",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) =>
				p.$registerDocumentFormattingEditProvider(
					h,
					s,
					e!,
					displayName,
				),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerDocumentRangeFormattingEditProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentRangeFormattingEditProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const displayName =
			(extensionIdentifier as any).displayName ||
			(extensionIdentifier as any).name ||
			extensionIdentifier.value;
		const rangeArgs = {
			canFormatMultipleRanges:
				typeof (providerInstance as any)
					.provideDocumentRangesFormattingEdits === "function",
		};
		return this._registerProviderOnMainThread<DocumentRangeFormattingEditProvider>(
			"DocumentRangeFormattingEdit",
			providerInstance,
			documentSelector,
			(p, h, s, args, e) =>
				p.$registerDocumentRangeFormattingEditProvider(
					h,
					s,
					e!,
					displayName,
					args.canFormatMultipleRanges,
				),
			rangeArgs,
			extensionIdentifier,
		);
	}
	public $registerOnTypeFormattingEditProvider(
		documentSelector: DocumentSelector,
		providerInstance: OnTypeFormattingEditProvider,
		triggerCharacters: string[],
		_options: OnTypeFormattingEditProviderOptions | undefined,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Note: _options (newer API) is not explicitly passed to the RPC in this simplified registration call for MVP.
		// A full implementation would convert _options to a DTO if the protocol supports it.
		const onTypeArgs = { triggerCharacters };
		return this._registerProviderOnMainThread<OnTypeFormattingEditProvider>(
			"OnTypeFormattingEdit",
			providerInstance,
			documentSelector,
			(p, h, s, args, e) =>
				p.$registerOnTypeFormattingEditProvider(
					h,
					s,
					args.triggerCharacters,
					e!,
				),
			onTypeArgs,
			extensionIdentifier,
		);
	}
	public $registerDocumentHighlightProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentHighlightProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<DocumentHighlightProvider>(
			"DocumentHighlight",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerDocumentHighlightProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerDocumentLinkProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentLinkProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const linkArgs = {
			supportsResolve:
				typeof providerInstance.resolveDocumentLink === "function",
		};
		return this._registerProviderOnMainThread<DocumentLinkProvider>(
			"DocumentLink",
			providerInstance,
			documentSelector,
			(p, h, s, args, e) =>
				p.$registerDocumentLinkProvider(h, s, args.supportsResolve, e!),
			linkArgs,
			extensionIdentifier,
		);
	}
	public $registerDocumentColorProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentColorProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<DocumentColorProvider>(
			"DocumentColor",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerDocumentColorProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerFoldingRangeProvider(
		documentSelector: DocumentSelector,
		providerInstance: FoldingRangeProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const eventHandle =
			typeof providerInstance.onDidChangeFoldingRanges === "function"
				? ++this.#providerHandlePool
				: undefined;
		if (eventHandle)
			this._logWarnOnce(
				`onDidChangeFoldingRanges for FoldingRangeProvider (Ext: ${extensionIdentifier.value}) STUBBED. Event Handle: ${eventHandle}.`,
			);
		const foldingArgs = {
			onDidChangeFoldingRangesEventHandle: eventHandle,
		};
		return this._registerProviderOnMainThread<FoldingRangeProvider>(
			"FoldingRange",
			providerInstance,
			documentSelector,
			(p, h, s, args, e) =>
				p.$registerFoldingRangeProvider(
					h,
					s,
					e!,
					args.onDidChangeFoldingRangesEventHandle,
				),
			foldingArgs,
			extensionIdentifier,
		);
	}
	public $registerReferenceProvider(
		documentSelector: DocumentSelector,
		providerInstance: ReferenceProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<ReferenceProvider>(
			"Reference",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerReferenceProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerRenameProvider(
		documentSelector: DocumentSelector,
		providerInstance: RenameProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const renameArgs = {
			supportsResolveLocation:
				typeof providerInstance.prepareRename === "function",
		};
		return this._registerProviderOnMainThread<RenameProvider>(
			"Rename",
			providerInstance,
			documentSelector,
			(p, h, s, args, e) =>
				p.$registerRenameProvider(
					h,
					s,
					args.supportsResolveLocation,
					e!,
				),
			renameArgs,
			extensionIdentifier,
		);
	}
	public $registerSignatureHelpProvider(
		documentSelector: DocumentSelector,
		providerInstance: SignatureHelpProvider,
		providerMetadataOrTriggerChars:
			| string[]
			| VscodeSignatureHelpProviderMetadata
			| undefined,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const metadataDto =
			typeof providerMetadataOrTriggerChars === "object" &&
			!Array.isArray(providerMetadataOrTriggerChars) &&
			providerMetadataOrTriggerChars !== null
				? localTypeConverters.SignatureHelpProviderMetadata.toDto(
						providerMetadataOrTriggerChars as VscodeSignatureHelpProviderMetadata,
					)
				: ({
						triggerCharacters:
							(providerMetadataOrTriggerChars as string[]) || [],
						retriggerCharacters:
							(
								providerMetadataOrTriggerChars as VscodeSignatureHelpProviderMetadata
							)?.retriggerCharacters || [],
					} as SignatureHelpProviderMetadataDto);
		const sigHelpArgs = { metadataDto };
		return this._registerProviderOnMainThread<SignatureHelpProvider>(
			"SignatureHelp",
			providerInstance,
			documentSelector,
			(p, h, s, args, e) =>
				p.$registerSignatureHelpProvider(h, s, args.metadataDto, e!),
			sigHelpArgs,
			extensionIdentifier,
		);
	}
	public $registerWorkspaceSymbolProvider(
		providerInstance: WorkspaceSymbolProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const metadata: WorkspaceSymbolProviderMetadataDto = {
			supportsResolve:
				typeof providerInstance.resolveWorkspaceSymbol === "function",
		};
		return this._registerProviderOnMainThread<WorkspaceSymbolProvider>(
			"WorkspaceSymbol",
			providerInstance,
			null,
			(p, h, s, args, e) =>
				p.$registerWorkspaceSymbolProvider(
					h,
					args as WorkspaceSymbolProviderMetadataDto,
					e!,
				),
			metadata,
			extensionIdentifier,
		);
	}
	public $registerDocumentSymbolProvider(
		documentSelector: DocumentSelector,
		providerInstance: VscodeDocumentSymbolProvider,
		providerMetadata: VscodeDocumentSymbolProviderMetadata | undefined,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const label =
			providerMetadata?.label ||
			(extensionIdentifier as any).displayName ||
			(extensionIdentifier as any).name ||
			extensionIdentifier.value;
		const metadataDto: DocumentSymbolProviderMetadataDto = { label };
		return this._registerProviderOnMainThread<VscodeDocumentSymbolProvider>(
			"DocumentSymbol",
			providerInstance,
			documentSelector,
			(p, h, s, args, e) =>
				p.$registerDocumentSymbolProvider(
					h,
					s,
					args as DocumentSymbolProviderMetadataDto,
					e!,
				),
			metadataDto,
			extensionIdentifier,
		);
	}
	public $registerSelectionRangeProvider(
		documentSelector: DocumentSelector,
		providerInstance: SelectionRangeProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<SelectionRangeProvider>(
			"SelectionRange",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerSelectionRangeProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerCallHierarchyProvider(
		documentSelector: DocumentSelector,
		providerInstance: CallHierarchyProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<CallHierarchyProvider>(
			"CallHierarchy",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerCallHierarchyProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerTypeHierarchyProvider(
		documentSelector: DocumentSelector,
		providerInstance: TypeHierarchyProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<TypeHierarchyProvider>(
			"TypeHierarchy",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerTypeHierarchyProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerLinkedEditingRangeProvider(
		documentSelector: DocumentSelector,
		providerInstance: LinkedEditingRangeProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<LinkedEditingRangeProvider>(
			"LinkedEditingRange",
			providerInstance,
			documentSelector,
			(p, h, s, _, e) => p.$registerLinkedEditingRangeProvider(h, s, e!),
			undefined,
			extensionIdentifier,
		);
	}
	public $registerInlayHintsProvider(
		documentSelector: DocumentSelector,
		providerInstance: InlayHintsProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const eventHandle =
			typeof providerInstance.onDidChangeInlayHints === "function"
				? ++this.#providerHandlePool
				: undefined;
		if (eventHandle)
			this._logWarnOnce(
				`onDidChangeInlayHints for InlayHintsProvider (Ext: ${extensionIdentifier.value}) STUBBED. Event Handle: ${eventHandle}.`,
			);
		const label =
			(extensionIdentifier as any).displayName ||
			(extensionIdentifier as any).name ||
			extensionIdentifier.value;
		const inlayArgs = {
			supportsResolve:
				typeof providerInstance.resolveInlayHint === "function",
			onDidChangeInlayHintsEventHandle: eventHandle,
			label,
		};
		return this._registerProviderOnMainThread<InlayHintsProvider>(
			"InlayHints",
			providerInstance,
			documentSelector,
			(p, h, s, args, e) =>
				p.$registerInlayHintsProvider(
					h,
					s,
					args.supportsResolve,
					args.onDidChangeInlayHintsEventHandle,
					args.label,
					e!,
				),
			inlayArgs,
			extensionIdentifier,
		);
	}

	public async $unregister(providerHandle: number): Promise<void> {
		this._logDebug(
			`RPC method $unregister called for Provider Handle: ${providerHandle}`,
		);
		const entry = this.#providerStore.get(providerHandle);
		if (this.#providerStore.delete(providerHandle)) {
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
				refineErrorForShim(
					error,
					this._logService,
					`$unregister RPC(${providerHandle})`,
				),
			);
		}
	}

	private _getProviderAndMethodInternal<P, M extends keyof P>(
		handle: number,
		methodName: M,
		expectedType: string,
	): {
		provider: P;
		method: P[M];
		registration: ProviderRegistrationEntry;
	} | null {
		const entry = this.#providerStore.get(handle);
		if (!entry) {
			this._logError(
				`Provider execution: No registration for Handle ${handle} (expected ${expectedType}).`,
			);
			return null;
		}
		if (entry.type !== expectedType) {
			this._logError(
				`Provider execution: Handle ${handle} type mismatch. Expected '${expectedType}', found '${entry.type}'.`,
			);
			return null;
		}
		const provider = entry.provider as P;
		if (!provider || typeof provider[methodName] !== "function") {
			this._logError(
				`Provider execution: ${expectedType}Provider (Handle ${handle}, Ext: ${entry.extensionId.value}) or method '${String(methodName)}' missing.`,
			);
			return null;
		}
		return {
			provider,
			method: provider[methodName] as P[M],
			registration: entry,
		};
	}
	private _getTextDocumentFromRpc(
		uriDto: VSCodeInternalUriComponents | undefined,
	): TextDocument | null {
		if (!uriDto) {
			this._logError(
				"Cannot get TextDocument for provider: URI DTO undefined.",
			);
			return null;
		}
		const uri = this._reviveApiArgument<VscodeApiUri>(uriDto);
		if (!uri) {
			this._logError(
				"Failed to revive vscode.Uri from DTO for _getTextDocumentFromRpc.",
				uriDto,
			);
			return null;
		}
		const docData = this.#extHostDocuments.getDocumentData(uri);
		if (!docData?.document) {
			this._logError(
				`TextDocument not found locally for provider execution. URI='${uri.toString()}'.`,
			);
			return null;
		}
		return docData.document;
	}
	private _resolveTokenFromDto(
		tokenDto: { id?: number } | number | undefined,
		disposables: DisposableStore,
	): CancellationToken {
		const tokenId = typeof tokenDto === "number" ? tokenDto : tokenDto?.id;
		if (tokenId && typeof tokenId === "number" && tokenId > 0) {
			if (!this.#cancellationTokenRegistry) {
				this._logError(
					"CancellationTokenRegistry unavailable. Using CancellationToken.None.",
				);
				return CancellationToken.None;
			}
			try {
				const { token, disposable } =
					this.#cancellationTokenRegistry.obtainTokenAndDisposable(
						tokenId,
					);
				disposables.add(disposable);
				this._logService?.trace(
					`Obtained CancellationToken for tokenId: ${tokenId}. Initial isCancellationRequested: ${token.isCancellationRequested}`,
				);
				return token;
			} catch (error) {
				this._logError(
					`Error obtaining CancellationToken for tokenId ${tokenId} from registry:`,
					error,
				);
				return CancellationToken.None;
			}
		}
		this._logService?.trace(
			"Invalid or missing tokenId in cancellationTokenDto. Using CancellationToken.None.",
		);
		return CancellationToken.None;
	}

	public async $provideHover(
		providerHandle: number,
		uriComponentsDto: VSCodeInternalUriComponents,
		positionDto: IPosition,
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<VscodeHover | undefined> {
		const operationDisposables = new DisposableStore();
		try {
			const info = this._getProviderAndMethodInternal<
				HoverProvider,
				"provideHover"
			>(providerHandle, "provideHover", "Hover");
			if (!info) return undefined;
			const doc = this._getTextDocumentFromRpc(uriComponentsDto);
			const pos = this._reviveApiArgument<VscodePosition>(positionDto);
			if (!doc || !pos) return undefined;
			const token = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationDisposables,
			);
			const result = await (info.method as Function).call(
				info.provider,
				doc,
				pos,
				token,
			);
			if (result)
				this._logDebug(
					`$provideHover (Handle ${providerHandle}) result needs DTO marshalling.`,
				);
			return this._convertApiArgToInternal(result);
		} catch (error: any) {
			const entry = this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing HoverProvider.provideHover (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				error,
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}
	public async $provideCompletionItems(
		providerHandle: number,
		uriComponentsDto: VSCodeInternalUriComponents,
		positionDto: IPosition,
		completionContextDto: ExtHostCompletionContextDto,
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcSuggestResult | undefined> {
		const operationDisposables = new DisposableStore();
		try {
			const info = this._getProviderAndMethodInternal<
				CompletionItemProvider,
				"provideCompletionItems"
			>(providerHandle, "provideCompletionItems", "Completion");
			if (!info) return undefined;
			const doc = this._getTextDocumentFromRpc(uriComponentsDto);
			const pos = this._reviveApiArgument<VscodePosition>(positionDto);
			const ctx =
				localTypeConverters.CompletionContext.toApiType(
					completionContextDto,
				);
			if (!doc || !pos || !ctx) return undefined;
			const token = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationDisposables,
			);
			const result = await (info.method as Function).call(
				info.provider,
				doc,
				pos,
				token,
				ctx,
			);
			if (result) {
				const count = Array.isArray(result)
					? result.length
					: (result as VscodeCompletionList).items.length;
				this._logDebug(
					`$provideCompletionItems (Handle ${providerHandle}) returned ${count} items. Needs DTO marshalling to RpcSuggestResult.`,
				);
			}
			return this._convertApiArgToInternal(result) as
				| RpcSuggestResult
				| undefined;
		} catch (error: any) {
			const entry = this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CompletionItemProvider.provideCompletionItems (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				error,
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}
	public async $resolveCompletionItem(
		providerHandle: number,
		completionItemDto: RpcSuggestData,
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcSuggestData | undefined> {
		const operationDisposables = new DisposableStore();
		let revivedItemForError: VscodeCompletionItem | undefined;
		try {
			const info = this._getProviderAndMethodInternal<
				CompletionItemProvider,
				"resolveCompletionItem"
			>(providerHandle, "resolveCompletionItem", "Completion");
			if (!info?.method) {
				this._logDebug(
					`No resolveCompletionItem for Handle ${providerHandle} (Ext: ${info?.registration.extensionId.value || "unknown"}). Returning original DTO.`,
				);
				return completionItemDto;
			}
			const itemToResolve =
				this._reviveApiArgument<VscodeCompletionItem>(
					completionItemDto,
				);
			revivedItemForError = itemToResolve;
			if (!itemToResolve) {
				this._logError(
					`Failed to revive CompletionItem DTO for resolve (Handle ${providerHandle}):`,
					completionItemDto,
				);
				return completionItemDto;
			}
			const token = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationDisposables,
			);
			const result = await (info.method as Function).call(
				info.provider,
				itemToResolve,
				token,
			);
			this._logDebug(
				`$resolveCompletionItem (Handle ${providerHandle}) result needs DTO marshalling.`,
			);
			return this._convertApiArgToInternal(result || itemToResolve);
		} catch (error: any) {
			const entry = this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CompletionItemProvider.resolveCompletionItem (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				error,
			);
			return this._convertApiArgToInternal(revivedItemForError);
		} finally {
			operationDisposables.dispose();
		}
	}
	public async $provideDefinition(
		providerHandle: number,
		uriComponentsDto: VSCodeInternalUriComponents,
		positionDto: IPosition,
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcLocationLink[] | undefined> {
		const operationDisposables = new DisposableStore();
		try {
			const info = this._getProviderAndMethodInternal<
				DefinitionProvider,
				"provideDefinition"
			>(providerHandle, "provideDefinition", "Definition");
			if (!info) return undefined;
			const doc = this._getTextDocumentFromRpc(uriComponentsDto);
			const pos = this._reviveApiArgument<VscodePosition>(positionDto);
			if (!doc || !pos) return undefined;
			const token = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationDisposables,
			);
			const result = await (info.method as Function).call(
				info.provider,
				doc,
				pos,
				token,
			);
			if (!result) return undefined;
			const resultArr = Array.isArray(result) ? result : [result];
			this._logDebug(
				`$provideDefinition (Handle ${providerHandle}) returned ${resultArr.length} results. Marshalling to RpcLocationLink[] with local stub.`,
			);
			return localTypeConverters.DefinitionLink.fromApiTypeMany(
				resultArr,
				this,
			);
		} catch (error: any) {
			const entry = this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing DefinitionProvider.provideDefinition (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				error,
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}
	public async $provideCodeLenses(
		providerHandle: number,
		uriComponentsDto: VSCodeInternalUriComponents,
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcCodeLensList | undefined> {
		const operationDisposables = new DisposableStore();
		try {
			const info = this._getProviderAndMethodInternal<
				CodeLensProvider,
				"provideCodeLenses"
			>(providerHandle, "provideCodeLenses", "CodeLens");
			if (!info) return undefined;
			const doc = this._getTextDocumentFromRpc(uriComponentsDto);
			if (!doc) return undefined;
			const token = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationDisposables,
			);
			const resultArr = (await (info.method as Function).call(
				info.provider,
				doc,
				token,
			)) as VscodeCodeLens[] | undefined;
			if (resultArr && resultArr.length > 0) {
				const dtoArray = localTypeConverters.CodeLens.fromApiTypeMany(
					resultArr,
					this,
				);
				this._logDebug(
					`$provideCodeLenses (Handle ${providerHandle}) returned ${dtoArray.length} lenses. Marshalling with local stub.`,
				);
				return { lenses: dtoArray, dispose: () => {} };
			}
			return undefined;
		} catch (error: any) {
			const entry = this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CodeLensProvider.provideCodeLenses (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				error,
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}
	public async $resolveCodeLens(
		providerHandle: number,
		codeLensDto: RpcCodeLens,
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcCodeLens | undefined> {
		const operationDisposables = new DisposableStore();
		let revivedLensForError: VscodeCodeLens | undefined;
		try {
			const info = this._getProviderAndMethodInternal<
				CodeLensProvider,
				"resolveCodeLens"
			>(providerHandle, "resolveCodeLens", "CodeLens");
			if (!info?.method) {
				this._logDebug(
					`No resolveCodeLens for Handle ${providerHandle} (Ext: ${info?.registration.extensionId.value || "unknown"}). Returning original DTO.`,
				);
				return codeLensDto;
			}
			const lensToResolve =
				this._reviveApiArgument<VscodeCodeLens>(codeLensDto);
			revivedLensForError = lensToResolve;
			if (!lensToResolve) {
				this._logError(
					`Failed to revive CodeLens DTO for resolve (Handle ${providerHandle}):`,
					codeLensDto,
				);
				return codeLensDto;
			}
			const token = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationDisposables,
			);
			const result = await (info.method as Function).call(
				info.provider,
				lensToResolve,
				token,
			);
			this._logDebug(
				`$resolveCodeLens (Handle ${providerHandle}) result needs DTO marshalling.`,
			);
			return this._convertApiArgToInternal(result || lensToResolve);
		} catch (error: any) {
			const entry = this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CodeLensProvider.resolveCodeLens (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				error,
			);
			return this._convertApiArgToInternal(revivedLensForError);
		} finally {
			operationDisposables.dispose();
		}
	}
	public async $provideCodeActions(
		providerHandle: number,
		uriComponentsDto: VSCodeInternalUriComponents,
		rangeDto: VscodeInternalRange,
		codeActionContextDto: ExtHostCodeActionContextDto,
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcCodeActionList | undefined> {
		const operationDisposables = new DisposableStore();
		try {
			const info = this._getProviderAndMethodInternal<
				CodeActionProvider,
				"provideCodeActions"
			>(providerHandle, "provideCodeActions", "CodeAction");
			if (!info) return undefined;
			const doc = this._getTextDocumentFromRpc(uriComponentsDto);
			const range = localTypeConverters.Range.toApiRange(rangeDto);
			const ctx =
				localTypeConverters.CodeActionContext.toApiType(
					codeActionContextDto,
				);
			if (!doc || !range || !ctx) return undefined;
			const token = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationDisposables,
			);
			const resultArr = (await (info.method as Function).call(
				info.provider,
				doc,
				range,
				ctx,
				token,
			)) as (VscodeCommand | VscodeCodeAction)[] | undefined;
			if (resultArr && resultArr.length > 0) {
				const dtoArray = localTypeConverters.CodeAction.fromApiTypeMany(
					resultArr,
					this,
				);
				this._logDebug(
					`$provideCodeActions (Handle ${providerHandle}) returned ${dtoArray.length} actions. Marshalling with local stub.`,
				);
				return { actions: dtoArray, dispose: () => {} };
			}
			return undefined;
		} catch (error: any) {
			const entry = this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CodeActionProvider.provideCodeActions (Handle ${providerHandle}, Ext: ${entry?.extensionId.value || "unknown"}):`,
				error,
			);
			return undefined;
		} finally {
			operationDisposables.dispose();
		}
	}

	public override dispose(): void {
		super.dispose();
		this.#providerStore.clear();
		this._logInfo(
			"ShimLanguageFeatures disposed: Provider store cleared, base resources released.",
		);
	}
}
