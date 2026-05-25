/**
 * @module APIFactoryService
 * @description
 * Creates the 'vscode' API surface for extensions.
 * Wires API calls to the Universal Spine via MountainClientService.
 */

import { Context, Effect, Layer } from "effect";

import { IConfigurationService } from "../../../Interfaces/I/Configuration/Service.js";
import { IFileSystemService } from "../../../Interfaces/I/File/System/Service.js";
import { IModuleInterceptorService } from "../../../Interfaces/I/Module/Interceptor/Service.js";
import { IMountainClientService } from "../../../Interfaces/I/Mountain/Client/Service.js";
import { ITerminalService } from "../../../Interfaces/I/Terminal/Service.js";
import * as LanguageProviderRegistry from "../../Language/Provider/Registry.js";

// Real VS Code type constructors from @codeeditorland/output (compiled from VS Code source).
// Loaded once at module init - all extensions share these class definitions.
const VsCodeTypes =
	await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");

const { URI } =
	await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js");

const { CancellationTokenSource, CancellationToken } =
	await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js");

const { Emitter } =
	await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js");

// Defensive RelativePattern wrapper.
//
// Stock `RelativePattern(base, pattern)` in extHostTypes.ts:1914 does:
//   if (!base || !URI.isUri(base) && !URI.isUri(base.uri)) throw illegalArgument('base');
//
// `URI.isUri` is strict: instance-check first, then duck-type that
// requires `.with` method + `.toString` override + `.fsPath` getter
// returning a string. Any URI that reached the extension as a plain
// `{scheme,path}` POJO (missing-hydration corners, custom extension
// wire transports, older Cocoon paths) trips this check - the caller
// gets a cryptic `Illegal argument: base` with no stack. Shopify.ruby-lsp
// hits this during activation when it builds a FileSystemWatcher from
// `new RelativePattern(workspaceFolder, '**/*.rb')`.
//
// Wrap the stock class so POJO inputs are silently hydrated via
// `URI.revive` / `URI.from` before the strict check. A string base
// passes through untouched; a real URI instance passes through
// untouched; a WorkspaceFolder-shape with a POJO `.uri` gets a real
// URI stamped onto it. Fully transparent to extensions - the wrapped
// result is an instance of the stock class, so any `instanceof` check
// downstream still matches.
const StockRelativePattern: any = VsCodeTypes.RelativePattern;

const HydrateBase = (Base: unknown): unknown => {
	if (Base == null) return Base;

	if (typeof Base === "string") return Base;

	if (Base instanceof URI) return Base;

	if (typeof (Base as { uri?: unknown }).uri !== "undefined") {
		const Uri = (Base as { uri?: unknown }).uri;

		if (Uri instanceof URI) return Base;

		// Empty-string short-circuit + try/catch around `URI.parse` so
		// extensions that pass `{ uri: "" }` don't trigger
		// `[UriError]: Scheme contains illegal characters. (len:0)` and
		// fail their entire `RelativePattern` construction. Return the
		// original Base on failure so the caller sees an unhydrated
		// shape instead of a crash - the stock RelativePattern
		// constructor accepts that path with its own fallback.
		let Revived: unknown;

		if (typeof Uri === "string") {
			if (Uri.length === 0) {
				Revived = undefined;
			} else {
				try {
					Revived = URI.parse(Uri);
				} catch {
					Revived = undefined;
				}
			}
		} else {
			try {
				Revived = URI.revive(Uri as any);
			} catch {
				Revived = undefined;
			}
		}

		return { ...(Base as object), uri: Revived };
	}

	try {
		const Revived = URI.revive(Base as any);

		return Revived ?? Base;
	} catch {
		return Base;
	}
};

const PatchedRelativePattern: any = function RelativePattern(
	this: unknown,

	Base: unknown,

	Pattern: string,
) {
	const Safe = HydrateBase(Base);

	// Forward to the stock constructor. `Reflect.construct` preserves
	// prototype chain so `instanceof vscode.RelativePattern` still works.
	return Reflect.construct(
		StockRelativePattern,

		[Safe, Pattern],

		PatchedRelativePattern,
	);
};

PatchedRelativePattern.prototype = StockRelativePattern.prototype;

Object.setPrototypeOf(PatchedRelativePattern, StockRelativePattern);

// --- API Service Interface ---

export interface IAPIFactoryService {
	createAPI(): any;
}

export const IAPIFactoryService = Context.Tag<IAPIFactoryService>();

// --- API Implementation ---

interface VSCodeAPI {
	version: string;

	env: any;

	commands: any;

	window: any;

	workspace: any;

	extensions: any;

	languages: any;

	debug: any;

	scm: any;

	authentication: any;

	[key: string]: any;
}

/**
 * Creates the 'vscode' namespace
 */
const createVSCodeAPI = (
	mountainClient: IMountainClientService,

	configService: IConfigurationService,

	fsService: IFileSystemService,

	terminalService: ITerminalService,
): VSCodeAPI => {
	return {
		version: "1.88.0",

		// --- Type Constructors (real VS Code classes from @codeeditorland/output) ---
		Position: VsCodeTypes.Position,

		Range: VsCodeTypes.Range,

		Location: VsCodeTypes.Location,

		Selection: VsCodeTypes.Selection,

		MarkdownString: VsCodeTypes.MarkdownString,

		Hover: VsCodeTypes.Hover,

		CompletionItem: VsCodeTypes.CompletionItem,

		CompletionItemKind: VsCodeTypes.CompletionItemKind,

		CompletionItemTag: VsCodeTypes.CompletionItemTag,

		CompletionList: VsCodeTypes.CompletionList,

		CompletionTriggerKind: VsCodeTypes.CompletionTriggerKind,

		Diagnostic: VsCodeTypes.Diagnostic,

		DiagnosticSeverity: VsCodeTypes.DiagnosticSeverity,

		DiagnosticTag: VsCodeTypes.DiagnosticTag,

		DiagnosticRelatedInformation: VsCodeTypes.DiagnosticRelatedInformation,

		TextEdit: VsCodeTypes.TextEdit,

		WorkspaceEdit: VsCodeTypes.WorkspaceEdit,

		SnippetString: VsCodeTypes.SnippetString,

		SnippetTextEdit: VsCodeTypes.SnippetTextEdit,

		SymbolKind: VsCodeTypes.SymbolKind,

		SymbolInformation: VsCodeTypes.SymbolInformation,

		DocumentSymbol: VsCodeTypes.DocumentSymbol,

		CodeActionKind: VsCodeTypes.CodeActionKind,

		CodeAction: VsCodeTypes.CodeAction,

		CodeActionTriggerKind: VsCodeTypes.CodeActionTriggerKind,

		SignatureHelp: VsCodeTypes.SignatureHelp,

		SignatureHelpTriggerKind: VsCodeTypes.SignatureHelpTriggerKind,

		SignatureInformation: VsCodeTypes.SignatureInformation,

		ParameterInformation: VsCodeTypes.ParameterInformation,

		InlayHint: VsCodeTypes.InlayHint,

		InlayHintKind: VsCodeTypes.InlayHintKind,

		InlayHintLabelPart: VsCodeTypes.InlayHintLabelPart,

		FoldingRange: VsCodeTypes.FoldingRange,

		FoldingRangeKind: VsCodeTypes.FoldingRangeKind,

		DocumentHighlight: VsCodeTypes.DocumentHighlight,

		DocumentHighlightKind: VsCodeTypes.DocumentHighlightKind,

		DocumentLink: VsCodeTypes.DocumentLink,

		SelectionRange: VsCodeTypes.SelectionRange,

		SemanticTokensLegend: VsCodeTypes.SemanticTokensLegend,

		SemanticTokensBuilder: VsCodeTypes.SemanticTokensBuilder,

		SemanticTokens: VsCodeTypes.SemanticTokens,

		RelativePattern: PatchedRelativePattern,

		Disposable: VsCodeTypes.Disposable,

		StatusBarAlignment: VsCodeTypes.StatusBarAlignment,

		ThemeColor: VsCodeTypes.ThemeColor,

		ThemeIcon: VsCodeTypes.ThemeIcon,

		TreeItem: VsCodeTypes.TreeItem,

		TreeItemCollapsibleState: VsCodeTypes.TreeItemCollapsibleState,

		ViewColumn: VsCodeTypes.ViewColumn,

		EndOfLine: VsCodeTypes.EndOfLine,

		FileSystemError: VsCodeTypes.FileSystemError,

		FileChangeType: VsCodeTypes.FileChangeType,

		ConfigurationTarget: VsCodeTypes.ConfigurationTarget,

		DecorationRangeBehavior: VsCodeTypes.DecorationRangeBehavior,

		TextDocumentSaveReason: VsCodeTypes.TextDocumentSaveReason,

		// These enums are declared in vs/editor/common/config/editorOptions.ts
		// and vs/workbench/services/extensions/common/extensionHostProtocol.ts
		// respectively, but extHostTypes.js doesn't re-export them. Extensions
		// (vscodevim, gitlens) crash at activation reading .Line / .Web off
		// undefined. Inline the literal enum values so the API surface matches
		// what extensions expect. Keep in sync with the upstream enums.
		TextEditorCursorStyle: {
			Line: 1,

			Block: 2,

			Underline: 3,

			LineThin: 4,

			BlockOutline: 5,

			UnderlineThin: 6,
		},

		UIKind: { Desktop: 1, Web: 2 },

		// URI is exposed as 'Uri' to match the vscode API surface
		Uri: URI,

		CancellationTokenSource,

		CancellationToken,

		// Emitter is the vscode.EventEmitter equivalent
		EventEmitter: Emitter,

		// --- Window Namespace ---
		window: {
			showInformationMessage: async (
				message: string,
				..._items: string[]
			) => {
				await mountainClient.sendRequest("Window.ShowMessage", {
					title: "Information",
					message: message,
					level: "info",
				});

				return undefined;
			},

			showErrorMessage: async (message: string, ..._items: string[]) => {
				await mountainClient.sendRequest("Window.ShowMessage", {
					title: "Error",
					message: message,
					level: "error",
				});

				return undefined;
			},

			showWarningMessage: async (
				message: string,
				..._items: string[]
			) => {
				await mountainClient.sendRequest("Window.ShowMessage", {
					title: "Warning",
					message: message,
					level: "warn",
				});

				return undefined;
			},

			createTerminal: (options: any) => {
				const name =
					typeof options === "string" ? options : options.name;

				const shellPath =
					typeof options === "object" ? options.shellPath : undefined;

				const cwd =
					typeof options === "object" ? options.cwd : undefined;

				const terminalIdPromise = terminalService.createTerminal(
					name,

					shellPath,

					cwd,
				);

				return {
					name,

					sendText: async (text: string) => {
						const id = await terminalIdPromise;

						await terminalService.sendText(id, text);
					},

					show: () => {},

					hide: () => {},

					dispose: async () => {
						const id = await terminalIdPromise;

						await terminalService.kill(id);
					},
				};
			},

			createStatusBarItem: (_alignment?: any, _priority?: number) => ({
				show: () => {},
				hide: () => {},
				dispose: () => {},
				text: "",
				tooltip: "",
				command: undefined,
			}),

			createOutputChannel: (_name: string) => ({
				append: (_value: string) => {},
				appendLine: (_value: string) => {},
				clear: () => {},
				show: () => {},
				hide: () => {},
				dispose: () => {},
			}),

			withProgress: async (_options: any, task: any) => {
				return task({ report: (_value: any) => {} });
			},

			// Terminal shell-integration events. Land doesn't track shell
			// integration, so extensions (openai.chatgpt) that subscribe get
			// a never-firing event that still registers/disposes cleanly.
			// Must be a function returning IDisposable - not just an object -
			// because `vscode.window.onDidChangeTerminalShellIntegration(cb)`
			// is called as a function by the extension.
			onDidChangeTerminalShellIntegration: (_Listener: any) => ({
				dispose: () => {},
			}),

			onDidStartTerminalShellExecution: (_Listener: any) => ({
				dispose: () => {},
			}),

			onDidEndTerminalShellExecution: (_Listener: any) => ({
				dispose: () => {},
			}),
		},

		// --- Workspace Namespace ---
		workspace: {
			workspaceFolders: [],

			getConfiguration: (section?: string) => {
				return {
					get: (key: string, defaultValue?: any) => {
						const fullKey = section ? `${section}.${key}` : key;

						return configService.getValue(fullKey, 0, defaultValue);
					},

					update: async (key: string, value: any, target: any) => {
						const fullKey = section ? `${section}.${key}` : key;

						await configService.setValue(fullKey, value, target);
					},

					has: (key: string) =>
						configService.hasKey(
							section ? `${section}.${key}` : key,

							0,
						),

					inspect: (key: string) =>
						configService.inspect(
							section ? `${section}.${key}` : key,

							0,
						),
				};
			},

			// Filesystem API (Real Implementation)
			fs: {
				stat: (uri: any) => fsService.stat(uri),

				readFile: (uri: any) => fsService.readFile(uri),

				writeFile: (uri: any, content: Uint8Array) =>
					fsService.writeFile(uri, content),

				readDirectory: (uri: any) => fsService.readDirectory(uri),

				createDirectory: (uri: any) => fsService.createDirectory(uri),

				delete: (uri: any, options: { recursive: boolean }) =>
					fsService.delete(uri, options),

				rename: (
					source: any,

					target: any,

					options: { overwrite: boolean },
				) => fsService.rename(source, target, options),
			},

			findFiles: async (_include: string) => [],

			openTextDocument: async (uri: any) => ({
				getText: () => "",
				uri,
				languageId: "plaintext",
				lineCount: 0,
				fileName: uri.fsPath || "",
			}),
		},

		// --- Commands Namespace ---
		commands: (() => {
			// Local callback registry - handlers registered from this extension.
			// When Mountain dispatches execute_contributed_command, Cocoon routes
			// to the callback stored here by matching the commandId.
			const LocalHandlers = new Map<
				string,
				(...args: readonly unknown[]) => unknown
			>();

			return {
				registerCommand: (
					command: string,

					callback: (...args: any[]) => any,
				) => {
					LocalHandlers.set(command, callback);
					// Notify Mountain so the command appears in the command palette
					// and can be dispatched via execute_contributed_command gRPC.
					mountainClient
						.sendNotification("registerCommand", {
							commandId: command,
							extensionId: "unknown",
							title: command,
						})
						.catch(() => {});
					return {
						dispose: () => {
							LocalHandlers.delete(command);
							mountainClient
								.sendNotification("unregisterCommand", {
									commandId: command,
								})
								.catch(() => {});
						},
					};
				},
				executeCommand: async (command: string, ...args: any[]) => {
					// Check local handlers first (same-process shortcut)
					const Local = LocalHandlers.get(command);
					if (Local !== undefined) {
						return Local(...args);
					}
					// Delegate to Mountain's CommandRegistry
					try {
						const Result = await mountainClient.sendRequest(
							"executeCommand",

							{
								commandId: command,
								arguments: args.map((Arg) => {
									if (typeof Arg === "string")
										return { stringValue: Arg };
									if (typeof Arg === "number")
										return { intValue: Arg };
									if (typeof Arg === "boolean")
										return { boolValue: Arg };
									return { stringValue: JSON.stringify(Arg) };
								}),
							},
						);
						return Result?.result;
					} catch (Error: any) {
						// Many extensions call executeCommand on their own
						// extension-namespaced commands at activation as a
						// signalling pattern (e.g. roo-cline.activationCompleted,
						// claude-vscode.openWalkthrough). Until the
						// registerCommand → Mountain CommandRegistry pipeline
						// is fixed (separate issue - no registerCommand
						// notifications reach Mountain in current builds),
						// swallow "not found" errors on extension-namespaced
						// commands. Real native-command typos still surface -
						// they lack the `<extension-id>.<command>` shape.
						const Message = String(Error?.message ?? Error);
						const IsNotFound =
							Message.includes("not found") ||
							Message.includes("Command not found");
						const IsExtensionNamespaced =
							command.includes(".") &&
							!command.startsWith("vscode.") &&
							!command.startsWith("workbench.") &&
							!command.startsWith("editor.");
						if (IsNotFound && IsExtensionNamespaced) {
							return undefined;
						}
						throw Error;
					}
				},
				getCommands: async () => {
					const Result = await mountainClient
						.sendRequest("executeCommand", {
							commandId: "_getCommands",
							arguments: [],
						})
						.catch(() => null);
					return Array.isArray(Result?.result) ? Result.result : [];
				},
			};
		})(),

		// --- Env Namespace ---
		env: {
			appName: "CodeEditorLand",

			appRoot: "/app",

			language: "en-US",

			clipboard: {
				readText: async () => "",

				writeText: async (_value: string) => {},
			},

			openExternal: async (target: any) => {
				const Url =
					typeof target === "string"
						? target
						: (target?.toString?.() ?? "");

				await mountainClient.sendNotification("openExternal", {
					url: Url,
				});

				return true;
			},

			uriScheme: "codeeditorland",

			appHost: "desktop",

			remoteName: "",

			isNewAppInstall: false,

			isTelemetryEnabled: false,

			onDidChangeTelemetryEnabled: {
				event: () => ({ dispose: () => {} }),
			},
		},

		// --- Extensions Namespace ---
		extensions: {
			getExtension: (_id: string) => undefined,

			all: [],
		},

		// --- Languages Namespace ---
		// Full provider registration surface lifted from extHostLanguageFeatures.ts.
		// Each register*Provider sends a registration notification to Mountain so
		// the editor can dispatch feature requests back to Cocoon.
		languages: (() => {
			let NextHandle = 1;

			const RegisterProvider = (
				type: string,

				selector: any,

				provider: any,
			) => {
				const Handle = NextHandle++;
				// Store in the shared registry so GRPCServerService can invoke
				// this provider when Mountain calls $provide* via gRPC.
				LanguageProviderRegistry.Register(Handle, provider);
				mountainClient
					.sendNotification(`register_${type}`, {
						language_selector:
							typeof selector === "string"
								? selector
								: JSON.stringify(selector),
						handle: Handle,
					})
					.catch(() => {}); // fire-and-forget
				return {
					dispose: () => LanguageProviderRegistry.Unregister(Handle),
				};
			};

			return {
				getLanguages: () => [],
				setTextDocumentLanguage: async () => undefined,
				match: () => 0,

				createDiagnosticCollection: (name?: string) => {
					const Items = new Map<string, any[]>();
					return {
						name: name ?? "default",
						set: (uri: any, diagnostics: any) =>
							Items.set(
								uri?.toString?.() ?? String(uri),

								diagnostics,
							),
						delete: (uri: any) =>
							Items.delete(uri?.toString?.() ?? String(uri)),
						clear: () => Items.clear(),
						forEach: (cb: any) => Items.forEach(cb),
						get: (uri: any) =>
							Items.get(uri?.toString?.() ?? String(uri)),
						has: (uri: any) =>
							Items.has(uri?.toString?.() ?? String(uri)),
						dispose: () => Items.clear(),
					};
				},

				registerHoverProvider: (sel: any, p: any) =>
					RegisterProvider("hover_provider", sel, p),
				registerCompletionItemProvider: (
					sel: any,

					p: any,
					..._: string[]
				) => RegisterProvider("completion_item_provider", sel, p),
				registerDefinitionProvider: (sel: any, p: any) =>
					RegisterProvider("definition_provider", sel, p),
				registerReferenceProvider: (sel: any, p: any) =>
					RegisterProvider("reference_provider", sel, p),
				registerCodeActionsProvider: (sel: any, p: any, _meta?: any) =>
					RegisterProvider("code_actions_provider", sel, p),
				registerDocumentHighlightProvider: (sel: any, p: any) =>
					RegisterProvider("document_highlight_provider", sel, p),
				registerDocumentSymbolProvider: (
					sel: any,

					p: any,

					_meta?: any,
				) => RegisterProvider("document_symbol_provider", sel, p),
				registerWorkspaceSymbolProvider: (p: any) =>
					RegisterProvider("workspace_symbol_provider", "*", p),
				registerRenameProvider: (sel: any, p: any) =>
					RegisterProvider("rename_provider", sel, p),
				registerDocumentFormattingEditProvider: (sel: any, p: any) =>
					RegisterProvider("document_formatting_provider", sel, p),
				registerDocumentRangeFormattingEditProvider: (
					sel: any,

					p: any,
				) =>
					RegisterProvider(
						"document_range_formatting_provider",

						sel,

						p,
					),
				registerOnTypeFormattingEditProvider: (
					sel: any,

					p: any,

					_first: string,
					..._more: string[]
				) => RegisterProvider("on_type_formatting_provider", sel, p),
				registerSignatureHelpProvider: (
					sel: any,

					p: any,
					..._: any[]
				) => RegisterProvider("signature_help_provider", sel, p),
				registerCodeLensProvider: (sel: any, p: any) =>
					RegisterProvider("code_lens_provider", sel, p),
				registerFoldingRangeProvider: (sel: any, p: any) =>
					RegisterProvider("folding_range_provider", sel, p),
				registerSelectionRangeProvider: (sel: any, p: any) =>
					RegisterProvider("selection_range_provider", sel, p),
				registerDocumentSemanticTokensProvider: (
					sel: any,

					p: any,

					_legend: any,
				) => RegisterProvider("semantic_tokens_provider", sel, p),
				registerDocumentRangeSemanticTokensProvider: (
					sel: any,

					p: any,

					_legend: any,
				) => RegisterProvider("semantic_tokens_provider", sel, p),
				registerInlayHintsProvider: (sel: any, p: any) =>
					RegisterProvider("inlay_hints_provider", sel, p),
				registerTypeHierarchyProvider: (sel: any, p: any) =>
					RegisterProvider("type_hierarchy_provider", sel, p),
				registerCallHierarchyProvider: (sel: any, p: any) =>
					RegisterProvider("call_hierarchy_provider", sel, p),
				registerLinkedEditingRangeProvider: (sel: any, p: any) =>
					RegisterProvider("linked_editing_range_provider", sel, p),
				registerDocumentLinkProvider: (sel: any, p: any) =>
					RegisterProvider("document_link_provider", sel, p),
				registerColorProvider: (sel: any, p: any) =>
					RegisterProvider("color_provider", sel, p),
				registerImplementationProvider: (sel: any, p: any) =>
					RegisterProvider("implementation_provider", sel, p),
				registerTypeDefinitionProvider: (sel: any, p: any) =>
					RegisterProvider("type_definition_provider", sel, p),
				registerDeclarationProvider: (sel: any, p: any) =>
					RegisterProvider("declaration_provider", sel, p),
				registerEvaluatableExpressionProvider: (sel: any, p: any) =>
					RegisterProvider("evaluatable_expression_provider", sel, p),
				registerInlineValuesProvider: (sel: any, p: any) =>
					RegisterProvider("inline_values_provider", sel, p),

				setLanguageConfiguration: (lang: string, config: any) => {
					mountainClient
						.sendNotification("set_language_configuration", {
							language: lang,
							configuration: config,
						})
						.catch(() => {});
					return { dispose: () => {} };
				},
			};
		})(),

		debug: {
			startDebugging: async () => false,

			activeDebugSession: undefined,
		},

		scm: {
			createSourceControl: (_id: string, _label: string) => ({
				createResourceGroup: (_id: string, _label: string) => ({
					resourceStates: [],
				}),
				dispose: () => {},
			}),
		},

		authentication: {
			getSession: async () => undefined,
		},
	};
};

/**
 * APIFactoryService implementation
 */
export class APIFactoryService implements IAPIFactoryService {
	readonly _serviceBrand: undefined;

	private api: any;

	constructor(
		private mountainClient: IMountainClientService,

		private configService: IConfigurationService,

		private fsService: IFileSystemService,

		private terminalService: ITerminalService,

		private moduleInterceptor: IModuleInterceptorService,
	) {
		this.api = createVSCodeAPI(
			mountainClient,

			configService,

			fsService,

			terminalService,
		);
	}

	/**
	 * Create/Get the API instance
	 */
	createAPI(): any {
		return this.api;
	}
}

/**
 * Service Layer
 */
export const APIFactoryLayer = Layer.effect(
	IAPIFactoryService,

	Effect.gen(function* () {
		const mountainClient = yield* IMountainClientService;
		const configService = yield* IConfigurationService;
		const fsService = yield* IFileSystemService;
		const terminalService = yield* ITerminalService;
		const moduleInterceptor = yield* IModuleInterceptorService;

		return new APIFactoryService(
			mountainClient,

			configService,

			fsService,

			terminalService,

			moduleInterceptor,
		);
	}),
);
