/**
 * @module Handler/ExtensionHost/EnsureVscodeAPI
 * @description
 * Builds and registers the `vscode` API shim on `globalThis.__cocoonVscodeAPI`
 * so that extension code can call `require('vscode')` / `import 'vscode'` and
 * receive a complete API surface backed by real VS Code type constructors from
 * `@codeeditorland/output`. Idempotent - a second call returns immediately if
 * the shim is already registered.
 *
 * Namespace implementations (window, workspace, commands, etc.) live under
 * `VscodeAPI/*.ts` and are imported here via dynamic await import().
 */

import { CocoonDevLog } from "../../../Dev/Log.js";

import * as LanguageProviderRegistry from "../../../Language/Provider/Registry.js";

import type { HandlerContext } from "../../Handler/Context.js";

import InstallVscodeModuleHooks from "./VscodeModuleHooks.js";

const EnsureVscodeAPIRegistered = async (
	Context: HandlerContext,
): Promise<void> => {

	// Install hooks *before* anything else - idempotent, runs once.
	await InstallVscodeModuleHooks(;

	if ((globalThis as any).__cocoonVscodeAPI) return;

	try {
		const VsCodeTypes =
			await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js";

		const { URI } =
			await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";

		const { CancellationTokenSource } =
			await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js";

		const { Emitter } =
			await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js";

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

						: URI.revive(WithUri.uri as any;

				return { ...(Base as object), uri: ReviveInput };
			}

			const Revived = URI.revive(Base as any;

			return Revived ?? Base;
		};

		const PatchedRelativePattern: any = function RelativePattern(
			this: unknown,

			Base: unknown,

			Pattern: string,
		) {
			const Safe = HydrateRelativePatternBase(Base;

			return Reflect.construct(
				StockRelativePattern,

				[Safe, Pattern],

				PatchedRelativePattern,
			;
		};

		PatchedRelativePattern.prototype = StockRelativePattern.prototype;

		Object.setPrototypeOf(PatchedRelativePattern, StockRelativePattern;

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
				super("Canceled";

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
			window: (
				await import("../../VscodeAPI/Window/Namespace.js")
			).default(Context),

			workspace: (
				await import("../../VscodeAPI/Workspace/Namespace.js")
			).default(Context),

			commands: (
				await import("../../VscodeAPI/Commands/Namespace.js")
			).default(Context, LanguageProviderRegistry),

			languages: (
				await import("../../VscodeAPI/Languages/Namespace.js")
			).default(Context, LanguageProviderRegistry),

			extensions: (
				await import("../../VscodeAPI/Extensions/Namespace.js")
			).default(Context),

			env: (await import("../../VscodeAPI/Env/Namespace.js")).default(
				Context,
			),

			debug: (await import("../../VscodeAPI/Debug/Namespace.js")).default(
				Context,
			),

			tasks: (await import("../../VscodeAPI/Tasks/Namespace.js")).default(
				Context,
			),

			scm: (await import("../../VscodeAPI/Scm/Namespace.js")).default(
				Context,
			),

			authentication: (
				await import("../../VscodeAPI/Authentication/Namespace.js")
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
								String(Message);

					if (!Arguments.length) return Raw;

					return Raw.replace(
						/\{(\d+)\}/g,

						(_Match, Index: string) => {
							const Replacement = Arguments[Number(Index)];

							return Replacement === undefined
								? ""
								: String(Replacement;
						},
					;
				},

				bundle: undefined,

				uri: undefined,
			},

			notebooks: {
				createNotebookController: (
					id: string,

					notebookType: string,

					label: string,
				) => {
					// Stub: notebook controllers are not yet wired to the workbench.
					// The returned disposable cleans up on deactivation. Extensions
					// that call `vscode.notebooks.createNotebookController(...)` and
					// set `executeHandler` will receive a controller object whose
					// executeHandler callback is stored but never invoked — real
					// execution requires wiring through the Jupyter kernel pipeline
					// in Cocoon → Mountain → Sky.
					return {
						id,

						notebookType,

						supportedLanguages: [] as string[],

						label,

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

						onDidChangeSelectedNotebooks: () => ({
							dispose: () => {},
						}),

						updateNotebookAffinity: () => {},
					};
				},

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

			tests: (await import("../../VscodeAPI/Tests/Namespace.js")).default(
				Context,
			),

			comments: (
				await import("../../VscodeAPI/Comments/Namespace.js")
			).default(Context),

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

		process.stdout.write(
			"[ExtensionHostHandler] vscode API shim registered on globalThis.__cocoonVscodeAPI\n",
		;

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

		const Missing = CriticalNames.filter((Name) => API[Name] === undefined;

		if (Missing.length) {
			process.stderr.write(
				`[ExtensionHostHandler] vscode API shim missing critical symbols: ${Missing.join(", ")}\n`,
			;
		} else {
			CocoonDevLog(
				"ext-host",

				"[ExtensionHostHandler] vscode API shim critical symbols OK",
			;
		}
	} catch (Err: unknown) {
		process.stderr.write(
			`[ExtensionHostHandler] Failed to create vscode API shim: ${Err instanceof Error ? Err.message : String(Err)}\n`,
		;
	}
};

export default EnsureVscodeAPIRegistered;
