/*---------------------------------------------------------------------------------------------
 * Cocoon Languages API Shim (shims/language-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.languages` API namespace, primarily focusing on
 * registering language feature providers defined by extensions. It interacts with the
 * `ShimLanguageFeatures` service (which handles storage and RPC).
 *
 * Responsibilities:
 * - Providing `registerHoverProvider`, `registerCompletionItemProvider`, etc. methods
 *   that extensions call.
 * - Calling corresponding `$register*Provider` methods on the injected `ShimLanguageFeatures`
 *   service, passing the selector, metadata, *and the provider object*.
 * - Receiving a numeric handle back from the `ShimLanguageFeatures` registration call.
 * - Returning a `vscode.Disposable` to the extension. When disposed, this disposable
 *   calls `$unregisterProvider` on `ShimLanguageFeatures` using the handle.
 *
 * Key Interactions:
 * - Provides parts of the `vscode.languages` API surface to extensions.
 * - Injected with and uses `ShimLanguageFeatures` (required) to handle provider
 *   storage and communication with Mountain.
 * - Does NOT store provider callbacks locally; delegates storage to ShimLanguageFeatures.
 * - Uses `vscode.Disposable` to manage registration lifetime.
 *--------------------------------------------------------------------------------------------*/

// Assuming these come from the vscode API shim
import { Event as VscodeEvent } from "vs/base/common/event";
// Standard Disposable class
import { Disposable, IDisposable } from "vs/base/common/lifecycle";

// Import vscode API types for providers and selectors
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
	LinkedEditingRangeProvider,
	// For OnTypeFormattingEditProvider
	OnTypeFormattingEditProviderOptions,
	ReferenceProvider,
	RenameProvider,
	SelectionRangeProvider,
	SignatureHelpProvider,
	SignatureHelpProviderMetadata,
	TypeDefinitionProvider,
	TypeHierarchyProvider,
	WorkspaceSymbolProvider,
	// For implements vscode.languages
	// LanguagesAPI as VscodeLanguagesAPI,
	// ... any other provider types needed
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	refineError,
} from "./_baseShim";
// The service this shim delegates to
import { ShimLanguageFeatures } from "./language-features-shim";

// Interface for the vscode.languages API (subset for this shim)
// This helps ensure the ShimLanguages class implements the correct surface.
// This would ideally be part of a larger `vscode` namespace type definition.
export interface VscodeLanguagesAPI {
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
		// Options are more complex in real API
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

		metadata?: SignatureHelpProviderMetadata | string[],
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

		// Note: no selector
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

	// Methods that might need specific shims or are on other services
	// getLanguages(): Promise<string[]>;

	// Typically on Diagnostics service
	// getDiagnostics?(resource?: Uri): Diagnostic[];

	// Typically on Diagnostics service
	// onDidChangeDiagnostics?: VscodeEvent<Uri[]>;

	// ... other methods from vscode.languages
}

export class ShimLanguages
	extends BaseCocoonShim
	implements VscodeLanguagesAPI
{
	readonly #languageFeaturesService: ShimLanguageFeatures;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,

		// Injected ShimLanguageFeatures instance
		languageFeaturesService: ShimLanguageFeatures,
	) {
		super("LanguagesAPI", rpcService, logService);

		this.#languageFeaturesService = languageFeaturesService;

		this._log("Initializing Languages API Shim...");

		if (!this.#languageFeaturesService) {
			this._logError(
				"ShimLanguageFeatures service was not provided! Language provider registration will fail.",
			);

			// This is a critical dependency.
		}
	}

	// --- Helper for generic registration ---
	private _registerProvider<P>(
		// For logging and potentially for ShimLanguageFeatures internal routing
		providerType: string,

		// The call to ShimLanguageFeatures.$register...
		registrationCall: () => Promise<number>,
	): IDisposable {
		if (!this.#languageFeaturesService) {
			this._logError(
				`Cannot register ${providerType} provider, LanguageFeatures service unavailable.`,
			);

			return Disposable.None;
		}

		this._log(`Registering ${providerType} provider...`);

		const registrationPromise = registrationCall();

		let handle = -1;

		let disposedBeforeRegister = false;

		const disposable = new Disposable(() => {
			if (handle !== -1) {
				this._log(
					`Disposing ${providerType} provider registration (handle: ${handle})`,
				);

				this.#languageFeaturesService
					.$unregisterProvider(handle)
					.catch((e: any) =>
						this._logError(
							`Failed to unregister ${providerType} handle ${handle}:`,

							refineError(
								e,

								this._logService,

								"unregisterProvider",
							),
						),
					);
			} else {
				this._log(
					`Dispose called before registration completed for ${providerType} provider.`,
				);

				// Mark that it was disposed, so if registration completes, we immediately unregister.
				disposedBeforeRegister = true;
			}
		});

		registrationPromise
			.then(
				(resolvedHandle) => {
					handle = resolvedHandle;

					this._log(
						`${providerType} provider registration successful (handle: ${handle})`,
					);

					if (disposedBeforeRegister) {
						this._log(
							`Unregistering ${providerType} (handle: ${handle}) immediately after registration due to prior dispose call.`,
						);

						this.#languageFeaturesService
							.$unregisterProvider(handle)
							.catch((e: any) =>
								this._logError(
									`Failed to unregister ${providerType} handle ${handle} post-registration:`,

									refineError(
										e,

										this._logService,

										"unregisterProvider",
									),
								),
							);
					}
				},

				(registrationError: any) => {
					this._logError(
						`${providerType}Provider registration failed:`,

						registrationError,
					);

					// No handle to unregister if registration itself failed.
					// The disposable will be a NOP.
				},
			)
			.catch((e: any) => {
				// Catch errors from the promise resolution/rejection handling itself
				this._logError(
					`Unexpected error during ${providerType} provider registration promise handling:`,

					e,
				);
			});

		return disposable;
	}

	// --- vscode.languages API Methods ---

	public registerHoverProvider(
		selector: DocumentSelector,

		provider: HoverProvider,
	): IDisposable {
		return this._registerProvider("Hover", () =>
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
		return this._registerProvider("CompletionItem", () =>
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
		return this._registerProvider("Definition", () =>
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
		return this._registerProvider("CodeActions", () =>
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
		return this._registerProvider("CodeLens", () =>
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
		return this._registerProvider("Declaration", () =>
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
		return this._registerProvider("DocumentFormattingEdit", () =>
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
		return this._registerProvider("DocumentHighlight", () =>
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
		return this._registerProvider("DocumentLink", () =>
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
		return this._registerProvider("DocumentRangeFormattingEdit", () =>
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

		...moreTriggerCharacters: string[]
	): IDisposable {
		// The actual vscode API might take OnTypeFormattingEditProviderOptions which includes triggerCharacters
		// ShimLanguageFeatures.$registerOnTypeFormattingEditProvider expects string[]
		const triggerChars = [firstTriggerCharacter, ...moreTriggerCharacters];

		return this._registerProvider("OnTypeFormattingEdit", () =>
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
		return this._registerProvider("Reference", () =>
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
		return this._registerProvider("Rename", () =>
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
		let metadata: SignatureHelpProviderMetadata | undefined;

		if (
			typeof metadataOrTriggerChars === "object" &&
			!Array.isArray(metadataOrTriggerChars)
		) {
			metadata = metadataOrTriggerChars;
		} else if (Array.isArray(metadataOrTriggerChars)) {
			// This case is for older API where trigger chars were passed as last arg
			metadata = {
				triggerCharacters: metadataOrTriggerChars,

				retriggerCharacters: [],

				// Adapt
			};
		}

		return this._registerProvider("SignatureHelp", () =>
			this.#languageFeaturesService.$registerSignatureHelpProvider(
				selector,

				provider,

				metadata,
			),
		);
	}

	public registerImplementationProvider(
		selector: DocumentSelector,

		provider: ImplementationProvider,
	): IDisposable {
		return this._registerProvider("Implementation", () =>
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
		return this._registerProvider("TypeDefinition", () =>
			this.#languageFeaturesService.$registerTypeDefinitionProvider(
				selector,

				provider,
			),
		);
	}

	public registerWorkspaceSymbolProvider(
		provider: WorkspaceSymbolProvider,
	): IDisposable {
		// WorkspaceSymbolProvider does not take a selector
		return this._registerProvider("WorkspaceSymbol", () =>
			this.#languageFeaturesService.$registerWorkspaceSymbolProvider(
				provider,
			),
		);
	}

	public registerSelectionRangeProvider(
		selector: DocumentSelector,

		provider: SelectionRangeProvider,
	): IDisposable {
		return this._registerProvider("SelectionRange", () =>
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
		return this._registerProvider("CallHierarchy", () =>
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
		return this._registerProvider("TypeHierarchy", () =>
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
		return this._registerProvider("LinkedEditingRange", () =>
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
		this._logWarnOnce(
			"API not fully implemented by ShimLanguageFeatures: languages.registerInlayHintsProvider",
		);

		return this._registerProvider("InlayHints", () =>
			(this.#languageFeaturesService as any)
				// Cast if method not on defined shape yet
				.$registerInlayHintsProvider(selector, provider),
		);
	}

	public registerDocumentColorProvider(
		selector: DocumentSelector,

		provider: DocumentColorProvider,
	): IDisposable {
		this._logWarnOnce(
			"API not fully implemented by ShimLanguageFeatures: languages.registerDocumentColorProvider",
		);

		return this._registerProvider("DocumentColor", () =>
			(
				this.#languageFeaturesService as any
			).$registerDocumentColorProvider(selector, provider),
		);
	}

	public registerFoldingRangeProvider(
		selector: DocumentSelector,

		provider: FoldingRangeProvider,
	): IDisposable {
		this._logWarnOnce(
			"API not fully implemented by ShimLanguageFeatures: languages.registerFoldingRangeProvider",
		);

		return this._registerProvider("FoldingRange", () =>
			(
				this.#languageFeaturesService as any
			).$registerFoldingRangeProvider(selector, provider),
		);
	}

	// --- Methods that likely don't belong here or need other services ---
	// public async getLanguages(): Promise<string[]> {

	// 	this._logWarnOnce("API not implemented: languages.getLanguages");

	// 	// This would typically call a method on MainThreadLanguages
	// 	return [];

	// }

	// Diagnostics are usually handled by a separate Diagnostics service
	// public async getDiagnostics(resource?: Uri): Promise<Diagnostic[]> {

	// 	this._logWarnOnce("API not implemented: languages.getDiagnostics (use Diagnostics service)");

	// 	return [];

	// }

	// public onDidChangeDiagnostics: VscodeEvent<Uri[]> = VscodeEvent.None;
}

// Class is already exported
// export { ShimLanguages };
