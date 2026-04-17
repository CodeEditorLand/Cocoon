/**
 * @module Handler/ExtensionHostHandler
 * @description
 * Handles extension host lifecycle methods from Mountain:
 * - InitializeExtensionHost — receives full init payload, builds registry
 * - $deltaExtensions — applies extension list diffs
 * - $activateByEvent — activates extensions matching an event
 * - $startExtensionHost — signals host should begin processing
 * - EnsureVscodeAPIRegistered — creates the vscode API shim
 * - ActivateExtension — loads and activates a single extension
 * - CreateExtensionContext — builds minimal VS Code ExtensionContext
 */

import type { HandlerContext } from "./HandlerContext.js";

import * as LanguageProviderRegistry from "../LanguageProviderRegistry.js";

/**
 * Handle InitializeExtensionHost from Mountain.
 * Receives the full IExtensionHostInitData payload (extensions list,
 * workspace, environment, telemetry, paths). Stores init data and
 * returns "initialized" so Mountain unblocks.
 */
const HandleInitializeExtensionHost = async (
	Context: HandlerContext,
	Parameters: any,
): Promise<string> => {
	const Extensions: any[] = Parameters?.extensions ?? [];

	console.log(
		`[ExtensionHostHandler] InitializeExtensionHost received ${Extensions.length} extensions`,
	);

	// Store init data for later use by extension activation
	Context.ExtensionHostInitData = Parameters;

	// Build extension registry and activation event index
	Context.ExtensionRegistry.clear();
	Context.ActivationEventIndex.clear();

	for (const Extension of Extensions) {
		const Identifier =
			Extension?.identifier?.value ??
			Extension?.identifier?.id ??
			Extension?.identifier ??
			"unknown";

		Context.ExtensionRegistry.set(Identifier, Extension);

		const ActivationEvents: string[] =
			Extension?.activationEvents ?? [];

		for (const Event of ActivationEvents) {
			const Existing = Context.ActivationEventIndex.get(Event) ?? [];
			Existing.push(Identifier);
			Context.ActivationEventIndex.set(Event, Existing);
		}
	}

	Context.ExtensionHostReady = true;

	console.log(
		`[ExtensionHostHandler] Extension registry: ${Context.ExtensionRegistry.size} extensions, ${Context.ActivationEventIndex.size} activation events`,
	);

	// Emit event so other Cocoon services can react
	Context.Emitter.emit("extensionHostInitialized", {
		extensionCount: Context.ExtensionRegistry.size,
		autoStart: Parameters?.autoStart ?? false,
	});

	// Mountain's gRPC is now confirmed running (it just called us).
	// Reconnect MountainClientService in the background so Cocoon can
	// send notifications back (provider registrations, extension host
	// messages, etc.). Fire-and-forget — don't block the response.
	Context.ConnectToMountain().catch((Error) => {
		console.warn(
			"[ExtensionHostHandler] Background Mountain reconnect failed:",
			Error instanceof globalThis.Error ? Error.message : String(Error),
		);
	});

	return "initialized";
};

/**
 * Handle $deltaExtensions from Mountain.
 * Receives extension list diffs (added/removed) after initial load.
 */
const HandleDeltaExtensions = async (
	Context: HandlerContext,
	Parameters: any,
): Promise<any> => {
	const Added: any[] = Parameters?.toAdd ?? [];
	const Removed: any[] = Parameters?.toRemove ?? [];

	console.log(
		`[ExtensionHostHandler] $deltaExtensions: +${Added.length} -${Removed.length}`,
	);

	// Add new extensions to registry
	for (const Extension of Added) {
		const Identifier =
			Extension?.identifier?.value ??
			Extension?.identifier?.id ??
			Extension?.identifier ??
			"unknown";

		Context.ExtensionRegistry.set(Identifier, Extension);

		const ActivationEvents: string[] =
			Extension?.activationEvents ?? [];

		for (const Event of ActivationEvents) {
			const Existing = Context.ActivationEventIndex.get(Event) ?? [];

			if (!Existing.includes(Identifier)) {
				Existing.push(Identifier);
				Context.ActivationEventIndex.set(Event, Existing);
			}
		}
	}

	// Remove extensions from registry
	for (const Extension of Removed) {
		const Identifier =
			Extension?.identifier?.value ??
			Extension?.identifier?.id ??
			Extension?.identifier ??
			"unknown";

		Context.ExtensionRegistry.delete(Identifier);
	}

	Context.Emitter.emit("deltaExtensions", { added: Added.length, removed: Removed.length });

	return {
		success: true,
		registrySize: Context.ExtensionRegistry.size,
	};
};

/**
 * Handle $activateByEvent from Mountain.
 * Activates all extensions that declare the given activation event.
 */
const HandleActivateByEvent = async (
	Context: HandlerContext,
	Parameters: any,
): Promise<any> => {
	// Ensure the vscode API shim is available before any extension loads
	await EnsureVscodeAPIRegistered(Context);

	const ActivationEvent =
		typeof Parameters === "string"
			? Parameters
			: Parameters?.activationEvent ?? Parameters?.event ?? "*";

	// For "*" we activate all extensions that have any activation event.
	// For a specific event we activate matching ones AND "*" ones.
	let MatchingExtensions: string[];
	if (ActivationEvent === "*") {
		// Collect all extensions across every event bucket (deduplicated)
		const All = new Set<string>();
		for (const Ids of Context.ActivationEventIndex.values()) {
			for (const Id of Ids) All.add(Id);
		}
		MatchingExtensions = [...All];
	} else {
		const Specific = Context.ActivationEventIndex.get(ActivationEvent) ?? [];
		const Star = Context.ActivationEventIndex.get("*") ?? [];
		MatchingExtensions = [...new Set([...Specific, ...Star])];
	}

	console.log(
		`[ExtensionHostHandler] $activateByEvent: ${ActivationEvent} → ${MatchingExtensions.length} extensions`,
	);
	if (MatchingExtensions.length > 0) {
		console.log(
			`[ExtensionHostHandler] Activating: ${MatchingExtensions.slice(0, 5).join(", ")}${MatchingExtensions.length > 5 ? ` (+${MatchingExtensions.length - 5} more)` : ""}`,
		);
	} else {
		console.log(
			`[ExtensionHostHandler] Available events: ${[...Context.ActivationEventIndex.keys()].slice(0, 10).join(", ")}${Context.ActivationEventIndex.size > 10 ? ` (+${Context.ActivationEventIndex.size - 10} more)` : ""}`,
		);
	}

	// Fire-and-forget — activate each matching extension asynchronously.
	// We cap concurrent activations to avoid flooding the event loop.
	const ToActivate = MatchingExtensions.filter(Id => !Context.ActivatedExtensions.has(Id));
	console.log(`[ExtensionHostHandler] $activateByEvent: ${ToActivate.length} new activations (${MatchingExtensions.length - ToActivate.length} already active)`);

	for (const ExtId of ToActivate) {
		ActivateExtension(Context, ExtId, ActivationEvent).catch((Err: unknown) => {
			const Msg = Err instanceof Error ? Err.message : String(Err);
			console.warn(`[ExtensionHostHandler] Activation failed for ${ExtId}: ${Msg}`);
		});
	}

	// Keep legacy event for any listeners
	Context.Emitter.emit("activateByEvent", {
		event: ActivationEvent,
		extensions: MatchingExtensions,
	});

	return {
		success: true,
		activated: ToActivate.length,
	};
};

/**
 * Handle $startExtensionHost from Mountain.
 * Signals that the extension host should begin processing.
 */
const HandleStartExtensionHost = async (
	Context: HandlerContext,
	Parameters: any,
): Promise<any> => {
	console.log(
		`[ExtensionHostHandler] $startExtensionHost received (registry: ${Context.ExtensionRegistry.size} extensions)`,
	);

	Context.Emitter.emit("startExtensionHost", {
		extensionCount: Context.ExtensionRegistry.size,
		ready: Context.ExtensionHostReady,
	});

	return {
		success: true,
		ready: Context.ExtensionHostReady,
		extensionCount: Context.ExtensionRegistry.size,
	};
};

/**
 * Imperatively patch Node.js `Module._load` and ESM resolution so that both
 * `require('vscode')` and `import 'vscode'` return our API shim. Runs exactly
 * once per process, keyed by a global flag, and is idempotent against Effect
 * Bootstrap's Stage 4 (which may run in degraded mode and skip module
 * interception entirely).
 *
 * This is deliberately side-effecting and synchronous for the CJS path — by
 * the time we activate extensions we *must* have `require('vscode')` working.
 */
const InstallVscodeModuleHooks = async (): Promise<void> => {
	if ((globalThis as any).__cocoonModuleHooksInstalled) return;
	(globalThis as any).__cocoonModuleHooksInstalled = true;

	// Cocoon runs as an ESM bundle (bundle: true in ESBuild). Bare `require`
	// is not defined here — we must go through createRequire. This is what
	// failed Effect-TS Stage 4 in past runs.
	const ModuleModule = await import("module");
	const CreateRequire = ModuleModule.createRequire;
	const LocalRequire = CreateRequire(import.meta.url);

	try {
		// CJS path: patch Module._load so any require('vscode') returns the shim.
		const NodeModule = LocalRequire("module") as typeof import("module") & {
			_load: (Request: string, Parent: unknown, IsMain: boolean) => unknown;
		};
		const OriginalLoad = NodeModule._load;
		NodeModule._load = function PatchedLoad(
			Request: string,
			Parent: unknown,
			IsMain: boolean,
		): unknown {
			if (Request === "vscode") {
				const API = (globalThis as any).__cocoonVscodeAPI;
				if (API) return API;
				console.warn(
					"[ExtensionHostHandler] require('vscode') called before shim registered — returning empty namespace",
				);
				return {};
			}
			return OriginalLoad.call(this, Request, Parent, IsMain);
		};
		console.log(
			"[ExtensionHostHandler] Module._load hook installed — require('vscode') intercepted",
		);
	} catch (Err: unknown) {
		console.warn(
			"[ExtensionHostHandler] Failed to patch Module._load:",
			Err instanceof Error ? Err.message : String(Err),
		);
	}

	try {
		// ESM path: register a loader that resolves `import 'vscode'` to a
		// virtual data: URL re-exporting globalThis.__cocoonVscodeAPI.
		// Node.js 20.6+ supports `module.register()` from inside the main
		// process. Older Node silently no-ops — CJS path still works.
		const NodeModule = LocalRequire("module") as {
			register?: (
				specifier: string | URL,
				parentURL: string | URL,
				options?: { data?: unknown },
			) => void;
		};
		if (typeof NodeModule.register === "function") {
			// The bridge module source exports every named member the VS Code
			// API surface has. Extensions doing `import { commands } from 'vscode'`
			// or `import * as vscode from 'vscode'` both resolve correctly. Each
			// exported binding reads through to `globalThis.__cocoonVscodeAPI`
			// at runtime — so as long as the shim is registered before ESM
			// evaluation, the exports are live.
			const VscodeExportNames = [
				// Namespaces
				"window", "workspace", "commands", "languages", "extensions",
				"env", "debug", "tasks", "scm", "authentication", "l10n",
				"notebooks", "tests", "comments", "chat", "lm", "interactive",
				// Type constructors
				"Position", "Range", "Location", "LocationLink", "Selection",
				"MarkdownString", "Hover", "CompletionItem", "CompletionItemKind",
				"CompletionItemTag", "CompletionList", "CompletionTriggerKind",
				"Diagnostic", "DiagnosticSeverity", "DiagnosticTag",
				"DiagnosticRelatedInformation", "TextEdit", "WorkspaceEdit",
				"SnippetString", "SnippetTextEdit", "SymbolKind", "SymbolTag",
				"SymbolInformation", "DocumentSymbol", "CodeActionKind",
				"CodeAction", "CodeActionTriggerKind", "CodeLens",
				"SignatureHelp", "SignatureHelpTriggerKind",
				"SignatureInformation", "ParameterInformation",
				"InlayHint", "InlayHintKind", "InlayHintLabelPart",
				"FoldingRange", "FoldingRangeKind",
				"DocumentHighlight", "DocumentHighlightKind",
				"SelectionRange", "SemanticTokensLegend",
				"SemanticTokensBuilder", "SemanticTokens",
				"SemanticTokensEdit", "SemanticTokensEdits",
				"RelativePattern", "Disposable",
				"StatusBarAlignment", "ThemeColor", "ThemeIcon",
				"TreeItem", "TreeItemCollapsibleState", "TreeItemCheckboxState",
				"ViewColumn", "EndOfLine", "ConfigurationTarget",
				"Uri", "CancellationTokenSource", "CancellationError",
				"EventEmitter", "FileType", "FilePermission",
				"FileSystemError", "DataTransfer", "DataTransferItem",
				"TextDocumentChangeReason", "TextDocumentSaveReason",
				"TextEditorCursorStyle", "TextEditorLineNumbersStyle",
				"TextEditorRevealType", "TextEditorSelectionChangeKind",
				"DecorationRangeBehavior", "OverviewRulerLane",
				"ColorPresentation", "ColorInformation", "Color",
				"QuickPickItemKind", "InputBoxValidationSeverity",
				"ProgressLocation", "NotebookCellData", "NotebookCellKind",
				"NotebookCellOutput", "NotebookCellOutputItem",
				"NotebookData", "NotebookEdit", "NotebookRange",
				"TestRunProfileKind", "TestMessage", "TestRunRequest",
				"TestTag", "DebugAdapterExecutable", "DebugAdapterInlineImplementation",
				"DebugAdapterNamedPipeServer", "DebugAdapterServer",
				"Breakpoint", "FunctionBreakpoint", "SourceBreakpoint",
				"TerminalLink", "TerminalLocation", "TerminalProfile",
				"TaskGroup", "TaskScope", "TaskRevealKind", "TaskPanelKind",
				"ShellExecution", "ProcessExecution", "CustomExecution", "Task",
				"CommentMode", "CommentThreadCollapsibleState",
				"CommentThreadState", "ExtensionKind", "ExtensionMode",
				"UIKind", "LogLevel", "LanguageStatusSeverity",
				"TextSearchContext", "TextSearchMatch",
				"DocumentLink", "LinkedEditingRanges",
				"EvaluatableExpression", "InlineValueText",
				"InlineValueVariableLookup", "InlineValueEvaluatableExpression",
				"TypeHierarchyItem", "CallHierarchyItem",
				"CallHierarchyIncomingCall", "CallHierarchyOutgoingCall",
				// Fields
				"version",
			];
			const NamedExports = VscodeExportNames
				.map((Name) => `export const ${Name} = API.${Name};`)
				.join("\n");
			// The virtual bridge module. Reads once at evaluation time, which
			// happens after EnsureVscodeAPIRegistered sets `__cocoonVscodeAPI`,
			// because $activateByEvent triggers EnsureVscodeAPIRegistered
			// before any extension ESM source is loaded.
			const BridgeSource = [
				"const API = globalThis.__cocoonVscodeAPI || {};",
				NamedExports,
				"export default API;",
				"export const __esModule = true;",
			].join("\n");
			const LoaderSource = `
				const BRIDGE_URL = 'vscode-shim:///vscode';
				const BRIDGE_SOURCE = ${JSON.stringify(BridgeSource)};
				export async function resolve(Specifier, Context, NextResolve) {
					if (Specifier === 'vscode') {
						return { url: BRIDGE_URL, shortCircuit: true, format: 'module' };
					}
					return NextResolve(Specifier, Context);
				}
				export async function load(Url, Context, NextLoad) {
					if (Url === BRIDGE_URL) {
						return { format: 'module', source: BRIDGE_SOURCE, shortCircuit: true };
					}
					return NextLoad(Url, Context);
				}
			`;
			const LoaderURL = `data:text/javascript;base64,${Buffer.from(LoaderSource).toString("base64")}`;
			try {
				NodeModule.register(LoaderURL, import.meta.url);
				console.log(
					"[ExtensionHostHandler] ESM loader registered — import 'vscode' intercepted",
				);
			} catch (RegisterErr: unknown) {
				console.warn(
					"[ExtensionHostHandler] module.register failed (ESM imports of 'vscode' will fail):",
					RegisterErr instanceof Error ? RegisterErr.message : String(RegisterErr),
				);
			}
		}
	} catch (Err: unknown) {
		console.warn(
			"[ExtensionHostHandler] ESM loader setup skipped:",
			Err instanceof Error ? Err.message : String(Err),
		);
	}
};

/**
 * Create a vscode API shim and register it on globalThis so the Module._load
 * hook can return it when extensions call require('vscode').
 * Uses real VS Code type constructors from @codeeditorland/output.
 * Namespace implementations live in VscodeAPI/*.ts for maintainability.
 */
const EnsureVscodeAPIRegistered = async (
	Context: HandlerContext,
): Promise<void> => {
	// Install hooks *before* anything else — idempotent, runs once.
	await InstallVscodeModuleHooks();

	if ((globalThis as any).__cocoonVscodeAPI) return;

	try {
		const VsCodeTypes = await import(
			"@codeeditorland/output/vs/workbench/api/common/extHostTypes"
		);
		const { URI } = await import(
			"@codeeditorland/output/vs/base/common/uri"
		);
		const { CancellationTokenSource } = await import(
			"@codeeditorland/output/vs/base/common/cancellation"
		);
		const { Emitter } = await import(
			"@codeeditorland/output/vs/base/common/event"
		);

		// Spread every named export from extHostTypes — classes, enums,
		// constants — so extensions that do `class X extends vscode.Y`
		// or `vscode.SomeEnum.Value` find the symbol. Explicit overrides
		// after the spread take precedence (Uri, CancellationTokenSource,
		// EventEmitter come from separate VS Code modules).
		// LogLevel is declared in `platform/log/common/log` — not in
		// extHostTypes — so the spread above misses it. Git/GitHub etc.
		// read `LogLevel[2]` (reverse enum lookup for "Debug") at init.
		const LogLevelEnum: Record<string | number, string | number> = {
			Off: 0,
			Trace: 1,
			Debug: 2,
			Info: 3,
			Warning: 4,
			Error: 5,
			0: "Off",
			1: "Trace",
			2: "Debug",
			3: "Info",
			4: "Warning",
			5: "Error",
		};

		const API: Record<string, unknown> = {
			...(VsCodeTypes as unknown as Record<string, unknown>),
			version: "1.88.0",
			Uri: URI,
			CancellationTokenSource,
			EventEmitter: Emitter,
			LogLevel: LogLevelEnum,
			// Namespaces — each in its own file under VscodeAPI/
			window: (await import("./VscodeAPI/WindowNamespace.js")).default(Context),
			workspace: (await import("./VscodeAPI/WorkspaceNamespace.js")).default(Context),
			commands: (await import("./VscodeAPI/CommandsNamespace.js")).default(Context, LanguageProviderRegistry),
			languages: (await import("./VscodeAPI/LanguagesNamespace.js")).default(Context, LanguageProviderRegistry),
			extensions: (await import("./VscodeAPI/ExtensionsNamespace.js")).default(Context),
			env: (await import("./VscodeAPI/EnvNamespace.js")).default(Context),
			debug: (await import("./VscodeAPI/DebugNamespace.js")).default(Context),
			tasks: (await import("./VscodeAPI/TasksNamespace.js")).default(Context),
			scm: (await import("./VscodeAPI/ScmNamespace.js")).default(Context),
			authentication: (await import("./VscodeAPI/AuthenticationNamespace.js")).default(Context),
			// Lightweight stub namespaces — no Mountain route yet, returns
			// safe defaults so extensions that reference them don't crash.
			l10n: {
				t: (Message: unknown, ...Arguments: unknown[]): string => {
					// vscode.l10n.t supports (string, ...args) and
					// ({ message, args, comment }, ...) signatures.
					const Raw =
						typeof Message === "string"
							? Message
							: (Message as { message?: string })?.message ?? String(Message);
					if (!Arguments.length) return Raw;
					return Raw.replace(/\{(\d+)\}/g, (_Match, Index: string) => {
						const Replacement = Arguments[Number(Index)];
						return Replacement === undefined ? "" : String(Replacement);
					});
				},
				bundle: undefined,
				uri: undefined,
			},
			notebooks: {
				createNotebookController: () => ({
					id: "",
					notebookType: "",
					supportedLanguages: [] as string[],
					label: "",
					supportsExecutionOrder: false,
					executeHandler: () => {},
					dispose: () => {},
					createNotebookCellExecution: () => ({
						start: () => {},
						end: () => {},
						replaceOutput: async () => {},
						appendOutput: async () => {},
						clearOutput: async () => {},
						replaceOutputItems: async () => {},
						appendOutputItems: async () => {},
						executionOrder: undefined,
					}),
					onDidChangeSelectedNotebooks: () => ({ dispose: () => {} }),
					updateNotebookAffinity: () => {},
				}),
				registerNotebookCellStatusBarItemProvider: () => ({ dispose: () => {} }),
				registerNotebookSerializer: () => ({ dispose: () => {} }),
				registerRendererCommunication: () => ({ dispose: () => {} }),
				createRendererMessaging: () => ({
					postMessage: async () => false,
					onDidReceiveMessage: () => ({ dispose: () => {} }),
				}),
				onDidChangeNotebookCellExecutionState: () => ({ dispose: () => {} }),
			},
			lm: {
				registerTool: () => ({ dispose: () => {} }),
				invokeTool: async () => ({ content: [] }),
				selectChatModels: async () => [] as unknown[],
				registerChatModelProvider: () => ({ dispose: () => {} }),
				tools: [] as unknown[],
				onDidChangeChatModels: () => ({ dispose: () => {} }),
			},
			chat: {
				createChatParticipant: () => ({
					id: "",
					iconPath: undefined,
					requester: undefined,
					dispose: () => {},
					followupProvider: undefined,
					onDidReceiveFeedback: () => ({ dispose: () => {} }),
				}),
				registerChatVariableResolver: () => ({ dispose: () => {} }),
				registerMappedEditsProvider: () => ({ dispose: () => {} }),
				registerChatOutputRenderer: () => ({ dispose: () => {} }),
				registerRelatedFilesProvider: () => ({ dispose: () => {} }),
				registerChatSessionProvider: () => ({ dispose: () => {} }),
				registerChatSessionItemProvider: () => ({ dispose: () => {} }),
			},
			tests: {
				createTestController: () => ({
					id: "",
					label: "",
					items: { size: 0, replace: () => {}, forEach: () => {}, add: () => {}, delete: () => {}, get: () => undefined },
					createRunProfile: () => ({ dispose: () => {} }),
					resolveHandler: undefined,
					refreshHandler: undefined,
					createTestItem: () => ({}),
					createTestRun: () => ({
						enqueued: () => {},
						started: () => {},
						skipped: () => {},
						failed: () => {},
						errored: () => {},
						passed: () => {},
						end: () => {},
						appendOutput: () => {},
						token: { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) },
					}),
					dispose: () => {},
				}),
			},
			comments: {
				createCommentController: () => ({
					id: "",
					label: "",
					commentingRangeProvider: undefined,
					reactionHandler: undefined,
					options: undefined,
					createCommentThread: () => ({
						uri: undefined,
						range: undefined,
						comments: [] as unknown[],
						collapsibleState: 0,
						canReply: true,
						contextValue: undefined,
						label: undefined,
						state: undefined,
						dispose: () => {},
					}),
					dispose: () => {},
				}),
			},
			interactive: {
				registerInteractiveEditorSessionProvider: () => ({ dispose: () => {} }),
				transferActiveChat: async () => {},
			},
		};

		(globalThis as any).__cocoonVscodeAPI = API;
		console.log("[ExtensionHostHandler] vscode API shim registered on globalThis.__cocoonVscodeAPI");
		// Diagnostic: log which critical base classes are resolved at shim
		// registration time. vscode-languageclient does
		// `class X extends vscode.Diagnostic {}` at module-load time; if any
		// of these are undefined at that point the language-features
		// extensions fail to activate with "Class extends value undefined".
		const CriticalNames = [
			"Diagnostic", "CodeAction", "CodeLens", "CompletionItem",
			"SymbolInformation", "DocumentLink", "TypeHierarchyItem",
			"CallHierarchyItem", "SemanticTokensBuilder", "SemanticTokens",
			"RelativePattern", "Position", "Range", "Hover", "LogLevel",
		];
		const Missing = CriticalNames.filter((Name) => API[Name] === undefined);
		if (Missing.length) {
			console.warn(
				`[ExtensionHostHandler] vscode API shim missing critical symbols: ${Missing.join(", ")}`,
			);
		} else {
			console.log(
				"[ExtensionHostHandler] vscode API shim critical symbols OK",
			);
		}
	} catch (Err: unknown) {
		console.warn(
			"[ExtensionHostHandler] Failed to create vscode API shim:",
			Err instanceof Error ? Err.message : String(Err),
		);
	}
};

/**
 * Load and activate a single extension from disk.
 * Expects extensionRegistry entries from Mountain's InitializeExtensionHost.
 */
const ActivateExtension = async (
	Context: HandlerContext,
	ExtensionId: string,
	ActivationEvent: string,
): Promise<void> => {
	// Guard: only activate once
	if (Context.ActivatedExtensions.has(ExtensionId)) return;
	Context.ActivatedExtensions.add(ExtensionId);

	const Extension = Context.ExtensionRegistry.get(ExtensionId);
	if (!Extension) return;

	// Mountain sends ExtensionLocation as a file:// URL (from url::Url::from_directory_path)
	const LocationRaw: unknown =
		Extension?.ExtensionLocation ??
		Extension?.extensionLocation ??
		Extension?.location?.path ??
		Extension?.location;
	const MainFile: string | undefined = Extension?.main ?? Extension?.Main;

	// Declarative extensions (themes, grammars) have no main — mark activated and return.
	if (!LocationRaw || !MainFile) {
		return;
	}

	// Convert file:// URL to filesystem path
	let ExtensionPath: string;
	try {
		ExtensionPath = new URL(String(LocationRaw)).pathname.replace(/\/$/, "");
	} catch {
		ExtensionPath = String(LocationRaw).replace(/^file:\/\//, "").replace(/\/$/, "");
	}

	const ModulePath = `${ExtensionPath}/${MainFile}`;

	// Inspect package.json to determine CJS vs ESM. If type === "module" OR
	// the main file has an .mjs extension, we must use dynamic import(). CJS
	// require() would throw ERR_REQUIRE_ESM for ESM modules.
	const ModuleType: string | undefined = Extension?.type ?? Extension?.Type;
	const IsESM =
		ModuleType === "module" ||
		/\.mjs$/i.test(MainFile) ||
		/\.mts$/i.test(MainFile);

	console.log(
		`[ExtensionHostHandler] Loading ${ExtensionId} (${IsESM ? "ESM" : "CJS"}) from ${ModulePath}`,
	);

	try {
		let ExtModule: { activate?: (ctx: unknown) => unknown };

		if (IsESM) {
			// Dynamic import resolves file extensions and handles ESM natively.
			// Prefer file:// URL to avoid Windows drive-letter quirks.
			const ImportURL = ModulePath.startsWith("/")
				? `file://${ModulePath}`
				: ModulePath;
			ExtModule = (await import(ImportURL)) as typeof ExtModule;
		} else {
			const { createRequire } = await import("module");
			const Require = createRequire(import.meta.url);
			try {
				// Module._load is patched above — require('vscode') returns our API shim.
				ExtModule = Require(ModulePath) as typeof ExtModule;
			} catch (RequireErr: unknown) {
				// Fallback for extensions whose main is actually ESM despite
				// no `"type": "module"` field — try dynamic import().
				const Msg =
					RequireErr instanceof Error ? RequireErr.message : String(RequireErr);
				if (/ERR_REQUIRE_ESM|Cannot use import statement/i.test(Msg)) {
					const ImportURL = ModulePath.startsWith("/")
						? `file://${ModulePath}`
						: ModulePath;
					ExtModule = (await import(ImportURL)) as typeof ExtModule;
				} else {
					throw RequireErr;
				}
			}
		}

		// ESM default export may wrap the activate function.
		const ActivateFn =
			typeof ExtModule?.activate === "function"
				? ExtModule.activate
				: typeof (ExtModule as any)?.default?.activate === "function"
					? (ExtModule as any).default.activate
					: undefined;

		if (typeof ActivateFn === "function") {
			const ExtContext = CreateExtensionContext(Context, Extension, ExtensionPath);
			await ActivateFn(ExtContext);
			console.log(
				`[ExtensionHostHandler] ${ExtensionId} activated (event: ${ActivationEvent})`,
			);
		} else {
			console.warn(
				`[ExtensionHostHandler] ${ExtensionId} loaded but no activate() function found`,
			);
		}
	} catch (Err: unknown) {
		// Remove from set so a retry is possible
		Context.ActivatedExtensions.delete(ExtensionId);
		throw Err;
	}
};

/**
 * Build a minimal VS Code ExtensionContext for activating an extension.
 */
const CreateExtensionContext = (
	Context: HandlerContext,
	Extension: any,
	ExtensionPath: string,
): unknown => {
	const ExtId: string =
		Extension?.identifier?.value ??
		Extension?.identifier?.id ??
		Extension?.identifier ??
		"";

	// Resolve real storage paths for the extension
	const HomeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "/tmp";
	const StorageBase = `${HomeDir}/.codeeditorland/extensions/storage`;
	const GlobalStorageBase = `${HomeDir}/.codeeditorland/globalStorage`;
	const LogBase = `${HomeDir}/.codeeditorland/logs`;
	const ExtStoragePath = `${StorageBase}/${ExtId}`;
	const GlobalStoragePath = `${GlobalStorageBase}/${ExtId}`;
	const LogPath = `${LogBase}/${ExtId}`;

	// Ensure directories exist (fire-and-forget)
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Fs = require("node:fs");
		Fs.mkdirSync(ExtStoragePath, { recursive: true });
		Fs.mkdirSync(GlobalStoragePath, { recursive: true });
		Fs.mkdirSync(LogPath, { recursive: true });
	} catch {}

	const MakeUri = (Path: string) => ({
		scheme: "file",
		path: Path,
		fsPath: Path,
		authority: "",
		query: "",
		fragment: "",
		with: () => ({}),
		toString: () => `file://${Path}`,
	});

	return {
		subscriptions: [] as { dispose(): unknown }[],
		extensionPath: ExtensionPath,
		extensionUri: MakeUri(ExtensionPath),
		globalState: {
			get: (_Key: string, DefaultValue?: unknown) => DefaultValue,
			update: async (_Key: string, _Value: unknown) => {},
			keys: () => [] as string[],
			setKeysForSync: (_Keys: string[]) => {},
		},
		workspaceState: {
			get: (_Key: string, DefaultValue?: unknown) => DefaultValue,
			update: async (_Key: string, _Value: unknown) => {},
			keys: () => [] as string[],
		},
		secrets: {
			get: async (Key: string) => {
				try {
					return await Context.MountainClient?.sendRequest("secrets.get", { key: Key }) as string | undefined;
				} catch { return undefined; }
			},
			store: async (Key: string, Value: string) => {
				try { await Context.MountainClient?.sendRequest("secrets.store", { key: Key, value: Value }); } catch {}
			},
			delete: async (Key: string) => {
				try { await Context.MountainClient?.sendRequest("secrets.delete", { key: Key }); } catch {}
			},
			onDidChange: (_Listener: unknown) => ({ dispose: () => {} }),
		},
		environmentVariableCollection: {
			persistent: true,
			description: undefined,
			append: () => {},
			prepend: () => {},
			replace: () => {},
			get: () => undefined,
			forEach: () => {},
			delete: () => {},
			clear: () => {},
			getScoped: () => ({}),
			[Symbol.iterator]: () => ([] as unknown[]).values(),
		},
		storagePath: ExtStoragePath,
		globalStoragePath: GlobalStoragePath,
		logPath: LogPath,
		storageUri: MakeUri(ExtStoragePath),
		globalStorageUri: MakeUri(GlobalStoragePath),
		logUri: MakeUri(LogPath),
		extensionMode: 1, // ExtensionMode.Production
		extension: {
			id: ExtId,
			extensionUri: { scheme: "file", path: ExtensionPath, fsPath: ExtensionPath },
			extensionPath: ExtensionPath,
			isActive: true,
			packageJSON: Extension,
			extensionKind: 1,
			exports: undefined,
			activate: async () => {},
		},
		languageModelAccessInformation: {
			canSendRequest: (_Model: unknown) => false,
			onDidChange: (_Listener: unknown) => ({ dispose: () => {} }),
		},
	};
};

export default {
	HandleInitializeExtensionHost,
	HandleDeltaExtensions,
	HandleActivateByEvent,
	HandleStartExtensionHost,
};
