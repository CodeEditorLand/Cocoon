/**
 * @module Handler/VscodeAPI/LanguagesNamespace
 * @description
 * Factory for the vscode.languages namespace shim.
 * Provides: all register*Provider methods, createDiagnosticCollection,
 * getLanguages, match, onDidChangeDiagnostics, getDiagnostics.
 */

import GlobToRegex from "../../../Utility/GlobToRegex.js";
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
	const Language =
		typeof Selector === "string" ? Selector : (Selector?.language ?? "*");
	Context.SendToMountain(MethodName, {
		handle: Handle,
		language_selector: Language,
		extension_id: "",
	}).catch(() => {});
	return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
};

const CreateLanguagesNamespace = (
	Context: HandlerContext,
	LanguageProviderRegistry: typeof import("../../LanguageProviderRegistry.js"),
) => ({
	registerHoverProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_hover_provider",
			Selector,
			Provider,
		),
	registerCompletionItemProvider: (
		Selector: any,
		Provider: any,
		..._TriggerCharacters: string[]
	) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_completion_item_provider",
			Selector,
			Provider,
		),
	registerDefinitionProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_definition_provider",
			Selector,
			Provider,
		),
	registerReferenceProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_reference_provider",
			Selector,
			Provider,
		),
	registerCodeActionsProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_code_actions_provider",
			Selector,
			Provider,
		),
	registerDocumentSymbolProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_document_symbol_provider",
			Selector,
			Provider,
		),
	registerDocumentFormattingEditProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_document_formatting_provider",
			Selector,
			Provider,
		),
	registerDocumentRangeFormattingEditProvider: (
		Selector: any,
		Provider: any,
	) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_document_range_formatting_provider",
			Selector,
			Provider,
		),
	registerOnTypeFormattingEditProvider: (
		Selector: any,
		Provider: any,
		_FirstTrigger: string,
		..._MoreTriggers: string[]
	) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_on_type_formatting_provider",
			Selector,
			Provider,
		),
	registerTypeDefinitionProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_type_definition_provider",
			Selector,
			Provider,
		),
	registerImplementationProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_implementation_provider",
			Selector,
			Provider,
		),
	registerDeclarationProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_declaration_provider",
			Selector,
			Provider,
		),
	registerDocumentLinkProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_document_link_provider",
			Selector,
			Provider,
		),
	registerColorProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_color_provider",
			Selector,
			Provider,
		),
	registerLinkedEditingRangeProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_linked_editing_range_provider",
			Selector,
			Provider,
		),
	registerCallHierarchyProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_call_hierarchy_provider",
			Selector,
			Provider,
		),
	registerTypeHierarchyProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_type_hierarchy_provider",
			Selector,
			Provider,
		),
	registerEvaluatableExpressionProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_evaluatable_expression_provider",
			Selector,
			Provider,
		),
	registerInlineValuesProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_inline_values_provider",
			Selector,
			Provider,
		),
	registerSignatureHelpProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_signature_help_provider",
			Selector,
			Provider,
		),
	registerDocumentHighlightProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_document_highlight_provider",
			Selector,
			Provider,
		),
	registerCodeLensProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_code_lens_provider",
			Selector,
			Provider,
		),
	registerRenameProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_rename_provider",
			Selector,
			Provider,
		),
	registerFoldingRangeProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_folding_range_provider",
			Selector,
			Provider,
		),
	registerSelectionRangeProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_selection_range_provider",
			Selector,
			Provider,
		),
	registerDocumentSemanticTokensProvider: (
		Selector: any,
		Provider: any,
		_Legend: any,
	) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_semantic_tokens_provider",
			Selector,
			Provider,
		),
	registerInlayHintsProvider: (Selector: any, Provider: any) =>
		RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_inlay_hints_provider",
			Selector,
			Provider,
		),
	registerWorkspaceSymbolProvider: (Provider: any) => {
		process.stdout.write(
			"[LandFix:LangNs] registerWorkspaceSymbolProvider called\n",
		);
		return RegisterProvider(
			Context,
			LanguageProviderRegistry,
			"register_workspace_symbol_provider",
			"*",
			Provider,
		);
	},
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
					[...Store.entries()].map(([U, D]) => ({
						uri: U,
						diagnostics: D,
					})),
				]).catch(() => {});
			},
			delete: (Uri: unknown) => {
				Store.delete(String(Uri));
				Context.MountainClient?.sendRequest("Diagnostic.Set", [
					Owner,
					[...Store.entries()].map(([U, D]) => ({
						uri: U,
						diagnostics: D,
					})),
				]).catch(() => {});
			},
			clear: () => {
				Store.clear();
				Context.MountainClient?.sendRequest("Diagnostic.Clear", [
					Owner,
				]).catch(() => {});
			},
			forEach: (
				Callback: (
					Uri: unknown,
					Diagnostics: unknown[],
					Collection: unknown,
				) => void,
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
				Context.MountainClient?.sendRequest("Diagnostic.Clear", [
					Owner,
				]).catch(() => {});
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
	match: (Selector: any, Document: any): number => {
		// Implements VS Code's `languages.match(selector, document)` contract —
		// returns 0 for no match; higher numbers for better matches. Scoring
		// loosely mirrors `matchesSelector()` in `vs/editor/common/languageSelector.ts`:
		//   +5  exact language  |  +3  "*" wildcard
		//   +5  exact scheme    |  +3  "*" wildcard
		//   +5  glob pattern match
		//   +1  notebookType match
		// Arrays are reduced by MAX — returning the best-matching subselector.
		const DocLanguage =
			typeof Document?.languageId === "string" ? Document.languageId : "";
		const DocScheme =
			typeof Document?.uri?.scheme === "string"
				? Document.uri.scheme
				: "";
		const DocPath =
			typeof Document?.uri?.fsPath === "string"
				? Document.uri.fsPath
				: typeof Document?.uri?.path === "string"
					? Document.uri.path
					: "";

		const ScoreOne = (One: unknown): number => {
			if (typeof One === "string") {
				if (One === DocLanguage) return 10;
				if (One === "*") return 5;
				return 0;
			}
			if (!One || typeof One !== "object") return 0;
			const Filter = One as {
				language?: string;
				scheme?: string;
				pattern?: string;
				notebookType?: string;
			};
			let Score = 0;
			if (typeof Filter.language === "string") {
				if (Filter.language === DocLanguage) Score += 5;
				else if (Filter.language === "*") Score += 3;
				else return 0;
			}
			if (typeof Filter.scheme === "string") {
				if (Filter.scheme === DocScheme) Score += 5;
				else if (Filter.scheme === "*") Score += 3;
				else return 0;
			}
			if (typeof Filter.pattern === "string" && DocPath.length > 0) {
				try {
					if (GlobToRegex(Filter.pattern).test(DocPath)) Score += 5;
					else return 0;
				} catch {
					// Malformed pattern — treat as no-match rather than throwing.
					return 0;
				}
			}
			if (typeof Filter.notebookType === "string") {
				const NotebookType =
					typeof Document?.notebook?.notebookType === "string"
						? Document.notebook.notebookType
						: "";
				if (Filter.notebookType === NotebookType) Score += 1;
				else if (Filter.notebookType === "*") Score += 1;
				else return 0;
			}
			return Score;
		};

		if (Array.isArray(Selector)) {
			let Best = 0;
			for (const One of Selector) {
				const Value = ScoreOne(One);
				if (Value > Best) Best = Value;
			}
			return Best;
		}
		return ScoreOne(Selector);
	},
	onDidChangeDiagnostics: (Listener: (...Arguments: any[]) => any) => {
		Context.Emitter.on("diagnostics.didChange", Listener);
		return {
			dispose: () => {
				Context.Emitter.off("diagnostics.didChange", Listener);
			},
		};
	},
	getDiagnostics: (_Resource?: unknown): unknown[] => [],
	registerDocumentPasteEditProvider: (
		_Selector: unknown,
		_Provider: unknown,
		_Metadata?: unknown,
	) => ({ dispose: () => {} }),
	registerDocumentDropEditProvider: (
		_Selector: unknown,
		_Provider: unknown,
		_Metadata?: unknown,
	) => ({ dispose: () => {} }),
	registerInlineCompletionItemProvider: (
		_Selector: unknown,
		_Provider: unknown,
	) => ({ dispose: () => {} }),
	registerInlineEditProvider: (_Selector: unknown, _Provider: unknown) => ({
		dispose: () => {},
	}),
	registerMultiDocumentHighlightProvider: (
		_Selector: unknown,
		_Provider: unknown,
	) => ({ dispose: () => {} }),
	registerMappedEditsProvider: (_Selector: unknown, _Provider: unknown) => ({
		dispose: () => {},
	}),
	createLanguageStatusItem: (Identifier: string, _Selector: unknown) => {
		process.stdout.write(
			`[LandFix:LangNs] createLanguageStatusItem id=${Identifier}\n`,
		);
		const Item: Record<string, unknown> = {
			id: Identifier,
			name: undefined,
			selector: _Selector,
			severity: 0,
			text: "",
			detail: undefined,
			busy: false,
			command: undefined,
			accessibilityInformation: undefined,
			dispose: () => {},
		};
		return Item;
	},
});

export default CreateLanguagesNamespace;
