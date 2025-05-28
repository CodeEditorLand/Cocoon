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
 *--------------------------------------------------------------------------------------------*/

// --- Core VS Code/Base Imports ---
import {
	CancellationToken,
	CancellationTokenSource,
} from "vs/base/common/cancellation"; // For cancellation token management.
import {
	Disposable,
	DisposableStore,
	type IDisposable,
} from "vs/base/common/lifecycle"; // For managing disposable resources.
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions"; // Type for uniquely identifying an extension.

// --- Protocol DTOs and Shapes from VS Code ---
// These types define the data structures and service shapes for RPC communication
// between the Extension Host (ExtHost) and the MainThread (Mountain).
import {
	// Context identifier for registering this service as an RPC target for calls from MainThread.
	ExtHostContext,
	// Context identifier for obtaining an RPC proxy to the MainThreadLanguageFeatures service.
	MainContext,
	// DTO for CodeActionProvider metadata.
	type CodeActionProviderMetadataDto,
	// DTO for DocumentSymbolProvider metadata.
	type DocumentSymbolProviderMetadataDto,
	// DTO for CodeActionContext passed from MainThread.
	type ExtHostCodeActionContextDto,
	// DTO for CompletionContext, renamed to avoid conflict with vscode.CompletionContext.
	type CompletionContextDto as ExtHostCompletionContextDto,
	// DTO for SignatureHelpContext, renamed.
	type SignatureHelpContextDto as ExtHostSignatureHelpContextDto,
	// DTO for FoldingRangeProvider metadata.
	type FoldingRangeProviderMetadataDto,
	type ICallHierarchyItemDto,
	type IColorPresentationDto,
	// DTOs for various other language features, ensuring comprehensive protocol coverage.
	type IDeclarationDto,
	// DTO for DocumentSelector, representing a filter for documents.
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
	// Protocol DTO for a position (0-based line and column).
	type IPosition,
	type IRawColorInfoDto,
	type IReferenceDto,
	type IRenameLocationDto,
	type ISelectionRangeDto,
	type ITypeDefinitionDto,
	type ITypeHierarchyItemDto,
	type ITypeHierarchySubtypesDto,
	type ITypeHierarchySupertypesDto,
	// Protocol DTO for a CodeAction.
	type ICodeActionDto as RpcCodeAction,
	// Protocol DTO for a list of CodeActions.
	type ICodeActionListDto as RpcCodeActionList,
	// Protocol DTO for a CodeLens.
	type ICodeLensDto as RpcCodeLens,
	// Protocol DTO for a list of CodeLenses.
	type ICodeLensListDto as RpcCodeLensList,
	// Protocol DTO for a Command.
	type ICommandDto as RpcCommand,
	// Protocol DTO for a DocumentSymbol.
	type IDocumentSymbolDto as RpcDocumentSymbolDto,
	// Protocol DTO for LocationLink (used for definitions, declarations, etc.).
	type ILocationLinkDto as RpcLocationLink,
	// Protocol DTO for a single completion item (suggest data).
	type ISuggestDataDto as RpcSuggestData,
	// Protocol DTO for a list of completion items or a CompletionList (suggest result).
	type ISuggestResultDto as RpcSuggestResult,
	// Protocol DTO for WorkspaceEdit (representing changes across multiple files).
	type IWorkspaceEditDto as RpcWorkspaceEdit,
	// Protocol DTO for a WorkspaceSymbol.
	type IWorkspaceSymbolDto as RpcWorkspaceSymbolDto,
	// DTO for SignatureHelpProvider metadata.
	type SignatureHelpProviderMetadataDto,
	// The RPC shape (interface) that this service implements for calls from MainThread.
	type ExtHostLanguageFeaturesShape as VscodeExtHostLanguageFeaturesShape,
	// Protocol DTO for a range (0-based start and end positions).
	type IRange as VscodeInternalRange,
	// Protocol DTO for URI components (scheme, authority, path, etc.).
	type UriComponents as VSCodeInternalUriComponents,
	// The RPC shape (interface) for the MainThreadLanguageFeatures service this service calls.
	type MainThreadLanguageFeaturesShape as VscodeMainThreadLanguageFeaturesShape,
	// DTO for WorkspaceSymbolProvider metadata.
	type WorkspaceSymbolProviderMetadataDto,
} from "vs/workbench/api/common/extHost.protocol";
// --- VS Code API Namespace Imports ---
// These are the types that extensions use when implementing language feature providers.
// This shim works with these API types and converts them to/from the DTOs above for RPC.
// Assuming 'vscode' resolves to the API shim (e.g., "../Shim/out/vscode").
import {
	// Provider Interfaces (these are what extensions implement and register)
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
	// API types used in provider method arguments and results
	CodeActionContext as VscodeCodeActionContext,
	CodeActionKind as VscodeCodeActionKind,
	CompletionContext as VscodeCompletionContext,
	DocumentSymbolProvider as VscodeDocumentSymbolProvider, // Explicitly alias if needed
	Location as VscodeLocation,
	Position as VscodePosition,
	Range as VscodeRange,
	SignatureHelpContext as VscodeSignatureHelpContext,
	WorkspaceSymbolProvider,
	type CallHierarchyIncomingCall,
	type CallHierarchyItem,
	type CallHierarchyOutgoingCall,
	type DocumentHighlight,
	// API types for selectors and metadata
	type DocumentSelector,
	type FoldingRange,
	type FormattingOptions,
	type InlayHint,
	type LinkedEditingRanges,
	type OnTypeFormattingEditProviderOptions,
	type RenameLocation,
	type SelectionRange,
	type TextDocument, // This type is crucial, instances are provided by CocoonDocumentService.
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
	// API types for results of provider methods
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

// Service for managing cancellation tokens linked across RPC.
import { CancellationTokenRegistry } from "../cancellation-token-registry";
// Dependency Injection key for CancellationTokenRegistry.
import { ICancellationTokenRegistry } from "../index";
// --- Cocoon Shim Infrastructure Imports ---
import {
	// Base class for Cocoon shims, providing common utilities.
	BaseCocoonShim,
	// Utility function to refine error messages for shim context.
	refineErrorForShim,
	// Interfaces for services injected into shims.
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
// Concrete class for dependency on the document service.
import type { CocoonDocumentService } from "./document-shim";

// TODO: CRITICAL - This is a placeholder. Replace with a comprehensive type conversion module.
// This module would be responsible for converting all complex VS Code API types to their
// corresponding DTOs for RPC, and vice-versa.
// import * as CocoonTypeConverters from '../cocoon-type-converters';

// --- Placeholder Type Converters (localTypeConverters) ---
// These are temporary, simplified converters used during MVP development.
// They lack the robustness and completeness required for full VS Code feature parity.
// Each of these should eventually be replaced by functions from a dedicated `CocoonTypeConverters` module.
const localTypeConverters = {
	// Converter for `vscode.DocumentSelector` to `IDocumentFilterDto[]`.
	DocumentSelector: {
		fromDtoArray: (
			// The DocumentSelector from the vscode.languages.register* API.
			// It can be a language ID string, a LanguageFilter object, or an array of these.
			documentSelector: DocumentSelector | null,
			// In VS Code's full implementation, a URI transformer might be used here,
			// for example, to handle workspace-relative glob patterns. Currently unused.
			_uriTransformer?: any,
		): IDocumentFilterDto[] => {
			// If the selector is null or undefined, return an empty array (no filters).
			if (!documentSelector) {
				return [];
			}

			// Ensure the selector is an array for uniform processing.
			const selectorsArray = Array.isArray(documentSelector)
				? documentSelector
				: [documentSelector];

			// Map each component of the DocumentSelector to an IDocumentFilterDto.
			return (
				selectorsArray
					.map((selectorComponent) => {
						// If the component is a string, it's treated as a language ID.
						if (typeof selectorComponent === "string") {
							return {
								language: selectorComponent, // Language ID.
								scheme: undefined, // No scheme filter.
								pattern: undefined, // No pattern filter.
								notebookType: undefined, // No notebook type filter.
								exclusive: undefined, // Not exclusive.
							} as IDocumentFilterDto;
						}

						// If the component is an object, it's a LanguageFilter.
						if (
							typeof selectorComponent === "object" &&
							selectorComponent !== null
						) {
							// Cast to a known structure for LanguageFilter.
							const languageFilter = selectorComponent as {
								language?: string;
								scheme?: string;
								pattern?: string | unknown; // Pattern can be string or GlobPattern object.
								notebookType?: string;
								exclusive?: boolean;
							};
							return {
								language: languageFilter.language,
								scheme: languageFilter.scheme,
								// Handle GlobPattern which might be an object with a pattern string
								// or a simple string. Convert GlobPattern to string if necessary.
								pattern:
									typeof languageFilter.pattern === "string"
										? languageFilter.pattern
										: (
												languageFilter.pattern as any
											)?.toString(), // Attempt to stringify GlobPattern.
								notebookType: languageFilter.notebookType, // For notebook-specific providers.
								exclusive: languageFilter.exclusive, // If the filter is exclusive.
							} as IDocumentFilterDto;
						}

						// Log a warning if an invalid selector component is encountered.
						console.warn(
							"[TypeConverter Stub] Invalid DocumentSelector component:",
							selectorComponent,
						);
						return undefined; // Invalid component results in undefined.
					})
					// Filter out any undefined DTOs resulting from invalid components.
					.filter(
						(dto): dto is IDocumentFilterDto => dto !== undefined,
					)
			);
		},
	},

	// Converter for `ExtHostCompletionContextDto` to `vscode.CompletionContext`.
	CompletionContext: {
		toApiType: (
			// The DTO received from the MainThread.
			completionContextDto: ExtHostCompletionContextDto,
		): VscodeCompletionContext => {
			// TODO: CRITICAL - Full conversion needed. This is a stub.
			// `completionContextDto.triggerKind` (number) needs to be correctly mapped to
			// the `vscode.CompletionTriggerKind` enum. Assuming direct value alignment for now.
			return {
				triggerKind:
					completionContextDto.triggerKind as unknown as VscodeCompletionContext["triggerKind"],
				triggerCharacter: completionContextDto.triggerCharacter,
			} as VscodeCompletionContext;
		},
	},

	// Converter for `ExtHostCodeActionContextDto` to `vscode.CodeActionContext`.
	CodeActionContext: {
		toApiType: (
			// The DTO received from the MainThread.
			codeActionContextDto: ExtHostCodeActionContextDto,
		): VscodeCodeActionContext => {
			// TODO: CRITICAL - Full conversion needed. This is a stub.
			// - `codeActionContextDto.diagnostics` are `RpcMarkerData[]` and need conversion to `vscode.Diagnostic[]`.
			// - `codeActionContextDto.triggerKind` (number) needs mapping to `vscode.CodeActionTriggerKind` enum.
			return {
				// Placeholder: Diagnostics conversion is complex and requires a dedicated converter.
				diagnostics: [],
				// Convert `only` (string representing CodeActionKind) to `vscode.CodeActionKind` instance.
				only: codeActionContextDto.only
					? new VscodeCodeActionKind(codeActionContextDto.only)
					: undefined,
				// Assuming enum values for triggerKind align directly for now.
				triggerKind:
					codeActionContextDto.triggerKind as unknown as VscodeCodeActionContext["triggerKind"],
			} as VscodeCodeActionContext;
		},
	},

	// Converter for `ExtHostSignatureHelpContextDto` to `vscode.SignatureHelpContext`.
	SignatureHelpContext: {
		toApiType: (
			// The DTO received from the MainThread.
			signatureHelpContextDto: ExtHostSignatureHelpContextDto,
		): VscodeSignatureHelpContext => {
			// TODO: CRITICAL - Full conversion needed. This is a stub.
			// Includes mapping `triggerKind`, reviving `activeSignatureHelp` from its DTO form, etc.
			return signatureHelpContextDto as any; // Placeholder cast, requires proper revival.
		},
	},

	// Converter for `VscodeInternalRange` (DTO for range) to `vscode.Range`.
	Range: {
		toApiRange: (
			// The range DTO from the MainThread (0-based).
			rangeDto: VscodeInternalRange | undefined,
		): VscodeRange => {
			// If the DTO is undefined, return a default empty range for safety.
			if (!rangeDto) {
				return new VscodeRange(0, 0, 0, 0);
			}
			// Create a new vscode.Range instance from the DTO's 0-based coordinates.
			return new VscodeRange(
				rangeDto.startLineNumber,
				rangeDto.startColumn,
				rangeDto.endLineNumber,
				rangeDto.endColumn,
			);
		},
	},

	// Converter for `vscode.DefinitionLink` or `vscode.Location` to `RpcLocationLink` DTO.
	DefinitionLink: {
		fromApiType: (
			// The API type item (DefinitionLink or Location) from a provider.
			// Can also be an array if a provider incorrectly returns an array for a single item.
			apiLinkOrLocation: VscodeDefinitionLink | VscodeLocation,
			// Instance of BaseCocoonShim for utility methods like URI marshalling.
			baseShim: BaseCocoonShim,
		): RpcLocationLink | undefined => {
			// If the input is null or undefined, return undefined.
			if (!apiLinkOrLocation) {
				return undefined;
			}

			// Some providers might return an array even when a single item is expected.
			// Handle this by taking the first element if it's an array.
			const singleItem = Array.isArray(apiLinkOrLocation)
				? apiLinkOrLocation[0]
				: apiLinkOrLocation;
			if (!singleItem) {
				return undefined;
			}

			// Check if the item is a VscodeDefinitionLink (has targetUri and targetRange).
			if ("targetUri" in singleItem && "targetRange" in singleItem) {
				// Marshal the target URI to its DTO form.
				const targetUriDto = baseShim._convertApiArgToInternal(
					singleItem.targetUri,
				);
				if (!targetUriDto) {
					console.warn(
						"[TypeConverter Stub] Failed to marshal targetUri in VscodeDefinitionLink. Skipping item.",
						singleItem.targetUri,
					);
					return undefined;
				}
				// Construct the RpcLocationLink DTO.
				// Note: vscode.Range is structurally compatible with IRange DTO, so direct marshalling often works.
				return {
					uri: targetUriDto, // Marshalled URI DTO.
					range: baseShim._convertApiArgToInternal(
						singleItem.targetRange,
					),
					targetSelectionRange: baseShim._convertApiArgToInternal(
						singleItem.targetSelectionRange,
					),
					originSelectionRange: baseShim._convertApiArgToInternal(
						singleItem.originSelectionRange,
					),
				} as RpcLocationLink;
			}
			// Check if the item is a VscodeLocation (has uri and range).
			else if ("uri" in singleItem && "range" in singleItem) {
				// Marshal the URI to its DTO form.
				const uriDto = baseShim._convertApiArgToInternal(
					singleItem.uri,
				);
				if (!uriDto) {
					console.warn(
						"[TypeConverter Stub] Failed to marshal uri in VscodeLocation. Skipping item.",
						singleItem.uri,
					);
					return undefined;
				}
				// Construct the RpcLocationLink DTO.
				return {
					uri: uriDto, // Marshalled URI DTO.
					range: baseShim._convertApiArgToInternal(singleItem.range), // vscode.Range DTO compatible.
					// Other fields for RpcLocationLink might be undefined if the source is just VscodeLocation.
				} as RpcLocationLink;
			}

			// Log a warning if the structure is unrecognized.
			console.warn(
				"[TypeConverter Stub] Unrecognized DefinitionLink/Location structure for marshalling:",
				singleItem,
			);
			return undefined;
		},

		// Converts an array of `VscodeDefinitionLink` or `VscodeLocation` to `RpcLocationLink[]`.
		fromApiTypeMany: (
			// Array of API type items from a provider.
			apiItems: ReadonlyArray<VscodeDefinitionLink | VscodeLocation>,
			// Instance of BaseCocoonShim for utility methods.
			baseShim: BaseCocoonShim,
		): RpcLocationLink[] => {
			if (!apiItems) {
				return [];
			}
			// Map each item using the single-item converter and filter out any undefined results.
			return apiItems
				.map((item) =>
					localTypeConverters.DefinitionLink.fromApiType(
						item,
						baseShim,
					),
				)
				.filter((link): link is RpcLocationLink => !!link); // Type guard to ensure only valid links remain.
		},
	},

	// Converter for `vscode.Command` or `vscode.CodeAction` array to `(RpcCommand | RpcCodeAction)[]`.
	CodeAction: {
		fromApiTypeMany: (
			// Array of VscodeCommand or VscodeCodeAction from a provider.
			apiActions: ReadonlyArray<VscodeCommand | VscodeCodeAction>,
			// Instance of BaseCocoonShim for generic marshalling.
			baseShim: BaseCocoonShim,
		): (RpcCommand | RpcCodeAction)[] => {
			// TODO: CRITICAL - This needs specific DTO conversion for VscodeCodeAction,
			// especially its `edit: WorkspaceEdit` property, which requires deep marshalling.
			// `_convertApiArgToInternal` is a generic fallback and insufficient for complex types.
			console.warn(
				"[TypeConverter Stub] CodeAction.fromApiTypeMany uses generic _convertApiArgToInternal. " +
					"Full WorkspaceEdit marshalling is critically needed for CodeAction.edit.",
			);
			// Using generic marshaller as a placeholder.
			return apiActions.map((action) =>
				baseShim._convertApiArgToInternal(action),
			) as any;
		},
	},

	// Converter for `vscode.CodeLens` array to `RpcCodeLens[]`.
	CodeLens: {
		fromApiTypeMany: (
			// Array of VscodeCodeLens from a provider.
			apiLenses: ReadonlyArray<VscodeCodeLens>,
			// Instance of BaseCocoonShim for generic marshalling.
			baseShim: BaseCocoonShim,
		): RpcCodeLens[] => {
			// TODO: CRITICAL - `VscodeCodeLens.command` needs proper marshalling to `RpcCommand`.
			// `_convertApiArgToInternal` is a generic fallback.
			console.warn(
				"[TypeConverter Stub] CodeLens.fromApiTypeMany uses generic _convertApiArgToInternal. " +
					"Full Command marshalling for CodeLens.command is needed.",
			);
			// Using generic marshaller as a placeholder.
			return apiLenses.map((lens) =>
				baseShim._convertApiArgToInternal(lens),
			) as any;
		},
	},

	// Converter for `VscodeCodeActionProviderMetadata` to `CodeActionProviderMetadataDto`.
	CodeActionProviderMetadata: {
		toDto: (
			// Optional metadata object from a CodeActionProvider.
			apiMetadata?: VscodeCodeActionProviderMetadata,
		): CodeActionProviderMetadataDto | undefined => {
			if (!apiMetadata) {
				return undefined;
			}
			return {
				// `providedCodeActionKinds` is an array of `vscode.CodeActionKind`.
				// Convert each to its string value.
				providedCodeActionKinds:
					apiMetadata.providedCodeActionKinds?.map(
						(kind) => kind.value,
					),
				// `documentation` is an array of objects with `value` and `kind`.
				documentation: apiMetadata.documentation?.map((doc) => ({
					value: doc.value, // Assuming doc.value is string.
					// Assuming doc.kind (vscode.CodeActionTriggerKind) has a string `value` property.
					kind: doc.kind.value,
				})),
			} as CodeActionProviderMetadataDto;
		},
	},

	// Converter for `VscodeSignatureHelpProviderMetadata` to `SignatureHelpProviderMetadataDto`.
	SignatureHelpProviderMetadata: {
		toDto: (
			// Optional metadata object from a SignatureHelpProvider.
			apiMetadata?: VscodeSignatureHelpProviderMetadata,
		): SignatureHelpProviderMetadataDto | undefined => {
			if (!apiMetadata) {
				return undefined;
			}
			return {
				triggerCharacters: apiMetadata.triggerCharacters,
				retriggerCharacters: apiMetadata.retriggerCharacters,
			} as SignatureHelpProviderMetadataDto;
		},
	},
	// TODO: CRITICAL - Add specific converters for all other complex types:
	// Hover (to DTO), CompletionItem/List (to RpcSuggestData/Result DTOs and back),
	// DocumentLink (to RpcLink/RpcLinksList DTOs and back), TextEdit (to DTO and back),
	// WorkspaceEdit (to RpcEditsDto/RpcWorkspaceEditDto and back), etc.
	// These are essential for robust language feature support.
};

// A dummy ExtensionIdentifier used for registrations made by the shim itself if necessary
// (e.g., for internal providers not originating from an actual extension).
const INTERNAL_SHIM_EXTENSION_ID: ExtensionIdentifier = new ExtensionIdentifier(
	"cocoon.languagefeatures.internal_provider",
);

// --- Internal Structure for Provider Registration ---
// This interface defines the structure used to store details about each
// registered language feature provider.
interface ProviderRegistrationEntry {
	// The actual language provider instance (e.g., an object implementing HoverProvider).
	provider: any;
	// The DocumentSelector that specifies which documents this provider applies to.
	// Null for workspace-wide providers (like WorkspaceSymbolProvider).
	selector: DocumentSelector | null;
	// A string identifying the type of provider (e.g., "Hover", "Completion").
	// Primarily used for logging and debugging purposes.
	type: string;
	// The ExtensionIdentifier of the extension that registered this provider.
	extensionId: ExtensionIdentifier;

	// --- Provider-specific options and metadata stored with the registration ---
	// For CompletionItemProvider and SignatureHelpProvider: trigger characters.
	triggerCharacters?: ReadonlyArray<string>;
	// For CompletionItemProvider: options related to resolving completion items.
	completionOptions?: { supportsResolveDetails?: boolean };
	// For CodeActionProvider: metadata and display name.
	codeActionOptions?: {
		metadataDto?: CodeActionProviderMetadataDto;
		displayName?: string;
	};
	// For SignatureHelpProvider: metadata including trigger and retrigger characters.
	signatureHelpOptions?: { metadataDto?: SignatureHelpProviderMetadataDto };
	// For RenameProvider: options related to preparing rename.
	renameOptions?: { supportsResolveLocation?: boolean };
	// For DocumentLinkProvider: options related to resolving links.
	linkSupportOptions?: { supportsResolve?: boolean };
	// For InlayHintsProvider: options related to resolving hints and event handling.
	inlayHintsOptions?: {
		supportsResolve?: boolean;
		onDidChangeInlayHintsEventHandle?: number; // Numeric handle for its onDidChange event.
		label?: string; // Display label for the provider.
	};

	// --- Handles for provider-specific onDidChange* events ---
	// These numeric handles are sent to the MainThread, which can use them to
	// signal back when an event occurs (though the typical flow is ExtHost notifying MainThread).
	// More commonly, the ExtHost would listen to these events and send a specific
	// RPC notification to the MainThread (e.g., `$emitCodeLensEvent(handle)`).
	codeLensEventHandle?: number; // Handle for onDidChangeCodeLenses.
	// Handle for onDidChangeInlayHints (can be redundant with inlayHintsOptions but kept for consistency).
	inlayHintsEventHandle?: number;
	// Handle for onDidChangeFoldingRanges.
	foldingRangeEventHandle?: number;
	// TODO: Add more event handles as needed for other providers (e.g., onDidChangeDiagnostics, if managed here).
}

/**
 * Cocoon's implementation of `VscodeExtHostLanguageFeaturesShape`.
 * This service is responsible for managing the registration of language feature
 * providers contributed by extensions. It also handles RPC calls from the
 * MainThread (Mountain) to execute these registered providers.
 */
export class ShimLanguageFeatures
	extends BaseCocoonShim
	implements VscodeExtHostLanguageFeaturesShape
{
	// Service brand for Dependency Injection, identifying this as `IExtHostLanguageFeatures`.
	public readonly _serviceBrand: undefined;

	// RPC proxy to the `MainThreadLanguageFeatures` service on the MainThread.
	// Initialized in the constructor; null if RPC setup fails.
	readonly #mainThreadLanguageFeaturesProxy: VscodeMainThreadLanguageFeaturesShape | null =
		null;

	// A simple counter to generate unique numerical handles for provider registrations.
	#providerHandlePool: number = 0;

	// The primary store for all registered language providers.
	// Maps a unique handle (number) to a `ProviderRegistrationEntry` object.
	readonly #providerStore = new Map<number, ProviderRegistrationEntry>();

	// Reference to the `CocoonDocumentService`, used to retrieve `vscode.TextDocument`
	// instances based on URIs provided in RPC calls.
	readonly #extHostDocuments: CocoonDocumentService;

	// Reference to the `CancellationTokenRegistry`, used to create and manage
	// `CancellationToken` instances that are linked to MainThread requests.
	readonly #cancellationTokenRegistry: CancellationTokenRegistry;

	/**
	 * Creates an instance of `ShimLanguageFeatures`.
	 * @param rpcProtocolServiceAdapter - The RPC service adapter for communication with the MainThread.
	 * @param logServiceForShim - The logging service instance for shim-specific logging.
	 * @param cocoonDocumentService - The document service, crucial for providing `TextDocument` context to providers.
	 * @param cancellationTokenRegistryInstance - The registry for managing cancellation tokens.
	 */
	constructor(
		// Adapter for sending and receiving RPC messages.
		rpcProtocolServiceAdapter: IRpcProtocolServiceAdapter | undefined,
		// Service for logging messages.
		logServiceForShim: ILogServiceForShim | undefined,
		// Service for accessing TextDocument data.
		cocoonDocumentService: CocoonDocumentService,
		// Service for managing cancellation tokens.
		// This would typically be injected using a DI key like @ICancellationTokenRegistry.
		cancellationTokenRegistryInstance: CancellationTokenRegistry,
	) {
		// Call the base class constructor.
		super(
			"ExtHostLanguageFeatures",
			rpcProtocolServiceAdapter,
			logServiceForShim,
		);
		this._logInfo(
			"Initializing ShimLanguageFeatures with CancellationTokenRegistry support...",
		);

		// Check for critical dependency: CocoonDocumentService.
		if (!cocoonDocumentService) {
			this._logError(
				"CRITICAL DEPENDENCY MISSING: CocoonDocumentService was not provided. " +
					"Language feature providers will not be able to operate correctly as they cannot get TextDocument context. " +
					"This will lead to failures or severely impaired functionality.",
			);
		}
		this.#extHostDocuments = cocoonDocumentService;

		// Check for critical dependency: CancellationTokenRegistry.
		if (!cancellationTokenRegistryInstance) {
			this._logError(
				"CRITICAL DEPENDENCY MISSING: CancellationTokenRegistry was not provided. " +
					"Cancellation of provider operations initiated from the MainThread will not work.",
			);
		}
		this.#cancellationTokenRegistry = cancellationTokenRegistryInstance;

		// Set up RPC if the service adapter is available.
		if (this._rpcService) {
			// Get a proxy to the MainThreadLanguageFeatures service.
			this.#mainThreadLanguageFeaturesProxy = this._getProxy(
				MainContext.MainThreadLanguageFeatures as ProxyIdentifier<VscodeMainThreadLanguageFeaturesShape>,
			);

			// Register this instance as an RPC target for calls from the MainThread.
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostLanguageFeatures as ProxyIdentifier<VscodeExtHostLanguageFeaturesShape>,
					this, // `this` instance will handle incoming RPC calls for this shape.
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

		// Log an error if the MainThread proxy could not be obtained.
		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				"Failed to obtain MainThreadLanguageFeatures RPC proxy. " +
					"Provider registration with MainThread and execution of language features requested by MainThread will be impaired or fail. " +
					"This is a critical issue for language feature functionality.",
			);
		}
	}

	/**
	 * Generic private helper method to register a language provider with the MainThread.
	 * This method handles common tasks like generating a unique handle, storing the provider
	 * instance and its metadata locally, converting the `DocumentSelector` to DTOs,
	 * and making the actual RPC call to the MainThread to announce the registration.
	 *
	 * @template ProviderType - The type of the language provider instance (e.g., `HoverProvider`).
	 * @param providerTypeString - A string identifying the type of provider (e.g., "Hover", "Completion"), used for logging.
	 * @param providerInstance - The actual language provider instance being registered.
	 * @param documentSelector - The `DocumentSelector` for this provider, or `null` for workspace-wide providers.
	 * @param mainThreadRegisterRpcCallLambda - A lambda function that encapsulates the specific RPC call
	 *                                          to the MainThread for registering this particular type of provider.
	 *                                          It receives:
	 *                                          - `proxy`: The `VscodeMainThreadLanguageFeaturesShape` proxy.
	 *                                          - `handle`: The generated unique handle for the registration.
	 *                                          - `selectorDtoArray`: The `DocumentSelector` converted to `IDocumentFilterDto[]`.
	 *                                          - `providerSpecificArgsForDto` (optional): Any provider-specific arguments
	 *                                            (like trigger characters DTO) needed for the MainThread RPC call.
	 *                                          - `extensionIdForRpc` (optional): The `ExtensionIdentifier` of the registering extension.
	 * @param providerSpecificArgumentsForStorageAndDto - Any provider-specific arguments (e.g., trigger characters, metadata objects)
	 *                                                    that need to be stored locally with the registration entry and/or
	 *                                                    passed as part of `providerSpecificArgsForDto` to the RPC call lambda.
	 * @param extensionIdentifierForRegistration - The `ExtensionIdentifier` of the extension that is registering this provider.
	 *                                             Defaults to `INTERNAL_SHIM_EXTENSION_ID` if not provided.
	 * @returns A promise that resolves to the unique numerical handle assigned to this provider registration.
	 * @throws An error if the RPC proxy to `MainThreadLanguageFeatures` is unavailable or if the RPC call itself fails.
	 */
	private async _registerProviderOnMainThread<ProviderType>(
		// String identifier for the provider type (e.g., "Hover", "Completion") for logging.
		providerTypeString: string,
		// The actual instance of the language provider (e.g., an object implementing HoverProvider).
		providerInstance: ProviderType,
		// The DocumentSelector defining when this provider is active. Null for workspace-wide providers.
		documentSelector: DocumentSelector | null,
		// Lambda function that makes the specific MainThread RPC call for this provider type.
		mainThreadRegisterRpcCallLambda: (
			// RPC proxy to MainThreadLanguageFeatures.
			rpcProxy: VscodeMainThreadLanguageFeaturesShape,
			// Unique handle for this registration.
			handle: number,
			// Document selector converted to DTO array.
			selectorDtoArray: IDocumentFilterDto[],
			// Optional provider-specific arguments for the DTO sent to MainThread.
			providerSpecificArgumentsForDto?: any,
			// Optional ExtensionIdentifier for the RPC call.
			extensionIdentifierForRpc?: ExtensionIdentifier,
		) => Promise<void>,
		// Optional provider-specific arguments to store locally and potentially pass to the DTO.
		providerSpecificArgumentsForStorageAndDto?: any,
		// Identifier of the extension registering the provider.
		extensionIdentifierForRegistration: ExtensionIdentifier = INTERNAL_SHIM_EXTENSION_ID,
	): Promise<number> {
		// Generate a new unique handle for this provider registration.
		const registrationHandle: number = ++this.#providerHandlePool;

		// Create an entry for storing the provider registration details locally.
		const registrationEntry: ProviderRegistrationEntry = {
			provider: providerInstance,
			selector: documentSelector,
			type: providerTypeString,
			extensionId: extensionIdentifierForRegistration,
			// Spread any provider-specific arguments into the entry for local storage.
			...providerSpecificArgumentsForStorageAndDto,
		};

		// Store the registration entry in the local map.
		this.#providerStore.set(registrationHandle, registrationEntry);

		this._logDebug(
			`Locally registered ${providerTypeString}Provider for extension '${extensionIdentifierForRegistration.value}' (Handle: ${registrationHandle}). Selector: ${JSON.stringify(documentSelector)}`,
		);

		// Check if the RPC proxy to MainThreadLanguageFeatures is available.
		if (!this.#mainThreadLanguageFeaturesProxy) {
			// If proxy is not available, rollback the local registration.
			this.#providerStore.delete(registrationHandle);
			const errorMessage = `Cannot register ${providerTypeString}Provider with MainThread: MainThreadLanguageFeatures RPC proxy is unavailable. Provider registration failed.`;
			this._logError(errorMessage);
			// Throw an error to indicate failure to the caller (e.g., ShimLanguages).
			throw new Error(errorMessage);
		}

		try {
			// Convert the vscode.DocumentSelector to IDocumentFilterDto[] for RPC transmission.
			// The `uriTransformer` argument is undefined here, as it's not typically used at this stage in basic shims.
			const selectorDtoArray: IDocumentFilterDto[] =
				localTypeConverters.DocumentSelector.fromDtoArray(
					documentSelector,
					undefined, // uriTransformer
				);

			// Make the RPC call to the MainThread to register the provider there.
			// The lambda function encapsulates the specific $register*Provider call on the proxy.
			await mainThreadRegisterRpcCallLambda(
				this.#mainThreadLanguageFeaturesProxy,
				registrationHandle,
				selectorDtoArray,
				// Pass the same provider-specific arguments that were stored,
				// as these might be needed to construct the DTO for the MainThread call.
				providerSpecificArgumentsForStorageAndDto,
				// Pass the ExtensionIdentifier to the MainThread.
				extensionIdentifierForRegistration,
			);

			this._logDebug(
				`${providerTypeString}Provider (Handle: ${registrationHandle}, Ext: ${extensionIdentifierForRegistration.value}) registration request successfully sent to MainThread.`,
			);

			// Return the handle assigned to this registration.
			return registrationHandle;
		} catch (error: any) {
			// If the RPC call fails, rollback the local registration.
			this.#providerStore.delete(registrationHandle);
			// Log the refined error.
			this._logError(
				`RPC call for ${providerTypeString}Provider (Handle: ${registrationHandle}, Ext: ${extensionIdentifierForRegistration.value}) registration failed:`,
				refineErrorForShim(
					error,
					this._logService,
					`register${providerTypeString}Provider RPC Call`, // Context for error refinement.
				),
			);
			// Rethrow the error so the caller is aware of the failure.
			throw error;
		}
	}

	// --- $register*Provider Methods (Called by ShimLanguages, part of VscodeExtHostLanguageFeaturesShape) ---
	// These methods are part of the VscodeExtHostLanguageFeaturesShape, typically called by the
	// `vscode.languages.register*Provider` facade (which would be implemented by `ShimLanguages.ts`).

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerHoverProvider} */
	public $registerHoverProvider(
		// The DocumentSelector for which this provider is active.
		documentSelector: DocumentSelector,
		// The HoverProvider instance implemented by the extension.
		providerInstance: HoverProvider,
		// The identifier of the extension registering this provider.
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Returns a promise of the unique registration handle.
		// Delegate to the generic registration helper.
		return this._registerProviderOnMainThread<HoverProvider>(
			"Hover", // Provider type string for logging.
			providerInstance,
			documentSelector,
			// Lambda for the MainThread RPC call.
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerHoverProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined, // No provider-specific arguments for basic HoverProvider registration.
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerCompletionItemProvider} */
	public $registerCompletionItemProvider(
		// The DocumentSelector for which this provider is active.
		documentSelector: DocumentSelector,
		// The CompletionItemProvider instance.
		providerInstance: CompletionItemProvider,
		// Array of trigger characters for this completion provider.
		triggerCharacters: string[],
		// The identifier of the extension registering this provider.
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Returns a promise of the unique registration handle.
		// Determine if the provider supports resolving completion item details.
		const supportsResolveDetails: boolean =
			typeof providerInstance.resolveCompletionItem === "function";
		// Arguments specific to CompletionItemProvider for storage and DTO.
		const completionProviderSpecificArguments = {
			triggerCharacters: triggerCharacters,
			completionOptions: {
				supportsResolveDetails: supportsResolveDetails,
			},
		};

		// Delegate to the generic registration helper.
		return this._registerProviderOnMainThread<CompletionItemProvider>(
			"Completion", // Provider type string.
			providerInstance,
			documentSelector,
			// Lambda for the MainThread RPC call.
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerCompletionsProvider(
					handle,
					selectorDtoArray,
					providerSpecificArguments.triggerCharacters,
					providerSpecificArguments.completionOptions
						.supportsResolveDetails,
					extensionIdentifierForRpc!,
				),
			completionProviderSpecificArguments, // Pass the specific arguments.
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerDefinitionProvider} */
	public $registerDefinitionProvider(
		// The DocumentSelector for this provider.
		documentSelector: DocumentSelector,
		// The DefinitionProvider instance.
		providerInstance: DefinitionProvider,
		// The identifier of the extension.
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Returns handle promise.
		// Delegate to the generic registration helper.
		return this._registerProviderOnMainThread<DefinitionProvider>(
			"Definition", // Provider type string.
			providerInstance,
			documentSelector,
			// Lambda for MainThread RPC.
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerDefinitionProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined, // No specific arguments for basic DefinitionProvider.
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerCodeLensProvider} */
	public $registerCodeLensProvider(
		// The DocumentSelector for this provider.
		documentSelector: DocumentSelector,
		// The CodeLensProvider instance.
		providerInstance: CodeLensProvider,
		// The identifier of the extension.
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Returns handle promise.
		// TODO: Implement full handling of `provider.onDidChangeCodeLenses` event.
		// This would involve creating an event emitter on the ExtHost side, subscribing to the provider's event,
		// generating a unique event handle, and sending this handle to the MainThread during registration.
		// When the provider's event fires, an RPC call like `$emitCodeLensEvent(eventHandle)` would be made to MainThread.
		const eventHandleForDidChangeCodeLenses: number | undefined =
			typeof providerInstance.onDidChangeCodeLenses === "function"
				? ++this.#providerHandlePool
				: undefined;
		// Log a warning if the event exists but full propagation is not yet implemented.
		if (eventHandleForDidChangeCodeLenses) {
			this._logWarnOnce(
				`onDidChangeCodeLenses event detected for CodeLensProvider (Ext: ${extensionIdentifier.value}). ` +
					`Event propagation to MainThread is STUBBED and needs full implementation. ` +
					`Event Handle (for local ref): ${eventHandleForDidChangeCodeLenses}.`,
			);
		}
		// Arguments specific to CodeLensProvider for storage (and potentially DTO if protocol changes).
		const codeLensProviderSpecificArguments = {
			codeLensEventHandle: eventHandleForDidChangeCodeLenses,
		};

		// Delegate to the generic registration helper.
		return this._registerProviderOnMainThread<CodeLensProvider>(
			"CodeLens", // Provider type string.
			providerInstance,
			documentSelector,
			// Lambda for MainThread RPC.
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerCodeLensProvider(
					handle,
					selectorDtoArray,
					providerSpecificArguments.codeLensEventHandle, // Pass the event handle.
					extensionIdentifierForRpc!,
				),
			codeLensProviderSpecificArguments, // Pass specific arguments for storage.
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerCodeActionProvider} */
	public $registerCodeActionProvider(
		// The DocumentSelector for this provider.
		documentSelector: DocumentSelector,
		// The CodeActionProvider instance.
		providerInstance: CodeActionProvider,
		// Optional metadata about the provider (e.g., kinds of code actions provided).
		providerMetadata: VscodeCodeActionProviderMetadata | undefined,
		// The identifier of the extension.
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Returns handle promise.
		// TODO: Implement full handling of `provider.onDidChangeCodeActions` event if it exists, similar to onDidChangeCodeLenses.
		const onDidChangeCodeActionsEventHandle: number | undefined = undefined; // Placeholder for event handle.

		// Convert VscodeCodeActionProviderMetadata to its DTO form.
		const metadataDto =
			localTypeConverters.CodeActionProviderMetadata.toDto(
				providerMetadata,
			);
		// `displayName` is an internal VS Code property on providers, not standard API, but sometimes used in protocol.
		const providerDisplayName: string | undefined =
			typeof (providerInstance as any).displayName === "string"
				? (providerInstance as any).displayName
				: undefined;
		// Arguments specific to CodeActionProvider.
		const codeActionProviderSpecificArguments = {
			codeActionOptions: {
				metadataDto: metadataDto,
				displayName: providerDisplayName,
			},
		};

		// Delegate to the generic registration helper.
		return this._registerProviderOnMainThread<CodeActionProvider>(
			"CodeAction", // Provider type string.
			providerInstance,
			documentSelector,
			// Lambda for MainThread RPC.
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerCodeActionProvider(
					handle,
					selectorDtoArray,
					providerSpecificArguments.codeActionOptions.metadataDto,
					providerSpecificArguments.codeActionOptions.displayName,
					extensionIdentifierForRpc!,
					onDidChangeCodeActionsEventHandle, // Pass the (currently undefined) event handle.
				),
			codeActionProviderSpecificArguments, // Pass specific arguments.
			extensionIdentifier,
		);
	}

	// --- Placeholder for other $register*Provider methods ---
	// TODO: Systematically implement ALL other $register*Provider methods from VscodeExtHostLanguageFeaturesShape.
	// Each implementation will follow a similar pattern to the ones above:
	// 1. Determine any provider-specific options or metadata (e.g., trigger characters for SignatureHelpProvider).
	// 2. Handle any provider-specific `onDidChange*` events:
	//    - Check if the provider instance has the event property (e.g., `provider.onDidChangeFoldingRanges`).
	//    - If it exists, generate a unique event handle (e.g., using `++this.#providerHandlePool`).
	//    - Store this event handle with the registration entry.
	//    - Log a warning if full event propagation is not yet implemented.
	//    - (Future) Subscribe to the event and implement RPC calls to notify MainThread when it fires.
	// 3. Call `this._registerProviderOnMainThread(...)` with:
	//    - The correct provider type string (e.g., "Declaration", "DocumentFormattingEdit").
	//    - The provider instance and document selector.
	//    - A lambda function that calls the corresponding `$register<Feature>Provider` method
	//      on the `VscodeMainThreadLanguageFeaturesShape` proxy. This lambda will receive the
	//      handle, selector DTO, any specific DTOs for options/metadata, and the extension ID,
	//      and must pass them correctly to the proxy method.
	//    - The extracted provider-specific options/metadata (including event handles) for local storage
	//      and for use in the RPC call lambda if needed for DTO construction.
	//    - The `extensionIdentifier` of the registering extension.

	// Example structure for a missing registration method:
	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerDeclarationProvider} */
	public $registerDeclarationProvider(
		documentSelector: DocumentSelector,
		providerInstance: DeclarationProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<DeclarationProvider>(
			"Declaration",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerDeclarationProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerImplementationProvider} */
	public $registerImplementationProvider(
		documentSelector: DocumentSelector,
		providerInstance: ImplementationProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<ImplementationProvider>(
			"Implementation",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerImplementationProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerTypeDefinitionProvider} */
	public $registerTypeDefinitionProvider(
		documentSelector: DocumentSelector,
		providerInstance: TypeDefinitionProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<TypeDefinitionProvider>(
			"TypeDefinition",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerTypeDefinitionProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerDocumentFormattingEditProvider} */
	public $registerDocumentFormattingEditProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentFormattingEditProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// The MainThread protocol might require a displayName for the provider.
		// Attempt to get it from the extension identifier, or use the ID as a fallback.
		const providerDisplayName =
			(extensionIdentifier as any).displayName ||
			(extensionIdentifier as any).name ||
			extensionIdentifier.value;
		return this._registerProviderOnMainThread<DocumentFormattingEditProvider>(
			"DocumentFormattingEdit",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				// The RPC call might take a displayName.
				rpcProxy.$registerDocumentFormattingEditProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
					providerDisplayName,
				),
			undefined, // No specific arguments stored other than what's passed to RPC.
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerDocumentRangeFormattingEditProvider} */
	public $registerDocumentRangeFormattingEditProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentRangeFormattingEditProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		const providerDisplayName =
			(extensionIdentifier as any).displayName ||
			(extensionIdentifier as any).name ||
			extensionIdentifier.value;
		// Some range formatters might support formatting multiple ranges at once.
		// This capability might be part of the protocol, check if `providerInstance.provideDocumentRangesFormattingEdits` exists.
		const canFormatMultipleRanges =
			typeof (providerInstance as any)
				.provideDocumentRangesFormattingEdits === "function";
		const rangeFormattingProviderSpecificArguments = {
			canFormatMultipleRanges: canFormatMultipleRanges,
		};

		return this._registerProviderOnMainThread<DocumentRangeFormattingEditProvider>(
			"DocumentRangeFormattingEdit",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerDocumentRangeFormattingEditProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
					providerDisplayName,
					providerSpecificArguments.canFormatMultipleRanges, // Pass capability flag.
				),
			rangeFormattingProviderSpecificArguments,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerOnTypeFormattingEditProvider} */
	public $registerOnTypeFormattingEditProvider(
		documentSelector: DocumentSelector,
		providerInstance: OnTypeFormattingEditProvider,
		triggerCharacters: string[], // First trigger character and other trigger characters.
		options: OnTypeFormattingEditProviderOptions | undefined, // VS Code API options, might be undefined.
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// The MainThread protocol might expect specific options structure for trigger characters.
		// Combine triggerCharacters and options for storage and DTO construction.
		// This is a simplification; the actual DTO might need `firstTriggerCharacter` and `moreTriggerCharacters` separated.
		const onTypeFormattingProviderSpecificArguments = {
			triggerCharacters: triggerCharacters,
			// Spread options if they exist; otherwise, it's just trigger characters.
			...(options || {}),
		};

		return this._registerProviderOnMainThread<OnTypeFormattingEditProvider>(
			"OnTypeFormattingEdit",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				// The DTO for options might need specific structuring based on protocol.
				// Assuming `providerSpecificArguments.triggerCharacters` is what the RPC expects here.
				rpcProxy.$registerOnTypeFormattingEditProvider(
					handle,
					selectorDtoArray,
					providerSpecificArguments.triggerCharacters,
					extensionIdentifierForRpc!,
				),
			onTypeFormattingProviderSpecificArguments,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerDocumentHighlightProvider} */
	public $registerDocumentHighlightProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentHighlightProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<DocumentHighlightProvider>(
			"DocumentHighlight",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerDocumentHighlightProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerDocumentLinkProvider} */
	public $registerDocumentLinkProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentLinkProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Check if the provider supports resolving document links.
		const supportsResolve: boolean =
			typeof providerInstance.resolveDocumentLink === "function";
		const linkProviderSpecificArguments = {
			supportsResolve: supportsResolve,
		};

		return this._registerProviderOnMainThread<DocumentLinkProvider>(
			"DocumentLink",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerDocumentLinkProvider(
					handle,
					selectorDtoArray,
					providerSpecificArguments.supportsResolve, // Pass capability flag.
					extensionIdentifierForRpc!,
				),
			linkProviderSpecificArguments,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerDocumentColorProvider} */
	public $registerDocumentColorProvider(
		documentSelector: DocumentSelector,
		providerInstance: DocumentColorProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<DocumentColorProvider>(
			"DocumentColor",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerDocumentColorProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerFoldingRangeProvider} */
	public $registerFoldingRangeProvider(
		documentSelector: DocumentSelector,
		providerInstance: FoldingRangeProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// TODO: Implement full handling of `provider.onDidChangeFoldingRanges` event.
		const eventHandleForDidChangeFoldingRanges: number | undefined =
			typeof providerInstance.onDidChangeFoldingRanges === "function"
				? ++this.#providerHandlePool
				: undefined;
		if (eventHandleForDidChangeFoldingRanges) {
			this._logWarnOnce(
				`onDidChangeFoldingRanges event detected for FoldingRangeProvider (Ext: ${extensionIdentifier.value}). ` +
					`Event propagation to MainThread is STUBBED. Event Handle: ${eventHandleForDidChangeFoldingRanges}.`,
			);
		}
		// Metadata for storage and potentially for DTO (if protocol requires it within args).
		// The `extensionId` in `FoldingRangeProviderMetadataDto` for RPC is usually passed as a separate param.
		const foldingRangeProviderMetadata: FoldingRangeProviderMetadataDto = {
			onDidChangeFoldingRangesEventHandle:
				eventHandleForDidChangeFoldingRanges,
			// The protocol `FoldingRangeProviderMetadataDto` itself doesn't typically include `extensionId`.
			// `extensionId` is passed as a direct argument to the MainThread RPC method.
			// This `extensionId` here is if the DTO structure itself needs it.
			// However, `this._convertApiArgToInternal(extensionIdentifier)` is likely incorrect if the DTO isn't designed for it.
			// Storing the event handle is the primary purpose here.
		};
		const foldingSpecificArguments = {
			onDidChangeFoldingRangesEventHandle:
				eventHandleForDidChangeFoldingRanges,
		};

		return this._registerProviderOnMainThread<FoldingRangeProvider>(
			"FoldingRange",
			providerInstance,
			documentSelector,
			// The `extensionIdentifierForRpc` is passed directly to the proxy method.
			// `providerSpecificArguments.onDidChangeFoldingRangesEventHandle` is used for the event handle.
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerFoldingRangeProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!, // This is the ExtensionIdentifier object.
					providerSpecificArguments.onDidChangeFoldingRangesEventHandle,
				),
			foldingSpecificArguments, // Store the event handle.
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerReferenceProvider} */
	public $registerReferenceProvider(
		documentSelector: DocumentSelector,
		providerInstance: ReferenceProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<ReferenceProvider>(
			"Reference",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerReferenceProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerRenameProvider} */
	public $registerRenameProvider(
		documentSelector: DocumentSelector,
		providerInstance: RenameProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Check if the provider supports the `prepareRename` step.
		const supportsResolveLocation: boolean =
			typeof providerInstance.prepareRename === "function";
		const renameProviderSpecificArguments = {
			supportsResolveLocation: supportsResolveLocation,
		};

		return this._registerProviderOnMainThread<RenameProvider>(
			"Rename",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerRenameProvider(
					handle,
					selectorDtoArray,
					providerSpecificArguments.supportsResolveLocation, // Pass capability flag.
					extensionIdentifierForRpc!,
				),
			renameProviderSpecificArguments,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerSignatureHelpProvider} */
	public $registerSignatureHelpProvider(
		documentSelector: DocumentSelector,
		providerInstance: SignatureHelpProvider,
		// Metadata can be just trigger characters array or a full metadata object.
		providerMetadataOrTriggerChars:
			| string[]
			| VscodeSignatureHelpProviderMetadata
			| undefined,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Convert the API metadata/trigger chars to the DTO form.
		const signatureHelpMetadataDto:
			| SignatureHelpProviderMetadataDto
			| undefined =
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
		// Arguments for storage and DTO.
		const signatureHelpProviderSpecificArguments = {
			metadataDto: signatureHelpMetadataDto,
		};

		return this._registerProviderOnMainThread<SignatureHelpProvider>(
			"SignatureHelp",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerSignatureHelpProvider(
					handle,
					selectorDtoArray,
					providerSpecificArguments.metadataDto, // Pass the metadata DTO.
					extensionIdentifierForRpc!,
				),
			signatureHelpProviderSpecificArguments,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerWorkspaceSymbolProvider} */
	public $registerWorkspaceSymbolProvider(
		// Note: WorkspaceSymbolProvider does not take a DocumentSelector; it's workspace-wide.
		providerInstance: WorkspaceSymbolProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Check if the provider supports resolving workspace symbols.
		const workspaceSymbolProviderMetadata: WorkspaceSymbolProviderMetadataDto =
			{
				supportsResolve:
					typeof providerInstance.resolveWorkspaceSymbol ===
					"function",
			};

		// For workspace-wide providers, the selector is `null`.
		// The `mainThreadRegisterRpcCallLambda` will receive an empty `selectorDtoArray`.
		return this._registerProviderOnMainThread<WorkspaceSymbolProvider>(
			"WorkspaceSymbol",
			providerInstance,
			null, // No document selector for workspace symbol provider.
			(
				rpcProxy,
				handle,
				_emptySelectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerWorkspaceSymbolProvider(
					handle,
					providerSpecificArguments as WorkspaceSymbolProviderMetadataDto, // Pass metadata.
					extensionIdentifierForRpc!,
				),
			workspaceSymbolProviderMetadata, // Store metadata.
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerDocumentSymbolProvider} */
	public $registerDocumentSymbolProvider(
		documentSelector: DocumentSelector,
		providerInstance: VscodeDocumentSymbolProvider, // Ensure this is the correct API type
		providerMetadata: VscodeDocumentSymbolProviderMetadata | undefined,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// Determine the label for the provider, often used in UI.
		const providerLabel: string =
			providerMetadata?.label ||
			(extensionIdentifier as any).displayName ||
			(extensionIdentifier as any).name ||
			extensionIdentifier.value;
		const documentSymbolProviderMetadataDto: DocumentSymbolProviderMetadataDto =
			{ label: providerLabel };

		return this._registerProviderOnMainThread<VscodeDocumentSymbolProvider>(
			"DocumentSymbol",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerDocumentSymbolProvider(
					handle,
					selectorDtoArray,
					providerSpecificArguments as DocumentSymbolProviderMetadataDto, // Pass metadata DTO.
					extensionIdentifierForRpc!,
				),
			documentSymbolProviderMetadataDto,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerSelectionRangeProvider} */
	public $registerSelectionRangeProvider(
		documentSelector: DocumentSelector,
		providerInstance: SelectionRangeProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<SelectionRangeProvider>(
			"SelectionRange",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerSelectionRangeProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerCallHierarchyProvider} */
	public $registerCallHierarchyProvider(
		documentSelector: DocumentSelector,
		providerInstance: CallHierarchyProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<CallHierarchyProvider>(
			"CallHierarchy",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerCallHierarchyProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerTypeHierarchyProvider} */
	public $registerTypeHierarchyProvider(
		documentSelector: DocumentSelector,
		providerInstance: TypeHierarchyProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<TypeHierarchyProvider>(
			"TypeHierarchy",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerTypeHierarchyProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerLinkedEditingRangeProvider} */
	public $registerLinkedEditingRangeProvider(
		documentSelector: DocumentSelector,
		providerInstance: LinkedEditingRangeProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		return this._registerProviderOnMainThread<LinkedEditingRangeProvider>(
			"LinkedEditingRange",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				_providerSpecificArguments,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerLinkedEditingRangeProvider(
					handle,
					selectorDtoArray,
					extensionIdentifierForRpc!,
				),
			undefined,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$registerInlayHintsProvider} */
	public $registerInlayHintsProvider(
		documentSelector: DocumentSelector,
		providerInstance: InlayHintsProvider,
		extensionIdentifier: ExtensionIdentifier,
	): Promise<number> {
		// TODO: Implement full handling of `provider.onDidChangeInlayHints` event.
		const eventHandleForDidChangeInlayHints: number | undefined =
			typeof providerInstance.onDidChangeInlayHints === "function"
				? ++this.#providerHandlePool
				: undefined;
		if (eventHandleForDidChangeInlayHints) {
			this._logWarnOnce(
				`onDidChangeInlayHints event detected for InlayHintsProvider (Ext: ${extensionIdentifier.value}). ` +
					`Event propagation to MainThread is STUBBED. Event Handle: ${eventHandleForDidChangeInlayHints}.`,
			);
		}
		// Determine display label for the provider.
		const providerLabel: string =
			(extensionIdentifier as any).displayName ||
			(extensionIdentifier as any).name ||
			extensionIdentifier.value;
		// Arguments for storage and DTO construction.
		const inlayHintsProviderSpecificArguments = {
			supportsResolve:
				typeof providerInstance.resolveInlayHint === "function",
			onDidChangeInlayHintsEventHandle: eventHandleForDidChangeInlayHints,
			label: providerLabel,
			// Note: `extensionId` is passed separately to the RPC proxy call,
			// but if the DTO structure for metadata itself needs it, it would be here.
			// For now, the `extensionIdentifierForRpc` in the lambda is used.
		};

		return this._registerProviderOnMainThread<InlayHintsProvider>(
			"InlayHints",
			providerInstance,
			documentSelector,
			(
				rpcProxy,
				handle,
				selectorDtoArray,
				providerSpecificArgumentsFromStorage,
				extensionIdentifierForRpc,
			) =>
				rpcProxy.$registerInlayHintsProvider(
					handle,
					selectorDtoArray,
					providerSpecificArgumentsFromStorage.supportsResolve,
					providerSpecificArgumentsFromStorage.onDidChangeInlayHintsEventHandle,
					providerSpecificArgumentsFromStorage.label,
					extensionIdentifierForRpc!, // This is the ExtensionIdentifier object.
				),
			inlayHintsProviderSpecificArguments,
			extensionIdentifier,
		);
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$unregister} */
	public async $unregister(
		// The unique handle of the provider registration to unregister.
		providerHandle: number,
	): Promise<void> {
		this._logDebug(
			`RPC method $unregister called for Provider Handle: ${providerHandle}`,
		);

		// Attempt to retrieve the registration details for logging before deletion.
		const registrationEntry = this.#providerStore.get(providerHandle);

		// Delete the provider registration from the local store.
		if (this.#providerStore.delete(providerHandle)) {
			this._logDebug(
				`Successfully locally unregistered provider (Handle: ${providerHandle}, Type: ${registrationEntry?.type}, Ext: ${registrationEntry?.extensionId.value})`,
			);
			// TODO: If the provider registration involved an `onDidChange*` event subscription
			// (e.g., stored in `registrationEntry.codeLensEventHandle`), ensure that any
			// resources related to that event (like an Emitter subscription or a Disposable)
			// are properly disposed of here to prevent memory leaks.
		} else {
			// Log a warning if no local registration was found for the given handle.
			this._logWarn(
				`Attempted to unregister a provider with Handle ${providerHandle}, but no such registration was found locally. ` +
					`This might indicate a desynchronization or an attempt to unregister an already unregistered provider.`,
			);
		}

		// Check if the RPC proxy to MainThreadLanguageFeatures is available.
		if (!this.#mainThreadLanguageFeaturesProxy) {
			this._logError(
				`Cannot send unregister request for provider (Handle: ${providerHandle}) to MainThread: ` +
					`MainThreadLanguageFeatures RPC proxy is unavailable. The provider will remain registered on the MainThread.`,
			);
			// Do not throw from unregister if proxy is missing; just log and fail to notify MainThread.
			// The local unregistration has already occurred.
			return;
		}

		try {
			// Make the RPC call to the MainThread to unregister the provider there.
			// The MainThread protocol uses a generic `$unregister(handle)` call.
			await this.#mainThreadLanguageFeaturesProxy.$unregister(
				providerHandle,
			);
			this._logDebug(
				`Unregistration request successfully sent to MainThread for Provider Handle ${providerHandle}.`,
			);
		} catch (error: any) {
			// Log the error if the RPC call to unregister on MainThread fails.
			// Don't rethrow, as unregistration failure on MainThread is usually not critical enough
			// to break the extension, and local unregistration has succeeded.
			const refinedError = refineErrorForShim(
				error,
				this._logService,
				`$unregisterProvider RPC Call (Handle: ${providerHandle})`, // Context for error.
			);
			this._logError(
				`Failed to send unregister request for Handle ${providerHandle} to MainThread via RPC: ${refinedError.message}`,
			);
		}
	}

	// --- Provider Execution Methods (Called BY Mountain/MainThread via RPC as part of VscodeExtHostLanguageFeaturesShape) ---

	/**
	 * Internal helper method to retrieve a registered provider instance and a specific method from it.
	 * This method validates the provider handle and checks if the provider type matches the expected type
	 * for the operation being performed. It also ensures the requested method exists on the provider.
	 *
	 * @template ProviderInterface - The expected interface type of the provider (e.g., `HoverProvider`).
	 * @template MethodName - The name of the method to retrieve from the provider (e.g., `"provideHover"`).
	 * @param providerHandle - The numerical handle of the provider registration.
	 * @param methodNameString - The string name of the method to retrieve from the provider instance.
	 * @param expectedProviderTypeString - A string descriptor for the expected provider type (e.g., "Hover"), used for logging and error messages.
	 * @returns An object containing the `provider` instance, the `method` function, and the `registration` entry,
	 *          or `null` if the provider is not found, the type mismatches, or the method is missing.
	 */
	private _getProviderAndMethodInternal<
		ProviderInterface,
		MethodKey extends keyof ProviderInterface,
	>(
		// The unique handle identifying the provider registration.
		providerHandle: number,
		// The name of the method to be called on the provider (e.g., 'provideHover').
		methodNameString: MethodKey,
		// A string describing the expected type of provider (e.g., "Hover") for error messages.
		expectedProviderTypeString: string,
	): {
		provider: ProviderInterface; // The retrieved provider instance.
		method: ProviderInterface[MethodKey]; // The specific method function from the provider.
		registration: ProviderRegistrationEntry; // The full registration entry.
	} | null {
		// Retrieve the registration entry from the local store using the handle.
		const registrationEntry = this.#providerStore.get(providerHandle);

		// If no registration is found for the given handle, log an error and return null.
		if (!registrationEntry) {
			this._logError(
				`Provider execution failed: No registration found for Handle ${providerHandle}. ` +
					`Expected provider type: ${expectedProviderTypeString}.`,
			);
			return null;
		}

		// Check if the registered provider's type matches the expected type for this operation.
		if (registrationEntry.type !== expectedProviderTypeString) {
			this._logError(
				`Provider execution failed: Handle ${providerHandle} corresponds to a '${registrationEntry.type}' provider, ` +
					`but a '${expectedProviderTypeString}' provider was expected for method '${String(methodNameString)}'.`,
			);
			return null;
		}

		// Cast the stored provider to the expected interface type.
		const providerInstance =
			registrationEntry.provider as ProviderInterface;

		// Check if the provider instance exists and if the required method is a function on it.
		if (
			!providerInstance ||
			typeof providerInstance[methodNameString] !== "function"
		) {
			this._logError(
				`Provider execution failed: ${expectedProviderTypeString}Provider (Handle ${providerHandle}, Ext: ${registrationEntry.extensionId.value}) ` +
					`or its method '${String(methodNameString)}' is missing or not a function.`,
			);
			return null;
		}

		// If all checks pass, return the provider, method, and registration entry.
		return {
			provider: providerInstance,
			method: providerInstance[
				methodNameString
			] as ProviderInterface[MethodKey],
			registration: registrationEntry,
		};
	}

	/**
	 * Internal helper method to retrieve a `vscode.TextDocument` instance from URI components
	 * received via an RPC call from the MainThread.
	 *
	 * @param uriComponentsDto - The URI components DTO (Data Transfer Object) from the RPC call.
	 *                           This typically includes scheme, authority, path, etc.
	 * @returns The corresponding `vscode.TextDocument` instance if found and the URI is valid,
	 *          or `null` if the URI components are invalid, the URI cannot be revived,
	 *          or the document is not found in the `CocoonDocumentService` cache.
	 */
	private _getTextDocumentFromRpc(
		// The URI components DTO received from MainThread.
		uriComponentsDto: VSCodeInternalUriComponents | undefined,
	): TextDocument | null {
		// Check if the URI components DTO is provided.
		if (!uriComponentsDto) {
			this._logError(
				"Cannot get TextDocument for provider execution: URI components DTO is undefined.",
			);
			return null;
		}

		// Revive the URI components DTO into a `vscode.Uri` (API type) instance.
		// This uses the `_reviveApiArgument` utility from `BaseCocoonShim`.
		const revivedVscodeApiUri =
			this._reviveApiArgument<VscodeApiUri>(uriComponentsDto);

		// If URI revival fails, log an error and return null.
		if (!revivedVscodeApiUri) {
			this._logError(
				"Failed to revive vscode.Uri from DTO for _getTextDocumentFromRpc. URI Components DTO:",
				uriComponentsDto,
			);
			return null;
		}

		// Attempt to retrieve the document data from the `CocoonDocumentService` using the revived URI.
		const documentData =
			this.#extHostDocuments.getDocumentData(revivedVscodeApiUri);

		// If document data or the document itself is not found, log an error and return null.
		if (!documentData?.document) {
			this._logError(
				`TextDocument not found in local cache for provider execution. URI='${revivedVscodeApiUri.toString()}'. ` +
					`Ensure the document is opened and its content has been synced to the Extension Host.`,
			);
			return null;
		}

		// Return the found TextDocument.
		return documentData.document;
	}

	/**
	 * Internal helper method to resolve a CancellationToken DTO received from the MainThread
	 * into an actual `CancellationToken` instance using the `CancellationTokenRegistry`.
	 * The caller of this method (e.g., a `$provide*` method) is responsible for adding
	 * the returned disposable (which manages the lifecycle of the token source in the registry)
	 * to its operation-specific `DisposableStore`. This ensures that the token source is
	 * released from the registry when the operation completes or is cancelled.
	 *
	 * @param cancellationTokenDto - The DTO for the CancellationToken received from the MainThread.
	 *                               This DTO should typically contain a numeric `id` (tokenId)
	 *                               that identifies the corresponding CancellationTokenSource on the MainThread.
	 *                               It can be an object `{ id: number }` or just the number itself.
	 * @param operationScopedDisposables - The `DisposableStore` specific to the current provider operation.
	 *                                     The disposable for the obtained token will be added to this store.
	 * @returns A `CancellationToken` instance linked to the MainThread's request if a valid tokenId
	 *          is provided and the registry is available; otherwise, `CancellationToken.None`.
	 */
	private _resolveTokenFromDto(
		// The DTO for the CancellationToken, can be { id: number } or just number.
		cancellationTokenDto: { id?: number } | number | undefined,
		// DisposableStore for the current operation to manage the token's lifecycle.
		operationScopedDisposables: DisposableStore,
	): CancellationToken {
		// Extract the tokenId from the DTO.
		const tokenId =
			typeof cancellationTokenDto === "number"
				? cancellationTokenDto
				: cancellationTokenDto?.id;

		// Check if a valid, positive tokenId is available.
		if (tokenId && typeof tokenId === "number" && tokenId > 0) {
			// Check if the CancellationTokenRegistry is available (it should be, via constructor).
			if (!this.#cancellationTokenRegistry) {
				this._logError(
					"[ShimLanguageFeatures] CancellationTokenRegistry is not available/initialized. " +
						"Cannot link cancellation token from MainThread. Using CancellationToken.None.",
				);
				return CancellationToken.None; // Fallback to non-cancellable token.
			}

			try {
				// Obtain the token and its associated disposable from the registry.
				const { token, disposable } =
					this.#cancellationTokenRegistry.obtainTokenAndDisposable(
						tokenId,
					);
				// Add the disposable to the operation's disposable store.
				// This ensures that `registry.releaseToken(tokenId)` is called when `operationScopedDisposables` is disposed.
				operationScopedDisposables.add(disposable);
				this._logService?.trace(
					`[ShimLanguageFeatures] Obtained CancellationToken for tokenId: ${tokenId}. ` +
						`Initial isCancellationRequested: ${token.isCancellationRequested}`,
				);
				return token; // Return the actual, potentially cancellable token.
			} catch (error) {
				this._logError(
					`[ShimLanguageFeatures] Error obtaining CancellationToken for tokenId ${tokenId} from registry:`,
					error,
				);
				return CancellationToken.None; // Fallback on error.
			}
		}

		// If no valid tokenId is found, log a trace message and return a non-cancellable token.
		this._logService?.trace(
			"[ShimLanguageFeatures] Invalid or missing tokenId in cancellationTokenDto. Using CancellationToken.None.",
		);
		return CancellationToken.None; // Default to a non-cancellable token.
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideHover} */
	public async $provideHover(
		// Handle for the registered HoverProvider.
		providerHandle: number,
		// URI components of the document for which hover is requested.
		uriComponentsDto: VSCodeInternalUriComponents,
		// DTO of the position in the document.
		positionDto: IPosition,
		// DTO for the CancellationToken from MainThread.
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<VscodeHover | undefined> {
		// Returns a promise of VscodeHover (API type) or undefined.
		// Create a DisposableStore to manage resources for this specific operation,
		// primarily the CancellationToken obtained from the registry.
		const operationScopedDisposables = new DisposableStore();
		try {
			// Retrieve the HoverProvider instance and its `provideHover` method.
			const providerInfo = this._getProviderAndMethodInternal<
				HoverProvider,
				"provideHover"
			>(providerHandle, "provideHover", "Hover");
			// If provider or method is not found, return undefined.
			if (!providerInfo) {
				return undefined;
			}

			// Get the TextDocument instance from the URI components.
			const documentInstance =
				this._getTextDocumentFromRpc(uriComponentsDto);
			// Revive the position DTO to a vscode.Position API type.
			const positionInstance =
				this._reviveApiArgument<VscodePosition>(positionDto);

			// If document or position is invalid, log a warning and return undefined.
			if (!documentInstance || !positionInstance) {
				this._logWarn(
					`$provideHover (Handle ${providerHandle}): Failed to get TextDocument or Position. ` +
						`Document valid: ${!!documentInstance}, Position valid: ${!!positionInstance}`,
				);
				return undefined;
			}

			// Resolve the CancellationToken from the DTO using the registry.
			const cancellationToken = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationScopedDisposables,
			);

			// Call the provider's `provideHover` method.
			const hoverResult = await (providerInfo.method as Function).call(
				providerInfo.provider,
				documentInstance,
				positionInstance,
				cancellationToken,
			);

			// TODO: CRITICAL - Marshal the `VscodeHover` result to its DTO form using a comprehensive
			// `CocoonTypeConverters.Hover.fromApi(hoverResult)` function before returning over RPC.
			// The current `_convertApiArgToInternal` is a generic placeholder and likely insufficient.
			if (hoverResult) {
				this._logDebug(
					`$provideHover (Handle ${providerHandle}) returned a result. This result needs proper marshalling to its DTO form.`,
				);
			}
			// For now, use the generic marshaller.
			return this._convertApiArgToInternal(hoverResult);
		} catch (error: any) {
			// Log any error occurring during provider execution.
			const providerInfoForError =
				this.#providerStore.get(providerHandle); // Re-fetch for logging context.
			this._logError(
				`Error executing HoverProvider.provideHover (Handle ${providerHandle}, Ext: ${providerInfoForError?.extensionId.value || "unknown_extension"}):`,
				error,
			);
			// API expects undefined on error or if no result is provided.
			return undefined;
		} finally {
			// Dispose of the operation-specific resources (e.g., release CancellationTokenSource from registry).
			operationScopedDisposables.dispose();
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideCompletionItems} */
	public async $provideCompletionItems(
		// Handle for the registered CompletionItemProvider.
		providerHandle: number,
		// URI components of the document.
		uriComponentsDto: VSCodeInternalUriComponents,
		// DTO of the position in the document.
		positionDto: IPosition,
		// DTO of the completion context (trigger kind, character).
		completionContextDto: ExtHostCompletionContextDto,
		// DTO for the CancellationToken.
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcSuggestResult | undefined> {
		// Returns a promise of RpcSuggestResult (DTO) or undefined.
		const operationScopedDisposables = new DisposableStore();
		try {
			// Retrieve the CompletionItemProvider and its `provideCompletionItems` method.
			const providerInfo = this._getProviderAndMethodInternal<
				CompletionItemProvider,
				"provideCompletionItems"
			>(providerHandle, "provideCompletionItems", "Completion");
			if (!providerInfo) {
				return undefined;
			}

			// Get TextDocument, revive Position, and convert CompletionContext DTO.
			const documentInstance =
				this._getTextDocumentFromRpc(uriComponentsDto);
			const positionInstance =
				this._reviveApiArgument<VscodePosition>(positionDto);
			// Use placeholder converter for CompletionContext; needs full implementation.
			const completionContextInstance =
				localTypeConverters.CompletionContext.toApiType(
					completionContextDto,
				);

			if (
				!documentInstance ||
				!positionInstance ||
				!completionContextInstance
			) {
				this._logWarn(
					`$provideCompletionItems (Handle ${providerHandle}): Failed to get prerequisites. ` +
						`Doc: ${!!documentInstance}, Pos: ${!!positionInstance}, Ctx: ${!!completionContextInstance}`,
				);
				return undefined;
			}

			// Resolve CancellationToken.
			const cancellationToken = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationScopedDisposables,
			);

			// Call the provider's method. Note VS Code API order: document, position, token, context.
			const completionResult = await (
				providerInfo.method as Function
			).call(
				providerInfo.provider,
				documentInstance,
				positionInstance,
				cancellationToken, // Token is third argument in VS Code API.
				completionContextInstance,
			);

			// TODO: CRITICAL - Marshal `VscodeCompletionList` or `VscodeCompletionItem[]` to `RpcSuggestResult` DTO
			// using a comprehensive `CocoonTypeConverters` module. This involves deep marshalling of each item.
			if (completionResult) {
				const resultCount = Array.isArray(completionResult)
					? completionResult.length
					: (completionResult as VscodeCompletionList).items.length;
				this._logDebug(
					`$provideCompletionItems (Handle ${providerHandle}) returned ${resultCount} items (or a list). Needs proper marshalling to RpcSuggestResult.`,
				);
			}
			// Using generic marshaller as a placeholder.
			return this._convertApiArgToInternal(completionResult) as
				| RpcSuggestResult
				| undefined;
		} catch (error: any) {
			const providerInfoForError =
				this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CompletionItemProvider.provideCompletionItems (Handle ${providerHandle}, Ext: ${providerInfoForError?.extensionId.value || "unknown_extension"}):`,
				error,
			);
			return undefined;
		} finally {
			operationScopedDisposables.dispose();
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$resolveCompletionItem} */
	public async $resolveCompletionItem(
		// Handle for the registered CompletionItemProvider.
		providerHandle: number,
		// DTO of the completion item to resolve.
		completionItemDto: RpcSuggestData,
		// DTO for the CancellationToken.
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcSuggestData | undefined> {
		// Returns resolved RpcSuggestData DTO or original/undefined.
		const operationScopedDisposables = new DisposableStore();
		// Store the revived item in case of error, to return it marshalled.
		let revivedCompletionItemForErrorReturn:
			| VscodeCompletionItem
			| undefined;
		try {
			// Retrieve provider and `resolveCompletionItem` method.
			const providerInfo = this._getProviderAndMethodInternal<
				CompletionItemProvider,
				"resolveCompletionItem"
			>(providerHandle, "resolveCompletionItem", "Completion");

			// If provider or method doesn't exist, VS Code often returns the original (unresolved) item.
			if (!providerInfo?.method) {
				this._logDebug(
					`No resolveCompletionItem method found for Provider Handle ${providerHandle} ` +
						`(Ext: ${providerInfo?.registration.extensionId.value || "unknown_extension"}). Returning original DTO.`,
				);
				return completionItemDto; // Return original DTO if no resolver.
			}

			// TODO: CRITICAL - Full revival of `RpcSuggestData` (DTO) to `VscodeCompletionItem` (API type)
			// using a comprehensive `CocoonTypeConverters` module.
			const completionItemToResolve =
				this._reviveApiArgument<VscodeCompletionItem>(
					completionItemDto,
				);
			revivedCompletionItemForErrorReturn = completionItemToResolve; // Keep for error case.

			if (!completionItemToResolve) {
				this._logError(
					`Failed to revive CompletionItem DTO (RpcSuggestData) for resolveCompletionItem (Handle ${providerHandle}):`,
					completionItemDto,
				);
				return completionItemDto; // Return original DTO on revival failure.
			}

			// Resolve CancellationToken.
			const cancellationToken = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationScopedDisposables,
			);

			// Call the provider's `resolveCompletionItem` method.
			const resolvedCompletionItem = await (
				providerInfo.method as Function
			).call(
				providerInfo.provider,
				completionItemToResolve,
				cancellationToken,
			);

			// TODO: CRITICAL - Marshal the resolved `VscodeCompletionItem` (or original if resolve returned null/undefined)
			// back to `RpcSuggestData` DTO using `CocoonTypeConverters`.
			this._logDebug(
				`$resolveCompletionItem (Handle ${providerHandle}) returned a result. Needs proper marshalling.`,
			);
			// If `resolveCompletionItem` returns `null` or `undefined`, the original item is typically used.
			// Marshal the resolved item, or fallback to marshalling the original un-resolved (but revived) item.
			return this._convertApiArgToInternal(
				resolvedCompletionItem || completionItemToResolve,
			);
		} catch (error: any) {
			const providerInfoForError =
				this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CompletionItemProvider.resolveCompletionItem (Handle ${providerHandle}, Ext: ${providerInfoForError?.extensionId.value || "unknown_extension"}):`,
				error,
			);
			// On error, VS Code might return the original unresolved item.
			// Marshal the revived-but-unresolved item back to DTO.
			return this._convertApiArgToInternal(
				revivedCompletionItemForErrorReturn,
			);
		} finally {
			operationScopedDisposables.dispose();
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideDefinition} */
	public async $provideDefinition(
		// Handle for the registered DefinitionProvider.
		providerHandle: number,
		// URI components of the document.
		uriComponentsDto: VSCodeInternalUriComponents,
		// DTO of the position in the document.
		positionDto: IPosition,
		// DTO for the CancellationToken.
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcLocationLink[] | undefined> {
		// Returns array of RpcLocationLink DTOs or undefined.
		const operationScopedDisposables = new DisposableStore();
		try {
			// Retrieve provider and `provideDefinition` method.
			const providerInfo = this._getProviderAndMethodInternal<
				DefinitionProvider,
				"provideDefinition"
			>(providerHandle, "provideDefinition", "Definition");
			if (!providerInfo) {
				return undefined;
			}

			// Get TextDocument and revive Position.
			const documentInstance =
				this._getTextDocumentFromRpc(uriComponentsDto);
			const positionInstance =
				this._reviveApiArgument<VscodePosition>(positionDto);

			if (!documentInstance || !positionInstance) {
				this._logWarn(
					`$provideDefinition (Handle ${providerHandle}): Failed to get TextDocument or Position. ` +
						`Doc: ${!!documentInstance}, Pos: ${!!positionInstance}`,
				);
				return undefined;
			}

			// Resolve CancellationToken.
			const cancellationToken = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationScopedDisposables,
			);

			// Call provider's method. Result type: VscodeDefinition | VscodeDefinitionLink[]
			// VscodeDefinition can be Location, Location[], LocationLink[], or mixed array.
			const definitionResult = await (
				providerInfo.method as Function
			).call(
				providerInfo.provider,
				documentInstance,
				positionInstance,
				cancellationToken,
			);

			// If no result, return undefined.
			if (!definitionResult) {
				return undefined;
			}

			// Ensure the result is an array for uniform processing.
			const definitionResultArray = Array.isArray(definitionResult)
				? definitionResult
				: [definitionResult];

			// TODO: CRITICAL - Use a robust `CocoonTypeConverters.DefinitionLink.fromApiArray(definitionResultArray)`
			// for marshalling all variants of VscodeDefinition (Location, LocationLink) to `RpcLocationLink[]`.
			// The current `localTypeConverters.DefinitionLink.fromApiTypeMany` is a stub.
			this._logDebug(
				`$provideDefinition (Handle ${providerHandle}) returned ${definitionResultArray.length} result(s). Marshalling to RpcLocationLink[] using local stub.`,
			);
			return localTypeConverters.DefinitionLink.fromApiTypeMany(
				definitionResultArray,
				this,
			);
		} catch (error: any) {
			const providerInfoForError =
				this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing DefinitionProvider.provideDefinition (Handle ${providerHandle}, Ext: ${providerInfoForError?.extensionId.value || "unknown_extension"}):`,
				error,
			);
			return undefined;
		} finally {
			operationScopedDisposables.dispose();
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideCodeLenses} */
	public async $provideCodeLenses(
		// Handle for the registered CodeLensProvider.
		providerHandle: number,
		// URI components of the document.
		uriComponentsDto: VSCodeInternalUriComponents,
		// DTO for the CancellationToken.
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcCodeLensList | undefined> {
		// Returns RpcCodeLensList DTO or undefined.
		const operationScopedDisposables = new DisposableStore();
		try {
			// Retrieve provider and `provideCodeLenses` method.
			const providerInfo = this._getProviderAndMethodInternal<
				CodeLensProvider,
				"provideCodeLenses"
			>(providerHandle, "provideCodeLenses", "CodeLens");
			if (!providerInfo) {
				return undefined;
			}

			// Get TextDocument.
			const documentInstance =
				this._getTextDocumentFromRpc(uriComponentsDto);
			if (!documentInstance) {
				this._logWarn(
					`$provideCodeLenses (Handle ${providerHandle}): Failed to get TextDocument.`,
				);
				return undefined;
			}

			// Resolve CancellationToken.
			const cancellationToken = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationScopedDisposables,
			);

			// Call provider's method.
			const codeLensResultArray = (await (
				providerInfo.method as Function
			).call(
				providerInfo.provider,
				documentInstance,
				cancellationToken,
			)) as VscodeCodeLens[] | undefined;

			// If results exist, marshal them.
			if (codeLensResultArray && codeLensResultArray.length > 0) {
				// TODO: CRITICAL - Use `CocoonTypeConverters.CodeLens.fromApiArray(codeLensResultArray)`
				// for marshalling, especially `VscodeCodeLens.command` to `RpcCommand`.
				const codeLensesDtoArray =
					localTypeConverters.CodeLens.fromApiTypeMany(
						codeLensResultArray,
						this,
					);
				this._logDebug(
					`$provideCodeLenses (Handle ${providerHandle}) returned ${codeLensesDtoArray.length} lenses. Marshalling with local stub.`,
				);
				// The `dispose` property on `RpcCodeLensList` is non-standard in VS Code's typical protocol,
				// but might be used by MainThread for cleanup callbacks if the protocol defines it.
				return {
					lenses: codeLensesDtoArray,
					dispose: () => {
						/* NOP or MainThread-specific cleanup */
					},
				};
			}

			// No code lenses provided.
			return undefined;
		} catch (error: any) {
			const providerInfoForError =
				this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CodeLensProvider.provideCodeLenses (Handle ${providerHandle}, Ext: ${providerInfoForError?.extensionId.value || "unknown_extension"}):`,
				error,
			);
			return undefined;
		} finally {
			operationScopedDisposables.dispose();
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$resolveCodeLens} */
	public async $resolveCodeLens(
		// Handle for the registered CodeLensProvider.
		providerHandle: number,
		// DTO of the CodeLens to resolve.
		codeLensDto: RpcCodeLens,
		// DTO for the CancellationToken.
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcCodeLens | undefined> {
		// Returns resolved RpcCodeLens DTO or original/undefined.
		const operationScopedDisposables = new DisposableStore();
		// Store the revived lens for error return or if resolve returns null.
		let revivedCodeLensForErrorReturn: VscodeCodeLens | undefined;
		try {
			// Retrieve provider and `resolveCodeLens` method.
			const providerInfo = this._getProviderAndMethodInternal<
				CodeLensProvider,
				"resolveCodeLens"
			>(providerHandle, "resolveCodeLens", "CodeLens");

			// If no resolver method on the provider, return the original DTO.
			if (!providerInfo?.method) {
				this._logDebug(
					`No resolveCodeLens method found for Provider Handle ${providerHandle} ` +
						`(Ext: ${providerInfo?.registration.extensionId.value || "unknown_extension"}). Returning original CodeLens DTO.`,
				);
				return codeLensDto;
			}

			// TODO: CRITICAL - Full revival of `RpcCodeLens` DTO to `VscodeCodeLens` (API type)
			// using `CocoonTypeConverters`, especially for `RpcCodeLens.command`.
			const codeLensToResolve =
				this._reviveApiArgument<VscodeCodeLens>(codeLensDto);
			revivedCodeLensForErrorReturn = codeLensToResolve;

			if (!codeLensToResolve) {
				this._logError(
					`Failed to revive CodeLens DTO (RpcCodeLens) for resolveCodeLens (Handle ${providerHandle}):`,
					codeLensDto,
				);
				return codeLensDto; // Return original DTO on revival failure.
			}

			// Resolve CancellationToken.
			const cancellationToken = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationScopedDisposables,
			);

			// Call provider's `resolveCodeLens` method.
			const resolvedCodeLens = await (
				providerInfo.method as Function
			).call(providerInfo.provider, codeLensToResolve, cancellationToken);

			// TODO: CRITICAL - Marshal resolved `VscodeCodeLens` (or original if resolve returns null)
			// back to `RpcCodeLens` DTO using `CocoonTypeConverters`.
			this._logDebug(
				`$resolveCodeLens (Handle ${providerHandle}) returned a result. Marshalling with local stub.`,
			);
			return this._convertApiArgToInternal(
				resolvedCodeLens || codeLensToResolve,
			);
		} catch (error: any) {
			const providerInfoForError =
				this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CodeLensProvider.resolveCodeLens (Handle ${providerHandle}, Ext: ${providerInfoForError?.extensionId.value || "unknown_extension"}):`,
				error,
			);
			// On error, VS Code might return the original unresolved item. Marshal the revived-but-unresolved item.
			return this._convertApiArgToInternal(revivedCodeLensForErrorReturn);
		} finally {
			operationScopedDisposables.dispose();
		}
	}

	/** {@inheritDoc VscodeExtHostLanguageFeaturesShape.$provideCodeActions} */
	public async $provideCodeActions(
		// Handle for the registered CodeActionProvider.
		providerHandle: number,
		// URI components of the document.
		uriComponentsDto: VSCodeInternalUriComponents,
		// DTO of the range in the document for which actions are requested.
		rangeDto: VscodeInternalRange,
		// DTO of the code action context (diagnostics, trigger kind).
		codeActionContextDto: ExtHostCodeActionContextDto,
		// DTO for the CancellationToken.
		cancellationTokenDto: { id?: number } | number | undefined,
	): Promise<RpcCodeActionList | undefined> {
		// Returns RpcCodeActionList DTO or undefined.
		const operationScopedDisposables = new DisposableStore();
		try {
			// Retrieve provider and `provideCodeActions` method.
			const providerInfo = this._getProviderAndMethodInternal<
				CodeActionProvider,
				"provideCodeActions"
			>(providerHandle, "provideCodeActions", "CodeAction");
			if (!providerInfo) {
				return undefined;
			}

			// Get TextDocument, revive Range, and convert CodeActionContext DTO.
			const documentInstance =
				this._getTextDocumentFromRpc(uriComponentsDto);
			// Use specific converter for Range DTO to vscode.Range.
			const rangeInstance =
				localTypeConverters.Range.toApiRange(rangeDto);
			// Use placeholder converter for CodeActionContext; needs full implementation.
			const codeActionContextInstance =
				localTypeConverters.CodeActionContext.toApiType(
					codeActionContextDto,
				);

			if (
				!documentInstance ||
				!rangeInstance ||
				!codeActionContextInstance
			) {
				this._logWarn(
					`$provideCodeActions (Handle ${providerHandle}): Failed to get prerequisites. ` +
						`Doc: ${!!documentInstance}, Range: ${!!rangeInstance}, Ctx: ${!!codeActionContextInstance}`,
				);
				return undefined;
			}

			// Resolve CancellationToken.
			const cancellationToken = this._resolveTokenFromDto(
				cancellationTokenDto,
				operationScopedDisposables,
			);

			// Call provider's method.
			const codeActionResultArray = (await (
				providerInfo.method as Function
			).call(
				providerInfo.provider,
				documentInstance,
				rangeInstance,
				codeActionContextInstance,
				cancellationToken,
			)) as (VscodeCommand | VscodeCodeAction)[] | undefined;

			// If results exist, marshal them.
			if (codeActionResultArray && codeActionResultArray.length > 0) {
				// TODO: CRITICAL - Use `CocoonTypeConverters.CodeAction.fromApiArray(codeActionResultArray)`
				// for marshalling, especially `VscodeCodeAction.edit: WorkspaceEdit` to its DTO.
				const codeActionsDtoArray =
					localTypeConverters.CodeAction.fromApiTypeMany(
						codeActionResultArray,
						this,
					);
				this._logDebug(
					`$provideCodeActions (Handle ${providerHandle}) returned ${codeActionsDtoArray.length} actions. Marshalling with local stub.`,
				);
				// The `dispose` property on `RpcCodeActionList` is non-standard.
				return {
					actions: codeActionsDtoArray,
					dispose: () => {
						/* NOP or MainThread-specific cleanup */
					},
				};
			}

			// No code actions provided.
			return undefined;
		} catch (error: any) {
			const providerInfoForError =
				this.#providerStore.get(providerHandle);
			this._logError(
				`Error executing CodeActionProvider.provideCodeActions (Handle ${providerHandle}, Ext: ${providerInfoForError?.extensionId.value || "unknown_extension"}):`,
				error,
			);
			return undefined;
		} finally {
			operationScopedDisposables.dispose();
		}
	}

	// TODO: Implement ALL other $provide* and $resolve* methods from VscodeExtHostLanguageFeaturesShape.
	// Each implementation will follow a similar pattern to the examples above:
	// 1. Create `operationScopedDisposables = new DisposableStore()`.
	// 2. Call `providerInfo = this._getProviderAndMethodInternal(...)`.
	// 3. Call `documentInstance = this._getTextDocumentFromRpc(...)` (if the provider method takes a document).
	// 4. Revive arguments from DTOs to VS Code API types:
	//    - Use `this._reviveApiArgument<ApiType>(dto)` for simple DTOs (like Position, Range).
	//    - Ensure `localTypeConverters` (or future `CocoonTypeConverters`) has appropriate `toApiType`
	//      methods for complex DTOs (like Context objects).
	// 5. Resolve the CancellationToken: `cancellationToken = this._resolveTokenFromDto(cancellationTokenDto, operationScopedDisposables)`.
	// 6. Call the provider's method within a `try...catch` block.
	// 7. Marshal the result from the provider (VS Code API type) back to its RPC DTO form:
	//    - Use `this._convertApiArgToInternal(apiResult)` for simple API types.
	//    - Ensure `localTypeConverters` (or future `CocoonTypeConverters`) has appropriate `fromApiType`
	//      or `toDto` methods to convert complex API result types (like Hover, CompletionList, WorkspaceEdit)
	//      to their RPC DTOs. This marshalling step is currently the biggest gap due to placeholder converters.
	// 8. `finally { operationScopedDisposables.dispose(); }` to release the CancellationToken.
	//
	// Examples of methods to implement:
	// - Declaration: $provideDeclaration
	// - Implementation: $provideImplementation
	// - Type Definition: $provideTypeDefinition
	// - Formatting: $provideDocumentFormattingEdits, $provideDocumentRangeFormattingEdits, $provideOnTypeFormattingEdits
	// - Highlights: $provideDocumentHighlights
	// - Links: $provideDocumentLinks, $resolveDocumentLink
	// - Colors: $provideDocumentColors, $provideColorPresentations
	// - Folding: $provideFoldingRanges
	// - References: $provideReferences
	// - Rename: $provideRenameEdits, $prepareRename (if applicable)
	// - Signature Help: $provideSignatureHelp
	// - Symbols: $provideWorkspaceSymbols, $resolveWorkspaceSymbol, $provideDocumentSymbols
	// - Selection Range: $provideSelectionRanges
	// - Call Hierarchy: $prepareCallHierarchy, $provideCallHierarchyIncomingCalls, $provideCallHierarchyOutgoingCalls
	// - Type Hierarchy: $prepareTypeHierarchy, $provideTypeHierarchySupertypes, $provideTypeHierarchySubtypes
	// - Linked Editing: $provideLinkedEditingRanges
	// - Inlay Hints: $provideInlayHints, $resolveInlayHint

	/**
	 * Disposes of resources held by this `ShimLanguageFeatures` instance.
	 * This primarily involves clearing the provider store and disposing resources
	 * managed by the base class (like RPC proxy connections).
	 */
	public override dispose(): void {
		// Call `dispose` on the base class (`BaseCocoonShim`).
		// This handles disposing of `_instanceDisposables`, which typically includes
		// cleaning up the RPC proxy and any other disposables registered in the base class.
		super.dispose();

		// Clear all registered language providers from the internal store.
		// This helps in garbage collection by removing references to provider instances.
		this.#providerStore.clear();

		// Note: The `CancellationTokenRegistry` is typically a shared service injected into this class.
		// Therefore, its lifecycle is usually managed externally (e.g., by the main DI container),
		// and this `dispose` method should not dispose of it unless it's exclusively owned.

		this._logInfo(
			"ShimLanguageFeatures disposed: All registered provider stores have been cleared, and base resources are released.",
		);
	}
}
