/**
 * @module APIFactory
 * @description Defines the service responsible for constructing a complete, sandboxed
 * `vscode` API object for a given extension.
 */

import { Effect, Option } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type {
	IExtensionDescription,
	ExtensionIdentifier,
} from "vs/platform/extensions/common/extensions.js";
import * as VSCode from "vscode";
import { Position, Range, Selection, Disposable } from "vscode";

import { APIDeprecationService } from "./APIDeprecation.js";
import { CommandService } from "./Command.js";
import { DebugService } from "./Debug.js";
import { DocumentService } from "./Document.js";
import { Extension, ExtensionService } from "./Extension.js";
import { LanguageFeatureService } from "./LanguageFeature.js";
import { Logger, LoggerService } from "./Logger.js";
import { ProposedAPIService } from "./ProposedAPI.js";
import { StatusBar, StatusBarService } from "./StatusBar.js";
import { TaskService } from "./Task.js";
import { TreeView, TreeViewService } from "./TreeView.js";
import { WebViewPanel, WebViewPanelService } from "./WebViewPanel.js";
import { WindowService } from "./Window.js";
import { WorkSpaceService } from "./WorkSpace.js";

// --- Internal Namespace Factory helpers ---
const CreateSafeEvent = <T>(
	ExtensionId: ExtensionIdentifier,
	Logger: Logger,
	ActualEvent: VSCode.Event<T>,
): VSCode.Event<T> => {
	return (Listener, ThisArgument, Disposables) => {
		const SafeListener = (Event: T) => {
			try {
				Listener.call(ThisArgument, Event);
			} catch (error) {
				Logger.Error(
					`[${ExtensionId.value}] FAILED to handle event:`,
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
	Command: Command,
	ExtensionDescription: IExtensionDescription,
): typeof VSCode.commands => {
	return {
		registerCommand: (Id, Handler, ThisArgument) =>
			Command.registerCommand(
				Id,
				Handler,
				ThisArgument,
				ExtensionDescription,
			),
		registerTextEditorCommand: (Id, Handler, ThisArgument) =>
			Command.registerTextEditorCommand(
				Id,
				Handler,
				ThisArgument,
				ExtensionDescription,
			),
		registerDiffInformationCommand: (Id, Handler, ThisArgument) =>
			Command.registerCommand(
				Id,
				Handler,
				ThisArgument,
				ExtensionDescription,
			),
		executeCommand: <T>(Id: string, ...Argument: any[]) =>
			Command.executeCommand<T>(Id, ...Argument),
		getCommands: (FilterInternal?: boolean) =>
			Command.getCommands(FilterInternal),
	};
};

const CreateWindowNamespace = (
	Window: Window,
	StatusBar: StatusBar,
	WebViewPanel: WebViewPanel,
	TreeView: TreeView,
	AsEvent: <T>(Event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
	WorkSpace: WorkSpace,
): typeof VSCode.window => {
	// This function must return an object matching vscode.window
	const RunEffectAndReturnPromise = <T, E>(TheEffect: Effect.Effect<T, E>) =>
		Effect.runPromise(Effect.mapError(TheEffect, (e) => e as Error));

	const WindowNamespace: Partial<typeof VSCode.window> = {
		get state() {
			return Window.state;
		},
		get onDidChangeWindowState() {
			return AsEvent(Window.onDidChangeWindowState);
		},
		get activeTextEditor() {
			return WorkSpace.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkSpace.visibleTextEditors;
		},
		get onDidChangeActiveTextEditor() {
			return AsEvent(WorkSpace.onDidChangeActiveTextEditor);
		},
		get onDidChangeVisibleTextEditors() {
			return AsEvent(WorkSpace.onDidChangeVisibleTextEditors);
		},
		showTextDocument: (documentOrUri, columnOrOptions, preserveFocus) =>
			RunEffectAndReturnPromise(
				Window.ShowTextDocument(
					documentOrUri as any,
					columnOrOptions,
					preserveFocus,
				),
			),
		createStatusBarItem: ((...args: any[]) => {
			let id: string | undefined,
				alignment: VSCode.StatusBarAlignment | undefined,
				priority: number | undefined;
			if (typeof args[0] === "string") {
				[id, alignment, priority] = args;
			} else {
				[alignment, priority] = args;
			}
			return Effect.runSync(
				StatusBar.CreateStatusBarItem(
					Extension,
					id,
					alignment,
					priority,
				),
			);
		}) as any,
		createTreeView: (ViewId, Options) =>
			Effect.runSync(TreeView.CreateTreeView(ViewId, Options, Extension)),
		createWebviewPanel: (ViewType, Title, ShowOptions, Options) =>
			Effect.runSync(
				WebViewPanel.CreateWebviewPanel(
					Extension,
					ViewType,
					Title,
					ShowOptions,
					Options,
				),
			),
		registerWebviewPanelSerializer: (ViewType, Serializer) =>
			Effect.runSync(
				WebViewPanel.RegisterWebviewPanelSerializer(
					Extension,
					ViewType,
					Serializer,
				),
			),
		// Stubs
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

/**
 * @interface APIFactory
 * @description The contract for the APIFactory service.
 */
export interface APIFactory {
	readonly CreateAPI: (
		ExtensionDescription: IExtensionDescription,
	) => typeof VSCode;
}

/**
 * @class APIFactoryService
 * @description The `Effect.Service` for the APIFactory.
 */
export class APIFactoryService extends Effect.Service<APIFactory>()(
	"Service/APIFactory",
	{
		effect: Effect.gen(function* () {
			const Logger = yield* LoggerService;
			const ProposedAPI = yield* ProposedAPIService;
			const APIDeprecation = yield* APIDeprecationService;
			const Command = yield* CommandService;
			const WorkSpace = yield* WorkSpaceService;
			const Document = yield* DocumentService;
			const Window = yield* WindowService;
			const LanguageFeature = yield* LanguageFeatureService;
			const Debug = yield* DebugService;
			const Task = yield* TaskService;
			const Extension = yield* ExtensionService;
			const WebViewPanel = yield* WebViewPanelService;
			const TreeView = yield* TreeViewService;
			const StatusBar = yield* StatusBarService;

			const CreateExtensionsAPI = (
				Extension: Extension,
			): typeof VSCode.extensions => ({
				getExtension: <T>(extensionId: string) =>
					Option.getOrUndefined(
						Effect.runSync(Extension.GetExtension<T>(extensionId)),
					),
				get all() {
					return Effect.runSync(Extension.GetAll());
				},
				get allAcrossExtensionHosts() {
					return [];
				},
				onDidChange: new Emitter<void>().event,
			});

			const CreateAPI = (
				ExtensionDescription: IExtensionDescription,
			): typeof VSCode => {
				const SafeEvent = <T>(SourceEvent: VSCode.Event<T>) =>
					CreateSafeEvent(
						ExtensionDescription.identifier,
						Logger,
						SourceEvent,
					);

				const API: Partial<typeof VSCode> = {
					version: "1.85.0",
					commands: CreateCommandNamespace(
						Command,
						ExtensionDescription,
					),
					window: CreateWindowNamespace(
						Window,
						StatusBar,
						WebViewPanel,
						TreeView,
						SafeEvent,
						ExtensionDescription,
						WorkSpace,
					),
					workspace: WorkSpace,
					languages: LanguageFeature,
					debug: Debug,
					tasks: Task,
					extensions: CreateExtensionsAPI(Extension),
					Position,
					Range,
					Selection,
				};

				if (
					ProposedAPI.IsEnabled(
						ExtensionDescription.identifier,
						"someProposedApi",
					)
				) {
					// Stub for proposed API logic
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
