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

// Corrected PascalCase Imports
import { APIDeprecationService } from "./APIDeprecation.js";
import { CommandService } from "./Command.js";
import { DebugService } from "./Debug.js";
import { DocumentService } from "./Document.js";
import { ExtensionService } from "./Extension.js";
import { LanguageFeatureService } from "./LanguageFeature.js";
import { Logger } from "./Logger.js";
import { ProposedAPIService } from "./ProposedAPI.js";
import { StatusBarService } from "./StatusBar.js";
import { TaskService } from "./Task.js";
import { TreeViewService } from "./TreeView.js";
import { WebViewPanelService } from "./WebViewPanel.js";
import { WindowService } from "./Window.js";
import { WorkspaceService } from "./Workspace.js";

// --- Internal Namespace Factory helpers ---
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

const CreateCommandNamespace = (
	CommandServiceInstance: CommandService,
	ExtensionDescription: IExtensionDescription,
): typeof VSCode.commands => {
	return {
		registerCommand: (Id, Handler, ThisArgument) =>
			CommandServiceInstance.registerCommand(
				Id,
				Handler,
				ThisArgument,
				ExtensionDescription,
			),
		registerTextEditorCommand: (Id, Handler, ThisArgument) =>
			CommandServiceInstance.registerTextEditorCommand(
				Id,
				Handler,
				ThisArgument,
				ExtensionDescription,
			),
		registerDiffInformationCommand: (Id, Handler, ThisArgument) =>
			CommandServiceInstance.registerCommand(
				Id,
				Handler,
				ThisArgument,
				ExtensionDescription,
			),
		executeCommand: <T>(Id: string, ...Argument: any[]) =>
			CommandServiceInstance.executeCommand<T>(Id, ...Argument),
		getCommands: (FilterInternal?: boolean) =>
			CommandServiceInstance.getCommands(FilterInternal),
	};
};

const CreateWindowNamespace = (
	WindowServiceInstance: WindowService,
	StatusBarServiceInstance: StatusBarService,
	WebViewPanelServiceInstance: WebViewPanelService,
	TreeViewServiceInstance: TreeViewService,
	AsEvent: <T>(Event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
	WorkspaceServiceInstance: WorkspaceService,
): typeof VSCode.window => {
	// This function must return an object matching vscode.window
	const RunEffectAndReturnPromise = <T, E>(TheEffect: Effect.Effect<T, E>) =>
		Effect.runPromise(Effect.mapError(TheEffect, (e) => e as Error));

	const WindowNamespace: Partial<typeof VSCode.window> = {
		get state() {
			return WindowServiceInstance.state;
		},
		get onDidChangeWindowState() {
			return AsEvent(WindowServiceInstance.onDidChangeWindowState);
		},
		get activeTextEditor() {
			return WorkspaceServiceInstance.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkspaceServiceInstance.visibleTextEditors;
		},
		get onDidChangeActiveTextEditor() {
			return AsEvent(
				WorkspaceServiceInstance.onDidChangeActiveTextEditor,
			);
		},
		get onDidChangeVisibleTextEditors() {
			return AsEvent(
				WorkspaceServiceInstance.onDidChangeVisibleTextEditors,
			);
		},
		showTextDocument: (documentOrUri, columnOrOptions, preserveFocus) =>
			RunEffectAndReturnPromise(
				WindowServiceInstance.ShowTextDocument(
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
				StatusBarServiceInstance.CreateStatusBarItem(
					Extension,
					id,
					alignment,
					priority,
				),
			);
		}) as any,
		createTreeView: (ViewId, Options) =>
			Effect.runSync(
				TreeViewServiceInstance.CreateTreeView(
					ViewId,
					Options,
					Extension,
				),
			),
		createWebviewPanel: (ViewType, Title, ShowOptions, Options) =>
			Effect.runSync(
				WebViewPanelServiceInstance.CreateWebviewPanel(
					Extension,
					ViewType,
					Title,
					ShowOptions,
					Options,
				),
			),
		registerWebviewPanelSerializer: (ViewType, Serializer) =>
			Effect.runSync(
				WebViewPanelServiceInstance.RegisterWebviewPanelSerializer(
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
			const LogService = yield* Logger;
			const ProposedAPIServiceInstance = yield* ProposedAPI;
			const APIDeprecationServiceInstance = yield* APIDeprecation;
			const CommandServiceInstance = yield* CommandService;
			const WorkspaceServiceInstance = yield* WorkspaceService;
			const DocumentServiceInstance = yield* DocumentService;
			const WindowServiceInstance = yield* WindowService;
			const LanguageFeatureServiceInstance =
				yield* LanguageFeatureService;
			const DebugServiceInstance = yield* DebugService;
			const TaskServiceInstance = yield* TaskService;
			const ExtensionServiceInstance = yield* ExtensionService;
			const WebViewPanelServiceInstance = yield* WebViewPanelService;
			const TreeViewServiceInstance = yield* TreeViewService;
			const StatusBarServiceInstance = yield* StatusBarService;

			const CreateExtensionsAPI = (
				ExtensionServiceInstance: ExtensionService,
			): typeof VSCode.extensions => ({
				getExtension: <T>(extensionId: string) =>
					Option.getOrUndefined(
						Effect.runSync(
							ExtensionServiceInstance.GetExtension<T>(
								extensionId,
							),
						),
					),
				get all() {
					return Effect.runSync(ExtensionServiceInstance.GetAll());
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

				const API: Partial<typeof VSCode> = {
					version: "1.85.0",
					commands: CreateCommandNamespace(
						CommandServiceInstance,
						ExtensionDescription,
					),
					window: CreateWindowNamespace(
						WindowServiceInstance,
						StatusBarServiceInstance,
						WebViewPanelServiceInstance,
						TreeViewServiceInstance,
						SafeEvent,
						ExtensionDescription,
						WorkspaceServiceInstance,
					),
					workspace: WorkspaceServiceInstance,
					languages: LanguageFeatureServiceInstance,
					debug: DebugServiceInstance,
					tasks: TaskServiceInstance,
					extensions: CreateExtensionsAPI(ExtensionServiceInstance),
					Position,
					Range,
					Selection,
				};

				if (
					ProposedAPIServiceInstance.IsEnabled(
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
