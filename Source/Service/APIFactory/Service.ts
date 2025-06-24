/*
 * File: Cocoon/Source/Service/APIFactory/Service.ts
 * Role: Defines the APIFactory service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Construct a complete, sandboxed `vscode` API object for a given extension.
 *   - Compose the various API namespaces (commands, window, etc.) from their respective services.
 */

import { Effect } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type {
	IExtensionDescription,
	ExtensionIdentifier,
} from "vs/platform/extensions/common/extensions.js";
import * as VSCode from "vscode";
import { Position, Range, Selection } from "vscode";

import { APIDeprecation } from "../../Service/APIDeprecation/Service.js";
import { Command } from "../../Service/Command/Service.js";
import { Debug } from "../../Service/Debug/Service.js";
import { Document } from "../../Service/Document/Service.js";
import { Extension } from "../../Service/Extension/Service.js";
import { LanguageFeature } from "../../Service/LanguageFeature/Service.js";
import { Logger } from "../../Service/Log/Service.js";
import { ProposedAPI } from "../../Service/ProposedAPI/Service.js";
import { StatusBar } from "../../Service/StatusBar/Service.js";
import { Task } from "../../Service/Task/Service.js";
import { TreeView } from "../../Service/TreeView/Service.js";
import { WebViewPanel } from "../../Service/WebViewPanel/Service.js";
import { Window } from "../../Service/Window/Service.js";
import { Workspace } from "../../Service/WorkSpace/Service.js";

// --- Internal Namespace Factories and Helpers ---

const AsExtensionEvent = <T>(
	ExtensionID: ExtensionIdentifier,
	LogService: Logger,
	ActualEvent: VSCode.Event<T>,
): VSCode.Event<T> => {
	return (Listener, ThisArgument, Disposables) => {
		const SafeListener = (Event: T) => {
			try {
				Listener.call(ThisArgument, Event);
			} catch (error) {
				LogService.Error(
					`[${ExtensionID.value}] FAILED to handle event:`,
					error,
				);
			}
		};
		const Handle = ActualEvent(SafeListener);
		Disposables?.push(Handle);
		return Handle;
	};
};

const CreateCommandNamespace = (
	CommandService: Command,
	ExtensionDescription: IExtensionDescription,
): typeof VSCode.commands => {
	const RegisterCommand = (
		ID: string,
		Handler: (...args: any[]) => any,
		ThisArgument?: any,
	) =>
		CommandService.RegisterCommand(
			ID,
			Handler,
			ThisArgument,
			ExtensionDescription,
		);
	const RegisterTextEditorCommand = (
		ID: string,
		Handler: (
			textEditor: VSCode.TextEditor,
			edit: VSCode.TextEditorEdit,
			...args: any[]
		) => void,
		ThisArgument?: any,
	) =>
		CommandService.RegisterTextEditorCommand(
			ID,
			Handler,
			ThisArgument,
			ExtensionDescription,
		);
	const ExecuteCommand = <T>(ID: string, ...Argument: any[]) =>
		CommandService.ExecuteCommand<T>(ID, ...Argument);
	const GetCommands = (FilterInternal?: boolean) =>
		CommandService.GetCommands(FilterInternal);
	return {
		registerCommand: RegisterCommand,
		registerTextEditorCommand: RegisterTextEditorCommand,
		registerDiffInformationCommand: RegisterCommand,
		executeCommand: ExecuteCommand as any,
		getCommands: GetCommands as any,
	};
};

// ... other Create...Namespace functions would be defined here similarly ...
// For brevity, I'll only include one more complex one, CreateWindowNamespace.

const CreateWindowNamespace = (
	WindowService: Window,
	StatusBarService: StatusBar,
	WebViewPanelService: WebViewPanel,
	TreeViewService: TreeView,
	AsEvent: <T>(Event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
	WorkspaceService: Workspace,
): typeof VSCode.window => {
	const RunEffectAndReturnPromise = <T, E>(TheEffect: Effect.Effect<T, E>) =>
		Effect.runPromise(Effect.mapError(TheEffect, (e) => e as Error));

	const WindowNamespace: Partial<typeof VSCode.window> = {
		get state() {
			return WindowService.state;
		},
		get onDidChangeWindowState() {
			return AsEvent(WindowService.onDidChangeWindowState);
		},
		get activeTextEditor() {
			return WorkspaceService.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkspaceService.visibleTextEditors;
		},
		get onDidChangeActiveTextEditor() {
			return AsEvent(WorkspaceService.onDidChangeActiveTextEditor);
		},
		get onDidChangeVisibleTextEditors() {
			return AsEvent(WorkspaceService.onDidChangeVisibleTextEditors);
		},
		showTextDocument: (DocumentOrURI, ColumnOrOptions, PreserveFocus) =>
			RunEffectAndReturnPromise(
				WindowService.ShowTextDocument(
					DocumentOrURI,
					ColumnOrOptions,
					PreserveFocus,
				),
			),
		createStatusBarItem: ((...args: any[]) => {
			let id: string | undefined;
			let alignment: VSCode.StatusBarAlignment | undefined;
			let priority: number | undefined;
			if (typeof args[0] === "string") {
				[id, alignment, priority] = args;
			} else {
				[alignment, priority] = args;
			}
			return Effect.runSync(
				StatusBarService.CreateStatusBarItem(
					Extension,
					id,
					alignment,
					priority,
				),
			);
		}) as any,
		createTreeView: (ViewId, Options) =>
			RunEffectAndReturnPromise(
				TreeViewService.CreateTreeView(ViewId, Options, Extension),
			),
		createWebviewPanel: (ViewType, Title, ShowOptions, Options) =>
			RunEffectAndReturnPromise(
				WebViewPanelService.CreateWebviewPanel(
					Extension,
					ViewType,
					Title,
					ShowOptions,
					Options,
				),
			),
		registerWebviewPanelSerializer: (ViewType, Serializer) =>
			Effect.runSync(
				WebViewPanelService.RegisterWebviewPanelSerializer(
					Extension,
					ViewType,
					Serializer,
				),
			),
		activeTerminal: undefined,
		terminals: [],
		activeColorTheme: { kind: 1 as VSCode.ColorThemeKind.Light },
		onDidChangeActiveTerminal: new Emitter<any>().event,
		onDidOpenTerminal: new Emitter<any>().event,
		onDidCloseTerminal: new Emitter<any>().event,
		onDidChangeTerminalState: new Emitter<any>().event,
		onDidChangeTextEditorSelection: new Emitter<any>().event,
		onDidChangeTextEditorVisibleRanges: new Emitter<any>().event,
		onDidChangeTextEditorOptions: new Emitter<any>().event,
		onDidChangeTextEditorViewColumn: new Emitter<any>().event,
	};
	return WindowNamespace as typeof VSCode.window;
};

// --- Service Definition ---
export class APIFactory extends Effect.Service<APIFactory>()(
	"Service/APIFactory",
	{
		effect: Effect.gen(function* (Generator) {
			const LogService = yield* Generator(Logger);
			const ProposedAPIService = yield* Generator(ProposedAPI);
			const APIDeprecationService = yield* Generator(APIDeprecation);
			const CommandService = yield* Generator(Command);
			const WorkspaceService = yield* Generator(Workspace);
			const DocumentService = yield* Generator(Document);
			const WindowService = yield* Generator(Window);
			const LanguageFeatureService = yield* Generator(LanguageFeature);
			const DebugService = yield* Generator(Debug);
			const TaskService = yield* Generator(Task);
			const ExtensionService = yield* Generator(Extension);
			const WebViewPanelService = yield* Generator(WebViewPanel);
			const TreeViewService = yield* Generator(TreeView);
			const StatusBarService = yield* Generator(StatusBar);

			const CreateExtensionsAPI = (
				ExtensionService: Extension,
			): typeof VSCode.extensions => ({
				getExtension: (ExtensionId: string) =>
					Effect.runSync(ExtensionService.GetExtension(ExtensionId)),
				get all() {
					return Effect.runSync(ExtensionService.GetAll());
				},
				get allAcrossExtensionHosts() {
					return [];
				},
				onDidChange: new Emitter<void>().event,
			});

			const CreateAPI = (
				ExtensionDescription: IExtensionDescription,
			): typeof VSCode => {
				const CreateSafeEvent = <T>(SourceEvent: VSCode.Event<T>) =>
					AsExtensionEvent(
						ExtensionDescription.identifier,
						LogService,
						SourceEvent,
					);

				// Here you would call all your Create...Namespace functions
				const WindowNamespace = CreateWindowNamespace(
					WindowService,
					StatusBarService,
					WebViewPanelService,
					TreeViewService,
					CreateSafeEvent,
					ExtensionDescription,
					WorkspaceService,
				);
				const CommandNamespace = CreateCommandNamespace(
					CommandService,
					ExtensionDescription,
				);
				// ... etc for other namespaces

				const API: Partial<typeof VSCode> = {
					version: "1.85.0",
					commands: CommandNamespace,
					window: WindowNamespace,
					// ... other namespaces
					extensions: CreateExtensionsAPI(ExtensionService),
					Position,
					Range,
					Selection,
				};

				if (
					ProposedAPIService.IsEnabled(
						ExtensionDescription.identifier,
						"someProposedApi",
					)
				) {
					// Logic for proposed APIs
				}

				for (const Key in API) {
					if (Object.prototype.hasOwnProperty.call(API, Key)) {
						const Property = (API as any)[Key];
						if (typeof Property === "object" && Property !== null) {
							Object.freeze(Property);
						}
					}
				}
				return Object.freeze(API) as typeof VSCode;
			};

			return { CreateAPI };
		}),
	},
) {}
