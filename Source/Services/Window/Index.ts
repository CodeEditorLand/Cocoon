/**
 * @module Services/Window/Index
 * @description
 * WindowService Effect.Service class - composition point for all window
 * sub-modules.  Each operation group is implemented in a dedicated module;
 * this file wires them together and keeps the service declaration thin.
 *
 * Architecture:
 * - Lifted from: src/vs/workbench/api/common/extHostWindow.ts
 * - Mountain Integration: All window operations delegate via gRPC
 *
 * Implementation Status:
 * - Window state management: COMPLETE (EventStream, Ref, AcceptWindowStateChange)
 * - ShowTextDocument: COMPLETE → TextDocument.ts
 * - ShowInformationMessage/Warning/Error: COMPLETE → TextDocument.ts
 * - ShowQuickPick / ShowInputBox: COMPLETE → QuickInput.ts
 * - ShowOpenDialog / ShowSaveDialog: COMPLETE → FileDialogs.ts
 * - WithProgress: COMPLETE → Progress.ts
 * - CreateStatusBarItem: COMPLETE → StatusBar.ts
 * - CreateOutputChannel: COMPLETE → OutputChannel.ts
 * - CreateWebviewPanel: COMPLETE → WebviewPanel.ts
 */

import { Context, Effect } from "effect";
import type * as VSCode from "vscode";

import { IMountainClientService } from "../../Interfaces/I/Mountain/Client/Service.js";
import { CreateEventStream } from "../../Utility/Event/Stream.js";
import { MountainGRPCClientService } from "../Mountain/gRPC/Client.js";
import { ShowOpenDialog, ShowSaveDialog } from "./File/Dialogs.js";
import type { Logger, Window, Workspace } from "./Interfaces.js";
import { CreateOutputChannel } from "./Output/Channel.js";
import { WithProgress } from "./Progress.js";
import { ShowInputBox, ShowQuickPick } from "./Quick/Input.js";
import { CreateStatusBarItem } from "./Status/Bar.js";
import {
	ShowErrorMessage,
	ShowInformationMessage,
	ShowTextDocument,
	ShowWarningMessage,
} from "./Text/Document.js";
import { CreateWebviewPanel } from "./Webview/Panel.js";

export type { Logger, Window, Workspace } from "./Interfaces.js";

export type { VSCodeWindowAPI } from "./Interfaces.js";

/**
 * WindowService - Effect-TS service for all VS Code `vscode.window` operations.
 *
 * Manages window state, displays messages and dialogs, and coordinates text
 * document display by delegating to Mountain's native UI implementation via
 * gRPC.
 */
export class WindowService extends Effect.Service<WindowService>()(
	"Service/Window",

	{
		effect: Effect.gen(function* () {
			// Resolve service dependencies
			const MountainClient = yield* IMountainClientService;

			const Workspace_ =
				yield* Context.Tag<Workspace>("Service/Workspace");

			const Logger_ = yield* Context.Tag<Logger>("Service/Logger");

			// Resolve the Mountain gRPC client (used by delegated operations)
			const MountainGRPC = yield* MountainGRPCClientService;

			// Window state tracking - plain variable, no Ref overhead
			let _windowState: VSCode.WindowState = {
				focused: true,
				active: true,
			};

			// Event stream for window state changes
			const OnDidChangeWindowStateStream =
				CreateEventStream<VSCode.WindowState>();

			/**
			 * Accept window state change notification from Mountain.
			 * Fires the onDidChangeWindowState event stream for all subscribers.
			 */
			const AcceptWindowStateChange = (State: VSCode.WindowState) =>
				Effect.gen(function* () {
					if (
						_windowState.focused !== State.focused ||
						_windowState.active !== State.active
					) {
						_windowState = State;

						yield* Logger_.Debug(
							`[WindowService] Window state changed: focused=${State.focused}, active=${State.active}`,
						);

						OnDidChangeWindowStateStream.Fire(State);
					}
				});

			// Build the service implementation object
			const ServiceImplementation: Window = {
				get state() {
					return _windowState;
				},
				get activeTextEditor() {
					return Workspace_.activeTextEditor;
				},
				get visibleTextEditors() {
					return Workspace_.visibleTextEditors;
				},
				get onDidChangeWindowState() {
					return OnDidChangeWindowStateStream.event;
				},

				ShowTextDocument: (
					DocumentOrUri: VSCode.Uri | VSCode.TextDocument,

					ColumnOrOptions?:
						| VSCode.ViewColumn
						| VSCode.TextDocumentShowOptions,

					PreserveFocus?: boolean,
				) =>
					ShowTextDocument(
						MountainGRPC as any,

						Logger_,

						Workspace_,

						DocumentOrUri,

						ColumnOrOptions,

						PreserveFocus,
					),

				ShowInformationMessage: (Message: string, ...Items: string[]) =>
					ShowInformationMessage(
						MountainClient as any,

						Logger_,

						Message,
						...Items,
					),

				ShowWarningMessage: (Message: string, ...Items: string[]) =>
					ShowWarningMessage(
						MountainClient as any,

						Logger_,

						Message,
						...Items,
					),

				ShowErrorMessage: (Message: string, ...Items: string[]) =>
					ShowErrorMessage(
						MountainClient as any,

						Logger_,

						Message,
						...Items,
					),

				ShowQuickPick: <T extends string>(
					Items: readonly T[] | VSCode.QuickPickItem[],

					Options?: VSCode.QuickPickOptions,
				) =>
					ShowQuickPick(
						MountainClient as any,

						Logger_,

						Items,

						Options,
					),

				ShowInputBox: (Options?: VSCode.InputBoxOptions) =>
					ShowInputBox(MountainClient as any, Logger_, Options),

				ShowOpenDialog: (Options?: VSCode.OpenDialogOptions) =>
					ShowOpenDialog(MountainClient as any, Logger_, Options),

				ShowSaveDialog: (Options?: VSCode.SaveDialogOptions) =>
					ShowSaveDialog(MountainClient as any, Logger_, Options),

				WithProgress: <T>(
					Options: VSCode.ProgressOptions,

					Task: (
						Progress: VSCode.Progress<{
							message?: string;

							increment?: number;
						}>,

						Token: VSCode.CancellationToken,
					) => Promise<T>,
				) =>
					WithProgress(MountainClient as any, Logger_, Options, Task),

				CreateStatusBarItem: (
					Id?: string,

					Alignment?: VSCode.StatusBarAlignment,

					Priority?: number,
				) =>
					CreateStatusBarItem(
						MountainClient as any,

						MountainGRPC as any,

						Logger_,

						Id,

						Alignment,

						Priority,
					),

				CreateOutputChannel: (Name: string) =>
					CreateOutputChannel(MountainClient as any, Logger_, Name),

				CreateWebviewPanel: (
					ViewType: string,

					Title: string,

					ShowOptions:
						| VSCode.ViewColumn
						| {
								viewColumn: VSCode.ViewColumn;

								preserveFocus?: boolean;
						  },

					Options?: VSCode.WebviewPanelOptions &
						VSCode.WebviewOptions,
				) =>
					CreateWebviewPanel(
						MountainClient as any,

						MountainGRPC as any,

						Logger_,

						ViewType,

						Title,

						ShowOptions,

						Options,
					),
			};

			return ServiceImplementation;
		}),
	},
) {}

export default WindowService;
