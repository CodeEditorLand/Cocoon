/*---------------------------------------------------------------------------------------------
 * Cocoon Tasks API Shim (shims/tasks-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `vscode.tasks` API namespace.
 * The `vscode.tasks` API allows extensions to define, fetch, and execute tasks,
 *
 * such as build scripts, linters, or other command-line operations, and integrate
 * them into VS Code's task system.
 *
 * For Cocoon's MVP (Minimum Viable Product), most of these task functionalities are
 * not implemented. This shim provides the necessary API surface to allow extensions
 * that use the tasks API to compile, but calls to most methods will result in warnings,
 *
 * NOPs (No Operations), default/empty return values, or throw "Not Implemented" errors
 * for critical actions that cannot be meaningfully stubbed (like `executeTask`).
 *
 * Responsibilities (as a stub):
 * - Implementing the `vscode.tasks` API interface shape.
 * - Providing NOP or default-returning stubs for `vscode.tasks` methods and properties.
 * - Logging warnings when unimplemented task methods are called.
 * - Exposing NOP event emitters for task-related lifecycle events.
 *
 * Key Interactions:
 * - An instance is made available as `vscode.tasks` via the API factory in `index.ts` (or equivalent).
 * - In a full implementation, it would interact heavily with a `MainThreadTaskService`
 *   on the main thread via RPC.
 * - Uses `BaseCocoonShim` for logging.
 *

 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// Import vscode API types for the tasks namespace
import {
	// Enums
	TaskScope,
	// Interfaces
	type Task,
	// For Task constructor if creating Task objects
	type TaskDefinition,
	// Type for onDidEndTask event
	type TaskEndEvent,
	type TaskExecution,
	type TaskFilter,
	// For Task.group if constructing Task objects
	type TaskGroup,
	type TaskProcessEndEvent,
	type TaskProcessStartEvent,
	type TaskProvider,
	// Type for onDidStartTask event
	type TaskStartEvent,
	// For Task constructor scope if creating Task objects
	type WorkspaceFolder,
	// Note: ShellExecution, ProcessExecution, CustomExecution are complex types
	// for Task.execution. For MVP, their full construction might not be shimmed
	// if executeTask itself is stubbed.
} from "vscode";

// Assuming path to the API type definitions

import {
	BaseCocoonShim,
	// Renamed/specific type for Log service in shims
	type ILogServiceForShim,
	// Renamed/specific type for RPC service in shims
	type IRpcProtocolServiceAdapter,
	// Uncomment if RPC is used for proxy creation
	// type ProxyIdentifier,
} from "./_baseShim";

// Path to base shim utilities
// If RPCing
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// --- Type Definitions ---

/**
 * Placeholder for the RPC shape of `MainThreadTaskService`.
 * This interface would define the methods callable on the main thread service.
 */
// interface MainThreadTaskServiceShape {
//     $registerTaskProvider(handle: number, type: string): Promise<void>;
//     $unregisterTaskProvider(handle: number): Promise<void>;
// TaskDTO would be a serializable Task representation
//     $fetchTasks(filter?: TaskFilter): Promise<TaskDTO[]>;
// TaskExecutionDTO for serializable execution info
//     $executeTask(taskHandleOrDTO: string | TaskDTO): Promise<TaskExecutionDTO>;
//     $terminateTask(taskExecutionId: string): Promise<void>;
// ... other RPC methods like $getTask, event forwarding from main to ext host, etc.
//
// }

/**
 * Defines the service interface for `vscode.tasks` that this shim implements for Dependency Injection.
 * This interface aligns with the public `vscode.tasks` API surface that extensions consume.
 */
export interface IExtHostTaskServiceShape {
	// Standard mechanism for type-safe DI
	readonly _serviceBrand: undefined;
	readonly taskExecutions: readonly TaskExecution[];
	readonly onDidStartTask: VscodeEvent<TaskStartEvent>;
	readonly onDidEndTask: VscodeEvent<TaskEndEvent>;
	readonly onDidStartTaskProcess: VscodeEvent<TaskProcessStartEvent>;
	readonly onDidEndTaskProcess: VscodeEvent<TaskProcessEndEvent>;

	registerTaskProvider(type: string, provider: TaskProvider): IDisposable;
	fetchTasks(filter?: TaskFilter): Promise<Task[]>;
	executeTask(task: Task): Promise<TaskExecution>;

	// TODO: Add stubs for other vscode.tasks methods as needed by extensions:
	// getTask(taskDefinition: TaskDefinition, scope?: WorkspaceFolder | TaskScope.Global | TaskScope.Workspace): Promise<Task | undefined>;
	// onDidRegisterTaskProvider: Event<TaskProvider>; (VS Code internal, may not need public exposure)
	// onDidUnregisterTaskProvider: Event<TaskProvider>; (VS Code internal, may not need public exposure)
}

/**
 * Cocoon's stub implementation of the `vscode.tasks` API for the extension host.
 * Most methods are NOPs (No Operations) or return default/failure values in this
 * MVP (Minimum Viable Product) version, primarily to allow extensions to compile
 * and run without crashing, rather than providing full task functionality.
 */
export class ShimExtHostTaskService
	extends BaseCocoonShim
	implements IExtHostTaskServiceShape
{
	public readonly _serviceBrand: undefined;
	// RPC proxy instance
	// private _mainThreadTaskProxy: MainThreadTaskServiceShape | null = null;

	// --- Stubbed Properties ---
	/**
	 * A list of active task executions. In this stub, it's always empty.
	 */
	public readonly taskExecutions: readonly TaskExecution[] = [];

	// --- Stubbed Event Emitters ---
	private readonly _onDidStartTaskEmitter =
		new VscodeEmitter<TaskStartEvent>();
	public readonly onDidStartTask: VscodeEvent<TaskStartEvent> =
		this._onDidStartTaskEmitter.event;

	private readonly _onDidEndTaskEmitter = new VscodeEmitter<TaskEndEvent>();
	public readonly onDidEndTask: VscodeEvent<TaskEndEvent> =
		this._onDidEndTaskEmitter.event;

	private readonly _onDidStartTaskProcessEmitter =
		new VscodeEmitter<TaskProcessStartEvent>();
	public readonly onDidStartTaskProcess: VscodeEvent<TaskProcessStartEvent> =
		this._onDidStartTaskProcessEmitter.event;

	private readonly _onDidEndTaskProcessEmitter =
		new VscodeEmitter<TaskProcessEndEvent>();
	public readonly onDidEndTaskProcess: VscodeEvent<TaskProcessEndEvent> =
		this._onDidEndTaskProcessEmitter.event;

	/**
	 * Creates an instance of ShimExtHostTaskService.
	 * @param rpcService The RPC service adapter, used for communication with the main thread (currently unused by this stub).
	 * @param logService The logging service for shim-specific messages.
	 */
	constructor(
		// Use the specific shim adapter type
		rpcService: IRpcProtocolServiceAdapter | undefined,

		// Use the specific shim logger type
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostTaskService", rpcService, logService);
		this._log(
			"Initialized (STUBBED implementation). Task functionality is minimal.",
		);

		// Example of RPC proxy initialization (currently commented out as it's a stub)
		// if (this._rpcService) {
		//     this._mainThreadTaskProxy = this._getProxy(
		//         MainContext.MainThreadTaskService as ProxyIdentifier<MainThreadTaskServiceShape>
		//     );
		// }
		// if (!this._mainThreadTaskProxy) {
		//     this._logWarn("MainThreadTaskService proxy NOT available. All task features will be non-functional.");
		// }
	}

	/**
	 * Indicates whether this shim requires RPC communication.
	 * For the current stub implementation, RPC is not strictly required as most operations are NOPs.
	 * A full implementation would return true.
	 */
	protected override _requiresRpc(): boolean {
		// Set to true if/when RPC calls to MainThreadTaskService are implemented.
		return false;
	}

	/**
	 * Registers a task provider.
	 * In this stub implementation, this is a No-Operation (NOP) and the provider
	 * is not actually registered with any task system. It returns a NOP disposable.
	 * @param type The task type identifier (e.g., 'npm', 'gulp').
	 * @param provider The task provider implementation.
	 * @returns A disposable object. Calling `dispose()` on it should unregister the provider,
	 *
	 *          but in this stub, it does nothing.
	 */
	public registerTaskProvider(
		type: string,

		provider: TaskProvider,
	): IDisposable {
		this._logWarn(
			`vscode.tasks.registerTaskProvider STUB: type='${type}'. Provider registration is a NOP. Returning NOP disposable.`,
		);
		// TODO: In a full implementation:
		// 1. Store the provider locally (e.g., in a map with a generated handle).
		// 2. Generate a unique handle for this provider.
		// 3. Call `this._mainThreadTaskProxy?.$registerTaskProvider(handle, type);`
		// 4. Return a Disposable that, when disposed, calls `this._mainThreadTaskProxy?.$unregisterTaskProvider(handle);`
		//    and removes the provider from local storage.
		// NOP disposable
		return Disposable.None;
	}

	/**
	 * Fetches tasks based on optional filter criteria.
	 * In this stub implementation, this is a NOP and always returns an empty array.
	 * @param filter Optional filter to narrow down the tasks to fetch.
	 * @returns A promise that resolves to an empty array of tasks.
	 */
	public async fetchTasks(filter?: TaskFilter): Promise<Task[]> {
		this._logWarn(
			`vscode.tasks.fetchTasks STUB: filter=${filter ? JSON.stringify(filter) : "undefined"}. Returning empty array.`,
		);
		// TODO: In a full implementation:
		// 1. Call `this._mainThreadTaskProxy?.$fetchTasks(filter)`.
		// 2. Receive an array of TaskDTOs (serializable task representations).
		// 3. Convert these DTOs back into `vscode.Task` objects, potentially linking them
		//    to their providing extensions and stored definitions.
		// Return an empty array as a stub
		return Promise.resolve([]);
	}

	/**
	 * Executes a given task.
	 * This method is critical for task functionality. In this stub implementation,
	 *
	 * it throws an error to indicate that the feature is not implemented, as simulating
	 * task execution and its lifecycle (`TaskExecution`) is complex and beyond the scope
	 * of a simple stub.
	 * @param task The `vscode.Task` object to execute.
	 * @returns A promise that, in a full implementation, would resolve to a `TaskExecution` object
	 *          representing the running task. In this stub, the promise rejects.
	 */
	public async executeTask(task: Task): Promise<TaskExecution> {
		const errorMsg = `vscode.tasks.executeTask for task '${task.name}' (type: '${task.definition.type}') is not implemented in this Cocoon shim.`;
		this._logError(errorMsg);
		// Throwing an error is more indicative of an unimplemented critical feature
		// than returning a dummy/failing TaskExecution.
		throw new Error(errorMsg);

		// TODO: In a full implementation:
		// 1. Convert the `task` object to a serializable DTO or use its handle/ID.
		// 2. Call `this._mainThreadTaskProxy?.$executeTask(taskDtoOrId)`.
		// 3. Receive a `TaskExecutionDTO` from the main thread.
		// 4. Create a local `TaskExecution` object that:
		//    - Stores the task and the execution ID.
		//    - Proxies its `terminate()` method to `this._mainThreadTaskProxy?.$terminateTask(executionId)`.
		//    - Manages local event emitters (e.g., for data, close) which are triggered by
		//      notifications from the main thread about the task's progress.
		//    - Adds this TaskExecution to the `this.taskExecutions` array.
		//    - Emits `onDidStartTask` event.
	}

	// TODO: Implement other vscode.tasks methods and properties as stubs or full implementations as needed.
	// For example:
	// public async getTask(
	//     definition: TaskDefinition,

	//     scope?: WorkspaceFolder | TaskScope.Global | TaskScope.Workspace
	// ): Promise<Task | undefined> {
	//     this._logWarn(`vscode.tasks.getTask STUB for definition type: '${definition.type}'. Returning undefined.`);
	// TODO: Full implementation would likely involve RPC to MainThreadTaskService.$getTask
	//
	//     return undefined;
	// }

	// Note: `onDidRegisterTaskProvider` and `onDidUnregisterTaskProvider` are typically
	// internal events used by VS Code's extension host machinery and might not need to be
	// publicly exposed or fully shimmed unless extensions directly rely on them (which is uncommon).

	/**
	 * Disposes of resources held by this shim instance, primarily event emitters.
	 * Ensures that event listeners are cleaned up to prevent memory leaks.
	 */
	public override dispose(): void {
		// Call dispose on BaseCocoonShim if it implements IDisposable
		super.dispose();

		this._onDidStartTaskEmitter.dispose();
		this._onDidEndTaskEmitter.dispose();
		this._onDidStartTaskProcessEmitter.dispose();
		this._onDidEndTaskProcessEmitter.dispose();

		this._log("Disposed.");
	}
}
