/**
 * @module Handler/ExtensionHostHandler
 * @description
 * Handles extension host lifecycle methods from Mountain:
 * - InitializeExtensionHost - receives full init payload, builds registry
 * - $deltaExtensions - applies extension list diffs
 * - $activateByEvent - activates extensions matching an event
 * - $startExtensionHost - signals host should begin processing
 * - EnsureVscodeAPIRegistered - creates the vscode API shim
 * - ActivateExtension - loads and activates a single extension
 * - CreateExtensionContext - builds minimal VS Code ExtensionContext
 */

import * as NodeFS from "node:fs";

import { CocoonDevLog } from "../DevLog.js";
import * as LanguageProviderRegistry from "../LanguageProviderRegistry.js";
import type { HandlerContext } from "./HandlerContext.js";

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

		const ActivationEvents: string[] = Extension?.activationEvents ?? [];

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
	// messages, etc.). Fire-and-forget - don't block the response.
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
 *
 * Wave 7 instrumentation: every delta logs `+Added -Removed` plus the
 * total registry size and the handler wall-clock duration. A Mountain
 * rebuild sees an observable line per VSIX install/uninstall (K2/K3 →
 * K4) - makes sudden registry growth or deletion visible during
 * regression hunts.
 */
const HandleDeltaExtensions = async (
	Context: HandlerContext,
	Parameters: any,
): Promise<any> => {
	const DeltaStart = performance.now();
	const Added: any[] = Parameters?.toAdd ?? [];
	const Removed: any[] = Parameters?.toRemove ?? [];

	const IdentifierOf = (Extension: any): string =>
		Extension?.identifier?.value ??
		Extension?.identifier?.id ??
		Extension?.identifier ??
		"unknown";

	let AddedActivationEvents = 0;

	// Add new extensions to registry
	for (const Extension of Added) {
		const Identifier = IdentifierOf(Extension);

		Context.ExtensionRegistry.set(Identifier, Extension);

		const ActivationEvents: string[] = Extension?.activationEvents ?? [];

		for (const Event of ActivationEvents) {
			const Existing = Context.ActivationEventIndex.get(Event) ?? [];

			if (!Existing.includes(Identifier)) {
				Existing.push(Identifier);
				Context.ActivationEventIndex.set(Event, Existing);
				AddedActivationEvents++;
			}
		}
	}

	// Remove extensions from registry
	for (const Extension of Removed) {
		const Identifier = IdentifierOf(Extension);

		Context.ExtensionRegistry.delete(Identifier);
	}

	const DurationMs = Math.round(performance.now() - DeltaStart);

	console.log(
		`[ExtensionHostHandler] $deltaExtensions: +${Added.length} -${Removed.length} | registry=${Context.ExtensionRegistry.size} | activationEvents+=${AddedActivationEvents} | ${DurationMs}ms`,
	);

	Context.Emitter.emit("deltaExtensions", {
		added: Added.length,
		removed: Removed.length,
		registrySize: Context.ExtensionRegistry.size,
		durationMs: DurationMs,
	});

	return {
		success: true,
		registrySize: Context.ExtensionRegistry.size,
		durationMs: DurationMs,
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
			: (Parameters?.activationEvent ?? Parameters?.event ?? "*");

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
		const Specific =
			Context.ActivationEventIndex.get(ActivationEvent) ?? [];
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

	// Fire-and-forget - activate each matching extension asynchronously.
	// We cap concurrent activations to avoid flooding the event loop.
	const ToActivate = MatchingExtensions.filter(
		(Id) => !Context.ActivatedExtensions.has(Id),
	);
	console.log(
		`[ExtensionHostHandler] $activateByEvent: ${ToActivate.length} new activations (${MatchingExtensions.length - ToActivate.length} already active)`,
	);

	for (const ExtId of ToActivate) {
		ActivateExtension(Context, ExtId, ActivationEvent).catch(
			(Err: unknown) => {
				const Msg = Err instanceof Error ? Err.message : String(Err);
				// Activation failures whose root cause is the
				// extension's own internal logic (peer-dependency
				// missing, semver parse on undefined, malformed
				// schema in its bundle) are NOT Land bugs - the
				// extension would fail on stock VS Code too if its
				// declared dependency wasn't installed. Routing the
				// log line to stdout keeps the diagnostic info but
				// stops Mountain's stderr-classifier from elevating
				// it to a `warn:` prefix that suggests Land is
				// broken. Same downgrade pattern as
				// `GRPCServerService` already uses for `$provide*`
				// handler rejections.
				console.log(
					`[ExtensionHostHandler] Activation failed for ${ExtId}: ${Msg}`,
				);
				// For `Class extends value undefined` errors, surface the top
				// of the stack so we can locate which module (and which base
				// class) actually failed to resolve. Cascade-7's critical-
				// symbol diagnostic confirmed the 14 most-used classes are
				// present on the shim, so the missing symbol is somewhere
				// deeper - only the stack can say where.
				if (
					Err instanceof Error &&
					/Class extends value undefined/.test(Err.message)
				) {
					const Stack = (Err.stack ?? "")
						.split("\n")
						.slice(0, 6)
						.join("\n");
					console.log(
						`[ExtensionHostHandler] Class-extends stack for ${ExtId}:\n${Stack}`,
					);
				}
			},
		);
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
	_Parameters: any,
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
 * This is deliberately side-effecting and synchronous for the CJS path - by
 * the time we activate extensions we *must* have `require('vscode')` working.
 */
const InstallVscodeModuleHooks = async (): Promise<void> => {
	if ((globalThis as any).__cocoonModuleHooksInstalled) return;
	(globalThis as any).__cocoonModuleHooksInstalled = true;

	// Cocoon runs as an ESM bundle (bundle: true in ESBuild). Bare `require`
	// is not defined here - we must go through createRequire. This is what
	// failed Effect-TS Stage 4 in past runs.
	const ModuleModule = await import("module");
	const CreateRequire = ModuleModule.createRequire;
	const LocalRequire = CreateRequire(import.meta.url);

	try {
		// CJS path: patch Module._load so any require('vscode') returns the shim.
		const NodeModule = LocalRequire("module") as typeof import("module") & {
			_load: (
				Request: string,
				Parent: unknown,
				IsMain: boolean,
			) => unknown;
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
					"[ExtensionHostHandler] require('vscode') called before shim registered - returning empty namespace",
				);
				return {};
			}
			return OriginalLoad.call(this, Request, Parent, IsMain);
		};
		console.log(
			"[ExtensionHostHandler] Module._load hook installed - require('vscode') intercepted",
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
		// process. Older Node silently no-ops - CJS path still works.
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
			// at runtime - so as long as the shim is registered before ESM
			// evaluation, the exports are live.
			const VscodeExportNames = [
				// Namespaces
				"window",
				"workspace",
				"commands",
				"languages",
				"extensions",
				"env",
				"debug",
				"tasks",
				"scm",
				"authentication",
				"l10n",
				"notebooks",
				"tests",
				"comments",
				"chat",
				"lm",
				"interactive",
				// Type constructors
				"Position",
				"Range",
				"Location",
				"LocationLink",
				"Selection",
				"MarkdownString",
				"Hover",
				"CompletionItem",
				"CompletionItemKind",
				"CompletionItemTag",
				"CompletionList",
				"CompletionTriggerKind",
				"Diagnostic",
				"DiagnosticSeverity",
				"DiagnosticTag",
				"DiagnosticRelatedInformation",
				"TextEdit",
				"WorkspaceEdit",
				"SnippetString",
				"SnippetTextEdit",
				"SymbolKind",
				"SymbolTag",
				"SymbolInformation",
				"DocumentSymbol",
				"CodeActionKind",
				"CodeAction",
				"CodeActionTriggerKind",
				"CodeLens",
				"SignatureHelp",
				"SignatureHelpTriggerKind",
				"SignatureInformation",
				"ParameterInformation",
				"InlayHint",
				"InlayHintKind",
				"InlayHintLabelPart",
				"FoldingRange",
				"FoldingRangeKind",
				"DocumentHighlight",
				"DocumentHighlightKind",
				"SelectionRange",
				"SemanticTokensLegend",
				"SemanticTokensBuilder",
				"SemanticTokens",
				"SemanticTokensEdit",
				"SemanticTokensEdits",
				"RelativePattern",
				"Disposable",
				"StatusBarAlignment",
				"ThemeColor",
				"ThemeIcon",
				"TreeItem",
				"TreeItemCollapsibleState",
				"TreeItemCheckboxState",
				"ViewColumn",
				"EndOfLine",
				"ConfigurationTarget",
				"Uri",
				"CancellationTokenSource",
				"CancellationError",
				"EventEmitter",
				"FileType",
				"FilePermission",
				"FileSystemError",
				"DataTransfer",
				"DataTransferItem",
				"TextDocumentChangeReason",
				"TextDocumentSaveReason",
				"TextEditorCursorStyle",
				"TextEditorLineNumbersStyle",
				"TextEditorRevealType",
				"TextEditorSelectionChangeKind",
				"DecorationRangeBehavior",
				"OverviewRulerLane",
				"ColorPresentation",
				"ColorInformation",
				"Color",
				"QuickPickItemKind",
				"InputBoxValidationSeverity",
				"ProgressLocation",
				"NotebookCellData",
				"NotebookCellKind",
				"NotebookCellOutput",
				"NotebookCellOutputItem",
				"NotebookData",
				"NotebookEdit",
				"NotebookRange",
				"TestRunProfileKind",
				"TestMessage",
				"TestRunRequest",
				"TestTag",
				"DebugAdapterExecutable",
				"DebugAdapterInlineImplementation",
				"DebugAdapterNamedPipeServer",
				"DebugAdapterServer",
				"DebugConfigurationProviderTriggerKind",
				"IndentAction",
				"Breakpoint",
				"FunctionBreakpoint",
				"SourceBreakpoint",
				"TerminalLink",
				"TerminalLocation",
				"TerminalProfile",
				"TaskGroup",
				"TaskScope",
				"TaskRevealKind",
				"TaskPanelKind",
				"ShellExecution",
				"ProcessExecution",
				"CustomExecution",
				"Task",
				"CommentMode",
				"CommentThreadCollapsibleState",
				"CommentThreadState",
				"ExtensionKind",
				"ExtensionMode",
				"UIKind",
				"LogLevel",
				"LanguageStatusSeverity",
				"TextSearchContext",
				"TextSearchMatch",
				"DocumentLink",
				"LinkedEditingRanges",
				"EvaluatableExpression",
				"InlineValueText",
				"InlineValueVariableLookup",
				"InlineValueEvaluatableExpression",
				"TypeHierarchyItem",
				"CallHierarchyItem",
				"CallHierarchyIncomingCall",
				"CallHierarchyOutgoingCall",
				// Fields
				"version",
			];
			const NamedExports = VscodeExportNames.map(
				(Name) => `export const ${Name} = API.${Name};`,
			).join("\n");
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
					"[ExtensionHostHandler] ESM loader registered - import 'vscode' intercepted",
				);
			} catch (RegisterErr: unknown) {
				console.warn(
					"[ExtensionHostHandler] module.register failed (ESM imports of 'vscode' will fail):",
					RegisterErr instanceof Error
						? RegisterErr.message
						: String(RegisterErr),
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
	// Install hooks *before* anything else - idempotent, runs once.
	await InstallVscodeModuleHooks();

	if ((globalThis as any).__cocoonVscodeAPI) return;

	try {
		const VsCodeTypes =
			await import("@codeeditorland/output/vs/workbench/api/common/extHostTypes");
		const { URI } =
			await import("@codeeditorland/output/vs/base/common/uri");
		const { CancellationTokenSource } =
			await import("@codeeditorland/output/vs/base/common/cancellation");
		const { Emitter } =
			await import("@codeeditorland/output/vs/base/common/event");

		// Defensive RelativePattern wrapper. Stock `extHostTypes.RelativePattern`
		// (extHostTypes.ts:1914) throws `Illegal argument: base` unless the
		// `base` argument passes a strict `URI.isUri` duck-type check -
		// instance brand OR all 8 of { authority, fragment, path, query,
		// scheme, fsPath, with, toString } as the expected types. Any URI
		// that reached an extension as a `{scheme, path}` POJO (missing
		// hydration corners on custom wire transports) trips the check,
		// producing a cryptic no-stack activation failure. Shopify.ruby-lsp
		// hits this during `new RelativePattern(workspaceFolder, '**/*.rb')`.
		//
		// Wrap so POJO / string / WorkspaceFolder-with-POJO-uri shapes get
		// `URI.revive`-hydrated first. Instance checks downstream still
		// match because `Reflect.construct` preserves the prototype chain.
		const StockRelativePattern: any = (VsCodeTypes as any).RelativePattern;
		const HydrateRelativePatternBase = (Base: unknown): unknown => {
			if (Base == null) return Base;
			if (typeof Base === "string") return Base;
			if (Base instanceof URI) return Base;
			const WithUri = Base as { uri?: unknown };
			if (typeof WithUri.uri !== "undefined") {
				if (WithUri.uri instanceof URI) return Base;
				const ReviveInput =
					typeof WithUri.uri === "string"
						? URI.parse(WithUri.uri)
						: URI.revive(WithUri.uri as any);
				return { ...(Base as object), uri: ReviveInput };
			}
			const Revived = URI.revive(Base as any);
			return Revived ?? Base;
		};
		const PatchedRelativePattern: any = function RelativePattern(
			this: unknown,
			Base: unknown,
			Pattern: string,
		) {
			const Safe = HydrateRelativePatternBase(Base);
			return Reflect.construct(
				StockRelativePattern,
				[Safe, Pattern],
				PatchedRelativePattern,
			);
		};
		PatchedRelativePattern.prototype = StockRelativePattern.prototype;
		Object.setPrototypeOf(PatchedRelativePattern, StockRelativePattern);

		// Spread every named export from extHostTypes - classes, enums,
		// constants - so extensions that do `class X extends vscode.Y`
		// or `vscode.SomeEnum.Value` find the symbol. Explicit overrides
		// after the spread take precedence (Uri, CancellationTokenSource,
		// EventEmitter come from separate VS Code modules).
		// LogLevel is declared in `platform/log/common/log` - not in
		// extHostTypes - so the spread above misses it. Git/GitHub etc.
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

		// CancellationError lives in `vs/base/common/errors`, not extHostTypes
		// - the spread misses it. vscode-languageclient/lib/common/features.js
		// does `class LSPCancellationError extends vscode.CancellationError`
		// at module-load time; undefined throws "Class extends value
		// undefined" and the whole language-features activate fails. A
		// minimal stub suffices.
		class CancellationError extends Error {
			constructor() {
				super("Canceled");
				this.name = "Canceled";
			}
		}

		// OverviewRulerLane is defined in `vs/editor/common/model` (bitmask
		// flags), not extHostTypes. vscode.merge-conflict's decorator calls
		// `vscode.OverviewRulerLane.Full` - undefined crashes activation.
		const OverviewRulerLane: Record<string | number, string | number> = {
			Left: 1,
			Center: 2,
			Right: 4,
			Full: 7,
			1: "Left",
			2: "Center",
			4: "Right",
			7: "Full",
		};

		// UIKind: declared in
		// `vs/workbench/services/extensions/common/extensionHostProtocol.ts`
		// (NOT extHostTypes) - the spread misses it. gitlens reads
		// `vscode.UIKind.Web`, yaml/java/rust-analyzer read `UIKind.Desktop`
		// - undefined crashes activation.
		const UIKind: Record<string | number, string | number> = {
			Desktop: 1,
			Web: 2,
			1: "Desktop",
			2: "Web",
		};

		// TextEditorCursorStyle: declared in
		// `vs/editor/common/config/editorOptions.ts` - also not in
		// extHostTypes. vscodevim reads `vscode.TextEditorCursorStyle.Line`.
		const TextEditorCursorStyle: Record<string | number, string | number> =
			{
				Line: 1,
				Block: 2,
				Underline: 3,
				LineThin: 4,
				BlockOutline: 5,
				UnderlineThin: 6,
				1: "Line",
				2: "Block",
				3: "Underline",
				4: "LineThin",
				5: "BlockOutline",
				6: "UnderlineThin",
			};

		// DebugConfigurationProviderTriggerKind: from
		// `vs/workbench/contrib/debug/common/debug.ts` - not in extHostTypes.
		// DEVSENSE.phptools-vscode reads `.Initial` at activation.
		const DebugConfigurationProviderTriggerKind: Record<
			string | number,
			string | number
		> = {
			Initial: 1,
			Dynamic: 2,
			1: "Initial",
			2: "Dynamic",
		};

		// IndentAction: from
		// `vs/editor/common/languages/languageConfiguration.ts` - not in
		// extHostTypes. rust-analyzer reads `IndentAction.None` (= 0) when
		// registering its onEnterRules.
		const IndentAction: Record<string | number, string | number> = {
			None: 0,
			Indent: 1,
			IndentOutdent: 2,
			Outdent: 3,
			0: "None",
			1: "Indent",
			2: "IndentOutdent",
			3: "Outdent",
		};

		const API: Record<string, unknown> = {
			...(VsCodeTypes as unknown as Record<string, unknown>),
			// Atom I5: read from process.env - single source is .env.Land
			// propagated by Maintain/Script/TierEnvironment.sh. Fallback
			// tracks the VS Code base from Dependency/.../Editor/package.json.
			version: process.env["ProductVersion"] ?? "1.118.0",
			// Override the spread's raw `RelativePattern` with the
			// POJO-tolerant wrapper defined above.
			RelativePattern: PatchedRelativePattern,
			Uri: URI,
			CancellationTokenSource,
			CancellationError,
			EventEmitter: Emitter,
			LogLevel: LogLevelEnum,
			OverviewRulerLane,
			UIKind,
			TextEditorCursorStyle,
			DebugConfigurationProviderTriggerKind,
			IndentAction,
			// Namespaces - each in its own file under VscodeAPI/
			window: (await import("./VscodeAPI/WindowNamespace.js")).default(
				Context,
			),
			workspace: (
				await import("./VscodeAPI/WorkspaceNamespace.js")
			).default(Context),
			commands: (
				await import("./VscodeAPI/CommandsNamespace.js")
			).default(Context, LanguageProviderRegistry),
			languages: (
				await import("./VscodeAPI/LanguagesNamespace.js")
			).default(Context, LanguageProviderRegistry),
			extensions: (
				await import("./VscodeAPI/ExtensionsNamespace.js")
			).default(Context),
			env: (await import("./VscodeAPI/EnvNamespace.js")).default(Context),
			debug: (await import("./VscodeAPI/DebugNamespace.js")).default(
				Context,
			),
			tasks: (await import("./VscodeAPI/TasksNamespace.js")).default(
				Context,
			),
			scm: (await import("./VscodeAPI/ScmNamespace.js")).default(Context),
			authentication: (
				await import("./VscodeAPI/AuthenticationNamespace.js")
			).default(Context),
			// Lightweight stub namespaces - no Mountain route yet, returns
			// safe defaults so extensions that reference them don't crash.
			l10n: {
				t: (Message: unknown, ...Arguments: unknown[]): string => {
					// vscode.l10n.t supports (string, ...args) and
					// ({ message, args, comment }, ...) signatures.
					const Raw =
						typeof Message === "string"
							? Message
							: ((Message as { message?: string })?.message ??
								String(Message));
					if (!Arguments.length) return Raw;
					return Raw.replace(
						/\{(\d+)\}/g,
						(_Match, Index: string) => {
							const Replacement = Arguments[Number(Index)];
							return Replacement === undefined
								? ""
								: String(Replacement);
						},
					);
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
				registerNotebookCellStatusBarItemProvider: () => ({
					dispose: () => {},
				}),
				registerNotebookSerializer: () => ({ dispose: () => {} }),
				registerRendererCommunication: () => ({ dispose: () => {} }),
				createRendererMessaging: () => ({
					postMessage: async () => false,
					onDidReceiveMessage: () => ({ dispose: () => {} }),
				}),
				onDidChangeNotebookCellExecutionState: () => ({
					dispose: () => {},
				}),
				// Proposed API (`vscode.proposed.notebookKernelSource.d.ts`).
				// Jupyter extension uses this to advertise additional
				// kernel discovery entries.
				registerKernelSourceActionProvider: () => ({
					dispose: () => {},
				}),
				createNotebookControllerDetectionTask: () => ({
					dispose: () => {},
				}),
			},
			lm: {
				registerTool: () => ({ dispose: () => {} }),
				invokeTool: async () => ({ content: [] }),
				selectChatModels: async () => [] as unknown[],
				// Stable API name (1.96+). Legacy `registerChatModelProvider`
				// kept below for extensions that haven't migrated yet.
				registerLanguageModelChatProvider: () => ({
					dispose: () => {},
				}),
				registerChatModelProvider: () => ({ dispose: () => {} }),
				// Stable 1.99+ MCP tool registration. GitHub Copilot's
				// `@mcp` participant reaches for this at activation; stub
				// disposable keeps the extension loading.
				registerMcpServerDefinitionProvider: () => ({
					dispose: () => {},
				}),
				// Proposed (`vscode.proposed.embeddings.d.ts`). Copilot-Chat
				// registers embedding models on activate. Empty bundle +
				// no-op disposable keep the flow non-throwing.
				embeddingModels: [] as string[],
				registerEmbeddingsProvider: () => ({ dispose: () => {} }),
				registerEmbeddingVectorProvider: () => ({
					dispose: () => {},
				}),
				computeEmbeddings: async () => [] as unknown[],
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
					items: {
						size: 0,
						replace: () => {},
						forEach: () => {},
						add: () => {},
						delete: () => {},
						get: () => undefined,
					},
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
						token: {
							isCancellationRequested: false,
							onCancellationRequested: () => ({
								dispose: () => {},
							}),
						},
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
				registerInteractiveEditorSessionProvider: () => ({
					dispose: () => {},
				}),
				transferActiveChat: async () => {},
			},
			// Proposed top-level namespaces. Each behaves as "empty
			// registry" so opt-in extensions activate but surface no
			// results until Mountain routes the corresponding channel.
			ai: {
				getRelatedInformation: async () => [] as unknown[],
				registerRelatedInformationProvider: () => ({
					dispose: () => {},
				}),
				registerSettingsSearchProvider: () => ({
					dispose: () => {},
				}),
			},
			speech: {
				registerSpeechProvider: () => ({ dispose: () => {} }),
				onDidChangeSpeechRecognitionAvailability: () => ({
					dispose: () => {},
				}),
			},
		};

		(globalThis as any).__cocoonVscodeAPI = API;
		console.log(
			"[ExtensionHostHandler] vscode API shim registered on globalThis.__cocoonVscodeAPI",
		);
		// Diagnostic: log which critical base classes are resolved at shim
		// registration time. vscode-languageclient does
		// `class X extends vscode.Diagnostic {}` at module-load time; if any
		// of these are undefined at that point the language-features
		// extensions fail to activate with "Class extends value undefined".
		const CriticalNames = [
			"Diagnostic",
			"CodeAction",
			"CodeLens",
			"CompletionItem",
			"SymbolInformation",
			"DocumentLink",
			"TypeHierarchyItem",
			"CallHierarchyItem",
			"SemanticTokensBuilder",
			"SemanticTokens",
			"RelativePattern",
			"Position",
			"Range",
			"Hover",
			"LogLevel",
			"CancellationError",
			"CancellationTokenSource",
			"EventEmitter",
			"Uri",
			"Disposable",
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

	const StartMs = Date.now();
	CocoonDevLog(
		"ext-activate",
		`[ExtActivate] start ext=${ExtensionId} event=${ActivationEvent}`,
	);

	const Extension = Context.ExtensionRegistry.get(ExtensionId);
	if (!Extension) {
		CocoonDevLog(
			"ext-activate",
			`[ExtActivate] skip-missing ext=${ExtensionId} (not in registry)`,
		);
		return;
	}

	// Mountain sends ExtensionLocation as a file:// URL (from url::Url::from_directory_path)
	const LocationRaw: unknown =
		Extension?.ExtensionLocation ??
		Extension?.extensionLocation ??
		Extension?.location?.path ??
		Extension?.location;
	const MainFile: string | undefined = Extension?.main ?? Extension?.Main;

	// Declarative extensions (themes, grammars) have no main - mark activated and return.
	if (!LocationRaw || !MainFile) {
		return;
	}

	// Convert file:// URL to filesystem path
	let ExtensionPath: string;
	try {
		ExtensionPath = new URL(String(LocationRaw)).pathname.replace(
			/\/$/,
			"",
		);
	} catch {
		ExtensionPath = String(LocationRaw)
			.replace(/^file:\/\//, "")
			.replace(/\/$/, "");
	}

	const ModulePath = `${ExtensionPath}/${MainFile}`;

	// Preflight: if the declared main file is absent on disk (e.g. Copilot's
	// `dist/extension.js` is not shipped in the source-tree checkout), skip
	// activation with a clean message instead of letting Node throw a
	// `Cannot find module` ERR_MODULE_NOT_FOUND stack. Tolerate both the raw
	// path and the common `.js` extension VS Code omits from `main`.
	try {
		const { access } = await import("node:fs/promises");
		let Exists = false;
		let Resolved = ModulePath;
		for (const Candidate of [ModulePath, `${ModulePath}.js`]) {
			try {
				await access(Candidate);
				Exists = true;
				Resolved = Candidate;
				break;
			} catch {}
		}
		if (!Exists) {
			// Skipping-an-extension is a real event; always log.
			process.stdout.write(
				`[LandFix:Preflight] Skipping ${ExtensionId}: main file not found on disk (${ModulePath})\n`,
			);
			return;
		}
		// Successful-resolve runs per extension (~40 lines per boot) and
		// is only useful when actively debugging module resolution. Gate.
		if (process.env["LAND_DEV_LOG"]?.includes("preflight")) {
			process.stdout.write(
				`[LandFix:Preflight] ${ExtensionId} main resolved → ${Resolved}\n`,
			);
		}
	} catch (Err: unknown) {
		// If `node:fs/promises` is unavailable for any reason, fall through
		// to the normal require/import path and let it surface the error.
		process.stdout.write(
			`[LandFix:Preflight] preflight disabled for ${ExtensionId}: ${Err instanceof Error ? Err.message : String(Err)}\n`,
		);
	}

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

	// Seed the workspace configuration cache with this extension's declared
	// `contributes.configuration.properties` defaults BEFORE its `activate()`
	// runs. Extensions like GitLens read `workspace.getConfiguration('gitlens')
	// .blame.format` synchronously at activation; if the cache is empty they
	// get `undefined` and throw `TypeError: Cannot read properties of undefined
	// (reading 'format')`. Priming from the manifest ensures the declared
	// defaults are already in the cache, so nested access succeeds from the
	// first call. `WorkspaceNamespace/Index.ts` stashes the ConfigurationState
	// on `globalThis.__cocoonConfigState` for exactly this hook.
	try {
		const Manifest = await (async () => {
			try {
				const { readFile } = await import("node:fs/promises");
				const Raw = await readFile(
					`${ExtensionPath}/package.json`,
					"utf8",
				);
				return JSON.parse(Raw) as unknown;
			} catch {
				return Extension as unknown;
			}
		})();
		const ConfigState = (
			globalThis as {
				__cocoonConfigState?: {
					PrePopulateFromManifest: (Manifest: unknown) => void;
				};
			}
		).__cocoonConfigState;
		ConfigState?.PrePopulateFromManifest(Manifest);
	} catch {
		// PrePopulate is best-effort; never block activation on it.
	}

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
				// Module._load is patched above - require('vscode') returns our API shim.
				ExtModule = Require(ModulePath) as typeof ExtModule;
			} catch (RequireErr: unknown) {
				// Fallback for extensions whose main is actually ESM despite
				// no `"type": "module"` field - try dynamic import().
				const Msg =
					RequireErr instanceof Error
						? RequireErr.message
						: String(RequireErr);
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
			const ExtContext = CreateExtensionContext(
				Context,
				Extension,
				ExtensionPath,
			);
			// Pre-activation snapshot - surfaces what `vscode.workspace.workspaceFolders`
			// actually exposes to the extension at the moment its `activate(context)`
			// is invoked. The git extension's `Model.doInitialScan()` reads this list
			// and bails when empty, which is exactly the F6 mystery (vscode.git
			// activates ok but never reaches `vscode.scm.createSourceControl`).
			// Gated to specific extension IDs so the log doesn't spam for the 113
			// scanned extensions; covers the Git family + npm/gulp/jake which all
			// take the same shortcut. Fires under `LAND_DEV_LOG=ext-preactivate` or
			// the implicit `=short` (we always emit on stdout via console.log).
			const InstrumentedExtensions = [
				"vscode.git",
				"vscode.git-base",
				"vscode.npm",
				"vscode.gulp",
				"vscode.grunt",
				"vscode.jake",
				"vscode.merge-conflict",
			];
			const SnapshotInitState = (Phase: string): void => {
				try {
					const InitWorkspace =
						(Context.ExtensionHostInitData as any)?.workspace ??
						(Context.ExtensionHostInitData as any)?.workspaceData ??
						{};
					const InitFolders = Array.isArray(InitWorkspace.folders)
						? InitWorkspace.folders
						: [];
					const FolderShape = InitFolders.map((F: any, I: number) => {
						const UriField = F?.uri;
						const UriShape =
							typeof UriField === "string"
								? `string("${UriField.slice(0, 80)}")`
								: typeof UriField === "object" &&
									  UriField !== null
									? `object(scheme=${UriField.scheme ?? "<missing>"} fsPath=${
											typeof UriField.fsPath === "string"
												? UriField.fsPath.slice(0, 80)
												: "<not-a-string>"
										})`
									: typeof UriField;
						return `[${I}] name=${F?.name ?? "?"} uri=${UriShape}`;
					}).join(" | ");
					// Surface the typed value the extension will read from
					// `config.get('git.autoRepositoryDetection')` - vscode.git's
					// `model.js:340` bails on `!== true && !== 'subFolders'`,
					// so a value that arrives as `1` or `"true"` or wrapped in
					// an object would silently kill the SCM scan even when
					// the merge says the key is present.
					const ConfigState = (
						globalThis as {
							__cocoonConfigState?: {
								ConfigCache?: Map<string, unknown>;
							};
						}
					).__cocoonConfigState;
					const AutoDetect = ConfigState?.ConfigCache?.get?.(
						"git.autoRepositoryDetection",
					);
					const Enabled =
						ConfigState?.ConfigCache?.get?.("git.enabled");
					const AutoDetectShape = `${typeof AutoDetect}=${
						typeof AutoDetect === "object"
							? JSON.stringify(AutoDetect).slice(0, 80)
							: String(AutoDetect)
					}`;
					console.log(
						`[ExtensionHostHandler] ${Phase} ${ExtensionId} folders.length=${InitFolders.length} | git.enabled=${Enabled} | git.autoRepositoryDetection=${AutoDetectShape} | ${FolderShape}`,
					);
				} catch (Err) {
					console.log(
						`[ExtensionHostHandler] ${Phase} ${ExtensionId} snapshot failed: ${
							(Err as { message?: string })?.message ??
							String(Err)
						}`,
					);
				}
			};
			if (InstrumentedExtensions.includes(ExtensionId)) {
				SnapshotInitState("PRE-ACTIVATE");
			}
			await ActivateFn(ExtContext);
			console.log(
				`[ExtensionHostHandler] ${ExtensionId} activated (event: ${ActivationEvent})`,
			);
			if (InstrumentedExtensions.includes(ExtensionId)) {
				// Post-activate snapshot - vscode.git's `Model.doInitialScan`
				// runs in `.finally(...)` (background) *after* `_activate`
				// returns. Capture state right after activate() resolves so
				// we can compare the pre/post difference - if folders or
				// autoRepositoryDetection differ between the two ticks, the
				// extension is reading a different snapshot than we instrumented.
				SnapshotInitState("POST-ACTIVATE");
				// Schedule one more snapshot 1s later to catch any state that
				// landed via $deltaWorkspaceFolders during activation.
				setTimeout(() => SnapshotInitState("DEFERRED-1S"), 1000);
			}
			CocoonDevLog(
				"ext-activate",
				`[ExtActivate] ok ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`,
			);
		} else {
			console.warn(
				`[ExtensionHostHandler] ${ExtensionId} loaded but no activate() function found`,
			);
			CocoonDevLog(
				"ext-activate",
				`[ExtActivate] no-activate-fn ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`,
			);
		}
	} catch (Err: unknown) {
		// Remove from set so a retry is possible
		Context.ActivatedExtensions.delete(ExtensionId);
		const Message = Err instanceof Error ? Err.message : String(Err);
		CocoonDevLog(
			"ext-activate",
			`[ExtActivate] fail ext=${ExtensionId} duration_ms=${Date.now() - StartMs} error=${Message.replace(/\n/g, " | ")}`,
		);
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
	// Keep per-extension storage OUT of `~/.land/extensions/` -
	// that directory is now a user-extension scan path in Mountain's
	// `ScanPathConfigure.rs`, and the scanner warns on non-extension
	// siblings like `storage/`. Use a dedicated, non-scanned root.
	const StorageBase = `${HomeDir}/.land/extensionStorage`;
	const GlobalStorageBase = `${HomeDir}/.land/globalStorage`;
	const LogBase = `${HomeDir}/.land/logs`;
	const ExtStoragePath = `${StorageBase}/${ExtId}`;
	const GlobalStoragePath = `${GlobalStorageBase}/${ExtId}`;
	const LogPath = `${LogBase}/${ExtId}`;

	// Ensure directories exist (fire-and-forget). Cocoon runs as an ESM
	// bundle, so bare `require("node:fs")` throws "Dynamic require of
	// 'node:fs' is not supported" - use the static `NodeFS` import.
	try {
		NodeFS.mkdirSync(ExtStoragePath, { recursive: true });
		NodeFS.mkdirSync(GlobalStoragePath, { recursive: true });
		NodeFS.mkdirSync(LogPath, { recursive: true });
	} catch {}

	// Mountain's scanner keeps only a subset of package.json fields. VS
	// Code extensions expect the FULL manifest on
	// `context.extension.packageJSON` - notably `aiKey`, which
	// `@vscode/extension-telemetry` reads at constructor time and calls
	// `aiKey.length` on. A missing aiKey throws `Cannot read properties of
	// undefined (reading 'length')` and the whole activate fails.
	// Read the real package.json from disk and merge it over the scanned
	// descriptor so every published field is present.
	let FullPackageJSON: Record<string, unknown> = Extension as Record<
		string,
		unknown
	>;
	try {
		const Contents = NodeFS.readFileSync(
			`${ExtensionPath}/package.json`,
			"utf8",
		);
		const Parsed = JSON.parse(Contents) as Record<string, unknown>;
		FullPackageJSON = {
			...Parsed,
			...(Extension as Record<string, unknown>),
		};
	} catch {
		// If we can't read it, fall back to the scanner payload. Extensions
		// that rely on manifest-only fields will fail at activate time and
		// surface a clear error on the next pass.
	}

	// VS Code's `URI.joinPath(uri, ...)` throws `[UriError]: cannot call
	// joinPath on URI without path` when handed a plain-object URI stub.
	// `EnsureVscodeAPIRegistered` has already stashed the real URI class on
	// `globalThis.__cocoonVscodeAPI.Uri`; use it when available so
	// `URI.file(Path).with(...)` behaves like the real thing.
	const VsCodeUri = (globalThis as any).__cocoonVscodeAPI?.Uri;
	const MakeUri = (Path: string): unknown => {
		if (VsCodeUri && typeof VsCodeUri.file === "function") {
			return VsCodeUri.file(Path);
		}
		return {
			scheme: "file",
			path: Path,
			fsPath: Path,
			authority: "",
			query: "",
			fragment: "",
			with: function (this: any, Change: any) {
				return { ...this, ...Change };
			},
			toString: () => `file://${Path}`,
		};
	};

	return {
		subscriptions: [] as { dispose(): unknown }[],
		extensionPath: ExtensionPath,
		extensionUri: MakeUri(ExtensionPath),
		// VS Code API: `context.asAbsolutePath(relative)` returns the
		// extension path joined with a relative path. The 4 language-
		// features extensions all call this immediately in their activate
		// function to resolve server bundle locations; without it, they
		// fail before vscode-languageclient even constructs.
		asAbsolutePath: (RelativePath: string) => {
			const Trimmed = RelativePath.replace(/^\.?\//, "");
			return `${ExtensionPath}/${Trimmed}`;
		},
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
					return (await Context.MountainClient?.sendRequest(
						"secrets.get",
						{ key: Key },
					)) as string | undefined;
				} catch {
					return undefined;
				}
			},
			store: async (Key: string, Value: string) => {
				try {
					await Context.MountainClient?.sendRequest("secrets.store", {
						key: Key,
						value: Value,
					});
				} catch {}
			},
			delete: async (Key: string) => {
				try {
					await Context.MountainClient?.sendRequest(
						"secrets.delete",
						{ key: Key },
					);
				} catch {}
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
			extensionUri: {
				scheme: "file",
				path: ExtensionPath,
				fsPath: ExtensionPath,
			},
			extensionPath: ExtensionPath,
			isActive: true,
			packageJSON: FullPackageJSON,
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
