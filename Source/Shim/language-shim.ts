/*---------------------------------------------------------------------------------------------
 * Cocoon Languages API Shim (shims/language-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.languages` API namespace, primarily focusing on
 * registering language feature providers defined by extensions. It interacts with the
 * `ShimLanguageFeatures` service (which handles provider storage, RPC, and execution).
 *
 * Responsibilities:
 * - Providing `register*Provider` methods that extensions call (e.g., `registerHoverProvider`).
 * - Delegating these calls to corresponding `$register*Provider` methods on the injected
 *   `ShimLanguageFeatures` service, passing the selector, metadata, and the provider object.
 * - Receiving a numeric handle from `ShimLanguageFeatures` post-registration.
 * - Returning a `vscode.Disposable` to the extension. When disposed, this calls
 *   `$unregisterProvider` on `ShimLanguageFeatures` using the handle.
 *
 * Key Interactions:
 * - Provides parts of the `vscode.languages` API surface to extensions.
 * - Injected with and heavily relies on `ShimLanguageFeatures`.
 * - Uses `vscode.Disposable` for registration lifecycle management.
 *--------------------------------------------------------------------------------------------*/

// Assuming these come from the vscode API shim
// For event type signatures (e.g., onDidChangeDiagnostics)
import { Event as VscodeEvent } from "vs/base/common/event";
import { Disposable, IDisposable } from "vs/base/common/lifecycle";
// VS Code internal URI
import { URI } from "vs/base/common/uri";

// Import vscode API types for providers, selectors, and other language-related interfaces/enums
import {
	CallHierarchyProvider,
	CodeActionProvider,
	CodeActionProviderMetadata,
	CodeLensProvider,
	CompletionItemProvider,
	DeclarationProvider,
	DefinitionProvider,
	DocumentColorProvider,
	DocumentFormattingEditProvider,
	DocumentHighlightProvider,
	DocumentLinkProvider,
	DocumentRangeFormattingEditProvider,
	DocumentSelector,
	FoldingRangeProvider,
	HoverProvider,
	ImplementationProvider,
	InlayHintsProvider,
	LanguageStatusItem,
	// For setLanguageStatus
	LanguageStatusSeverity,
	LinkedEditingRangeProvider,
	OnTypeFormattingEditProvider,
	OnTypeFormattingEditProviderOptions,
	ReferenceProvider,
	RenameProvider,
	SelectionRangeProvider,
	SignatureHelpProvider,
	SignatureHelpProviderMetadata,
	TypeDefinitionProvider,
	TypeHierarchyProvider,
	WorkspaceSymbolProvider,
	// For getLanguages, matchLanguages, etc.
	// LanguageFilter,
	// TODO: Add any other provider or language API types that vscode.languages exposes.
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	refineError,
} from "./_baseShim";
import {
	ExtHostLanguageFeaturesServiceShape,
	ShimLanguageFeatures,
} from "./shims/language-features-shim";

// Import concrete class and its RPC shape

// If getDiagnostics is part of this API
// import { Diagnostic } from "vscode";

// --- Type Definition for vscode.languages API surface ---
// This interface defines the subset of `vscode.languages` that this shim aims to provide.
// TODO: This should be comprehensive based on the target VS Code API version.
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
		// Or OnTypeFormattingEditProviderOptions
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

	// Other methods typically on vscode.languages
	getLanguages(): Promise<string[]>;

	setTextDocumentsLanguage(
		document: TextDocument,

		languageId: string,

		// Assuming TextDocument is vscode.TextDocument
	): Promise<TextDocument>;

	// Score
	match(selector: DocumentSelector, document: TextDocument): number;

	createDiagnosticCollection?(
		name?: string,

		// Usually on its own service
	): /*vscode.DiagnosticCollection*/ any;

	// Usually on Diagnostics service
	// getDiagnostics?(resource?: VscodeUri): readonly Diagnostic[];

	// Usually on Diagnostics service
	// onDidChangeDiagnostics?: VscodeEvent<readonly VscodeUri[]>;

	setLanguageStatus(
		selector: DocumentSelector,

		status: LanguageStatusItem,
	): IDisposable;

	// ... and more, e.g., for LanguageConfiguration, Indentation Rules
}

export class ShimLanguages
	extends BaseCocoonShim
	implements VscodeLanguagesApiSubset
{
	// Use the concrete ShimLanguageFeatures type for #languageFeaturesService for direct calls to its $register methods.
	// ShimLanguageFeatures itself implements ExtHostLanguageFeaturesServiceShape
	readonly #languageFeaturesService: ShimLanguageFeatures;

	constructor(
		// Inherited, not directly used by this shim's methods
		rpcService: IExtHostRpcService | undefined,

		// Inherited for logging
		logService: ILogService | undefined,

		// Injected ShimLanguageFeatures instance
		languageFeaturesService: ShimLanguageFeatures,
	) {
		// Service identifier for logging
		super("LanguagesAPI", rpcService, logService);

		this.#languageFeaturesService = languageFeaturesService;

		this._log("Initializing Languages API Shim...");

		if (!this.#languageFeaturesService) {
			this._logError(
				"CRITICAL: ShimLanguageFeatures service not provided! Language provider registration will fail.",
			);

			// Consider throwing an error here as this is a critical dependency.
		}
	}

	private _handleProviderRegistration<P>(
		providerType: string,

		// The function that calls ShimLanguageFeatures.$register...
		registrationFn: () => Promise<number>,
	): IDisposable {
		if (!this.#languageFeaturesService) {
			this._logError(
				`Cannot register ${providerType} provider: LanguageFeatures service unavailable. Returning NOP disposable.`,
			);

			// Return a NOP disposable
			return Disposable.None;
		}

		this._log(`vscode.languages.register${providerType}Provider called.`);

		// The actual registration call is now async.
		// We need to return a disposable immediately.
		// The disposable's dispose method will use the handle obtained from the promise.
		let handle = -1;

		let registrationAttempted = false;

		let registrationPromise: Promise<number> | undefined;

		const tryRegister = () => {
			if (registrationAttempted) return registrationPromise!;

			registrationAttempted = true;

			registrationPromise = registrationFn();

			registrationPromise
				.then(
					(resolvedHandle) => {
						handle = resolvedHandle;

						this._log(
							`${providerType}Provider registration with ShimLanguageFeatures successful (handle: ${handle})`,
						);
					},

					(registrationError: any) => {
						// Handle remains -1, dispose will be a NOP for main thread unregistration.
						this._logError(
							`${providerType}Provider registration with ShimLanguageFeatures failed:`,

							registrationError,
						);

						// TODO: Should this error be propagated to the extension?
						// VS Code's API usually returns Disposable and errors might be logged or silent.
					},
				)
				.catch((e) => {
					this._logError(
						`Unexpected error in ${providerType}Provider registration promise chain:`,

						e,
					);
				});

			return registrationPromise;
		};

		// Call immediately to start registration
		tryRegister();

		return new Disposable(() => {
			// If handle is set, registration succeeded (or is in flight and will succeed)
			if (handle !== -1) {
				this._log(
					`Disposing ${providerType}Provider registration (handle: ${handle})`,
				);

				this.#languageFeaturesService
					.$unregisterProvider(handle)
					.catch((e: any) =>
						this._logError(
							`Failed to unregister ${providerType}Provider handle ${handle}:`,

							refineError(
								e,

								this._logService,

								"unregisterProvider",
							),
						),
					);
			} else {
				// Registration might not have completed or failed.
				// If it's still in flight, ensure it gets unregistered once handle is known.
				if (registrationPromise) {
					this._log(
						`Dispose called for ${providerType}Provider before registration completed or handle known. Scheduling unregistration.`,
					);

					registrationPromise
						.then(
							(resolvedHandleAfterDispose) => {
								if (resolvedHandleAfterDispose !== -1) {
									// Check if it's a valid handle
									this._log(
										`Unregistering ${providerType}Provider (handle: ${resolvedHandleAfterDispose}) post-dispose after registration completed.`,
									);

									this.#languageFeaturesService
										.$unregisterProvider(
											resolvedHandleAfterDispose,
										)
										.catch((e: any) =>
											this._logError(
												`Failed to unregister ${providerType}Provider handle ${resolvedHandleAfterDispose} post-dispose:`,

												refineError(
													e,

													this._logService,

													"unregisterProvider",
												),
											),
										);
								}
							},

							(_registrationError) => {
								// If registration failed, nothing to unregister on main thread.
								this._log(
									`${providerType}Provider registration failed, no unregistration needed for failed handle.`,
								);
							},
						)
						.catch((e) => {
							this._logError(
								`Error in post-dispose unregistration logic for ${providerType}Provider:`,

								e,
							);
						});
				} else {
					this._logWarn(
						`Disposing ${providerType}Provider but registration was not attempted or promise is missing.`,
					);
				}
			}
		});
	}

	// --- vscode.languages API Registration Methods ---
	// Each method delegates to ShimLanguageFeatures and wraps the unregistration in a Disposable.

	public registerHoverProvider(
		selector: DocumentSelector,

		provider: HoverProvider,
	): IDisposable {
		return this._handleProviderRegistration("Hover", () =>
			this.#languageFeaturesService.$registerHoverProvider(
				selector,

				provider,
			),
		);
	}

	public registerCompletionItemProvider(
		selector: DocumentSelector,

		provider: CompletionItemProvider,

		...triggerCharacters: string[]
	): IDisposable {
		return this._handleProviderRegistration("CompletionItem", () =>
			this.#languageFeaturesService.$registerCompletionProvider(
				selector,

				provider,

				triggerCharacters,
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
				),
		);
	}

	public registerOnTypeFormattingEditProvider(
		selector: DocumentSelector,

		provider: OnTypeFormattingEditProvider,

		firstTriggerCharacter: string,

		// Note: VS Code API might also take OnTypeFormattingEditProviderOptions here.
		// This shim currently only handles trigger characters.
		...moreTriggerCharacters: string[]
	): IDisposable {
		const triggerChars = [firstTriggerCharacter, ...moreTriggerCharacters];

		// TODO: If OnTypeFormattingEditProviderOptions needs to be supported, adapt ShimLanguageFeatures
		// and this call.
		return this._handleProviderRegistration("OnTypeFormattingEdit", () =>
			this.#languageFeaturesService.$registerOnTypeFormattingEditProvider(
				selector,

				provider,

				triggerChars,
			),
		);
	}

	public registerReferenceProvider(
		selector: DocumentSelector,

		provider: ReferenceProvider,
	): IDisposable {
		return this._handleProviderRegistration("Reference", () =>
			this.#languageFeaturesService.$registerReferenceProvider(
				selector,

				provider,
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
			),
		);
	}

	public registerSignatureHelpProvider(
		selector: DocumentSelector,

		provider: SignatureHelpProvider,

		metadataOrTriggerChars?: SignatureHelpProviderMetadata | string[],
	): IDisposable {
		let actualMetadata: SignatureHelpProviderMetadata | undefined;

		if (
			typeof metadataOrTriggerChars === "object" &&
			!Array.isArray(metadataOrTriggerChars)
		) {
			// It's SignatureHelpProviderMetadata
			actualMetadata = metadataOrTriggerChars;
		} else if (Array.isArray(metadataOrTriggerChars)) {
			// It's the old API: string[] for trigger characters
			actualMetadata = {
				triggerCharacters: metadataOrTriggerChars,

				retriggerCharacters: [],

				// Adapt to new metadata structure
			};
		}

		// TODO: Ensure ShimLanguageFeatures.$registerSignatureHelpProvider expects SignatureHelpProviderMetadata
		return this._handleProviderRegistration("SignatureHelp", () =>
			this.#languageFeaturesService.$registerSignatureHelpProvider(
				selector,

				provider,

				actualMetadata,
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
			),
		);
	}

	public registerWorkspaceSymbolProvider(
		provider: WorkspaceSymbolProvider,
	): IDisposable {
		// WorkspaceSymbolProvider does not take a selector.
		// Pass null or a specific convention to ShimLanguageFeatures if needed.
		return this._handleProviderRegistration("WorkspaceSymbol", () =>
			this.#languageFeaturesService.$registerWorkspaceSymbolProvider(
				provider,
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
			),
		);
	}

	public registerInlayHintsProvider(
		selector: DocumentSelector,

		provider: InlayHintsProvider,
	): IDisposable {
		// TODO: Ensure ShimLanguageFeatures.$registerInlayHintsProvider is implemented.
		return this._handleProviderRegistration("InlayHints", () =>
			(this.#languageFeaturesService as any).$registerInlayHintsProvider(
				selector,

				provider,
			),
		);
	}

	public registerDocumentColorProvider(
		selector: DocumentSelector,

		provider: DocumentColorProvider,
	): IDisposable {
		// TODO: Ensure ShimLanguageFeatures.$registerDocumentColorProvider is implemented.
		return this._handleProviderRegistration("DocumentColor", () =>
			(
				this.#languageFeaturesService as any
			).$registerDocumentColorProvider(selector, provider),
		);
	}

	public registerFoldingRangeProvider(
		selector: DocumentSelector,

		provider: FoldingRangeProvider,
	): IDisposable {
		// TODO: Ensure ShimLanguageFeatures.$registerFoldingRangeProvider is implemented.
		return this._handleProviderRegistration("FoldingRange", () =>
			(
				this.#languageFeaturesService as any
			).$registerFoldingRangeProvider(selector, provider),
		);
	}

	// --- Other vscode.languages methods ---
	public async getLanguages(): Promise<string[]> {
		this._logWarnOnce(
			"API not fully implemented by ShimLanguageFeatures/MainThread: languages.getLanguages",
		);

		// TODO: This would typically call a method on MainThreadLanguages or similar via RPC.
		// For example: return this._rpcService?.getProxy(MainContext.MainThreadLanguages)?.$getLanguages() || Promise.resolve([]);

		// Stub
		return Promise.resolve([]);
	}

	public async setTextDocumentsLanguage(
		document: TextDocument,

		languageId: string,
	): Promise<TextDocument> {
		this._logWarnOnce(
			"API not fully implemented by ShimLanguageFeatures/MainThread: languages.setTextDocumentsLanguage",
		);

		// TODO: This would involve an RPC call to MainThreadLanguages to change the language mode.
		// After the change, Mountain should send an update ($acceptModelLanguageChanged),

		// which ShimDocumentService handles, updating the document.
		// The returned TextDocument should be the updated one.
		// For now, return the original document as a NOP.
		if (document.languageId !== languageId) {
			console.warn(
				`ShimLanguages: Pretending to change language of ${document.uri.toString()} to ${languageId}, but it's a NOP.`,
			);
		}

		return document;
	}

	public match(selector: DocumentSelector, document: TextDocument): number {
		this._logWarnOnce(
			"API not fully implemented or needs VS Code's internal matcher: languages.match",
		);

		// TODO: This requires VS Code's internal document selector matching logic.
		// (typically found in vs/base/common/glob or vs/editor/common/services/modelService).
		// For a basic shim, this might always return 0 or 1 if the languageId matches.
		if (typeof selector === "string") {
			// Simple language ID match
			return document.languageId === selector ? 1 : 0;
		}

		if (Array.isArray(selector)) {
			// Array of selectors
			return Math.max(...selector.map((s) => this.match(s, document)));
		}

		if (typeof selector === "object" && selector !== null) {
			// LanguageFilter
			if (selector.language && document.languageId !== selector.language)
				return 0;

			if (selector.scheme && document.uri.scheme !== selector.scheme)
				return 0;

			// Pattern matching is complex
			if (selector.pattern)
				this._logWarn(
					"Pattern matching in languages.match selector not implemented.",
				);

			// Simplified: if language/scheme match (or not specified), assume match
			return 1;
		}

		return 0;
	}

	public setLanguageStatus(
		selector: DocumentSelector,

		statusItem: LanguageStatusItem,
	): IDisposable {
		this._logWarnOnce("API not implemented: languages.setLanguageStatus");

		// TODO: This would require an RPC call to MainThreadLanguageStatus service.
		// The LanguageStatusItem also has a command which might need to be registered.
		return Disposable.None;
	}

	// createDiagnosticCollection, getDiagnostics, onDidChangeDiagnostics are typically
	// provided by a dedicated Diagnostics service (ShimDiagnosticsService in this project).
	// They are not usually directly on `vscode.languages` in the ExtHost implementation.
	// If they need to be exposed here for API compatibility, they should delegate.
}
