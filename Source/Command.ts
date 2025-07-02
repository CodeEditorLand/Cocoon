/**
 * @module Command
 * @description Defines the service for managing and executing commands within the
 * extension host. It implements the core logic of `vscode.commands`, handling
 * command registration, execution, and retrieval.
 */

import type { IDisposable } from "@codeeditorland/output/vs/base/common/lifecycle.js";
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import type { MainThreadCommandsShape } from "@codeeditorland/output/vs/workbench/api/common/extHost.protocol.js";
import { Effect, Ref } from "effect";
import type * as VSCode from "vscode";

import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { WindowService } from "./Window.js";

/**
 * @interface Command
 * @description The contract for the Command service, mirroring the public
 * `vscode.commands` API surface but adapted for an Effect-TS environment.
 */
export interface Command {
	readonly registerCommand: (
		global: boolean,
		id: string,
		command: <T>(...args: any[]) => T | Promise<T>,
		thisArg?: any,
	) => IDisposable;
	readonly registerTextEditorCommand: (
		id: string,
		callback: (
			textEditor: VSCode.TextEditor,
			edit: VSCode.TextEditorEdit,
			...args: any[]
		) => void,
		thisArg?: any,
	) => IDisposable;
	readonly executeCommand: <T>(
		id: string,
		...args: any[]
	) => Promise<T | undefined>;
	readonly GetCommands: (FilterInternal?: boolean) => Promise<string[]>;
}

/**
 * @interface InternalCommand
 * @description Represents the internal structure of a registered command, including
 * its callback, argument transformations, and associated extension metadata.
 */
export interface InternalCommand {
	readonly Id: string;
	readonly Callback: (...args: any[]) => any;
	readonly ThisArg: any;
	readonly Extension: IExtensionDescription | undefined;
}

/**
 * @class CommandService
 * @description The `Effect.Service` for the Command service. It manages the
 * lifecycle of commands, proxies execution to the main thread when necessary,
 * and handles argument marshalling.
 */
export class CommandService extends Effect.Service<CommandService>()(
	"Service/Command",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Logger = yield* LoggerService;
			const Window = yield* WindowService;

			const CommandsReference = yield* Ref.make(
				new Map<string, InternalCommand>(),
			);
			const MainThreadProxy = IPC.CreateProxy<MainThreadCommandsShape>(
				"$rpc:mainThreadCommands",
			);

			/**
			 * @description Executes a command that has been registered within this extension host.
			 * @param Command The internal command object to execute.
			 * @param Arguments The arguments to pass to the command's callback.
			 * @returns An `Effect` that resolves with the command's result.
			 */
			const ExecuteLocalCommand = (
				Command: InternalCommand,
				Arguments: any[],
			) =>
				Effect.tryPromise({
					try: async () => {
						const { Callback, ThisArg, Extension } = Command;
						if (Extension) {
							// Telemetry.onExtensionActivation(...)
						}
						return Callback.apply(ThisArg, Arguments);
					},
					catch: (Cause) => Cause as Error,
				});

			// Register the RPC handler for commands invoked from the main thread.
			IPC.RegisterInvokeHandler(
				"$executeContributedCommand",
				([Id, ...Arguments]) =>
					Effect.runPromise(
						Ref.get(CommandsReference).pipe(
							Effect.flatMap((Map) =>
								Effect.fromNullable(Map.get(Id)),
							),
							Effect.flatMap((Command) =>
								ExecuteLocalCommand(
									Command as InternalCommand,
									Arguments,
								),
							),
							Effect.catchAll((Error) =>
								Logger.Error(
									`Failed to execute local command '${Id}'`,
									Error,
								).pipe(Effect.as(undefined)),
							),
						),
					),
			);

			const ServiceImplementation: Command = {
				registerCommand: (
					Global: boolean,
					Id: string,
					Callback: <T>(...args: any[]) => T | Promise<T>,
					ThisArg?: any,
				): IDisposable => {
					const CommandRegistration = Ref.update(
						CommandsReference,
						(Map) =>
							Map.set(Id, {
								Id,
								Callback,
								ThisArg,
								Extension: undefined, // TODO: This needs to be captured from the context
							}),
					).pipe(
						Effect.tap(() =>
							Logger.Trace(`Command '${Id}' registered.`),
						),
					);

					Effect.runSync(CommandRegistration);

					if (Global) {
						MainThreadProxy.$registerCommand(Id);
					}

					return {
						dispose: () => {
							const Cleanup = Ref.update(
								CommandsReference,
								(Map) => (Map.delete(Id), Map),
							).pipe(
								Effect.tap(() => {
									if (Global) {
										MainThreadProxy.$unregisterCommand(Id);
									}
								}),
							);
							Effect.runFork(Cleanup);
						},
					};
				},

				registerTextEditorCommand: (
					Id: string,
					Callback: (
						textEditor: VSCode.TextEditor,
						edit: VSCode.TextEditorEdit,
						...args: any[]
					) => void,
					ThisArg?: any,
				): IDisposable => {
					const AdaptedCallback = (
						...args: any[]
					): any | Promise<any> => {
						const ActiveEditor = Window.activeTextEditor;
						if (!ActiveEditor) {
							Effect.runSync(
								Logger.Warn(
									`Cannot execute text editor command '${Id}' because there is no active text editor.`,
								),
							);
							return undefined;
						}
						return ActiveEditor.edit((editBuilder) => {
							Callback.apply(ThisArg, [
								ActiveEditor,
								editBuilder,
								...args,
							]);
						});
					};
					return ServiceImplementation.registerCommand(
						true,
						Id,
						AdaptedCallback,
					);
				},

				executeCommand: async <T>(
					Id: string,
					...Arguments: any[]
				): Promise<T | undefined> => {
					const AllCommands = await Effect.runPromise(
						Ref.get(CommandsReference),
					);

					if (AllCommands.has(Id)) {
						return Effect.runPromise(
							ExecuteLocalCommand(
								AllCommands.get(Id)!,
								Arguments,
							),
						) as Promise<T | undefined>;
					}
					return MainThreadProxy.$executeCommand(
						Id,
						Arguments,
						true,
					) as Promise<T | undefined>;
				},

				// FIX: MainThreadCommandsShape.$getCommands takes no arguments.
				GetCommands: (_FilterInternal = false): Promise<string[]> =>
					MainThreadProxy.$getCommands(),
			};

			return ServiceImplementation;
		}),
	},
) {}
