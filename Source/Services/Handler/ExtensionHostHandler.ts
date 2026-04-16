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
 * Create a vscode API shim and register it on globalThis so the Module._load
 * hook can return it when extensions call require('vscode').
 * Uses real VS Code type constructors from @codeeditorland/output.
 * Namespace implementations live in VscodeAPI/*.ts for maintainability.
 */
const EnsureVscodeAPIRegistered = async (
	Context: HandlerContext,
): Promise<void> => {
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

		const API = {
			version: "1.88.0",
			// Type constructors
			Position: VsCodeTypes.Position,
			Range: VsCodeTypes.Range,
			Location: VsCodeTypes.Location,
			Selection: VsCodeTypes.Selection,
			MarkdownString: VsCodeTypes.MarkdownString,
			Hover: VsCodeTypes.Hover,
			CompletionItem: VsCodeTypes.CompletionItem,
			CompletionItemKind: VsCodeTypes.CompletionItemKind,
			CompletionList: VsCodeTypes.CompletionList,
			CompletionTriggerKind: VsCodeTypes.CompletionTriggerKind,
			Diagnostic: VsCodeTypes.Diagnostic,
			DiagnosticSeverity: VsCodeTypes.DiagnosticSeverity,
			TextEdit: VsCodeTypes.TextEdit,
			WorkspaceEdit: VsCodeTypes.WorkspaceEdit,
			SnippetString: VsCodeTypes.SnippetString,
			SymbolKind: VsCodeTypes.SymbolKind,
			SymbolInformation: VsCodeTypes.SymbolInformation,
			DocumentSymbol: VsCodeTypes.DocumentSymbol,
			CodeActionKind: VsCodeTypes.CodeActionKind,
			CodeAction: VsCodeTypes.CodeAction,
			SignatureHelp: VsCodeTypes.SignatureHelp,
			SignatureInformation: VsCodeTypes.SignatureInformation,
			ParameterInformation: VsCodeTypes.ParameterInformation,
			InlayHint: VsCodeTypes.InlayHint,
			InlayHintKind: VsCodeTypes.InlayHintKind,
			FoldingRange: VsCodeTypes.FoldingRange,
			FoldingRangeKind: VsCodeTypes.FoldingRangeKind,
			DocumentHighlight: VsCodeTypes.DocumentHighlight,
			DocumentHighlightKind: VsCodeTypes.DocumentHighlightKind,
			SelectionRange: VsCodeTypes.SelectionRange,
			SemanticTokensLegend: VsCodeTypes.SemanticTokensLegend,
			SemanticTokensBuilder: VsCodeTypes.SemanticTokensBuilder,
			SemanticTokens: VsCodeTypes.SemanticTokens,
			RelativePattern: VsCodeTypes.RelativePattern,
			Disposable: VsCodeTypes.Disposable,
			StatusBarAlignment: VsCodeTypes.StatusBarAlignment,
			ThemeColor: VsCodeTypes.ThemeColor,
			ThemeIcon: VsCodeTypes.ThemeIcon,
			TreeItem: VsCodeTypes.TreeItem,
			TreeItemCollapsibleState: VsCodeTypes.TreeItemCollapsibleState,
			ViewColumn: VsCodeTypes.ViewColumn,
			EndOfLine: VsCodeTypes.EndOfLine,
			ConfigurationTarget: VsCodeTypes.ConfigurationTarget,
			Uri: URI,
			CancellationTokenSource,
			EventEmitter: Emitter,
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
		};

		(globalThis as any).__cocoonVscodeAPI = API;
		console.log("[ExtensionHostHandler] vscode API shim registered on globalThis.__cocoonVscodeAPI");
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

	console.log(`[ExtensionHostHandler] Loading ${ExtensionId} from ${ModulePath}`);

	try {
		const { createRequire } = await import("module");
		const Require = createRequire(import.meta.url);

		// Module._load is patched by ModuleInterceptor — require('vscode') returns our API shim.
		const ExtModule: { activate?: (ctx: unknown) => unknown } = Require(ModulePath);

		if (typeof ExtModule?.activate === "function") {
			const ExtContext = CreateExtensionContext(Context, Extension, ExtensionPath);
			await ExtModule.activate(ExtContext);
			console.log(`[ExtensionHostHandler] ${ExtensionId} activated (event: ${ActivationEvent})`);
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
