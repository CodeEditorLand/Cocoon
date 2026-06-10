import{CocoonDevLog as t}from"../../../Dev/Log.js";const d=async()=>{if(globalThis.__cocoonModuleHooksInstalled)return;globalThis.__cocoonModuleHooksInstalled=!0;const l=(await import("module")).createRequire,a=l(import.meta.url);try{const e=a("module"),s=e._load;e._load=function(n,i,r){if(n==="vscode"){const o=globalThis.__cocoonVscodeAPI;return o||(t("ext-host","[ExtensionHostHandler] require('vscode') called before shim registered - returning empty namespace"),{})}return s.call(this,n,i,r)},t("ext-host","[ExtensionHostHandler] Module._load hook installed - require('vscode') intercepted")}catch(e){t("ext-host",`[ExtensionHostHandler] Failed to patch Module._load: ${e instanceof Error?e.message:String(e)}`)}try{const e=a("module");if(typeof e.register=="function"){const n=["const API = globalThis.__cocoonVscodeAPI || {};",["window","workspace","commands","languages","extensions","env","debug","tasks","scm","authentication","l10n","notebooks","tests","comments","chat","lm","interactive","Position","Range","Location","LocationLink","Selection","MarkdownString","Hover","CompletionItem","CompletionItemKind","CompletionItemTag","CompletionList","CompletionTriggerKind","Diagnostic","DiagnosticSeverity","DiagnosticTag","DiagnosticRelatedInformation","TextEdit","WorkspaceEdit","SnippetString","SnippetTextEdit","SymbolKind","SymbolTag","SymbolInformation","DocumentSymbol","CodeActionKind","CodeAction","CodeActionTriggerKind","CodeLens","SignatureHelp","SignatureHelpTriggerKind","SignatureInformation","ParameterInformation","InlayHint","InlayHintKind","InlayHintLabelPart","FoldingRange","FoldingRangeKind","DocumentHighlight","DocumentHighlightKind","SelectionRange","SemanticTokensLegend","SemanticTokensBuilder","SemanticTokens","SemanticTokensEdit","SemanticTokensEdits","RelativePattern","Disposable","StatusBarAlignment","ThemeColor","ThemeIcon","TreeItem","TreeItemCollapsibleState","TreeItemCheckboxState","ViewColumn","EndOfLine","ConfigurationTarget","Uri","CancellationTokenSource","CancellationError","EventEmitter","FileType","FilePermission","FileSystemError","DataTransfer","DataTransferItem","TextDocumentChangeReason","TextDocumentSaveReason","TextEditorCursorStyle","TextEditorLineNumbersStyle","TextEditorRevealType","TextEditorSelectionChangeKind","DecorationRangeBehavior","OverviewRulerLane","ColorPresentation","ColorInformation","Color","QuickPickItemKind","InputBoxValidationSeverity","ProgressLocation","NotebookCellData","NotebookCellKind","NotebookCellOutput","NotebookCellOutputItem","NotebookData","NotebookEdit","NotebookRange","TestRunProfileKind","TestMessage","TestRunRequest","TestTag","DebugAdapterExecutable","DebugAdapterInlineImplementation","DebugAdapterNamedPipeServer","DebugAdapterServer","DebugConfigurationProviderTriggerKind","IndentAction","Breakpoint","FunctionBreakpoint","SourceBreakpoint","TerminalLink","TerminalLocation","TerminalProfile","TaskGroup","TaskScope","TaskRevealKind","TaskPanelKind","ShellExecution","ProcessExecution","CustomExecution","Task","CommentMode","CommentThreadCollapsibleState","CommentThreadState","ExtensionKind","ExtensionMode","UIKind","LogLevel","LanguageStatusSeverity","TextSearchContext","TextSearchMatch","DocumentLink","LinkedEditingRanges","EvaluatableExpression","InlineValueText","InlineValueVariableLookup","InlineValueEvaluatableExpression","TypeHierarchyItem","CallHierarchyItem","CallHierarchyIncomingCall","CallHierarchyOutgoingCall","version"].map(o=>`export const ${o} = API.${o};`).join(`
`),"export default API;","export const __esModule = true;"].join(`
`),i=`
				const BRIDGE_URL = 'vscode-shim:///vscode';

				const BRIDGE_SOURCE = ${JSON.stringify(n)};

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

			`,r=`data:text/javascript;base64,${Buffer.from(i).toString("base64")}`;try{e.register(r,import.meta.url),t("ext-host","[ExtensionHostHandler] ESM loader registered - import 'vscode' intercepted")}catch(o){t("ext-host",`[ExtensionHostHandler] module.register failed (ESM imports of 'vscode' will fail): ${o instanceof Error?o.message:String(o)}`)}}}catch(e){t("ext-host",`[ExtensionHostHandler] ESM loader setup skipped: ${e instanceof Error?e.message:String(e)}`)}};var g=d;export{g as default};
