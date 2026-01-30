/**
 * @module Command (ARCHIVED)
 * @description
 * ARCHIVED - This file has been adapted and moved to Source/Services/Command.ts
 *
 * Patterns borrowed from this file:
 * - Effect-TS service pattern with Context.Tag
 * - Command registration with Ref-based registry
 * - Remote command proxy pattern
 *
 * New implementation in Source/Services/Command.ts includes:
 * - Mountain gRPC integration (replaced IPC proxy)
 * - Enhanced error handling and logging
 * - Comprehensive TODOs for future improvements
 * - Security validation framework
 * - Performance tracking hooks
 *
 * Archive kept for reference during further implementation work.
 *
 * Original description: Defines the service for managing and executing commands within the
 * extension host. It implements the core logic of `vscode.commands`, handling
 * command registration, execution, and retrieval.
 */
import type { IDisposable } from "@codeeditorland/output/vs/base/common/lifecycle.js";
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
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
    readonly registerCommand: (global: boolean, id: string, command: <T>(...args: any[]) => T | Promise<T>, thisArg?: any) => IDisposable;
    readonly registerTextEditorCommand: (id: string, callback: (textEditor: VSCode.TextEditor, edit: VSCode.TextEditorEdit, ...args: any[]) => void, thisArg?: any) => IDisposable;
    readonly executeCommand: <T>(id: string, ...args: any[]) => Promise<T | undefined>;
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
//# sourceMappingURL=Command.d.ts.map