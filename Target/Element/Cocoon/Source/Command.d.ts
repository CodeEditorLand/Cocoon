/**
 * @module Command
 * @description Defines the service for managing and executing commands within the
 * extension host. It implements the core logic of `vscode.commands`, handling
 * command registration, execution, and retrieval.
 */
import { Effect } from "effect";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { TextEditorCommand } from "vscode";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { WindowService } from "./Window.js";
/**
 * @interface Command
 * @description The contract for the Command service, mirroring the public
 * `vscode.commands` API surface but adapted for an Effect-TS environment.
 */
export interface Command {
    readonly registerCommand: (global: boolean, id: string, command: <T>(...args: any[]) => T | Promise<T>, thisArg?: any) => IDisposable;
    readonly registerTextEditorCommand: (id: string, callback: TextEditorCommand, thisArg?: any) => IDisposable;
    readonly executeCommand: <T>(id: string, ...args: any[]) => Promise<T | undefined>;
    readonly GetCommands: (FilterInternal?: boolean) => Promise<string[]>;
}
declare const CommandService_base: Effect.Service.Class<CommandService, "Service/Command", {
    readonly effect: Effect.Effect<Command, never, LoggerService | IPCService | WindowService>;
}>;
/**
 * @class CommandService
 * @description The `Effect.Service` for the Command service. It manages the
 * lifecycle of commands, proxies execution to the main thread when necessary,
 * and handles argument marshalling.
 */
export declare class CommandService extends CommandService_base {
}
export {};
