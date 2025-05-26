/*---------------------------------------------------------------------------------------------
 * Cocoon Languages API Shim (shims/language-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.languages` API namespace. Its primary responsibility is to provide
 * the `register<Feature>Provider` methods that extensions use to contribute language-specific
 * functionalities like hovers, completions, definitions, code actions, etc.
 *
 * This shim acts as a facade, delegating the actual registration logic (including
 * communication with the MainThread/Mountain) to an injected `ShimLanguageFeatures`
 * service instance. `ShimLanguageFeatures` manages the provider store and RPC calls.
 *
 * Responsibilities:
 * - Providing the public `vscode.languages.register*Provider` methods.
 * - When a provider is registered:
 *   - It calls the corresponding `$register*Provider` method on the `ShimLanguageFeatures` service.
 *   - It receives a numeric handle (or a promise thereof) for the registration from `ShimLanguageFeatures`.
 *   - It returns a `vscode.Disposable` to the calling extension. Disposing this
 *     `Disposable` will trigger an unregistration call (`$unregisterProvider`) on
 *     `ShimLanguageFeatures` using the obtained handle.
 * - Providing stubs or basic implementations for other `vscode.languages` utilities like
 *   `getLanguages()`, `match()`, and `setTextDocumentsLanguage()`.
 * - `createDiagnosticCollection` and related diagnostic APIs are typically handled by a
 *   dedicated `DiagnosticsService`, not directly by this `Languages` shim, although
 *   the `vscode.languages` namespace might expose them for convenience.
 *
 * Key Interactions:
 * - An instance of `ShimLanguages` is typically created by the API factory in `index.ts`
 *   and forms part of the `vscode` API object provided to extensions.
 * - It is injected with and heavily relies on an instance of `ShimLanguageFeatures`.
 * - Uses `vscode.Disposable` for managing the lifecycle of provider registrations.
 * - Uses `BaseCocoonShim` for logging.
 *

 *--------------------------------------------------------------------------------------------*/

// For vscode.Event and vscode.Disposable types
import { Event as VscodeEvent } from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// For URI type if used in any language API methods (e.g., for a hypothetical getDiagnostics here)
// import { URI as VSCodeInternalURI } from "vs/base/common/uri";

// For passing to ShimLanguageFeatures
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
// Import all necessary vscode API types for provider interfaces, selectors, etc.
// These are typically from `../Shim/out/vscode.js` or the `vscode` namespace.
import {
	// Enum for setLanguageStatus
	LanguageStatusSeverity,
	// If supporting the options object variant
	// OnTypeFormattingEditProviderOptions,
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
	// Crucial for all provider registrations
	type DocumentSelector,
	type FoldingRangeProvider,
	type HoverProvider,
	type ImplementationProvider,
	type InlayHintsProvider,
	// For setLanguageStatus
	type LanguageStatusItem,
	type LinkedEditingRangeProvider,
	type OnTypeFormattingEditProvider,
	// For registerOnTypeFormattingEditProvider
	type OnTypeFormattingEditProviderOptions,
	type ReferenceProvider,
	type RenameProvider,
	type SelectionRangeProvider,
	type SignatureHelpProvider,
	type SignatureHelpProviderMetadata,
	// For setTextDocumentsLanguage, match
	type TextDocument,
	type TypeDefinitionProvider,
	type TypeHierarchyProvider,
	// If getDiagnostics were here
	type Diagnostic as VscodeDiagnostic,
	// If createDiagnosticCollection were here
	type DiagnosticCollection as VscodeDiagnosticCollection,
	// For onDidChangeDiagnostics event payload
	type Uri as VscodeUri,
	type WorkspaceSymbolProvider,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";
// Import the concrete ShimLanguageFeatures class and its RPC shape if directly calling its methods.
import type { ShimLanguageFeatures } from "./language-features-shim";

/**
 * Defines the subset of the `vscode.languages` API namespace that this shim implements.
 */
export interface VscodeLanguagesApiSubset {
	// Provider registration methods
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

		// Newer overload
	): IDisposable;

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

		// No selector
	): IDisposable;

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

	// Other utility methods
	getLanguages(): Promise<string[]>;

	setTextDocumentsLanguage(
		document: TextDocument,

		languageId: string,
	): Promise<TextDocument>;

	// Returns a score
	match(selector: DocumentSelector, document: TextDocument): number;

	setLanguageStatus(
		selector: DocumentSelector,

		status: LanguageStatusItem,
	): IDisposable;

	createLanguageStatusItem(
		id: string,

		selector: DocumentSelector,

		// Added from newer API
	): LanguageStatusItem;

	// Diagnostics related APIs are typically on a separate service (e.g., ExtHostDiagnostics)
	// but sometimes exposed via `vscode.languages` for convenience in the API.
	// This shim assumes they are handled by `ShimDiagnosticsService` and exposed elsewhere
	// by the main API factory in `index.ts`.
	// createDiagnosticCollection?(name?: string): VscodeDiagnosticCollection;

	// getDiagnostics?(resource?: VscodeUri): readonly VscodeDiagnostic[];

	// onDidChangeDiagnostics?: VscodeEvent<readonly VscodeUri[]>;
}

/**
 * Cocoon's implementation of the `vscode.languages` API namespace.
 * It delegates provider registrations to an injected `ShimLanguageFeatures` service.
 */
export class ShimLanguages
	extends BaseCocoonShim
	implements VscodeLanguagesApiSubset
{
	// Use the concrete ShimLanguageFeatures type for direct calls to its $register methods.
	readonly #languageFeaturesService: ShimLanguageFeatures;

	// Store the extension ID for which this `vscode.languages` object is being created.
	// This is crucial for attributing provider registrations.
	readonly #extensionContextId: ExtensionIdentifier;

	/**
	 * Creates an instance of ShimLanguages.
	 * @param rpcService The RPC service adapter (passed to base, not directly used here).
	 * @param logService The logging service.
	 * @param languageFeaturesService The instance of `ShimLanguageFeatures` to delegate registrations to.
	 * @param extensionContextId The `ExtensionIdentifier` of the extension this API object is for.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		languageFeaturesService: ShimLanguageFeatures,

		extensionContextId: ExtensionIdentifier,
	) {
		super("LanguagesAPI", rpcService, logService);

		this.#languageFeaturesService = languageFeaturesService;

		this.#extensionContextId = extensionContextId;

		this._log(
			`Initialized for extension '${this.#extensionContextId.value}'.`,
		);

		if (!this.#languageFeaturesService) {
			this._logError(
				"CRITICAL: ShimLanguageFeatures service instance not provided! All language provider registrations will fail.",
			);

			// Consider throwing an error here as this is a fundamental dependency for this shim to function.
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
	 * Generic helper to handle the registration of a language feature provider.
	 * It calls the asynchronous registration function on `ShimLanguageFeatures` and
	 * returns a `Disposable` that will unregister the provider when disposed.
	 *
	 * @template P The type of the provider being registered.
	 * @param providerType A string identifying the type of provider (e.g., "Hover", "Completion"), for logging.
	 * @param registrationFn A function that, when called, performs the asynchronous registration
	 *                       with `ShimLanguageFeatures` and returns a Promise for the provider handle.
	 * @returns An `IDisposable` to unregister the provider.
	 */
	private _handleProviderRegistration<P>(
		providerType: string,

		registrationFn: () => Promise<number>,
	): IDisposable {
		if (!this.#languageFeaturesService) {
			// Should have been caught in constructor, but double-check
			this._logError(
				`Cannot register ${providerType}Provider: ShimLanguageFeatures service is unavailable. Returning NOP disposable.`,
			);

			return Disposable.None;
		}

		// this._logService?.trace(`vscode.languages.register${providerType}Provider called by ext '${this.#extensionContextId.value}'.`);

		// Sentinel for "handle not yet received" or "registration failed"
		let handle = -1;

		let registrationSucceeded = false;

		// Start the registration process. The promise might not resolve immediately.
		const registrationPromise = registrationFn();

		registrationPromise
			.then(
				(resolvedHandle) => {
					handle = resolvedHandle;

					registrationSucceeded = true;

					// this._logService?.trace(`${providerType}Provider registration with ShimLanguageFeatures for ext '${this.#extensionContextId.value}' succeeded (Handle: ${handle})`);
				},

				(registrationError: any) => {
					// `handle` remains -1, `registrationSucceeded` remains false.
					this._logError(
						`${providerType}Provider registration with ShimLanguageFeatures for ext '${this.#extensionContextId.value}' failed:`,

						registrationError,
					);

					// The error is logged by ShimLanguageFeatures or the _registerProviderOnMainThread helper.
					// Extensions typically don't get immediate feedback on registration failure from `vscode.languages.register*`.
				},
			)
			.catch((unhandledPromiseErr) => {
				// Catch any unhandled rejection from the then() blocks themselves
				this._logError(
					`Unexpected error in ${providerType}Provider registration promise chain for ext '${this.#extensionContextId.value}':`,

					unhandledPromiseErr,
				);
			});

		return new Disposable(() => {
			// This dispose function is called by the extension.
			// If registration succeeded and we have a valid handle, unregister.
			if (registrationSucceeded && handle !== -1) {
				// this._logService?.trace(`Disposing ${providerType}Provider registration for ext '${this.#extensionContextId.value}' (Handle: ${handle})`);

				this.#languageFeaturesService
					// Use generic $unregister
					.$unregister(handle)
					.catch((e: any) =>
						this._logError(
							`Failed to unregister ${providerType}Provider (Handle: ${handle}) for ext '${this.#extensionContextId.value}':`,

							refineErrorForShim(
								e,

								this._logService,

								"unregisterProvider",
							),
						),
					);
			} else if (!registrationSucceeded && handle === -1) {
				// Registration might have failed or is still pending but dispose was called early.
				// If it's still pending and then succeeds, we need to unregister it then.
				registrationPromise
					.then((resolvedHandleAfterDispose) => {
						if (resolvedHandleAfterDispose !== -1) {
							// If it eventually succeeded
							this._logWarn(
								`Unregistering ${providerType}Provider (Handle: ${resolvedHandleAfterDispose}) for ext '${this.#extensionContextId.value}' post-dispose, as registration completed after dispose was called.`,
							);

							this.#languageFeaturesService
								.$unregister(resolvedHandleAfterDispose)
								.catch((e: any) =>
									this._logError(
										`Post-dispose unregistration failed for ${providerType}Provider (Handle: ${resolvedHandleAfterDispose}):`,

										e,
									),
								);
						}
					})
					.catch(() => {
						/* Registration ultimately failed, nothing to unregister */
					});
			}
		});
	}

	// --- vscode.languages API Registration Methods ---
	// Each method delegates to ShimLanguageFeatures, passing the extension ID.

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

	// --- Other vscode.languages methods (Stubs or requiring MainThread interaction) ---
	public async getLanguages(): Promise<string[]> {
		this._logWarnOnce(
			"API STUB: vscode.languages.getLanguages() called. Returning empty array. Full implementation requires RPC to MainThread.",
		);

		// TODO: Proxy to `this.#mainThreadLanguagesProxy?.$getLanguages()` if such a proxy exists.
		return Promise.resolve([]);
	}

	public async setTextDocumentsLanguage(
		document: TextDocument,

		languageId: string,
	): Promise<TextDocument> {
		this._logWarnOnce(
			`API STUB: vscode.languages.setTextDocumentsLanguage() called for URI '${document.uri.toString()}' to LangID '${languageId}'. This is a NOP in the current shim.`,
		);

		// TODO: Proxy to `MainThreadDocuments.$setLanguageId(uri, languageId)`.
		// The document object itself might not change instance but its `languageId` property should reflect the new ID
		// after the main thread confirms the change and CocoonDocumentService updates its model.
		// For now, return the original document as a NOP.
		if (document.languageId !== languageId) {
			this._logWarn(
				`Simulating language change for ${document.uri.toString()} to ${languageId} (actual change depends on MainThread update).`,
			);

			// If we could mutate it (which we shouldn't for an API object):
			// Object.defineProperty(document, 'languageId', { value: languageId });
		}

		return document;
	}

	public match(selector: DocumentSelector, document: TextDocument): number {
		// this._logService?.trace(`vscode.languages.match called. Selector: ${JSON.stringify(selector)}, DocURI: ${document.uri.toString()}`);

		// TODO: This requires VS Code's internal document selector matching logic, which can be complex
		// (handling globs, language filters, scheme filters). Found in `vs/base/common/glob.ts` or
		// `vs/editor/common/services/modelService.ts` (matchLanguage).
		// For a basic shim:
		if (typeof selector === "string") {
			// Simple language ID match
			// VS Code often returns a score
			return document.languageId === selector ? 10 : 0;
		}

		if (Array.isArray(selector)) {
			// Array of selectors, take max score
			return Math.max(0, ...selector.map((s) => this.match(s, document)));
		}

		if (typeof selector === "object" && selector !== null) {
			// LanguageFilter
			let score = 0;

			if (selector.language && document.languageId === selector.language)
				score += 5;
			// Language mismatch
			else if (selector.language) return 0;

			if (selector.scheme && document.uri.scheme === selector.scheme)
				score += 5;
			// Scheme mismatch
			else if (selector.scheme) return 0;

			if (selector.pattern)
				this._logWarnOnce(
					"Pattern matching in vscode.languages.match selector not fully implemented in shim.",
				);

			// If language/scheme matched or weren't specified, give some score.
			return score > 0 || (!selector.language && !selector.scheme)
				? score || 1
				: 0;
		}

		// No match
		return 0;
	}

	public setLanguageStatus(
		selector: DocumentSelector,

		status: LanguageStatusItem,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.languages.setLanguageStatus called for selector ${JSON.stringify(selector)}. Status item ID: '${status.id}'. This is a NOP.`,
		);

		// TODO: This would require an RPC call to a MainThreadLanguageStatus service.
		// The LanguageStatusItem also has a `command` which might need to be handled.
		return Disposable.None;
	}

	public createLanguageStatusItem(
		id: string,

		selector: DocumentSelector,
	): LanguageStatusItem {
		this._logWarnOnce(
			`API STUB: vscode.languages.createLanguageStatusItem called for id '${id}'. Returning NOP LanguageStatusItem.`,
		);

		// TODO: This would involve MainThreadLanguageStatus.$createStatusItem(id, selectorDto)
		// and returning a proxy object that updates the main thread on property changes.
		const itemEmitter = new VscodeEmitter<void>();

		const NOP_STATUS_ITEM: LanguageStatusItem = {
			id,

			selector,

			get name() {
				return undefined;
			},

			set name(_value) {},

			get text() {
				return "";
			},

			set text(_value) {},

			get detail() {
				return undefined;
			},

			set detail(_value) {},

			get severity() {
				return LanguageStatusSeverity.Information;
			},

			set severity(_value) {},

			get command() {
				return undefined;
			},

			set command(_value) {},

			get accessibilityInformation() {
				return undefined;
			},

			set accessibilityInformation(_value) {},

			get busy() {
				return false;
			},

			set busy(_value) {},

			onDidChange: itemEmitter.event,

			dispose: () => itemEmitter.dispose(),
		};

		return NOP_STATUS_ITEM;
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		// No specific event emitters owned directly by ShimLanguages to dispose here.
		// Disposables for provider registrations are handled by their respective IDisposable returns.
		this._log("Disposed.");
	}
}
