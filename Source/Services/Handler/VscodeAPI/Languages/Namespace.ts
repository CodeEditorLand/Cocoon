/**
 * @module Handler/VscodeAPI/LanguagesNamespace
 * @description
 * Factory for the vscode.languages namespace shim.
 * Provides: all register*Provider methods, createDiagnosticCollection,
 * getLanguages, match, onDidChangeDiagnostics, getDiagnostics.
 */

import GlobToRegex from "../../../../Utility/Glob/To/Regex.js";
import type { HandlerContext } from "../../Handler/Context.js";
import { ToUri as StockToUri } from "../Stock/Lift.js";
import WrapLanguagesNamespace from "../Wrap/Languages/Namespace.js";

/**
 * Serialise a URI-shape (real instance / POJO / string) to a stable
 * string key. Without this, POJO URIs collapse to `"[object Object]"`
 * under `String(uri)` and every diagnostic collection key collides,
 * silently merging errors across files.
 */
const UriKey = (Value: unknown): string => {
	if (Value == null) return "";

	if (typeof Value === "string") return Value;

	const Hydrated = StockToUri(Value);

	if (Hydrated) return Hydrated.toString();

	const Rendered = String(Value);

	if (Rendered && Rendered !== "[object Object]") return Rendered;

	const WithParts = Value as {
		scheme?: unknown;

		path?: unknown;

		fsPath?: unknown;
	};

	if (
		typeof WithParts.scheme === "string" &&
		typeof WithParts.path === "string"
	) {
		return `${WithParts.scheme}://${WithParts.path}`;
	}

	if (typeof WithParts.fsPath === "string")
		return `file://${WithParts.fsPath}`;

	return Rendered;
};

/**
 * Helper: register a language provider with auto-handle,
 * notify Mountain, and return a disposable.
 */
const RegisterProvider = (
	Context: HandlerContext,

	LanguageProviderRegistry: typeof import("../../../Language/Provider/Registry.js"),

	MethodName: string,

	Selector: any,

	Provider: any,
) => {
	// Defensive: if the extension passes `null`/`undefined` as a
	// provider (some extensions do this defensively when their feature
	// flags are off), don't register an empty handle - return a noop
	// disposable. Avoids subsequent provider lookups picking up a
	// `null` handler and crashing on `provider.provideHover` etc.
	if (Provider == null || typeof Provider !== "object") {
		return { dispose: () => {} };
	}

	let Handle: number;

	try {
		Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
	} catch {
		// RegisterAutoHandle should be infallible, but a future
		// implementation could throw on registry-full or duplicate
		// registration. Soft-fail to a noop disposable so the
		// extension's `disposables.push(...)` keeps working.
		return { dispose: () => {} };
	}

	const Language =
		typeof Selector === "string"
			? Selector
			: typeof Selector?.language === "string"
				? Selector.language
				: "*";

	Context.SendToMountain(MethodName, {
		handle: Handle,
		languageSelector: Language,
		extensionId: "",
	}).catch(() => {});

	return {
		dispose: () => {
			try {
				LanguageProviderRegistry.Unregister(Handle);
			} catch {
				/* registry already cleared on shutdown - swallow */
			}
		},
	};
};

const CreateLanguagesNamespace = (
	Context: HandlerContext,

	LanguageProviderRegistry: typeof import("../../../Language/Provider/Registry.js"),
) =>
	WrapLanguagesNamespace({
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
		registerDocumentFormattingEditProvider: (
			Selector: any,

			Provider: any,
		) =>
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
		// Range-variant of the semantic tokens API. DEVSENSE.phptools calls it
		// at activation; missing function crashes the provider registration
		// loop. Route through the same provider channel as the document-wide
		// variant - the Land side can't yet distinguish range vs full, so the
		// worst case is the provider computes tokens for the whole document.
		registerDocumentRangeSemanticTokensProvider: (
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

			// Normalise a `vscode.Diagnostic` (or LSP-shaped diagnostic, or
			// debug-string-severity diagnostic) to Mountain's
			// `MarkerDataDTO` shape:
			//   - `range` (nested) → flat `startLineNumber/startColumn/
			//     endLineNumber/endColumn` (1-based - mirrors stock VS
			//     Code's `extHostTypeConverters.ts:128` `start.line + 1`
			//     conversion. `IMarkerData` in `markerService.ts:243`
			//     clamps `startLineNumber > 0 ? startLineNumber : 1`,
			//     so any 0-based position lands on line 1, collapsing
			//     all line-0 diagnostics together and shifting every
			//     other diagnostic up by one row. Visible as red
			//     squiggles on the wrong line + the Problems panel
			//     mis-grouping markers under the wrong file row.)
			//   - `severity`: vscode enum (0-3) OR string label
			//     ("Error"/"Warning"/"Information"/"Hint") OR LSP integer
			//     (1-4) → Monaco `MarkerSeverity` bit values
			//     (Error=8, Warning=4, Info=2, Hint=1) which is what
			//     Mountain's `MarkerDataDTO::Severity:u32` deserialises.
			//
			// Without normalisation Mountain rejects every entry with
			// `invalid type: string "Warning", expected u32` and the
			// editor stays free of red squiggles even after the
			// wire-shape (object→tuple) fix landed.
			const NormaliseSeverity = (Sev: unknown): number => {
				if (typeof Sev === "number") {
					// vscode.DiagnosticSeverity: 0=Error, 1=Warning, 2=Info, 3=Hint
					switch (Sev) {
						case 0:
							return 8; // Error
						case 1:
							return 4; // Warning
						case 2:
							return 2; // Info
						case 3:
							return 1; // Hint
						// LSP DiagnosticSeverity: 1=Error, 2=Warning, 3=Info, 4=Hint
						// (only reached when caller passed pre-LSP form by mistake;
						// Monaco bit values 4/2/1/8 already covered above for the
						// vscode enum 1/2/3/0 - leaving the LSP form as a
						// best-effort fallthrough.)
						default:
							return Sev > 0 && Sev <= 8 ? Sev : 4;
					}
				}

				if (typeof Sev === "string") {
					const Lower = Sev.toLowerCase();

					if (Lower.startsWith("err")) return 8;

					if (Lower.startsWith("warn")) return 4;

					if (Lower.startsWith("info")) return 2;

					if (Lower.startsWith("hint")) return 1;

					return 4; // unknown label → warning by convention
				}

				return 4;
			};

			const Pos = (V: unknown): { line: number; character: number } => {
				const O = (V ?? {}) as { line?: number; character?: number };

				return {
					line: typeof O.line === "number" ? O.line : 0,

					character:
						typeof O.character === "number" ? O.character : 0,
				};
			};

			const NormaliseDiagnostic = (
				D: unknown,
			): Record<string, unknown> => {
				const Obj = (D ?? {}) as {
					range?: { start?: unknown; end?: unknown };

					severity?: unknown;

					message?: unknown;

					source?: unknown;

					code?: unknown;

					tags?: unknown;

					relatedInformation?: unknown;
				};

				const Range = Obj.range ?? {};

				const Start = Pos((Range as { start?: unknown }).start);

				const End = Pos((Range as { end?: unknown }).end);

				const Out: Record<string, unknown> = {
					severity: NormaliseSeverity(Obj.severity),

					message:
						typeof Obj.message === "string"
							? Obj.message
							: String(Obj.message ?? ""),

					// `+ 1` converts vscode.Position (0-based) to
					// `IMarkerData` (1-based). See block comment above.
					startLineNumber: Start.line + 1,

					startColumn: Start.character + 1,

					endLineNumber: End.line + 1,

					endColumn: End.character + 1,
				};

				if (Obj.source !== undefined && Obj.source !== null) {
					Out.source = String(Obj.source);
				}

				if (Obj.code !== undefined && Obj.code !== null) {
					Out.code = Obj.code;
				}

				if (Array.isArray(Obj.tags)) {
					Out.tags = Obj.tags.filter((T) => typeof T === "number");
				}

				if (Obj.relatedInformation !== undefined) {
					Out.relatedInformation = Obj.relatedInformation;
				}

				return Out;
			};

			// Per-item try/catch so a single malformed diagnostic
			// (extension passed an exotic shape, range with non-numeric
			// fields, message: Symbol(...), etc.) doesn't drop the
			// entire batch. Stock VS Code's MainThreadDiagnostics
			// rejects bad entries individually with `_toMarker
			// returning undefined` - we mirror that resilience here so
			// language extensions that emit a partially-broken
			// diagnostic stream still get the well-formed entries
			// rendered as squiggles.
			const NormaliseList = (
				List: unknown,
			): Record<string, unknown>[] => {
				if (!Array.isArray(List)) return [];

				const Result: Record<string, unknown>[] = [];

				for (const Item of List) {
					try {
						Result.push(NormaliseDiagnostic(Item));
					} catch {
						/* skip the bad entry; the rest of the batch
						 * is still valid */
					}
				}

				return Result;
			};

			// LSP clients (json-language-features and others) call `.clear()`
			// defensively on every doc-update cycle, which otherwise amplifies
			// to hundreds of Diagnostic.Clear RPCs per second for owner
			// `default`. Short-circuit when Store is already empty, and make
			// dispose() idempotent.
			let Disposed = false;

			return {
				name: Owner,

				set: (UriOrEntries: unknown, Diagnostics?: unknown[]) => {
					// Two overloads: (uri, diagnostics) and (entries: [uri, diagnostics][])
					if (
						Array.isArray(UriOrEntries) &&
						Diagnostics === undefined
					) {
						const Entries = UriOrEntries as Array<
							[unknown, unknown[]]
						>;

						for (const [Uri, D] of Entries) {
							Store.set(UriKey(Uri), D ?? []);
						}
					} else {
						Store.set(UriKey(UriOrEntries), Diagnostics ?? []);
					}

					// Single-shot Diagnostic.Set over the whole collection.
					// Wire shape MUST be a 2-tuple `[uri, markers]` (NOT
					// `{uri, diagnostics}`) - Mountain's
					// `DiagnosticProvider::SetDiagnostics` deserialises with
					// `Vec<(Value, Option<Vec<MarkerDataDTO>>)>` and rejects
					// the object form with `invalid type: map, expected a
					// tuple of size 2`. Sending the map form silently
					// dropped EVERY diagnostic - compiler errors, linter
					// warnings, type errors all invisible across every
					// language extension.
					Context.MountainClient?.sendRequest("Diagnostic.Set", [
						Owner,

						[...Store.entries()].map(([U, D]) => [
							U,

							NormaliseList(D),
						]),
					]).catch(() => {});
				},

				delete: (Uri: unknown) => {
					Store.delete(UriKey(Uri));

					Context.MountainClient?.sendRequest("Diagnostic.Set", [
						Owner,

						[...Store.entries()].map(([U, D]) => [
							U,

							NormaliseList(D),
						]),
					]).catch(() => {});
				},

				clear: () => {
					if (Store.size === 0) return;

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

					// Per-iteration try/catch so an extension callback
					// that throws on one URI doesn't terminate the
					// iteration over the rest. Stock VS Code's
					// `DiagnosticCollection.forEach` runs the callback
					// inside a try/catch with the same rationale - the
					// caller's bug shouldn't propagate into the
					// language-features API surface.
					for (const [Uri, Diagnostics] of Store) {
						try {
							Callback(Uri, Diagnostics, Self);
						} catch {
							/* extension callback bug - skip + continue */
						}
					}
				},

				get: (Uri: unknown): unknown[] => Store.get(UriKey(Uri)) ?? [],

				has: (Uri: unknown): boolean => Store.has(UriKey(Uri)),

				dispose: () => {
					if (Disposed) return;

					Disposed = true;

					if (Store.size === 0) return;

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

		// `match(selector, document)` - stable API used by extensions that
		// need to score a DocumentSelector against a document before doing
		// work (gitlens, copilot, prettier). Implements the same 0-10 rubric
		// as stock `vs/editor/common/languageSelector.ts::score`: a plain
		// language id match scores 10, a filter with language+scheme+pattern
		// sums each hit, `*` is 5, unrelated is 0. Good enough to keep
		// extensions from believing every document is unmatched.
		match: (Selector: unknown, Document: unknown): number => {
			const Doc = (Document ?? {}) as {
				languageId?: string;

				uri?: { scheme?: string; path?: string };
			};

			const ScoreOne = (Candidate: unknown): number => {
				if (typeof Candidate === "string") {
					if (Candidate === "*") return 5;

					return Candidate === Doc.languageId ? 10 : 0;
				}

				if (Candidate && typeof Candidate === "object") {
					const Filter = Candidate as {
						language?: string;

						scheme?: string;

						pattern?: string;

						notebookType?: string;
					};

					let Score = 0;

					if (Filter.language !== undefined) {
						if (Filter.language === "*") Score += 5;
						else if (Filter.language === Doc.languageId)
							Score += 10;
						else return 0;
					}

					if (Filter.scheme !== undefined) {
						if (Filter.scheme === "*") Score += 5;
						else if (Filter.scheme === Doc.uri?.scheme) Score += 10;
						else return 0;
					}

					if (Filter.pattern !== undefined) {
						// Pattern matching is expensive; bump score only on
						// substring match, which is a reasonable proxy that
						// avoids pulling in minimatch just for a shim.
						if (Doc.uri?.path?.includes(String(Filter.pattern)))
							Score += 5;
						else return 0;
					}

					return Score;
				}

				return 0;
			};

			if (Array.isArray(Selector)) {
				let Best = 0;

				for (const Candidate of Selector) {
					const Score = ScoreOne(Candidate);

					if (Score > Best) Best = Score;
				}

				return Best;
			}

			return ScoreOne(Selector);
		},

		setTextDocumentLanguage: async (Document: any, LanguageId: string) => {
			Context.SendToMountain("languages.setDocumentLanguage", {
				uri: Document?.uri?.toString?.() ?? "",
				languageId: LanguageId,
			}).catch(() => {});

			return Document;
		},

		// Per-language configuration (auto-closing pairs, comments, onEnterRules,
		// wordPattern, indentation). rust-analyzer calls this at activation with
		// its Rust-specific IndentAction rules. Land doesn't wire these through
		// Mountain yet; return a disposable so activation completes and the
		// contributed LSP still provides completions.
		setLanguageConfiguration: (
			_LanguageId: string,

			_Configuration: unknown,
		): { dispose: () => void } => {
			return { dispose: () => {} };
		},

		match: (Selector: any, Document: any): number => {
			// Implements VS Code's `languages.match(selector, document)` contract -
			// returns 0 for no match; higher numbers for better matches. Scoring
			// loosely mirrors `matchesSelector()` in `vs/editor/common/languageSelector.ts`:
			//   +5  exact language  |  +3  "*" wildcard
			//   +5  exact scheme    |  +3  "*" wildcard
			//   +5  glob pattern match
			//   +1  notebookType match
			// Arrays are reduced by MAX - returning the best-matching subselector.
			const DocLanguage =
				typeof Document?.languageId === "string"
					? Document.languageId
					: "";

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
						if (GlobToRegex(Filter.pattern).test(DocPath))
							Score += 5;
						else return 0;
					} catch {
						// Malformed pattern - treat as no-match rather than throwing.
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
			Selector: any,

			Provider: any,

			_Metadata?: unknown,
		) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_document_paste_edit_provider",

				Selector,

				Provider,
			),

		registerDocumentDropEditProvider: (
			Selector: any,

			Provider: any,

			_Metadata?: unknown,
		) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_document_drop_edit_provider",

				Selector,

				Provider,
			),

		registerInlineCompletionItemProvider: (Selector: any, Provider: any) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_inline_completion_item_provider",

				Selector,

				Provider,
			),

		registerInlineEditProvider: (Selector: any, Provider: any) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_inline_edit_provider",

				Selector,

				Provider,
			),

		registerMultiDocumentHighlightProvider: (
			Selector: any,

			Provider: any,
		) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_multi_document_highlight_provider",

				Selector,

				Provider,
			),

		registerMappedEditsProvider: (Selector: any, Provider: any) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_mapped_edits_provider",

				Selector,

				Provider,
			),

		// Proposed API. Language servers (rust-analyzer, pyright, TS) opt in
		// via `enabledApiProposals` to publish server-computed rename
		// candidates. Stub disposable keeps activation quiet; real wiring
		// routes through `registerRenameProvider` today for the stable path.
		registerNewSymbolNamesProvider: (
			_Selector: unknown,

			_Provider: unknown,
		) => ({ dispose: () => {} }),

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
