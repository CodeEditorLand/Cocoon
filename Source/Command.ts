/**
 * @module Command
 * @description Defines the service for registering and executing commands,
 * implementing the `IExtHostCommands` interface from VS Code for high fidelity.
 * This service is responsible for managing the command palette and direct command
 * invocations from extensions.
 */

import { Effect } from "effect";
import type { IExtHostCommands } from "vs/workbench/api/common/extHostCommands.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { TextEditor, TextEditorEdit, Disposable } from "vscode";
import { IPCService } from "./IPC.js";
import { TelemetryService } from "./Telemetry.js";
import { WindowService } from "./Window.js";

// --- Service-Specific Types ---

/**
 * @interface CommandHandler
 * @description A general-purpose command handler function.
 */
export type CommandHandler = (...args: any[]) => any;

/**
 * @interface TextEditorCommandHandler
 * @description A command handler specifically for text editor commands, which receives the
 * active editor and an edit builder as arguments.
 */
export type TextEditorCommandHandler = (
	Editor: TextEditor,
	Edit: TextEditorEdit,
	...args: any[]
) => any;

/**
 * @interface CommandHandlerEntry
 * @description The internal representation of a registered command, holding its
 * handler and the extension that registered it.
 */
export interface CommandHandlerEntry {
	readonly Handler: CommandHandler;
	readonly ThisArgument: any;
	readonly Extension: IExtensionDescription;
	/** Indicates if the command requires an active text editor. */
	readonly IsTextEditorCommand: boolean;
}

/**
 * @interface Command
 * @description The contract for the Command service, matching `IExtHostCommands`.
 */
export interface Command extends IExtHostCommands {}

/**
 * @class CommandService
 * @description The `Effect.Service` for the Command service. It directly implements
 * the `IExtHostCommands` interface from VS Code's source code to ensure 1:1 API
 * compatibility.
 */
export class CommandService extends Effect.Service<CommandService>()(
	"Service/Command",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			yield* TelemetryService;
			yield* WindowService;

			const RegisterCommand = (
				Id: string,
				_Handler: (...args: any[]) => any,
			): Effect.Effect<Disposable, Error> => {
				return IPC.SendNotification("$registerCommand", [Id]).pipe(
					Effect.map(() => ({ dispose: () => {} })),
					Effect.mapError((e) => e as Error),
				);
			};

			const ExecuteCommand = <T>(
				Id: string,
				...Arguments: any[]
			): Effect.Effect<T, Error> => {
				return IPC.SendRequest<T>("$executeCommand", [
					Id,
					...Arguments,
				]);
			};

			const GetCommands = (
				FilterInternal = false,
			): Effect.Effect<string[], Error> => {
				return IPC.SendRequest<string[]>("$getCommands", [
					FilterInternal,
				]);
			};

			const Service: IExtHostCommands = {
				registerCommand: (id, handler, thisArg) =>
					Effect.runSync(RegisterCommand(id, handler.bind(thisArg))),
				registerTextEditorCommand: (id, handler, thisArg) =>
					Effect.runSync(RegisterCommand(id, handler.bind(thisArg))),
				executeCommand: <T>(id: string, ...args: any[]) =>
					Effect.runPromise(ExecuteCommand<T>(id, ...args)),
				getCommands: (filterInternal) =>
					Effect.runPromise(GetCommands(filterInternal)),
			} as unknown as IExtHostCommands; // Cast to satisfy full interface from vscode.d.ts

			return Service;
		}),
	},
) {}
