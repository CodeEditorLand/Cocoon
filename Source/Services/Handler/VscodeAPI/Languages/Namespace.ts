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

	const Hydrated = StockToUri(Value;

	if (Hydrated) return Hydrated.toString(;

	const Rendered = String(Value;

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

// Module-level diagnostics store: owner → (uriKey → vscode.Diagnostic[]).
// Each DiagnosticCollection.set() mirrors into this store so getDiagnostics()
// can return real data without an async Mountain round-trip (T2.6 / C5).
const _AllDiagnostics = new Map<string, Map<string, unknown[]>>(;

/**
 * Helper: register a language provider with auto-handle,
 * notify Mountain, and return a disposable.
 *
 * `Extra` carries provider-specific metadata that Mountain needs to
 * forward to Monaco's `ILanguageFeaturesService.<feature>Provider`:
 *   - `triggerCharacters: string[]` for completion + signature-help
 *   - `firstTriggerCharacter` + `moreTriggerCharacter` for on-type
 *     formatting providers
 *   - `documentSelector` (full DocumentSelector array shape) for
 *     selectors that can't be flattened to a single language id
 *   - `metadata` arbitrary metadata for code-actions / inlay hints
 *
 * Without forwarding these, Monaco still receives the registration
 * but invokes the provider at the wrong moments: completion providers
 * don't fire on `.`, signature-help doesn't pop on `(`. Most extensions
 * appear to "work" until the user actually tries to invoke a feature.
 */
const RegisterProvider = (
	Context: HandlerContext,

	LanguageProviderRegistry: typeof import("../../../Language/Provider/Registry.js"),

	MethodName: string,

	Selector: any,

	Provider: any,

	Extra?: Record<string, unknown>,
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
		Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider;
	} catch {
		// RegisterAutoHandle should be infallible, but a future
		// implementation could throw on registry-full or duplicate
		// registration. Soft-fail to a noop disposable so the
		// extension's `disposables.push(...)` keeps working.
		return { dispose: () => {} };
	}

	// Normalise the selector to BOTH a flat language id (for callers
	// that only inspect a single field) AND the full selector array
	// (for the workbench's DocumentSelector matcher). Most providers
	// receive a single { language, scheme } object; vscode-languageclient
	// passes an array of those. Preserve both shapes when present.
	const NormaliseOne = (S: any) => {
		if (typeof S === "string") return { language: S };

		if (S && typeof S === "object") return S;

		return { language: "*" };
	};

	const SelectorArray = Array.isArray(Selector)
		? Selector.map(NormaliseOne)
		: [NormaliseOne(Selector)];

	const Language =
		typeof Selector === "string"
			? Selector
			: (SelectorArray[0]?.language ?? "*";

	Context.SendToMountain(MethodName, {
		handle: Handle,
		languageSelector: Language,
		documentSelector: SelectorArray,
		extensionId: "",
		...(Extra ?? {}),
	}).catch(() => {};

	return {
		dispose: () => {
			try {
				LanguageProviderRegistry.Unregister(Handle;
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
			...TriggerCharacters: string[]
		) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_completion_item_provider",

				Selector,

				Provider,

				{
					// VS Code's CompletionRegistry keys providers by their
					// trigger character set so the workbench's editor
					// contribution `SuggestController` knows when to fire
					// auto-suggest. Without forwarding these, completions
					// only ever fire on the universal Ctrl+Space, never on
					// the language-specific triggers (`.` for TS/JS, `:` for
					// CSS, `<` for HTML, ` ` for Tailwind, etc.) - which
					// makes the workbench feel completely broken even when
					// every other path is wired correctly.
					triggerCharacters: TriggerCharacters,
				},
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
		registerCodeActionsProvider: (
			Selector: any,

			Provider: any,

			Metadata?: {
				providedCodeActionKinds?: unknown[];

				documentation?: unknown[];
			},
		) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_code_actions_provider",

				Selector,

				Provider,

				{
					// VS Code's CodeAction registry uses `providedCodeActionKinds`
					// to filter which code-action providers run for which
					// requested kinds. Without this forwarding, ESLint's
					// `quickfix.eslint` provider is invoked for the `refactor`
					// menu (and vice versa), wasting CPU and producing wrong
					// menus.
					providedCodeActionKinds:
						Metadata?.providedCodeActionKinds ?? [],
					documentation: Metadata?.documentation ?? [],
				},
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

			FirstTrigger: string,
			...MoreTriggers: string[]
		) =>
			RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_on_type_formatting_provider",

				Selector,

				Provider,

				{
					// On-type formatting is invoked by Monaco when the user
					// types one of these chars. Without forwarding, JS/TS
					// auto-formatting on `;` and `}` (built-in) never fires,
					// and language-server-provided formatting (CSS `;`,
					// HTML `>`) silently misses.
					firstTriggerCharacter: FirstTrigger,
					moreTriggerCharacter: MoreTriggers,
				},
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
		registerSignatureHelpProvider: (
			Selector: any,

			Provider: any,
			...Metadata: unknown[]
		) => {
			// Stock VS Code's signature support has two registration shapes:
			//   registerSignatureHelpProvider(selector, provider, ...triggerChars)
			//   registerSignatureHelpProvider(selector, provider, metadata)
			// where `metadata` is `{ triggerCharacters, retriggerCharacters }`.
			// Both forms appear in the wild (older extensions still call the
			// varargs form). Detect and normalise.
			let TriggerCharacters: string[] = [];

			let RetriggerCharacters: string[] = [];

			if (
				Metadata.length === 1 &&
				typeof Metadata[0] === "object" &&
				Metadata[0] !== null
			) {
				const Meta = Metadata[0] as {
					triggerCharacters?: string[];

					retriggerCharacters?: string[];
				};

				TriggerCharacters = Array.isArray(Meta.triggerCharacters)

					? Meta.triggerCharacters
					: [];

				RetriggerCharacters = Array.isArray(Meta.retriggerCharacters)

					? Meta.retriggerCharacters
					: [];
			} else {
				TriggerCharacters = Metadata.filter(
					(M): M is string => typeof M === "string",
				;
			}

			return RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_signature_help_provider",

				Selector,

				Provider,

				{
					triggerCharacters: TriggerCharacters,
					retriggerCharacters: RetriggerCharacters,
				},
			;
		},
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
			;

			return RegisterProvider(
				Context,

				LanguageProviderRegistry,

				"register_workspace_symbol_provider",

				"*",

				Provider,
			;
		},
		createDiagnosticCollection: (Name?: string) => {
			const Owner = Name ?? "default";

			const Store = new Map<string, unknown[]>(;

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
					const Lower = Sev.toLowerCase(;

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

				const Start = Pos((Range as { start?: unknown }).start;

				const End = Pos((Range as { end?: unknown }).end;

				const RawMsg =
					typeof Obj.message === "string"
						? Obj.message
						: String(Obj.message ?? "";

				const Out: Record<string, unknown> = {
					severity: NormaliseSeverity(Obj.severity),

					// VS Code's _toMarker rejects empty message with
					// `if (!message) return undefined`, silently dropping
					// the marker. Substitute a fallback so diagnostics
					// without a human-readable message still appear.
					message: RawMsg.length > 0 ? RawMsg : "(diagnostic)",

					// `+ 1` converts vscode.Position (0-based) to
					// `IMarkerData` (1-based). See block comment above.
					startLineNumber: Start.line + 1,

					startColumn: Start.character + 1,

					endLineNumber: End.line + 1,

					endColumn: End.character + 1,
				};

				if (Obj.source !== undefined && Obj.source !== null) {
					Out.source = String(Obj.source;
				}

				if (Obj.code !== undefined && Obj.code !== null) {
					Out.code = Obj.code;
				}

				if (Array.isArray(Obj.tags)) {
					Out.tags = Obj.tags.filter((T) => typeof T === "number";
				}

				// Normalize vscode.DiagnosticRelatedInformation[] to the
				// flat IRelatedInformation[] shape that IMarkerService and
				// MarkersView expect. vscode shape: { location: { uri,
				// range: { start, end } }, message }. IRelatedInformation
				// shape: { resource (URI string), startLineNumber,
				// startColumn, endLineNumber, endColumn, message }.
				// The resource URI is revived to a real URI object in
				// Sky's InstallDiagnostics.ts before passing to changeOne.
				if (Array.isArray(Obj.relatedInformation)) {
					Out.relatedInformation = Obj.relatedInformation.map(
						(RI: any) => {
							const Loc = RI?.location ?? RI;

							const RIRange = Loc?.range ?? {};

							const RIStart = Pos(
								(RIRange as { start?: unknown }).start ??
									RIRange,
							;

							const RIEnd = Pos(
								(RIRange as { end?: unknown }).end ?? RIRange,
							);

							const RIUri = Loc?.uri ?? RI?.resource ?? null;

							return {
								resource:
									RIUri && typeof RIUri === "object"
										? RIUri
										: typeof RIUri === "string"
											? RIUri
											: null,
								message: String(RI?.message ?? ""),
								startLineNumber: RIStart.line + 1,
								startColumn: RIStart.character + 1,
								endLineNumber: RIEnd.line + 1,
								endColumn: RIEnd.character + 1,
							};
						},
					;
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
						Result.push(NormaliseDiagnostic(Item);
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
					//
					// Empty/undefined diagnostics DELETE the URI key instead
					// of storing `[]` (mirrors stock `ExtHostDiagnostics`
					// clearing semantics) - storing the empty array left
					// ghost `[uri, []]` entries in `getDiagnostics()`.
					// Cleared URIs still ship on the wire as `[uri, []]`
					// tuples so Mountain drops their markers.
					const ClearedKeys: string[] = [];

					const Apply = (Uri: unknown, D: unknown[] | undefined) => {
						const Key = UriKey(Uri;

						if (Array.isArray(D) && D.length > 0) {
							Store.set(Key, D;
						} else {
							Store.delete(Key;

							ClearedKeys.push(Key;
						}
					};

					if (
						Array.isArray(UriOrEntries) &&
						Diagnostics === undefined
					) {
						const Entries = UriOrEntries as Array<
							[unknown, unknown[]]
						>;

						for (const [Uri, D] of Entries) {
							Apply(Uri, D;
						}
					} else {
						Apply(UriOrEntries, Diagnostics;
					}

					// Mirror into the module-level cache so getDiagnostics()
					// returns real data without an async Mountain round-trip.
					// A fully-cleared owner is removed outright so it never
					// surfaces ghost entries.
					if (Store.size === 0) {
						_AllDiagnostics.delete(Owner;
					} else {
						_AllDiagnostics.set(Owner, new Map(Store);
					}

					Context.Emitter.emit("diagnostics.didChange", {
						uris: [...Store.keys(), ...ClearedKeys],
					};

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

						[
							...[...Store.entries()].map(([U, D]) => [
								U,

								NormaliseList(D),
							]),

							...ClearedKeys.map((U) => [U, []]),
						],
					]).catch(() => {};
				},

				delete: (Uri: unknown) => {
					Store.delete(UriKey(Uri);

					_AllDiagnostics.set(Owner, new Map(Store);

					Context.Emitter.emit("diagnostics.didChange", {
						uris: [UriKey(Uri)],
					};

					Context.MountainClient?.sendRequest("Diagnostic.Set", [
						Owner,

						[...Store.entries()].map(([U, D]) => [
							U,

							NormaliseList(D),
						]),
					]).catch(() => {};
				},

				clear: () => {
					if (Store.size === 0) return;

					Store.clear(;

					_AllDiagnostics.delete(Owner;

					Context.Emitter.emit("diagnostics.didChange", { uris: [] };

					Context.MountainClient?.sendRequest("Diagnostic.Clear", [
						Owner,
					]).catch(() => {};
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
							Callback(Uri, Diagnostics, Self;
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

					Store.clear(;

					Context.MountainClient?.sendRequest("Diagnostic.Clear", [
						Owner,
					]).catch(() => {};
				},
			};
		},

		getLanguages: async (): Promise<string[]> => {
			try {
				const Result = await Context.MountainClient?.sendRequest(
					"Languages.GetAll",

					[],
				;

				return Array.isArray(Result) ? (Result as string[]) : [];
			} catch {
				return [];
			}
		},

		setTextDocumentLanguage: async (Document: any, LanguageId: string) => {
			// Stock VS Code's `languages.setTextDocumentLanguage` returns
			// the SAME document object with `.languageId` updated, AND
			// fires `onDidOpenTextDocument` for the new language (so
			// language-server extensions register listeners for the new
			// language). Our local document cache must be updated in-line
			// or the extension reads stale state on the very next call.
			const Uri = Document?.uri?.toString?.() ?? "";

			Context.SendToMountain("languages.setDocumentLanguage", {
				uri: Uri,
				languageId: LanguageId,
			}).catch(() => {};

			// Mutate `Document.languageId` in place so the extension's
			// reference sees the new value, AND update the cached entry
			// in `__textDocuments`. The notification handler will fire
			// `onDidChangeTextDocument` from Mountain's side too, but
			// the in-memory update is what unblocks synchronous reads.
			try {
				if (Document && typeof Document === "object") {
					(Document as any).languageId = LanguageId;
				}

				const TextDocs = (Context as any).__textDocuments as
					| Array<{ uri?: any; languageId?: string }>
					| undefined;

				if (Array.isArray(TextDocs)) {
					const Match = TextDocs.find(
						(D) =>
							D?.uri?.toString?.() === Uri ||
							(D as any)?.fileName === Uri,
					;

					if (Match) (Match as any).languageId = LanguageId;
				}
			} catch {
				/* swallow - lookup failures don't poison the round-trip */
			}

			return Document;
		},

		// Per-language configuration (auto-closing pairs, comments, onEnterRules,
		// wordPattern, indentation). rust-analyzer calls this at activation with
		// its Rust-specific IndentAction rules. Forward through Mountain's
		// `set_language_configuration` gRPC notification so Sky can relay
		// to Monaco's `monaco.languages.setLanguageConfiguration(...)`.
		setLanguageConfiguration: (
			LanguageId: string,

			Configuration: unknown,
		): { dispose: () => void } => {
			Context.SendToMountain("set_language_configuration", {
				language: LanguageId,
				configuration: Configuration ?? {},
			}).catch(() => {};

			return {
				dispose: () => {
					// No Mountain-side undo for language config; no-op.
				},
			};
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
					const Value = ScoreOne(One;

					if (Value > Best) Best = Value;
				}

				return Best;
			}

			return ScoreOne(Selector;
		},

		onDidChangeDiagnostics: (Listener: (...Arguments: any[]) => any) => {
			Context.Emitter.on("diagnostics.didChange", Listener;

			return {
				dispose: () => {
					Context.Emitter.off("diagnostics.didChange", Listener;
				},
			};
		},

		getDiagnostics: (Resource?: unknown): unknown => {
			// Aggregate diagnostics from all owners stored in _AllDiagnostics.
			// Two call signatures (matching vscode.languages.getDiagnostics):
			//   getDiagnostics(uri)  → Diagnostic[]
			//   getDiagnostics()     → [Uri, Diagnostic[]][]
			if (Resource !== undefined) {
				const Key = UriKey(Resource;

				const Merged: unknown[] = [];

				for (const OwnerStore of _AllDiagnostics.values()) {
					const Diags = OwnerStore.get(Key;

					if (Diags) Merged.push(...Diags;
				}

				return Merged;
			}

			// No resource - return all [uri, diagnostics] pairs.
			const All = new Map<string, unknown[]>(;

			for (const OwnerStore of _AllDiagnostics.values()) {
				for (const [Uri, Diags] of OwnerStore.entries()) {
					const Existing = All.get(Uri;

					if (Existing) {
						Existing.push(...Diags;
					} else {
						All.set(Uri, [...Diags];
					}
				}
			}

			return [...All.entries()];
		},

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
			;

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
	};

export default CreateLanguagesNamespace;
