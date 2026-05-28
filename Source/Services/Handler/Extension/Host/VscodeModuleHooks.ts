/**
 * @module Handler/ExtensionHost/VscodeModuleHooks
 * @description
 * Patches Node.js module resolution so that both `require('vscode')` and
 * `import 'vscode'` return Cocoon's API shim. Runs exactly once per process
 * (keyed by a global flag on `globalThis.__cocoonModuleHooksInstalled`).
 *
 * CJS path: patches `Module._load` to intercept `require('vscode')`.
 * ESM path: registers a loader via `module.register()` (Node ≥ 20.6).
 * Older Node silently skips the ESM path - CJS path still works.
 */

import { CocoonDevLog } from "../../../Dev/Log.js";

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

				CocoonDevLog(
					"ext-host",

					"[ExtensionHostHandler] require('vscode') called before shim registered - returning empty namespace",
				);

				return {};
			}

			return OriginalLoad.call(this, Request, Parent, IsMain);
		};

		CocoonDevLog(
			"ext-host",

			"[ExtensionHostHandler] Module._load hook installed - require('vscode') intercepted",
		);
	} catch (Err: unknown) {
		CocoonDevLog(
			"ext-host",

			`[ExtensionHostHandler] Failed to patch Module._load: ${Err instanceof Error ? Err.message : String(Err)}`,
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

				CocoonDevLog(
					"ext-host",

					"[ExtensionHostHandler] ESM loader registered - import 'vscode' intercepted",
				);
			} catch (RegisterErr: unknown) {
				CocoonDevLog(
					"ext-host",

					`[ExtensionHostHandler] module.register failed (ESM imports of 'vscode' will fail): ${RegisterErr instanceof Error ? RegisterErr.message : String(RegisterErr)}`,
				);
			}
		}
	} catch (Err: unknown) {
		CocoonDevLog(
			"ext-host",

			`[ExtensionHostHandler] ESM loader setup skipped: ${Err instanceof Error ? Err.message : String(Err)}`,
		);
	}
};

export default InstallVscodeModuleHooks;
