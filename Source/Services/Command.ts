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
 * - Effect-TS service pattern with Symbol
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
 * - HIGH: Add command validation and registration conflict resolution
 * - MEDIUM: Implement command execution timeout and cancellation
 * - SECURITY: Validate command ID format before registration (MEDIUM)
 * - LOW: Extract command documentation from JSDoc for autocomplete
 * - LOW: Implement command conflict resolution strategy
 * - VSCODE-LIFT: Lift complete command lifecycle from Dependency/Editor/extHostCommands.ts
 */

import type * as VSCode from "vscode";

// Import current Cocoon interfaces
import { IMountainClientService } from "../Interfaces/I/Mountain/Client/Service.js";

// Import type converters
import { Command as CommandConverter } from "../TypeConverter/Command.js";

import { CocoonDevLog } from "./Dev/Log.js";

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

	readonly Trace: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;

	readonly Debug: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;

	readonly Info: (Message: string, ...Data: unknown[]) => Promise<void>;

	readonly Warn: (Message: string, ...Data: unknown[]) => Promise<void>;

	readonly Error: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;
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

	readonly RegisterCommand: (
		Id: string,

		Callback: (...Args: any[]) => any,

		ThisArg?: unknown,
	) => Promise<IDisposable>;

	readonly RegisterTextEditorCommand: (
		Id: string,

		Callback: (
			TextEditor: VSCode.TextEditor,

			Edit: VSCode.TextEditorEdit,
			...Args: any[]
		) => void,

		ThisArg?: unknown,
	) => Promise<IDisposable>;

	readonly ExecuteCommand: <T>(
		Id: string,
		...Arguments: any[]
	) => Promise<T | undefined>;

	readonly GetCommands: (
		FilterInternal?: boolean,
	) => Promise<string[]>;
}

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
export class CommandService extends /* Effect.Service */(
	"Service/Command",

	{
		effect: async function() {
			// Resolve service dependencies
			const MountainClient = await IMountainClientService;

			const Logger = await Symbol<Logger>("Service/Logger";

			const Window = await Symbol<Window>("Service/Window";

			// Command registry - maps command ID to registered command metadata
			const _commandRegistry = new Map<string, InternalCommandMetadata>(;

			/**
			 * Emit a tag-gated execution breadcrumb so command latency is
			 * observable in Mountain's dev log (`Trace=command-telemetry`).
			 */
			const TrackCommandExecution = (
				Id: string,

				Mode: "local" | "remote",

				DurationMs: number,

				Success: boolean,
			): void => {
				CocoonDevLog(
					"command-telemetry",

					`execute id=${Id} mode=${Mode} duration_ms=${DurationMs} ok=${Success}`,
				;
			};

			// Command converter for marshalling
			void new CommandConverter(
				(
					_Global: boolean,

					Id: string,

					Callback: (...Args: any[]) => any,

					ThisArg?: unknown,
				) => {
					const Disposable: IDisposable = { dispose: () => {} };

					// Register command locally - direct map mutation
					_commandRegistry.set(Id, {
						Id,
						Callback,
						ThisArg,
						Extension: undefined,
						RegisteredAt: Date.now(),
					};

					return Disposable;
				},

				<T>(
					_Id: string,
					..._Arguments: any[]
				): Promise<T | undefined> => {
					return Promise.resolve(undefined;
				},

				(_Id: string) => undefined,
			;

			/**
			 * Execute a locally registered command with proper error handling and timing
			 *
			 * Implementation Pattern: Dependency/Editor/extHostCommands.ts (executeCommand)
			 *
			 * TODOs:
			 * - TIMEOUT: Add command execution timeout (configurable, default 30s) (MEDIUM)
			 * - CANCELLATION: Support CancellationToken for long-running commands (MEDIUM)
			 */
			const ExecuteLocalCommand = (
				Command: InternalCommandMetadata,

				Arguments: any[],
			): Promise<unknown> =>
				async function() {
					const StartTime = Date.now(;

					const {
						Callback,
						ThisArg,
						Extension: _Extension,
						Id,
					} = Command;

					await Logger.Trace(
						`[CommandService] Executing local command '${Id}' with ${Arguments.length} arguments`,
					;

					const Result = await (async () => {
	try {
		return await Promise.resolve(Callback.apply(ThisArg, Arguments));
	} catch (_e) {
		throw _e;
	}
})() - StartTime;

					TrackCommandExecution(Id, "local", Duration, true;

					await Logger.Debug(
						`[CommandService] Command '${Id}' executed in ${Duration}ms`,
					;

					return Result;
				};

			/**
			 * Execute a command, preferring local registration but falling back to Mountain
			 *
			 * Implementation Pattern: Dependency/Editor/extHostCommands.ts ($executeCommand)
			 *
			 * TODOs:
			 * - DEDUPLICATION: Implement request deduplication for idempotent commands (LOW)
			 * - BATCHING: Batch multiple command executions if possible (LOW)
			 */
			const ExecuteCommand = <T>(
				Id: string,
				...Arguments: any[]
			): Promise<T | undefined> =>
				async function() {
					const Registry = _commandRegistry;

					// Check if command is registered locally
					if (Registry.has(Id)) {
						const Command = Registry.get(Id)!;

						const Result = await ExecuteLocalCommand(
							Command,

							Arguments,
						;

						return Result as T;
					}

					// Fall back to remote execution on Mountain
					await Logger.Info(
						`[CommandService] Command '${Id}' not registered locally, executing via Mountain gRPC`,
					;

					const startTime = Date.now(;

					try {
						// Routed by Mountain via Track::SideCarRequest →
						// Command.Execute effect.
						const result = await (async () => {
	try {
		return await MountainClient.sendRequest("Command.Execute", [
									Id,
									...Arguments,
								]);
	} catch (_e) {
		throw _e;
	}
})() - startTime,

							true,
						;

						return result as T;
					} catch (error) {
						TrackCommandExecution(
							Id,

							"remote",

							Date.now() - startTime,

							false,
						;

						await Logger.Error(
							`[CommandService] Failed to execute remote command '${Id}'`,

							error as Error,
						;

						throw error;
					}
				};

			/**
			 * Register a command for execution
			 *
			 * Implementation Pattern: Dependency/Editor/extHostCommands.ts (registerCommand)
			 *
			 * TODOs:
			 * - SECURITY: Add command ID format validation (must follow pattern) (MEDIUM)
			 * - CONFLICTS: Implement command conflict detection and resolution (LOW)
			 */
			const RegisterCommand = (
				Id: string,

				Callback: (...Args: any[]) => any,

				ThisArg?: unknown,
			): Promise<IDisposable> =>
				async function() {
					// TODO: SECURITY: Validate command ID format before registration (MEDIUM)
					if (!Id || typeof Id !== "string") {
						await Logger.Error(
							`[CommandService] Invalid command ID: ${Id}`,
						;

						throw new Error(`Invalid command ID: ${Id}`;
					}

					const Metadata: InternalCommandMetadata = {
						Id,

						Callback,

						ThisArg,

						Extension: undefined,

						RegisteredAt: Date.now(),
					};

					// Register in local registry
					_commandRegistry.set(Id, Metadata;

					await Logger.Info(
						`[CommandService] Command '${Id}' registered locally`,
					;

					// Mirror into Mountain's command registry so Sky's command
					// palette and `Command.Execute` routing can see it.
					// Fire-and-forget: local registration stays valid even if
					// Mountain is not yet connected.
					void MountainClient.sendNotification("registerCommand", {
						commandId: Id,
					}).catch(() => {};

					// Return disposable for cleanup
					return {
						dispose: () => {
							_commandRegistry.delete(Id); // lean: was Effect.runFork

							void MountainClient.sendNotification(
								"unregisterCommand",

								{ commandId: Id },
							).catch(() => {};
						},
					};
				};

			/**
			 * Register a text editor command (automatically gets active text editor)
			 *
			 * Implementation Pattern: Dependency/Editor/extHostCommands.ts (registerTextEditorCommand)
			 *
			 * TODOs:
			 * - TYPECONVERTER: Integrate TypeConverter for proper text editor handling (MEDIUM)
			 */
			const RegisterTextEditorCommand = (
				Id: string,

				Callback: (
					TextEditor: VSCode.TextEditor,

					Edit: VSCode.TextEditorEdit,
					...Args: any[]
				) => void,

				ThisArg?: unknown,
			): Promise<IDisposable> =>
				async function() {
					// Adapt command callback to inject active text editor
					const AdaptedCallback = (...Args: any[]): any => {
						const ActiveEditor = Window.activeTextEditor;

						if (!ActiveEditor) {
							Logger.Warn(
								`[CommandService] Cannot execute text editor command '${Id}' - no active text editor`,
							).catch?.(() => {};

							return undefined;
						}

						return ActiveEditor.edit(
							(EditBuilder: VSCode.TextEditorEdit) => {
								Callback.apply(ThisArg, [
									ActiveEditor,

									EditBuilder,
									...Args,
								];
							},
						;
					};

					return await RegisterCommand(Id, AdaptedCallback, ThisArg;
				};

			/**
			 * Get all registered commands
			 *
			 * Implementation Pattern: Dependency/Editor/extHostCommands.ts (getCommands)
			 */
			const GetCommands = (
				FilterInternal: boolean = false,
			): Promise<string[]> =>
				async function() {
					const Registry = _commandRegistry;

					const LocalCommandIds = Array.from(Registry.keys();

					try {
						// Routed by Mountain via Track::SideCarRequest →
						// Command.GetAll effect; returns the native registry ids.
						const Response = await (async () => {
	try {
		return await MountainClient.sendRequest("Command.GetAll", [
									FilterInternal,
								]);
	} catch (_e) {
		throw _e;
	}
})()

							? (Response as string[])

							: [];

						await Logger.Info(
							`[CommandService] Retrieved ${RemoteCommands.length} remote commands from Mountain`,
						;

						// Combine and deduplicate
						const AllCommands = Array.from(
							new Set([...LocalCommandIds, ...RemoteCommands]),
						;

						if (FilterInternal) {
							// Filter out internal commands (starting with _)
							return AllCommands.filter(
								(Id) => !Id.startsWith("_"),
							;
						}

						return AllCommands;
					} catch (error) {
						await Logger.Warn(
							`[CommandService] Error getting remote commands, using local only`,

							error as Error,
						;

						if (FilterInternal) {
							return LocalCommandIds.filter(
								(Id) => !Id.startsWith("_"),
							;
						}

						return LocalCommandIds;
					}
				};

			// Return the service implementation with PascalCase method names
			const ServiceImplementation: Command = {
				RegisterCommand,
				RegisterTextEditorCommand,
				ExecuteCommand,
				GetCommands,
			};

			const Registry = _commandRegistry;

			await Logger.Info(
				`[CommandService] CommandService initialized with ${Registry.size} registered commands`,
			;

			return ServiceImplementation;
		}),
	},
) {}
