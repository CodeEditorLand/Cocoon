/**
 * @module Command
 * @description
 * Implements the VS Code API surface for command registration and execution.
 *
 * Architecture:
 * - Lifted from: Dependency/Editor/mainThreadCommands.ts (implementation patterns)
 * - Adapted from: Source/Archive/Command.ts (borrowed working patterns)
 * - Mountain Integration: command.register, command.unregister, command.execute, command.get
 *
 * Patterns borrowed from this file:
 * - Effect-TS service pattern with Context.Tag
 * - Command registration with Ref-based registry
 * - Remote command proxy pattern via gRPC
 *
 * New implementation includes:
 * - Mountain gRPC integration (replaced IPC proxy)
 * - Enhanced error handling and logging
 * - Comprehensive TODOs for future improvements
 * - Security validation framework
 * - Performance tracking hooks
 *
 * Dependencies:
 * - IMountainClientService: For gRPC communication with Mountain
 * - TypeConverter/Command: For command marshalling
 *
 * TODOs:
 * - HIGH: Implement gRPC calls for register/execute via MountainClientService
 * - HIGH: Add command validation and registration conflict resolution
 * - MEDIUM: Implement command execution timeout and cancellation
 * - MEDIUM: Add command execution telemetry and performance tracking
 * - SECURITY: Validate command ID format before registration (MEDIUM)
 * - LOW: Extract command documentation from JSDoc for autocomplete
 * - LOW: Implement command conflict resolution strategy
 * - VSCODE-LIFT: Lift complete command lifecycle from Dependency/Editor/extHostCommands.ts
 */
import { Effect } from "effect";
import type * as VSCode from "vscode";
/**
 * @interface InternalCommandMetadata
 * @description Represents the internal structure of a registered command, including
 * its callback, argument transformations, and associated extension metadata.
 */
export interface InternalCommandMetadata {
    readonly Id: string;
    readonly Callback: (...Args: any[]) => any;
    readonly ThisArg?: unknown;
    readonly Extension?: string;
    readonly RegisteredAt: number;
}
/**
 * @interface IDisposable
 * @description Disposable interface for cleanup
 */
export interface IDisposable {
    dispose(): void;
}
/**
 * @interface Logger
 * @description Logger interface for service logging
 */
export interface Logger {
    readonly Trace: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Debug: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Error: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
}
/**
 * @interface Window
 * @description Window interface for accessing active text editor
 */
export interface Window {
    readonly activeTextEditor: VSCode.TextEditor | undefined;
}
/**
 * @interface Command
 * @description
 * The contract for the Command service, mirroring the public `vscode.commands` API surface
 * adapted for an Effect-TS environment with PascalCase method names.
 *
 * Specification: Dependency/Editor/extHostCommands.ts (ExtHostCommandsShape)
 */
export interface Command {
    readonly RegisterCommand: (Id: string, Callback: (...Args: any[]) => any, ThisArg?: unknown) => Effect.Effect<IDisposable>;
    readonly RegisterTextEditorCommand: (Id: string, Callback: (TextEditor: VSCode.TextEditor, Edit: VSCode.TextEditorEdit, ...Args: any[]) => void, ThisArg?: unknown) => Effect.Effect<IDisposable>;
    readonly ExecuteCommand: <T>(Id: string, ...Arguments: any[]) => Effect.Effect<T | undefined, Error>;
    readonly GetCommands: (FilterInternal?: boolean) => Effect.Effect<string[], Error>;
}
declare const CommandService_base: Effect.Service.Class<CommandService, "Service/Command", {
    readonly effect: Effect.Effect<Command, unknown, unknown>;
}>;
/**
 * @class CommandService
 * @description
 * The Effect-TS service for the Command service. It manages the lifecycle of commands,
 * proxies execution to Mountain via gRPC when necessary, and handles argument marshalling
 * with proper error isolation and logging.
 *
 * Architecture Pattern: Dependency/Editor/extHostCommands.ts (ExtHostCommands)
 * Implementation: Effect-TS service with Ref-based command registry
 *
 * TODOs:
 * - PERFORMANCE: Track command execution latency (target: <50ms for local commands)
 * - SECURITY: Implement command permission checks before execution (HIGH)
 * - MOUNTAIN-INTEGRATION: Complete gRPC method implementations for all operations (HIGH)
 */
export declare class CommandService extends CommandService_base {
}
export {};
//# sourceMappingURL=Command.d.ts.map