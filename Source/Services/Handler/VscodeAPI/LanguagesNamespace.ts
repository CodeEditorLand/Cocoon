/**
 * @module Handler/VscodeAPI/LanguagesNamespace
 * @description
 * Factory for the vscode.languages namespace shim.
 * Provides: all register*Provider methods, createDiagnosticCollection,
 * getLanguages, match, onDidChangeDiagnostics, getDiagnostics.
 */

import type { HandlerContext } from "../HandlerContext.js";

/**
 * Helper: register a language provider with auto-handle,
 * notify Mountain, and return a disposable.
 */
const RegisterProvider = (
	Context: HandlerContext,
	LanguageProviderRegistry: typeof import("../../LanguageProviderRegistry.js"),
	MethodName: string,
	Selector: any,
	Provider: any,
) => {
	const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
	const Language = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
	Context.SendToMountain(MethodName, { handle: Handle, language_selector: Language, extension_id: "" }).catch(() => {});
	return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
};

const CreateLanguagesNamespace = (
	Context: HandlerContext,
	LanguageProviderRegistry: typeof import("../../LanguageProviderRegistry.js"),
) => ({
	registerHoverProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_hover_provider", Selector, Provider),
	registerCompletionItemProvider: (Selector: any, Provider: any, ..._TriggerCharacters: string[]) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_completion_item_provider", Selector, Provider),
	registerDefinitionProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_definition_provider", Selector, Provider),
	registerReferenceProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_reference_provider", Selector, Provider),
	registerCodeActionsProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_code_actions_provider", Selector, Provider),
	registerDocumentSymbolProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_document_symbol_provider", Selector, Provider),
	registerDocumentFormattingEditProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_document_formatting_provider", Selector, Provider),
	registerDocumentRangeFormattingEditProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_document_range_formatting_provider", Selector, Provider),
	registerOnTypeFormattingEditProvider: (Selector: any, Provider: any, _FirstTrigger: string, ..._MoreTriggers: string[]) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_on_type_formatting_provider", Selector, Provider),
	registerTypeDefinitionProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_type_definition_provider", Selector, Provider),
	registerImplementationProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_implementation_provider", Selector, Provider),
	registerDeclarationProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_declaration_provider", Selector, Provider),
	registerDocumentLinkProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_document_link_provider", Selector, Provider),
	registerColorProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_color_provider", Selector, Provider),
	registerLinkedEditingRangeProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_linked_editing_range_provider", Selector, Provider),
	registerCallHierarchyProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_call_hierarchy_provider", Selector, Provider),
	registerTypeHierarchyProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_type_hierarchy_provider", Selector, Provider),
	registerEvaluatableExpressionProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_evaluatable_expression_provider", Selector, Provider),
	registerInlineValuesProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_inline_values_provider", Selector, Provider),
	registerSignatureHelpProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_signature_help_provider", Selector, Provider),
	registerDocumentHighlightProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_document_highlight_provider", Selector, Provider),
	registerCodeLensProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_code_lens_provider", Selector, Provider),
	registerRenameProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_rename_provider", Selector, Provider),
	registerFoldingRangeProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_folding_range_provider", Selector, Provider),
	registerSelectionRangeProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_selection_range_provider", Selector, Provider),
	registerDocumentSemanticTokensProvider: (Selector: any, Provider: any, _Legend: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_semantic_tokens_provider", Selector, Provider),
	registerInlayHintsProvider: (Selector: any, Provider: any) =>
		RegisterProvider(Context, LanguageProviderRegistry, "register_inlay_hints_provider", Selector, Provider),
	createDiagnosticCollection: (Name?: string) => {
		const Owner = Name ?? "default";
		const Store = new Map<string, unknown[]>();
		return {
			name: Owner,
			set: (UriOrEntries: unknown, Diagnostics?: unknown[]) => {
				// Two overloads: (uri, diagnostics) and (entries: [uri, diagnostics][])
				if (Array.isArray(UriOrEntries) && Diagnostics === undefined) {
					const Entries = UriOrEntries as Array<[unknown, unknown[]]>;
					for (const [Uri, D] of Entries) {
						Store.set(String(Uri), D ?? []);
					}
				} else {
					Store.set(String(UriOrEntries), Diagnostics ?? []);
				}
				// Single-shot Diagnostic.Set over the whole collection.
				Context.MountainClient?.sendRequest("Diagnostic.Set", [
					Owner,
					[...Store.entries()].map(([U, D]) => ({ uri: U, diagnostics: D })),
				]).catch(() => {});
			},
			delete: (Uri: unknown) => {
				Store.delete(String(Uri));
				Context.MountainClient?.sendRequest("Diagnostic.Set", [
					Owner,
					[...Store.entries()].map(([U, D]) => ({ uri: U, diagnostics: D })),
				]).catch(() => {});
			},
			clear: () => {
				Store.clear();
				Context.MountainClient?.sendRequest("Diagnostic.Clear", [Owner]).catch(
					() => {},
				);
			},
			forEach: (
				Callback: (Uri: unknown, Diagnostics: unknown[], Collection: unknown) => void,
			) => {
				const Self = null;
				for (const [Uri, Diagnostics] of Store) {
					Callback(Uri, Diagnostics, Self);
				}
			},
			get: (Uri: unknown): unknown[] => Store.get(String(Uri)) ?? [],
			has: (Uri: unknown): boolean => Store.has(String(Uri)),
			dispose: () => {
				Store.clear();
				Context.MountainClient?.sendRequest("Diagnostic.Clear", [Owner]).catch(
					() => {},
				);
			},
		};
	},
	getLanguages: async (): Promise<string[]> => {
		try {
			const Result = await Context.MountainClient?.sendRequest(
				"Languages.GetAll",
				[],
			);
			return Array.isArray(Result) ? (Result as string[]) : [];
		} catch {
			return [];
		}
	},
	setTextDocumentLanguage: async (Document: any, LanguageId: string) => {
		Context.SendToMountain("languages.setDocumentLanguage", {
			uri: Document?.uri?.toString?.() ?? "",
			languageId: LanguageId,
		}).catch(() => {});
		return Document;
	},
	match: (_Selector: any, _Document: any): number => 10,
	onDidChangeDiagnostics: (Listener: (...Arguments: any[]) => any) => {
		Context.Emitter.on("diagnostics.didChange", Listener);
		return {
			dispose: () => {
				Context.Emitter.off("diagnostics.didChange", Listener);
			},
		};
	},
	getDiagnostics: (_Resource?: unknown): unknown[] => [],
});

export default CreateLanguagesNamespace;
