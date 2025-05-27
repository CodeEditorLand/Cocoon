/*---------------------------------------------------------------------------------------------
 * Cocoon Languages API Shim (language-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.languages` API namespace. Its primary responsibility is to provide
 * the `register<Feature>Provider` methods that extensions use to contribute language-specific
 * functionalities such as hovers, completions, definitions, code actions, formatting, etc.
 *
 * This shim acts as a facade. It receives provider registration requests from extensions
 * (via the `vscode.languages` API object) and delegates the actual registration logic,
 *
 * including communication with the MainThread/Mountain, to an injected `ShimLanguageFeatures`
 * service instance. The `ShimLanguageFeatures` service is responsible for managing the
 * provider store and handling the RPC calls related to provider registration and invocation.
 *
 * Responsibilities:
 * - Providing the public `vscode.languages.register*Provider` methods. Each of these
 *   methods is specific to a particular language feature (e.g., `registerHoverProvider`,
 *
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
 *--------------------------------------------------------------------------------------------*/

// For vscode.Event (used for onDidChangeDiagnostics stub if it were here) and vscode.Disposable types
import { Event as VscodeEvent } from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// For passing to ShimLanguageFeatures
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
// Import all necessary vscode API types for provider interfaces, document selectors, options, etc.
// These are typically sourced from Cocoon's bundled API definitions (`../Shim/out/vscode.js`) or the `vscode` namespace.
import {
	// Enum for setLanguageStatus severity
	LanguageStatusSeverity,
	// Provider Interfaces
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
	// For setLanguageStatus return and parameter types
	type LanguageStatusItem,
	type LinkedEditingRangeProvider,
	type OnTypeFormattingEditProvider,
	// For the overloaded registerOnTypeFormattingEditProvider
	type OnTypeFormattingEditProviderOptions,
	type ReferenceProvider,
	type RenameProvider,
	type SelectionRangeProvider,
	type SignatureHelpProvider,
	type SignatureHelpProviderMetadata,
	// For setTextDocumentsLanguage, match methods
	type TextDocument,
	type TypeDefinitionProvider,
	type TypeHierarchyProvider,
	type WorkspaceSymbolProvider,
	// Diagnostics-related types (though functionality is usually in ShimDiagnosticsService)
	// type Diagnostic as VscodeDiagnostic,
	// type DiagnosticCollection as VscodeDiagnosticCollection,
	// For onDidChangeDiagnostics event payload, if handled here
	// type Uri as VscodeUri,
} from "vscode";

import {
	BaseCocoonShim,
	// For error handling in disposables if needed
	refineErrorForShim,
	// For BaseCocoonShim constructor
	type ILogServiceForShim,
	// For BaseCocoonShim constructor
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";
// Import the concrete ShimLanguageFeatures class to call its $register* methods.
import type { ShimLanguageFeatures } from "./language-features-shim";

/**
 * Defines the subset of the `vscode.languages` API namespace that this `ShimLanguages` class implements.
 * This interface primarily focuses on provider registration methods and a few utility functions.
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

		// Newer overload with options object
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

		// Note: No DocumentSelector for workspace symbols
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

	// Other utility methods from vscode.languages
	getLanguages(): Promise<string[]>;

	setTextDocumentsLanguage(
		document: TextDocument,

		languageId: string,
	): Promise<TextDocument>;

	// Returns a match score
	match(selector: DocumentSelector, document: TextDocument): number;

	setLanguageStatus(
		selector: DocumentSelector,

		status: LanguageStatusItem,
	): IDisposable;

	createLanguageStatusItem(
		id: string,

		selector: DocumentSelector,
	): LanguageStatusItem;

	// Diagnostics related APIs (e.g., createDiagnosticCollection, getDiagnostics, onDidChangeDiagnostics)
	// are typically handled by a dedicated `ShimDiagnosticsService` and exposed through the main API factory
	// by merging them into the `vscode.languages` namespace if desired, rather than being implemented here.
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
	// The concrete ShimLanguageFeatures service instance used for delegation.
	readonly #languageFeaturesService: ShimLanguageFeatures;

	// The ExtensionIdentifier of the extension for which this `vscode.languages` API object is being created.
	// This is crucial for attributing provider registrations to the correct extension.
	readonly #extensionContextId: ExtensionIdentifier;

	/**
	 * Creates an instance of ShimLanguages.
	 * @param rpcService The RPC service adapter (passed to `BaseCocoonShim`, not directly used by `ShimLanguages` itself).
	 * @param logService The logging service instance.
	 * @param languageFeaturesService The instance of `ShimLanguageFeatures` to which all provider registrations will be delegated.
	 * @param extensionContextId The `ExtensionIdentifier` of the extension that will be using this `vscode.languages` API object.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		languageFeaturesService: ShimLanguageFeatures,

		extensionContextId: ExtensionIdentifier,
	) {
		// Service identifier for logging
		super("LanguagesAPI", rpcService, logService);

		this.#languageFeaturesService = languageFeaturesService;

		this.#extensionContextId = extensionContextId;

		this._logInfo(
			`Initialized for extension '${this.#extensionContextId.value}'. All provider registrations will be attributed to this extension.`,
		);

		if (!this.#languageFeaturesService) {
			// This is a critical failure if the languageFeaturesService is not provided, as this shim cannot function.
			const criticalErrorMsg =
				"CRITICAL DEPENDENCY MISSING: ShimLanguageFeatures service instance was not provided to ShimLanguages. All language provider registrations will fail.";

			this._logError(criticalErrorMsg);

			// Depending on Cocoon's error strategy, consider throwing an error here to halt initialization
			// as the `vscode.languages` API would be non-functional.
			// throw new Error(criticalErrorMsg);
		}
	}

	/**
	 * This shim primarily delegates to another local ExtHost service (`ShimLanguageFeatures`)
	 * for provider registrations and does not make direct RPC calls itself.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Generic helper method to handle the registration of a language feature provider.
	 * It invokes the asynchronous registration function (which calls the appropriate method
	 * on `ShimLanguageFeatures`) and returns a `vscode.Disposable` that, when disposed,
	 *
	 * will unregister the provider.
	 *
	 * @template P The type of the provider being registered (e.g., `HoverProvider`). Not strictly used by this helper's type signature but good for context.
	 * @param providerType A string identifying the type of provider (e.g., "Hover", "CompletionItem"), used for logging.
	 * @param registrationFn A function that, when called, performs the asynchronous registration
	 *                       by calling the relevant method on `ShimLanguageFeatures`. This function
	 *                       should return a `Promise<number>` where the number is the handle assigned
	 *                       to the provider registration by `ShimLanguageFeatures`.
	 * @returns An `IDisposable` which, when `dispose()` is called, will attempt to unregister the provider
	 *          using the handle obtained from `ShimLanguageFeatures`.
	 */
	private _handleProviderRegistration<P>(
		providerType: string,

		registrationFn: () => Promise<number>,
	): IDisposable {
		if (!this.#languageFeaturesService) {
			this._logError(
				`Cannot register ${providerType}Provider for extension '${this.#extensionContextId.value}': ShimLanguageFeatures service is unavailable. Returning a NOP disposable.`,
			);

			// No-operation disposable
			return Disposable.None;
		}

		this._logDebug(
			`API vscode.languages.register${providerType}Provider called by extension '${this.#extensionContextId.value}'. Delegating to ShimLanguageFeatures.`,
		);

		// Sentinel value: -1 indicates handle not yet received or registration failed.
		let handle: number = -1;

		let registrationSucceeded = false;

		// Initiate the asynchronous registration process.
		const registrationPromise = registrationFn();

		registrationPromise
			.then(
				(resolvedHandle) => {
					// Store the handle returned by ShimLanguageFeatures.
					handle = resolvedHandle;

					registrationSucceeded = true;

					this._logDebug(
						`${providerType}Provider registration with ShimLanguageFeatures for extension '${this.#extensionContextId.value}' succeeded. Assigned Handle: ${handle}`,
					);
				},

				(registrationError: any) => {
					// `handle` remains -1, `registrationSucceeded` remains false.
					this._logError(
						`${providerType}Provider registration with ShimLanguageFeatures for extension '${this.#extensionContextId.value}' failed:`,

						// The error should have been logged by ShimLanguageFeatures or its _registerProviderOnMainThread helper.
						// We log it here again for context from ShimLanguages.
						registrationError,
					);

					// Extensions typically don't get immediate synchronous feedback on registration failure from `vscode.languages.register*`.
					// The failure is logged, and the returned disposable will be a NOP for unregistration if `handle` remains -1.
				},
			)
			.catch((unhandledPromiseError) => {
				// This catches unexpected errors in the .then() blocks themselves, which should be rare.
				this._logError(
					`Unexpected error in the promise chain for ${providerType}Provider registration (extension '${this.#extensionContextId.value}'):`,

					unhandledPromiseError,
				);
			});

		// Return a disposable that will attempt to unregister the provider when called.
		return new Disposable(() => {
			this._logDebug(
				`Dispose called for ${providerType}Provider registration (extension '${this.#extensionContextId.value}', current Handle: ${handle}, Succeeded: ${registrationSucceeded}).`,
			);

			if (registrationSucceeded && handle !== -1) {
				// If registration was successful and we have a valid handle, unregister.
				this.#languageFeaturesService
					// $unregister is the generic unregistration method on ShimLanguageFeatures.
					.$unregister(handle)
					.catch((e: any) =>
						this._logError(
							`Failed to unregister ${providerType}Provider (Handle: ${handle}) for extension '${this.#extensionContextId.value}' via ShimLanguageFeatures:`,

							refineErrorForShim(
								e,

								this._logService,

								"unregisterProvider",

								// Use refineErrorForShim for consistency.
							),
						),
					);
			} else if (!registrationSucceeded && handle === -1) {
				// If dispose is called before the registrationPromise resolved (or if it rejected).
				// We need to ensure that if the registration *eventually* succeeds after dispose was called,

				// it still gets unregistered.
				registrationPromise
					.then((resolvedHandleAfterDispose) => {
						if (resolvedHandleAfterDispose !== -1) {
							// Check if it eventually succeeded.
							this._logWarn(
								`Unregistering ${providerType}Provider (Handle: ${resolvedHandleAfterDispose}) for extension '${this.#extensionContextId.value}' post-dispose, ` +
									`as registration completed *after* its disposable was invoked.`,
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
	// Each method delegates to ShimLanguageFeatures.$register*Provider, passing the `this.#extensionContextId`
	// to ensure the registration is correctly attributed to the calling extension.

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
			// Legacy signature with trigger characters array
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
			// Newer signature with OnTypeFormattingEditProviderOptions object
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
		// Note: No DocumentSelector
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

	// --- Other vscode.languages utility methods (Stubs or requiring MainThread interaction for full functionality) ---

	public async getLanguages(): Promise<string[]> {
		this._logWarnOnce(
			"API STUB: vscode.languages.getLanguages() called. Returning an empty array. " +
				"A full implementation would require an RPC call to MainThread to get all known language identifiers.",
		);

		// TODO: Implement RPC call to `MainThreadLanguages.$getLanguages()` (if such a method exists on the proxy).
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
		// The `document` object itself might not change instance, but its `languageId` property (if mutable, or if a new
		// instance is returned by `CocoonDocumentService` after update) should reflect the new ID after MainThread confirms.
		// For now, as a NOP, return the original document instance.
		if (document.languageId !== languageId) {
			this._logWarn(
				`Simulating language change for document ${document.uri.toString()} from '${document.languageId}' to '${languageId}'. ` +
					`Note: The actual document model update depends on MainThread confirmation and subsequent event propagation.`,
			);

			// If we could directly mutate the TextDocument object (which is generally not advised for API objects):
			// Object.defineProperty(document, 'languageId', { value: languageId, configurable: true, writable: true });
		}

		return document;
	}

	public match(selector: DocumentSelector, document: TextDocument): number {
		this._logDebug(
			`API vscode.languages.match called. Selector: ${JSON.stringify(selector)}, Document URI: ${document.uri.toString()}, LanguageID: ${document.languageId}`,
		);

		// TODO: This requires a robust implementation of VS Code's internal document selector matching logic.
		// This logic handles complex selectors including language filters, scheme filters, and glob patterns.
		// It can be found in `vs/base/common/glob.ts` (for pattern matching) and potentially in services
		// like `vs/editor/common/services/modelService.ts` (for language matching behavior).
		// For a basic shim, a simplified approach is taken:
		if (typeof selector === "string") {
			// Simple language ID match
			// VS Code often returns a score (e.g., 10 for exact language match).
			return document.languageId === selector ? 10 : 0;
		}

		if (Array.isArray(selector)) {
			// Array of selectors, take the maximum score from any matching selector.
			return Math.max(0, ...selector.map((s) => this.match(s, document)));
		}

		if (typeof selector === "object" && selector !== null) {
			// LanguageFilter object
			let score = 0;

			// Assume it matches until a mismatch is found
			let matchesAll = true;

			if (selector.language) {
				if (document.languageId === selector.language)
					// Higher score for language match
					score += 5;
				else matchesAll = false;
			}

			if (selector.scheme && matchesAll) {
				// Only check scheme if previous parts matched
				if (document.uri.scheme === selector.scheme)
					// Higher score for scheme match
					score += 5;
				else matchesAll = false;
			}

			if (selector.pattern && matchesAll) {
				// Only check pattern if previous matched
				// Glob pattern matching is complex. For MVP, this is a very basic check or warning.
				this._logWarnOnce(
					"Pattern matching in vscode.languages.match (LanguageFilter.pattern) is not fully implemented in this shim. Returning partial score based on language/scheme only.",
				);

				// A real implementation would use `new winjs.GlobMatcher(selector.pattern).matches(document.uri.path)`.
				// If pattern matching were implemented, it might add, e.g., score += 10.
				// For now, if it has a pattern and other parts matched, we give a base score.
				if (score > 0 || (!selector.language && !selector.scheme))
					// Ensure some score if pattern exists and other parts are met or unspecified
					score = Math.max(score, 1);
				// If pattern exists but lang/scheme didn't match (and were specified), then it's not a match
				else matchesAll = false;
			}

			// Ensure at least 1 if all specified fields match, 0 otherwise.
			return matchesAll ? Math.max(score, 1) : 0;
		}

		// No match for other selector types or invalid input.
		return 0;
	}

	public setLanguageStatus(
		selector: DocumentSelector,

		status: LanguageStatusItem,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.languages.setLanguageStatus called for selector ${JSON.stringify(selector)}. Status item ID: '${status.id}'. ` +
				`This is a No-Operation in the current shim. Full implementation requires RPC to a MainThreadLanguageStatus service.`,
		);

		// TODO: This would require an RPC call to a MainThreadLanguageStatus service to register/update the status item.
		// The `LanguageStatusItem` also has properties like `command` which might need to be handled (e.g., marshalling Command DTOs).
		// NOP disposable.
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

		// TODO: This would involve an RPC call like `MainThreadLanguageStatus.$createStatusItem(id, selectorDto)`
		// and returning a proxy object that updates the main thread when its properties (text, severity, etc.) are set.
		// For the onDidChange event of the stubbed item.
		const itemEmitter = new VscodeEmitter<void>();

		const NOP_STATUS_ITEM: LanguageStatusItem = {
			id,

			// Store selector for reference, though not used by NOP setters
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

			// NOP event for changes
			onDidChange: itemEmitter.event,

			// Dispose the emitter
			dispose: () => itemEmitter.dispose(),
		};

		return NOP_STATUS_ITEM;
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like its own event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles via `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables.
		super.dispose();

		// No specific event emitters owned directly by `ShimLanguages` to dispose here.
		// Disposables for individual provider registrations are handled by the `IDisposable`
		// objects returned by the `register*Provider` methods.
		this._logInfo("Disposed.");
	}
}
