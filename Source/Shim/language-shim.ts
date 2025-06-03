/*---------------------------------------------------------------------------------------------
 * Cocoon Languages API Shim (language-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.languages` API namespace. Its primary responsibility is to provide
 * the `register<Feature>Provider` methods that extensions use to contribute language-specific
 * functionalities such as hovers, completions, definitions, code actions, formatting, etc.
 *
 * This shim acts as a facade. It receives provider registration requests from extensions
 * (via the `vscode.languages` API object) and delegates the actual registration logic,
 * including communication with the MainThread/Mountain, to an injected `ShimLanguageFeatures`
 * service instance. The `ShimLanguageFeatures` service is responsible for managing the
 * provider store and handling the RPC calls related to provider registration and invocation.
 *
 * Responsibilities:
 * - Providing the public `vscode.languages.register*Provider` methods. Each of these
 *   methods is specific to a particular language feature (e.g., `registerHoverProvider`,
 *   `registerCompletionItemProvider`).
 * - When a provider is registered by an extension:
 *   - This shim calls the corresponding `$register*Provider` method on the injected
 *     `ShimLanguageFeatures` service, passing along the provider instance, its
 *     `DocumentSelector`, any provider-specific options, and the `ExtensionIdentifier`
 *     of the registering extension.
 *   - It receives a numeric handle (or a Promise that resolves to a handle) for the
 *     registration from `ShimLanguageFeatures`.
 *   - It returns a `vscode.Disposable` object to the calling extension. When this
 *     `Disposable` is invoked (i.g., `disposable.dispose()`), it triggers an
 *     unregistration call (`$unregister(handle)`) on `ShimLanguageFeatures`, which
 *     in turn notifies the MainThread if necessary.
 * - Providing stubs or basic implementations for other `vscode.languages` utility
 *   methods like `getLanguages()`, `match()`, and `setTextDocumentsLanguage()`. These
 *   are often simplified for MVP and may require RPC to Mountain for full functionality.
 * - `createDiagnosticCollection` and related diagnostic APIs are typically handled by a
 *   dedicated `DiagnosticsService` (`ShimDiagnosticsService`) and are not directly
 *   implemented by this `Languages` shim, although the `vscode.languages` namespace
 *   might expose them for convenience (this is handled by the main API factory).
 *
 * Key Interactions:
 * - An instance of `ShimLanguages` is typically created by the main API factory provider
 *   in `Cocoon/index.ts`. It forms part of the `vscode` API object that is provided
 *   to each activated extension.
 * - It is injected with, and heavily relies on, an instance of `ShimLanguageFeatures`
 *   to handle the backend logic of provider management.
 * - It uses `vscode.Disposable` (from `vs/base/common/lifecycle` or the API shim)
 *   for managing the lifecycle of provider registrations.
 * - Uses `BaseCocoonShim` for standardized logging.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import { Event as VscodeEvent } from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
// API types from 'vscode' (ensure this path resolves to Cocoon's 'vscode' shim)
import {
	LanguageStatusSeverity,
	type CallHierarchyProvider,
	type CodeActionProvider,
	type CodeActionProviderMetadata,
	type CodeLensProvider,
	type CompletionItemProvider,
	type DeclarationProvider,
	type DefinitionProvider,
	type DocumentColorProvider,
	type DocumentFormattingEditProvider,
	type DocumentHighlightProvider,
	type DocumentLinkProvider,
	type DocumentRangeFormattingEditProvider,
	type DocumentSelector,
	type FoldingRangeProvider,
	type HoverProvider,
	type ImplementationProvider,
	type InlayHintsProvider,
	type LanguageStatusItem,
	type LinkedEditingRangeProvider,
	type OnTypeFormattingEditProvider,
	type OnTypeFormattingEditProviderOptions,
	type ReferenceProvider,
	type RenameProvider,
	type SelectionRangeProvider,
	type SignatureHelpProvider,
	type SignatureHelpProviderMetadata,
	type TextDocument,
	type TypeDefinitionProvider,
	type TypeHierarchyProvider,
	type WorkspaceSymbolProvider,
	// type Diagnostic as VscodeDiagnostic, // Handled by ShimDiagnosticsService
	// type DiagnosticCollection as VscodeDiagnosticCollection, // Handled by ShimDiagnosticsService
	// type Uri as VscodeUri, // If onDidChangeDiagnostics were here
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";
import type { ShimLanguageFeatures } from "./language-features-shim"; // Concrete class for delegation

/**
 * Defines the subset of the `vscode.languages` API namespace that this `ShimLanguages` class implements.
 */
export interface VscodeLanguagesApiSubset {
	registerHoverProvider(
		selector: DocumentSelector,
		provider: HoverProvider,
	): IDisposable;
	registerCompletionItemProvider(
		selector: DocumentSelector,
		provider: CompletionItemProvider,
		...triggerCharacters: string[]
	): IDisposable;
	registerDefinitionProvider(
		selector: DocumentSelector,
		provider: DefinitionProvider,
	): IDisposable;
	registerCodeActionsProvider(
		selector: DocumentSelector,
		provider: CodeActionProvider,
		metadata?: CodeActionProviderMetadata,
	): IDisposable;
	registerCodeLensProvider(
		selector: DocumentSelector,
		provider: CodeLensProvider,
	): IDisposable;
	registerDeclarationProvider(
		selector: DocumentSelector,
		provider: DeclarationProvider,
	): IDisposable;
	registerDocumentFormattingEditProvider(
		selector: DocumentSelector,
		provider: DocumentFormattingEditProvider,
	): IDisposable;
	registerDocumentHighlightProvider(
		selector: DocumentSelector,
		provider: DocumentHighlightProvider,
	): IDisposable;
	registerDocumentLinkProvider(
		selector: DocumentSelector,
		provider: DocumentLinkProvider,
	): IDisposable;
	registerDocumentRangeFormattingEditProvider(
		selector: DocumentSelector,
		provider: DocumentRangeFormattingEditProvider,
	): IDisposable;
	registerOnTypeFormattingEditProvider(
		selector: DocumentSelector,
		provider: OnTypeFormattingEditProvider,
		firstTriggerCharacter: string,
		...moreTriggerCharacters: string[]
	): IDisposable;
	registerOnTypeFormattingEditProvider(
		selector: DocumentSelector,
		provider: OnTypeFormattingEditProvider,
		options: OnTypeFormattingEditProviderOptions,
	): IDisposable; // Newer overload
	registerReferenceProvider(
		selector: DocumentSelector,
		provider: ReferenceProvider,
	): IDisposable;
	registerRenameProvider(
		selector: DocumentSelector,
		provider: RenameProvider,
	): IDisposable;
	registerSignatureHelpProvider(
		selector: DocumentSelector,
		provider: SignatureHelpProvider,
		metadataOrTriggerChars?: SignatureHelpProviderMetadata | string[],
	): IDisposable;
	registerImplementationProvider(
		selector: DocumentSelector,
		provider: ImplementationProvider,
	): IDisposable;
	registerTypeDefinitionProvider(
		selector: DocumentSelector,
		provider: TypeDefinitionProvider,
	): IDisposable;
	registerWorkspaceSymbolProvider(
		provider: WorkspaceSymbolProvider,
	): IDisposable; // No selector
	registerSelectionRangeProvider(
		selector: DocumentSelector,
		provider: SelectionRangeProvider,
	): IDisposable;
	registerCallHierarchyProvider(
		selector: DocumentSelector,
		provider: CallHierarchyProvider,
	): IDisposable;
	registerTypeHierarchyProvider(
		selector: DocumentSelector,
		provider: TypeHierarchyProvider,
	): IDisposable;
	registerLinkedEditingRangeProvider(
		selector: DocumentSelector,
		provider: LinkedEditingRangeProvider,
	): IDisposable;
	registerInlayHintsProvider(
		selector: DocumentSelector,
		provider: InlayHintsProvider,
	): IDisposable;
	registerDocumentColorProvider(
		selector: DocumentSelector,
		provider: DocumentColorProvider,
	): IDisposable;
	registerFoldingRangeProvider(
		selector: DocumentSelector,
		provider: FoldingRangeProvider,
	): IDisposable;

	getLanguages(): Promise<string[]>;
	setTextDocumentsLanguage(
		document: TextDocument,
		languageId: string,
	): Promise<TextDocument>;
	match(selector: DocumentSelector, document: TextDocument): number; // Returns a score
	setLanguageStatus(
		selector: DocumentSelector,
		status: LanguageStatusItem,
	): IDisposable;
	createLanguageStatusItem(
		id: string,
		selector: DocumentSelector,
	): LanguageStatusItem;
}

/**
 * Cocoon's implementation of the `vscode.languages` API namespace.
 * This class acts as a facade, delegating language feature provider registrations
 * to an injected `ShimLanguageFeatures` service, which handles the actual registration
 * logic and communication with the MainThread (Mountain).
 */
export class ShimLanguages
	extends BaseCocoonShim
	implements VscodeLanguagesApiSubset
{
	readonly #languageFeaturesService: ShimLanguageFeatures;
	readonly #extensionContextId: ExtensionIdentifier; // ID of the extension this `vscode.languages` instance is for

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		languageFeaturesService: ShimLanguageFeatures, // Injected dependency
		extensionContextId: ExtensionIdentifier, // Context of the extension calling these APIs
	) {
		super("LanguagesAPI", rpcService, logService); // Service identifier for logging
		this.#languageFeaturesService = languageFeaturesService;
		this.#extensionContextId = extensionContextId;
		this._logInfo(
			`Initialized for extension '${this.#extensionContextId.value}'. All provider registrations will be attributed to this extension.`,
		);

		if (!this.#languageFeaturesService) {
			const criticalErrorMsg =
				"CRITICAL DEPENDENCY MISSING: ShimLanguageFeatures service instance was not provided to ShimLanguages. All language provider registrations will fail.";
			this._logError(criticalErrorMsg);
			// Consider throwing an error here to halt initialization as vscode.languages would be non-functional.
			// throw new Error(criticalErrorMsg);
		}
	}

	/**
	 * This shim primarily delegates to another local ExtHost service (`ShimLanguageFeatures`)
	 * and does not make direct RPC calls itself.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Generic helper method to handle the registration of a language feature provider.
	 * It invokes the asynchronous registration function on `ShimLanguageFeatures`
	 * and returns a `vscode.Disposable` that, when disposed, will unregister the provider.
	 */
	private _handleProviderRegistration<P>(
		providerType: string,
		registrationFn: () => Promise<number>, // Function that returns Promise<handle>
	): IDisposable {
		if (!this.#languageFeaturesService) {
			this._logError(
				`Cannot register ${providerType}Provider for extension '${this.#extensionContextId.value}': ShimLanguageFeatures service is unavailable. Returning NOP disposable.`,
			);
			return Disposable.None; // No-operation disposable
		}

		this._logDebug(
			`API vscode.languages.register${providerType}Provider called by extension '${this.#extensionContextId.value}'. Delegating to ShimLanguageFeatures.`,
		);

		let handle: number = -1; // Sentinel: -1 indicates handle not yet received or registration failed.
		let registrationSucceeded = false;

		const registrationPromise = registrationFn();

		registrationPromise
			.then(
				(resolvedHandle) => {
					handle = resolvedHandle;
					registrationSucceeded = true;
					this._logDebug(
						`${providerType}Provider registration with ShimLanguageFeatures for extension '${this.#extensionContextId.value}' succeeded. Assigned Handle: ${handle}`,
					);
				},
				(registrationError: any) => {
					this._logError(
						`${providerType}Provider registration with ShimLanguageFeatures for extension '${this.#extensionContextId.value}' failed:`,
						registrationError,
					);
				},
			)
			.catch((unhandledPromiseError) => {
				this._logError(
					`Unexpected error in the promise chain for ${providerType}Provider registration (extension '${this.#extensionContextId.value}'):`,
					unhandledPromiseError,
				);
			});

		return new Disposable(() => {
			this._logDebug(
				`Dispose called for ${providerType}Provider registration (extension '${this.#extensionContextId.value}', current Handle: ${handle}, Succeeded: ${registrationSucceeded}).`,
			);
			if (registrationSucceeded && handle !== -1) {
				this.#languageFeaturesService
					.$unregister(handle)
					.catch((e: any) =>
						this._logError(
							`Failed to unregister ${providerType}Provider (Handle: ${handle}) for extension '${this.#extensionContextId.value}' via ShimLanguageFeatures:`,
							refineErrorForShim(
								e,
								this._logService,
								"unregisterProvider",
							),
						),
					);
			} else if (!registrationSucceeded && handle === -1) {
				// If dispose is called before registrationPromise resolved or if it rejected.
				// Ensure that if registration *eventually* succeeds, it still gets unregistered.
				registrationPromise
					.then((resolvedHandleAfterDispose) => {
						if (resolvedHandleAfterDispose !== -1) {
							this._logWarn(
								`Unregistering ${providerType}Provider (Handle: ${resolvedHandleAfterDispose}) for extension '${this.#extensionContextId.value}' post-dispose, as registration completed *after* its disposable was invoked.`,
							);
							this.#languageFeaturesService
								.$unregister(resolvedHandleAfterDispose)
								.catch((e: any) =>
									this._logError(
										`Post-dispose unregistration failed for ${providerType}Provider (Handle: ${resolvedHandleAfterDispose}, Ext: '${this.#extensionContextId.value}'):`,
										e,
									),
								);
						}
					})
					.catch(() => {
						/* Registration ultimately failed, so nothing to unregister. */
					});
			}
		});
	}

	// --- vscode.languages API Provider Registration Methods ---
	// Each delegates to ShimLanguageFeatures, passing `this.#extensionContextId`.

	public registerHoverProvider(
		selector: DocumentSelector,
		provider: HoverProvider,
	): IDisposable {
		return this._handleProviderRegistration("Hover", () =>
			this.#languageFeaturesService.$registerHoverProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerCompletionItemProvider(
		selector: DocumentSelector,
		provider: CompletionItemProvider,
		...triggerCharacters: string[]
	): IDisposable {
		return this._handleProviderRegistration("CompletionItem", () =>
			this.#languageFeaturesService.$registerCompletionItemProvider(
				selector,
				provider,
				triggerCharacters,
				this.#extensionContextId,
			),
		);
	}
	public registerDefinitionProvider(
		selector: DocumentSelector,
		provider: DefinitionProvider,
	): IDisposable {
		return this._handleProviderRegistration("Definition", () =>
			this.#languageFeaturesService.$registerDefinitionProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerCodeActionsProvider(
		selector: DocumentSelector,
		provider: CodeActionProvider,
		metadata?: CodeActionProviderMetadata,
	): IDisposable {
		return this._handleProviderRegistration("CodeActions", () =>
			this.#languageFeaturesService.$registerCodeActionProvider(
				selector,
				provider,
				metadata,
				this.#extensionContextId,
			),
		);
	}
	public registerCodeLensProvider(
		selector: DocumentSelector,
		provider: CodeLensProvider,
	): IDisposable {
		return this._handleProviderRegistration("CodeLens", () =>
			this.#languageFeaturesService.$registerCodeLensProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerDeclarationProvider(
		selector: DocumentSelector,
		provider: DeclarationProvider,
	): IDisposable {
		return this._handleProviderRegistration("Declaration", () =>
			this.#languageFeaturesService.$registerDeclarationProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerDocumentFormattingEditProvider(
		selector: DocumentSelector,
		provider: DocumentFormattingEditProvider,
	): IDisposable {
		return this._handleProviderRegistration("DocumentFormattingEdit", () =>
			this.#languageFeaturesService.$registerDocumentFormattingEditProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerDocumentHighlightProvider(
		selector: DocumentSelector,
		provider: DocumentHighlightProvider,
	): IDisposable {
		return this._handleProviderRegistration("DocumentHighlight", () =>
			this.#languageFeaturesService.$registerDocumentHighlightProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerDocumentLinkProvider(
		selector: DocumentSelector,
		provider: DocumentLinkProvider,
	): IDisposable {
		return this._handleProviderRegistration("DocumentLink", () =>
			this.#languageFeaturesService.$registerDocumentLinkProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerDocumentRangeFormattingEditProvider(
		selector: DocumentSelector,
		provider: DocumentRangeFormattingEditProvider,
	): IDisposable {
		return this._handleProviderRegistration(
			"DocumentRangeFormattingEdit",
			() =>
				this.#languageFeaturesService.$registerDocumentRangeFormattingEditProvider(
					selector,
					provider,
					this.#extensionContextId,
				),
		);
	}
	public registerOnTypeFormattingEditProvider(
		selector: DocumentSelector,
		provider: OnTypeFormattingEditProvider,
		firstTriggerCharacterOrOptions:
			| string
			| OnTypeFormattingEditProviderOptions,
		...moreTriggerCharacters: string[]
	): IDisposable {
		if (typeof firstTriggerCharacterOrOptions === "string") {
			const triggerChars = [
				firstTriggerCharacterOrOptions,
				...moreTriggerCharacters,
			];
			return this._handleProviderRegistration(
				"OnTypeFormattingEdit",
				() =>
					this.#languageFeaturesService.$registerOnTypeFormattingEditProvider(
						selector,
						provider,
						triggerChars,
						this.#extensionContextId,
					),
			);
		} else {
			// It's OnTypeFormattingEditProviderOptions
			return this._handleProviderRegistration(
				"OnTypeFormattingEdit",
				() =>
					this.#languageFeaturesService.$registerOnTypeFormattingEditProvider(
						selector,
						provider,
						firstTriggerCharacterOrOptions,
						this.#extensionContextId,
					),
			);
		}
	}
	public registerReferenceProvider(
		selector: DocumentSelector,
		provider: ReferenceProvider,
	): IDisposable {
		return this._handleProviderRegistration("Reference", () =>
			this.#languageFeaturesService.$registerReferenceProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerRenameProvider(
		selector: DocumentSelector,
		provider: RenameProvider,
	): IDisposable {
		return this._handleProviderRegistration("Rename", () =>
			this.#languageFeaturesService.$registerRenameProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerSignatureHelpProvider(
		selector: DocumentSelector,
		provider: SignatureHelpProvider,
		metadataOrTriggerChars?: SignatureHelpProviderMetadata | string[],
	): IDisposable {
		return this._handleProviderRegistration("SignatureHelp", () =>
			this.#languageFeaturesService.$registerSignatureHelpProvider(
				selector,
				provider,
				metadataOrTriggerChars,
				this.#extensionContextId,
			),
		);
	}
	public registerImplementationProvider(
		selector: DocumentSelector,
		provider: ImplementationProvider,
	): IDisposable {
		return this._handleProviderRegistration("Implementation", () =>
			this.#languageFeaturesService.$registerImplementationProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerTypeDefinitionProvider(
		selector: DocumentSelector,
		provider: TypeDefinitionProvider,
	): IDisposable {
		return this._handleProviderRegistration("TypeDefinition", () =>
			this.#languageFeaturesService.$registerTypeDefinitionProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerWorkspaceSymbolProvider(
		provider: WorkspaceSymbolProvider,
	): IDisposable {
		return this._handleProviderRegistration("WorkspaceSymbol", () =>
			this.#languageFeaturesService.$registerWorkspaceSymbolProvider(
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerSelectionRangeProvider(
		selector: DocumentSelector,
		provider: SelectionRangeProvider,
	): IDisposable {
		return this._handleProviderRegistration("SelectionRange", () =>
			this.#languageFeaturesService.$registerSelectionRangeProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerCallHierarchyProvider(
		selector: DocumentSelector,
		provider: CallHierarchyProvider,
	): IDisposable {
		return this._handleProviderRegistration("CallHierarchy", () =>
			this.#languageFeaturesService.$registerCallHierarchyProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerTypeHierarchyProvider(
		selector: DocumentSelector,
		provider: TypeHierarchyProvider,
	): IDisposable {
		return this._handleProviderRegistration("TypeHierarchy", () =>
			this.#languageFeaturesService.$registerTypeHierarchyProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerLinkedEditingRangeProvider(
		selector: DocumentSelector,
		provider: LinkedEditingRangeProvider,
	): IDisposable {
		return this._handleProviderRegistration("LinkedEditingRange", () =>
			this.#languageFeaturesService.$registerLinkedEditingRangeProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerInlayHintsProvider(
		selector: DocumentSelector,
		provider: InlayHintsProvider,
	): IDisposable {
		return this._handleProviderRegistration("InlayHints", () =>
			this.#languageFeaturesService.$registerInlayHintsProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerDocumentColorProvider(
		selector: DocumentSelector,
		provider: DocumentColorProvider,
	): IDisposable {
		return this._handleProviderRegistration("DocumentColor", () =>
			this.#languageFeaturesService.$registerDocumentColorProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}
	public registerFoldingRangeProvider(
		selector: DocumentSelector,
		provider: FoldingRangeProvider,
	): IDisposable {
		return this._handleProviderRegistration("FoldingRange", () =>
			this.#languageFeaturesService.$registerFoldingRangeProvider(
				selector,
				provider,
				this.#extensionContextId,
			),
		);
	}

	// --- Other vscode.languages utility methods ---

	public async getLanguages(): Promise<string[]> {
		this._logWarnOnce(
			"API STUB: vscode.languages.getLanguages() called. Returning an empty array. " +
				"A full implementation would require an RPC call to MainThread to get all known language identifiers.",
		);
		// TODO: Implement RPC call to `MainThreadLanguages.$getLanguages()` if available.
		return Promise.resolve([]);
	}

	public async setTextDocumentsLanguage(
		document: TextDocument,
		languageId: string,
	): Promise<TextDocument> {
		this._logWarnOnce(
			`API STUB: vscode.languages.setTextDocumentsLanguage() called for URI '${document.uri.toString()}' to LangID '${languageId}'. ` +
				`This is a No-Operation in the current shim. A full implementation would require an RPC call to MainThreadDocuments.`,
		);
		// TODO: Implement RPC call to `MainThreadDocuments.$setLanguageId(document.uri DTO, languageId)`.
		// For now, as a NOP, return the original document instance.
		if (document.languageId !== languageId) {
			this._logWarn(
				`Simulating language change for document ${document.uri.toString()} from '${document.languageId}' to '${languageId}'. ` +
					`Note: The actual document model update depends on MainThread confirmation and subsequent event propagation.`,
			);
			// If direct mutation were possible and safe (which it isn't for API objects):
			// Object.defineProperty(document, 'languageId', { value: languageId, configurable: true, writable: true });
		}
		return document;
	}

	public match(selector: DocumentSelector, document: TextDocument): number {
		this._logDebug(
			`API vscode.languages.match called. Selector: ${JSON.stringify(selector)}, Document URI: ${document.uri.toString()}, LanguageID: ${document.languageId}`,
		);
		// This requires a robust implementation of VS Code's internal document selector matching logic.
		// Simplified approach for MVP:
		if (typeof selector === "string") {
			return document.languageId === selector ? 10 : 0; // Score for exact language match
		}
		if (Array.isArray(selector)) {
			return Math.max(0, ...selector.map((s) => this.match(s, document)));
		}
		if (typeof selector === "object" && selector !== null) {
			let score = 0;
			let matchesAll = true;
			if (selector.language) {
				document.languageId === selector.language
					? (score += 5)
					: (matchesAll = false);
			}
			if (selector.scheme && matchesAll) {
				document.uri.scheme === selector.scheme
					? (score += 5)
					: (matchesAll = false);
			}
			if (selector.pattern && matchesAll) {
				this._logWarnOnce(
					"Pattern matching in vscode.languages.match (LanguageFilter.pattern) is not fully implemented in this shim.",
				);
				if (score > 0 || (!selector.language && !selector.scheme))
					score = Math.max(score, 1);
				else matchesAll = false;
			}
			return matchesAll ? Math.max(score, 1) : 0;
		}
		return 0; // No match
	}

	public setLanguageStatus(
		selector: DocumentSelector,
		status: LanguageStatusItem,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.languages.setLanguageStatus called for selector ${JSON.stringify(selector)}. Status item ID: '${status.id}'. ` +
				`This is a No-Operation in the current shim. Full implementation requires RPC to a MainThreadLanguageStatus service.`,
		);
		return Disposable.None;
	}

	public createLanguageStatusItem(
		id: string,
		selector: DocumentSelector,
	): LanguageStatusItem {
		this._logWarnOnce(
			`API STUB: vscode.languages.createLanguageStatusItem called for id '${id}' and selector ${JSON.stringify(selector)}. ` +
				`Returning a NOP LanguageStatusItem. Full implementation requires RPC to MainThreadLanguageStatus.`,
		);
		const itemEmitter = new VscodeEmitter<void>(); // For the onDidChange event of the NOP item
		const NOP_STATUS_ITEM: LanguageStatusItem = {
			id,
			selector,
			get name() {
				return undefined;
			},
			set name(_value: string | undefined) {
				/* NOP */
			},
			get text() {
				return "";
			},
			set text(_value: string) {
				/* NOP */
			},
			get detail() {
				return undefined;
			},
			set detail(_value: string | undefined) {
				/* NOP */
			},
			get severity() {
				return LanguageStatusSeverity.Information;
			},
			set severity(_value: LanguageStatusSeverity) {
				/* NOP */
			},
			get command() {
				return undefined;
			},
			set command(_value: vscode.Command | undefined) {
				/* NOP */
			},
			get accessibilityInformation() {
				return undefined;
			},
			set accessibilityInformation(
				_value: vscode.AccessibilityInformation | undefined,
			) {
				/* NOP */
			},
			get busy() {
				return false;
			},
			set busy(_value: boolean) {
				/* NOP */
			},
			onDidChange: itemEmitter.event,
			dispose: () => itemEmitter.dispose(),
		};
		return NOP_STATUS_ITEM;
	}

	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		this._logInfo("Disposed.");
	}
}
