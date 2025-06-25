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
import type { TextEditor, TextEditorEdit } from "vscode";
import { IPCService } from "./IPC.js";
import { WindowService } from "./Window.js";
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
export type TextEditorCommandHandler = (Editor: TextEditor, Edit: TextEditorEdit, ...args: any[]) => any;
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
export interface Command extends IExtHostCommands {
}
declare const CommandService_base: Effect.Service.Class<CommandService, "Service/Command", {
    readonly effect: Effect.Effect<IExtHostCommands, never, import("vs/workbench/api/common/extHostTelemetry.js").IExtHostTelemetry | IPCService | WindowService>;
}>;
/**
 * @class CommandService
 * @description The `Effect.Service` for the Command service. It directly implements
 * the `IExtHostCommands` interface from VS Code's source code to ensure 1:1 API
 * compatibility.
 */
export declare class CommandService extends CommandService_base {
}
export {};
