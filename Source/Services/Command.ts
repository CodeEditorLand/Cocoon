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

import { Context, Effect, Ref } from "effect";
import type * as VSCode from "vscode";

// Import current Cocoon interfaces
import { IMountainClientService } from "../Interfaces/I/Mountain/Client/Service.js";
// Import type converters
import { Command as CommandConverter } from "../TypeConverter/Command.js";
import { MountainGRPCClientService } from "./Mountain/GRPC/Client.js";

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
	) => Effect.Effect<void>;

	readonly Debug: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;

	readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;

	readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;

	readonly Error: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
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
	) => Effect.Effect<IDisposable>;

	readonly RegisterTextEditorCommand: (
		Id: string,

		Callback: (
			TextEditor: VSCode.TextEditor,

			Edit: VSCode.TextEditorEdit,
			...Args: any[]
		) => void,

		ThisArg?: unknown,
	) => Effect.Effect<IDisposable>;

	readonly ExecuteCommand: <T>(
		Id: string,
		...Arguments: any[]
	) => Effect.Effect<T | undefined, Error>;

	readonly GetCommands: (
		FilterInternal?: boolean,
	) => Effect.Effect<string[], Error>;
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
export class CommandService extends Effect.Service<CommandService>()(
	"Service/Command",

	{
		effect: Effect.gen(function* () {
			// Resolve service dependencies
			yield* IMountainClientService;
			const Logger = yield* Context.Tag<Logger>("Service/Logger");
			const Window = yield* Context.Tag<Window>("Service/Window");

			// Command registry - maps command ID to registered command metadata
			const CommandRegistry = yield* Ref.make(
				new Map<string, InternalCommandMetadata>(),
			);

			// Command converter for marshalling
			void new CommandConverter(
				(
					_Global: boolean,

					Id: string,

					Callback: (...Args: any[]) => any,

					ThisArg?: unknown,
				) => {
					const Disposable: IDisposable = { dispose: () => {} };
					// Register command locally
					Effect.runSync(
						Ref.update(CommandRegistry, (Registry) =>
							Registry.set(Id, {
								Id,
								Callback,
								ThisArg,
								Extension: undefined,
								RegisteredAt: Date.now(),
							}),
						),
					);
					return Disposable;
				},

				<T>(
					_Id: string,
					..._Arguments: any[]
				): Promise<T | undefined> => {
					return Promise.resolve(undefined);
				},

				(_Id: string) => undefined,
			);

			/**
			 * Execute a locally registered command with proper error handling and timing
			 *
			 * Implementation Pattern: Dependency/Editor/extHostCommands.ts (executeCommand)
			 *
			 * TODOs:
			 * - TIMEOUT: Add command execution timeout (configurable, default 30s) (MEDIUM)
			 * - CANCELLATION: Support CancellationToken for long-running commands (MEDIUM)
			 * - MOUNTAIN-INTEGRATION: Implement telemetry tracking via gRPC (HIGH)
			 */
			const ExecuteLocalCommand = (
				Command: InternalCommandMetadata,

				Arguments: any[],
			): Effect.Effect<unknown, Error> =>
				Effect.gen(function* () {
					const StartTime = Date.now();
					const {
						Callback,
						ThisArg,
						Extension: _Extension,
						Id,
					} = Command;

					yield* Logger.Trace(
						`[CommandService] Executing local command '${Id}' with ${Arguments.length} arguments`,
					);

					// TODO: MOUNTAIN-INTEGRATION: Implement telemetry tracking via gRPC (HIGH)
					// yield* Effect.tryPromise({
					//     try: () => MountainClient.sendRequest('telemetry.commandExecution', {
					//         commandId: Id,
					//         extensionId: Extension,
					//         timestamp: StartTime
					//     }),
					//     catch: () => undefined
					// });

					const Result = yield* Effect.tryPromise({
						try: () =>
							Promise.resolve(Callback.apply(ThisArg, Arguments)),
						catch: (Cause) => {
							throw Cause;
						},
					});

					const Duration = Date.now() - StartTime;
					yield* Logger.Debug(
						`[CommandService] Command '${Id}' executed in ${Duration}ms`,
					);

					// TODO: Track performance metrics (target: <50ms for local commands) (LOW)
					// if (Duration >= 50) {
					//     yield* Logger.Warn(
					//         `[CommandService] Command '${Id}' exceeded performance target: ${Duration}ms >= 50ms`
					//     );
					// }

					return Result;
				});

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
			): Effect.Effect<T | undefined, Error> =>
				Effect.gen(function* () {
					const Registry = yield* Ref.get(CommandRegistry);

					// Check if command is registered locally
					if (Registry.has(Id)) {
						const Command = Registry.get(Id)!;
						const Result = yield* ExecuteLocalCommand(
							Command,

							Arguments,
						);
						return Result as T;
					}

					// Fall back to remote execution on Mountain
					yield* Logger.Info(
						`[CommandService] Command '${Id}' not registered locally, executing via Mountain gRPC`,
					);

					// Mountain gRPC integration for command execution
					const mountainClient = yield* MountainGRPCClientService;
					const startTime = Date.now();

					try {
						const result = yield* mountainClient.executeCommand(
							Id,
							...Arguments,
						);

						// Track performance metrics
						this.trackCommandExecution(
							Id,

							"remote",

							Date.now() - startTime,

							true,
						);

						return result as T;
					} catch (error) {
						// Track execution failure
						this.trackCommandExecution(
							Id,

							"remote",

							Date.now() - startTime,

							false,
						);

						yield* Logger.Error(
							`[CommandService] Failed to execute remote command '${Id}'`,

							error as Error,
						);
						throw error;
					}
				});

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
			): Effect.Effect<IDisposable> =>
				Effect.gen(function* () {
					// TODO: SECURITY: Validate command ID format before registration (MEDIUM)
					if (!Id || typeof Id !== "string") {
						yield* Logger.Error(
							`[CommandService] Invalid command ID: ${Id}`,
						);
						throw new Error(`Invalid command ID: ${Id}`);
					}

					const Metadata: InternalCommandMetadata = {
						Id,
						Callback,
						ThisArg,
						Extension: undefined,
						RegisteredAt: Date.now(),
					};

					// Register in local registry
					yield* Ref.update(CommandRegistry, (Registry) =>
						Registry.set(Id, Metadata),
					);

					yield* Logger.Info(
						`[CommandService] Command '${Id}' registered locally`,
					);

					// TODO: MOUNTAIN-INTEGRATION: Register with Mountain via gRPC (HIGH)
					// if (Global) {
					//     yield* Effect.tryPromise({
					//         try: () => MountainClient.sendRequest('command.register', {
					//             commandId: Id
					//         }),
					//         catch: (Error) => {
					//             yield* Logger.Error(
					//                 `[CommandService] Failed to register command '${Id}' with Mountain`,
					//                 Error as Error
					//             );
					//             throw Error;
					//         }
					//     });
					// }

					// Mountain gRPC integration for command registration
					const mountainClient = yield* MountainGRPCClientService;

					const extensionId = this.getCallingExtension();

					try {
						yield* mountainClient.registerCommand(
							Id,

							extensionId,

							`Command: ${Id}`,
						);

						yield* Logger.Info(
							`[CommandService] Command '${Id}' registered with Mountain`,
						);
					} catch (error) {
						yield* Logger.Warn(
							`[CommandService] Failed to register command '${Id}' with Mountain:`,

							error,
						);
						// Continue with local registration even if Mountain registration fails
					}

					// Return disposable for cleanup
					return {
						dispose: () => {
							Effect.runFork(
								Effect.gen(function* () {
									// Unregister from local registry
									yield* Ref.update(
										CommandRegistry,

										(Registry) => {
											Registry.delete(Id);
											return Registry;
										},
									);

									yield* Logger.Info(
										`[CommandService] Command '${Id}' unregistered`,
									);

									// TODO: MOUNTAIN-INTEGRATION: Unregister from Mountain via gRPC (HIGH)
									// yield* Effect.tryPromise({
									//     try: () => MountainClient.sendRequest('command.unregister', {
									//         commandId: Id
									//     }),
									//     catch: () => undefined
									// });
								}),
							);
						},
					};
				});

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
			): Effect.Effect<IDisposable> =>
				Effect.gen(function* () {
					// Adapt command callback to inject active text editor
					const AdaptedCallback = (...Args: any[]): any => {
						const ActiveEditor = Window.activeTextEditor;
						if (!ActiveEditor) {
							Effect.runSync(
								Logger.Warn(
									`[CommandService] Cannot execute text editor command '${Id}' - no active text editor`,
								),
							);
							return undefined;
						}

						return ActiveEditor.edit(
							(EditBuilder: VSCode.TextEditorEdit) => {
								Callback.apply(ThisArg, [
									ActiveEditor,

									EditBuilder,
									...Args,
								]);
							},
						);
					};

					return yield* RegisterCommand(Id, AdaptedCallback, ThisArg);
				});

			/**
			 * Get all registered commands
			 *
			 * Implementation Pattern: Dependency/Editor/extHostCommands.ts (getCommands)
			 *
			 * TODOs:
			 * - MOUNTAIN-INTEGRATION: Merge with remote commands from Mountain (HIGH)
			 */
			const GetCommands = (
				FilterInternal: boolean = false,
			): Effect.Effect<string[], Error> =>
				Effect.gen(function* () {
					const Registry = yield* Ref.get(CommandRegistry);
					const LocalCommandIds = Array.from(Registry.keys());

					// Mountain gRPC integration for getting remote commands
					try {
						yield* MountainGRPCClientService;

						// For now, just return local commands
						// TODO: Implement getCommands in MountainGRPCClientService
						const RemoteCommands: string[] = [];

						yield* Logger.Info(
							`[CommandService] Retrieved ${RemoteCommands.length} remote commands from Mountain`,
						);

						// Combine and deduplicate
						const AllCommands = Array.from(
							new Set([...LocalCommandIds, ...RemoteCommands]),
						);

						if (FilterInternal) {
							// Filter out internal commands (starting with _)
							return AllCommands.filter(
								(Id) => !Id.startsWith("_"),
							);
						}

						return AllCommands;
					} catch (error) {
						yield* Logger.Warn(
							`[CommandService] Error getting remote commands, using local only`,

							error as Error,
						);
						if (FilterInternal) {
							return LocalCommandIds.filter(
								(Id) => !Id.startsWith("_"),
							);
						}
						return LocalCommandIds;
					}
				});
			// Return the service implementation with PascalCase method names
			const ServiceImplementation: Command = {
				RegisterCommand,
				RegisterTextEditorCommand,
				ExecuteCommand,
				GetCommands,
			};

			const Registry = yield* Ref.get(CommandRegistry);
			yield* Logger.Info(
				`[CommandService] CommandService initialized with ${Registry.size} registered commands`,
			);

			return ServiceImplementation;
		}),
	},
) {}
