/*---------------------------------------------------------------------------------------------
 * Cocoon Tasks API Shim (tasks-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `vscode.tasks` API namespace.
 * The `vscode.tasks` API allows extensions to define, fetch, and execute tasks, * such as build scripts, linters, or other command-line operations, and integrate
 * them into VS Code's task system.
 *
 * For Cocoon's MVP (Minimum Viable Product), most of these task functionalities are
 * not implemented. This shim provides the necessary API surface to allow extensions
 * that use the tasks API to compile and run, but calls to most methods will result
 * in warnings, NOPs (No Operations), default/empty return values, or throw
 * "Not Implemented" errors for critical actions that cannot be meaningfully stubbed
 * (like `executeTask`).
 *
 * Responsibilities (as a stub):
 * - Implementing the `vscode.tasks` API interface shape (as defined by
 *   `IExtHostTaskServiceShape`).
 * - Providing NOP or default-returning stubs for `vscode.tasks` methods and properties
 *   (e.g., `taskExecutions` is an empty array, `fetchTasks` returns an empty array).
 * - Explicitly throwing an error for `executeTask` to indicate it's not implemented.
 * - Logging warnings when unimplemented task methods are called.
 * - Exposing NOP event emitters (e.g., `onDidStartTask`, `onDidEndTask`) that never fire.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostTaskService` is registered with Dependency Injection
 *   in `Cocoon/index.ts` and made available as `vscode.tasks` via the API factory.
 * - In a full implementation, this service would interact heavily with a
 *   `MainThreadTaskService` on the Mountain host process via RPC to manage the
 *   actual task lifecycle.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// Import vscode API types for the tasks namespace from the bundled API definitions
import {
	// Enums
	// Though not directly used in this stub's method signatures, it's part of the namespace.
	TaskScope,
	// Interfaces
	type Task,
	// For Task constructor if creating Task objects.
	type TaskDefinition,
	// Type for onDidEndTask event.
	type TaskEndEvent,
	type TaskExecution,
	type TaskFilter,
	// For Task.group if constructing Task objects.
	type TaskGroup,
	type TaskProcessEndEvent,
	type TaskProcessStartEvent,
	type TaskProvider,
	// Type for onDidStartTask event.
	type TaskStartEvent,
	// For Task constructor scope if creating Task objects.
	type WorkspaceFolder,
	// Note: ShellExecution, ProcessExecution, CustomExecution are complex types
	// for Task.execution. For MVP, their full construction might not be shimmed
	// if executeTask itself is stubbed to throw.
} from "vscode";

import {
	BaseCocoonShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	// Not used if RPC calls are not made in stub
	// refineErrorForShim,
	// Uncomment if RPC is used for a full implementation
	// type ProxyIdentifier,
} from "./_baseShim";

// If RPCing to MainThreadTaskService:
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// Example
// import type { MainThreadTaskServiceShape } from "vs/workbench/api/common/extHost.protocol";

// --- Type Definitions ---

/**
 * Placeholder for the RPC shape of `MainThreadTaskService`.
 * This would define methods for registering providers, fetching/executing tasks, etc.
 */
// If using VS Code's shape
// interface MainThreadTaskServiceProxyShape extends MainThreadTaskServiceShape {

//     $registerTaskProvider(handle: number, type: string): Promise<void>;

//     $unregisterTaskProvider(handle: number): Promise<void>;

// TaskDTO would be a serializable Task representation.
//     $fetchTasks(filter?: TaskFilter): Promise<TaskDTO[]>;

// TaskExecutionDTO for serializable execution info.
//     $executeTask(taskHandleOrDTO: string | TaskDTO): Promise<TaskExecutionDTO>;

//     $terminateTask(taskExecutionId: string): Promise<void>;

// ... other RPC methods related to task lifecycle and events.
//
// }

/**
 * Defines the service interface for `vscode.tasks` that this shim implements for DI.
 * This interface aligns with the public `vscode.tasks` API surface that extensions consume.
 */
export interface IExtHostTaskServiceShape {
	// Standard mechanism for type-safe DI.
	readonly _serviceBrand: undefined;

	// List of active task executions.
	readonly taskExecutions: readonly TaskExecution[];

	readonly onDidStartTask: VscodeEvent<TaskStartEvent>;

	readonly onDidEndTask: VscodeEvent<TaskEndEvent>;

	readonly onDidStartTaskProcess: VscodeEvent<TaskProcessStartEvent>;

	readonly onDidEndTaskProcess: VscodeEvent<TaskProcessEndEvent>;

	registerTaskProvider(type: string, provider: TaskProvider): IDisposable;

	fetchTasks(filter?: TaskFilter): Promise<Task[]>;

	executeTask(task: Task): Promise<TaskExecution>;

	// TODO: Add stubs for other vscode.tasks methods as they become relevant or are encountered by extensions:
	// e.g., getTask(task: Task): Promise<Task | undefined>;

	// Note: onDidRegisterTaskProvider and onDidUnregisterTaskProvider are typically internal events
	// within VS Code's extension host machinery and might not need public exposure or full shimming
	// unless extensions directly (and atypically) rely on them.
}

/**
 * Cocoon's stub implementation of the `vscode.tasks` API for the extension host.
 * Most methods are NOPs (No Operations) or return default/failure values in this
 * MVP (Minimum Viable Product) version. This primarily allows extensions that use the
 * tasks API to compile and run without crashing, rather than providing full task
 * system functionality.
 */
export class ShimExtHostTaskService
	extends BaseCocoonShim
	implements IExtHostTaskServiceShape
{
	public readonly _serviceBrand: undefined;

	// private _mainThreadTaskProxy: MainThreadTaskServiceProxyShape | null = null;

	// --- Stubbed Properties ---
	/**
	 * A readonly array of active task executions. In this stub implementation, it's always empty.
	 */
	public readonly taskExecutions: readonly TaskExecution[] = [];

	// --- Stubbed Event Emitters (all NOPs, never fire) ---
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
	 * @param rpcService The RPC service adapter (passed to base, currently unused by this stub).
	 * @param logService The logging service for shim-specific messages.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostTaskService", rpcService, logService);

		this._logInfo(
			"Initialized (STUBBED implementation). Full task functionality is not available.",
		);

		// Example of RPC proxy initialization (currently commented out as this is a stub):
		// if (this._rpcService) {

		//     this._mainThreadTaskProxy = this._getProxy(
		//         MainContext.MainThreadTaskService as ProxyIdentifier<MainThreadTaskServiceProxyShape>
		//     );

		// }

		// if (!this._mainThreadTaskProxy) {

		//     this._logWarn("MainThreadTaskService RPC proxy is NOT available. All task-related features will be non-functional if they were to be implemented via RPC.");

		// }
	}

	/**
	 * This shim, in its current stubbed form, does not require RPC communication for its
	 * core (stubbed) functionality. A full implementation would likely return `true`.
	 * @returns `false` as RPC is not required for the current stub.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc vscode.tasks.registerTaskProvider}
	 *
	 *
	 *
	 * Registers a task provider for a specific task type.
	 * This is a No-Operation (NOP) in the current stub implementation. The provider
	 * will not be registered with any actual task system, and the returned disposable is a NOP.
	 * @param type The task type identifier (e.g., 'npm', 'gulp', 'shell').
	 * @param _provider The task provider implementation (marked as unused in stub).
	 * @returns A NOP `IDisposable`. Calling `dispose()` on it will have no effect.
	 */
	public registerTaskProvider(
		type: string,

		_provider: TaskProvider,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.tasks.registerTaskProvider(type='${type}') called. ` +
				`Provider registration is a No-Operation in Cocoon MVP. Returning a NOP disposable.`,
		);

		// TODO (Full Implementation):
		// 1. Store the provider locally (e.g., in a Map, associated with a generated unique handle).
		// 2. Generate a unique handle for this provider registration.
		// 3. Make an RPC call to MainThread: `this._mainThreadTaskProxy?.$registerTaskProvider(handle, type);`
		// 4. Return a `Disposable` that, when disposed, calls `this._mainThreadTaskProxy?.$unregisterTaskProvider(handle);`
		//    and removes the provider from the local store.
		// Return a NOP disposable.
		return Disposable.None;
	}

	/**
	 * {@inheritDoc vscode.tasks.fetchTasks}
	 *
	 *
	 *
	 * Fetches tasks based on optional filter criteria.
	 * In this stub implementation, this is a NOP and always returns a promise
	 * that resolves to an empty array, indicating no tasks were found.
	 * @param filter Optional filter (`TaskFilter`) to narrow down the tasks to fetch.
	 * @returns A promise that resolves to an empty array of `Task` objects.
	 */
	public async fetchTasks(filter?: TaskFilter): Promise<Task[]> {
		this._logWarnOnce(
			`API STUB: vscode.tasks.fetchTasks(${filter ? `filter: ${JSON.stringify(filter)}` : "no filter"}) called. ` +
				`Returning an empty array. Full task fetching is not implemented in Cocoon MVP.`,
		);

		// TODO (Full Implementation):
		// 1. Make an RPC call to MainThread: `this._mainThreadTaskProxy?.$fetchTasks(filter)`.
		// 2. Receive an array of TaskDTOs (serializable task representations) from MainThread.
		// 3. Convert these DTOs back into `vscode.Task` API objects. This conversion is complex,

		//    involving recreating `TaskDefinition`, `ShellExecution`/`ProcessExecution`/`CustomExecution`,

		//    `TaskScope`, `TaskGroup`, etc., potentially linking them to their providing extensions.
		// Return an empty array as a stub.
		return Promise.resolve([]);
	}

	/**
	 * {@inheritDoc vscode.tasks.executeTask}
	 *
	 *
	 *
	 * Executes a given task. This method is critical for task functionality.
	 * In this stub implementation, it throws an error to indicate that the feature
	 * is not implemented, as simulating task execution and its lifecycle (which involves
	 * creating and managing a `TaskExecution` object, handling process output, exit codes,
	 *
	 *
	 * and events) is complex and beyond the scope of a simple stub.
	 *
	 * @param task The `vscode.Task` object to execute.
	 * @returns A promise that, in a full implementation, would resolve to a `TaskExecution` object
	 *          representing the running task. In this stub, the promise will reject with an error.
	 * @throws `Error` indicating that task execution is not implemented.
	 */
	public async executeTask(task: Task): Promise<TaskExecution> {
		const errorMsg =
			`API Not Implemented: vscode.tasks.executeTask for task '${task.name}' (source: '${task.source}', type: '${task.definition.type}') ` +
			`is not supported in this version of Cocoon. Full task execution requires a functional backend on Mountain.`;

		this._logError(errorMsg);

		// Throwing an error is more indicative of an unimplemented critical feature
		// than returning a dummy/failing TaskExecution that doesn't actually do anything.
		throw new Error(errorMsg);

		// TODO (Full Implementation):
		// 1. Convert the `task` API object to a serializable DTO or use a unique handle/ID if tasks are already known by MainThread.
		// 2. Make an RPC call: `this._mainThreadTaskProxy?.$executeTask(taskDtoOrId)`.
		// 3. Receive a `TaskExecutionDTO` (or equivalent execution identifier) from MainThread.
		// 4. Create a local `TaskExecution` proxy object that:
		//    - Stores the original `task` and the execution ID from MainThread.
		//    - Proxies its `terminate()` method to `this._mainThreadTaskProxy?.$terminateTask(executionId)`.
		//    - Manages local event emitters (e.g., for data output, close signals) which would be triggered by
		//      notifications from MainThread about the actual task's progress and state changes.
		//    - Adds this `TaskExecution` proxy to the `this.taskExecutions` array.
		//    - Emits `onDidStartTask` event with appropriate `TaskStartEvent` data.
		//    - When the task finishes (notified by MainThread), emit `onDidEndTask`, remove from `taskExecutions`.
	}

	// TODO: Implement other vscode.tasks methods and properties as stubs or full implementations as needed.
	// For example:
	// public async getTask(
	// This is the definition from package.json or a TaskProvider
	//     definition: TaskDefinition,

	// The scope of the task
	//     scope?: WorkspaceFolder | TaskScope.Global | TaskScope.Workspace
	// ): Promise<Task | undefined> {

	//     this._logWarnOnce(`API STUB: vscode.tasks.getTask for definition type: '${definition.type}' called. Returning undefined.`);

	// TODO (Full Implementation): This would likely involve an RPC call to MainThreadTaskService.$getTask,

	//
	// passing the definition and scope, and then converting the returned TaskDTO to a vscode.Task.
	//
	//     return undefined;

	// }

	// Note: `onDidRegisterTaskProvider` and `onDidUnregisterTaskProvider` are typically
	// internal events used by VS Code's extension host machinery (e.g., by `ExtHostTask` itself
	// to know when providers come and go). They might not need to be publicly exposed or fully
	// shimmed for external extensions unless extensions directly and atypically rely on them.

	/**
	 * Disposes of resources held by this shim instance, primarily its event emitters.
	 * Ensures that event listeners are cleaned up to prevent memory leaks.
	 */
	public override dispose(): void {
		// Call dispose on BaseCocoonShim if it implements IDisposable and manages common resources.
		super.dispose();

		this._onDidStartTaskEmitter.dispose();

		this._onDidEndTaskEmitter.dispose();

		this._onDidStartTaskProcessEmitter.dispose();

		this._onDidEndTaskProcessEmitter.dispose();

		// Use Info for major lifecycle events.
		this._logInfo("Disposed.");
	}
}
