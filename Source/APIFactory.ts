/**
 * @module APIFactory
 * @description Defines the service responsible for constructing a complete, sandboxed
 * `vscode` API object for a given extension. It composes the various API namespaces
 * (e.g., `commands`, `window`, `workspace`) from their respective, underlying services.
 */

import { Effect } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type {
	IExtensionDescription,
	ExtensionIdentifier,
} from "vs/platform/extensions/common/extensions.js";
import * as VSCode from "vscode";
import { Position, Range, Selection } from "vscode";
import { APIDeprecation } from "./APIDeprecation.js";
import { Command } from "./Command.js";
import { Debug } from "./Debug.js";
import { Document } from "./Document.js";
import { Extension } from "./Extension.js";
import { LanguageFeature } from "./LanguageFeature.js";
import { Logger } from "./Logger.js";
import { ProposedAPI } from "./ProposedAPI.js";
import { StatusBar } from "./StatusBar.js";
import { Task } from "./Task.js";
import { TreeView } from "./TreeView.js";
import { WebViewPanel } from "./WebViewPanel.js";
import { Window } from "./Window.js";
import { WorkSpace } from "./WorkSpace.js";

// --- NOTE: Internal Namespace Factory helpers are now co-located for clarity. ---

/**
 * @description Wraps a raw event emitter to provide safe error handling for
 * extension listeners, preventing one extension's faulty listener from crashing the host.
 */
const CreateSafeEvent = <T>(
	ExtensionId: ExtensionIdentifier,
	LogService: Logger,
	ActualEvent: VSCode.Event<T>,
): VSCode.Event<T> => {
	return (Listener, ThisArgument, Disposables) => {
		const SafeListener = (Event: T) => {
			try {
				Listener.call(ThisArgument, Event);
			} catch (error) {
				LogService.Error(
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

/**
 * @description Constructs the `vscode.commands` namespace for the API object.
 */
const CreateCommandNamespace = (
	CommandService: Command,
	ExtensionDescription: IExtensionDescription,
): typeof VSCode.commands => {
	return {
		registerCommand: (Id, Handler, ThisArgument) =>
			Effect.runSync(
				CommandService.registerCommand(
					Id,
					Handler,
					ThisArgument,
					ExtensionDescription,
				),
			),
		registerTextEditorCommand: (Id, Handler, ThisArgument) =>
			Effect.runSync(
				CommandService.registerTextEditorCommand(
					Id,
					Handler,
					ThisArgument,
					ExtensionDescription,
				),
			),
		registerDiffInformationCommand: (Id, Handler, ThisArgument) =>
			Effect.runSync(
				CommandService.registerCommand(
					Id,
					Handler,
					ThisArgument,
					ExtensionDescription,
				),
			),
		executeCommand: <T>(Id: string, ...Argument: any[]) =>
			Effect.runPromise(
				CommandService.executeCommand<T>(Id, ...Argument),
			),
		getCommands: (FilterInternal?: boolean) =>
			Effect.runPromise(CommandService.getCommands(FilterInternal)),
	};
};

/**
 * @description Constructs the `vscode.window` namespace for the API object.
 */
const CreateWindowNamespace = (
	WindowService: Window,
	StatusBarService: StatusBar,
	WebViewPanelService: WebViewPanel,
	TreeViewService: TreeView,
	AsEvent: <T>(Event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
	WorkSpaceService: WorkSpace,
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
			return WorkSpaceService.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkSpaceService.visibleTextEditors;
		},
		get onDidChangeActiveTextEditor() {
			return AsEvent(WorkSpaceService.onDidChangeActiveTextEditor);
		},
		get onDidChangeVisibleTextEditors() {
			return AsEvent(WorkSpaceService.onDidChangeVisibleTextEditors);
		},
		showTextDocument: (DocumentOrUri, ColumnOrOptions, PreserveFocus) =>
			RunEffectAndReturnPromise(
				WindowService.ShowTextDocument(
					DocumentOrUri,
					ColumnOrOptions,
					PreserveFocus,
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
	/**
	 * Creates a complete, sandboxed `vscode` API object for a given extension.
	 * @param ExtensionDescription The description of the extension to create the API for.
	 * @returns A fully-formed `vscode` API object.
	 */
	readonly CreateAPI: (
		ExtensionDescription: IExtensionDescription,
	) => typeof VSCode;
}

/**
 * @class APIFactory
 * @description The `Effect.Service` for the APIFactory. This is a high-level service
 * that aggregates almost all other services to construct the final `vscode` object
 * that is exposed to extensions.
 */
export class APIFactory extends Effect.Service<APIFactory>()(
	"Service/APIFactory",
	{
		effect: Effect.gen(function* () {
			const LogService = yield* Logger;
			const ProposedAPIService = yield* ProposedAPI;
			const APIDeprecationService = yield* APIDeprecation;
			const CommandService = yield* Command;
			const WorkSpaceService = yield* WorkSpace;
			const DocumentService = yield* Document;
			const WindowService = yield* Window;
			const LanguageFeatureService = yield* LanguageFeature;
			const DebugService = yield* Debug;
			const TaskService = yield* Task;
			const ExtensionService = yield* Extension;
			const WebViewPanelService = yield* WebViewPanel;
			const TreeViewService = yield* TreeView;
			const StatusBarService = yield* StatusBar;

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
				const SafeEvent = <T>(SourceEvent: VSCode.Event<T>) =>
					CreateSafeEvent(
						ExtensionDescription.identifier,
						LogService,
						SourceEvent,
					);

				// --- Namespace Construction ---
				const CommandNamespace = CreateCommandNamespace(
					CommandService,
					ExtensionDescription,
				);
				const WorkSpaceNamespace = WorkSpaceService; // The service itself now implements the namespace
				const WindowNamespace = CreateWindowNamespace(
					WindowService,
					StatusBarService,
					WebViewPanelService,
					TreeViewService,
					SafeEvent,
					ExtensionDescription,
					WorkSpaceService,
				);
				const LanguagesNamespace = LanguageFeatureService; // The service itself implements the namespace
				const TasksNamespace = TaskService;
				const DebugNamespace = DebugService;
				const ExtensionsNamespace =
					CreateExtensionsAPI(ExtensionService);

				const API: Partial<typeof VSCode> = {
					version: "1.85.0",
					commands: CommandNamespace,
					window: WindowNamespace,
					workspace: WorkSpaceNamespace,
					languages: LanguagesNamespace,
					debug: DebugNamespace,
					tasks: TasksNamespace,
					extensions: ExtensionsNamespace,
					Position,
					Range,
					Selection,
				};

				if (
					ProposedAPIService.IsEnabled(
						ExtensionDescription.identifier,
						"someProposedAPI",
					)
				) {
					// Object.assign(API, { someProposedAPI: ... });
				}

				// Deep freeze the final API object to prevent modification by extensions.
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
