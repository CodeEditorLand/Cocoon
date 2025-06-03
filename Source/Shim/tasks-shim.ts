/*---------------------------------------------------------------------------------------------
 * Cocoon Tasks API Shim (tasks-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `vscode.tasks` API namespace.
 * The `vscode.tasks` API allows extensions to define, fetch, and execute tasks.
 *
 * For Cocoon's MVP, most task functionalities are NOT IMPLEMENTED. This shim provides
 * the API surface to allow extensions using `vscode.tasks` to compile and run, but calls
 * to most methods will result in warnings, NOPs, default/empty return values, or throw
 * "Not Implemented" errors for critical actions like `executeTask`.
 *
 * Responsibilities (as a stub):
 * - Implementing the `vscode.tasks` API interface shape (`IExtHostTaskServiceShape`).
 * - Providing NOP or default-returning stubs (e.g., `taskExecutions` is empty,
 *   `fetchTasks` returns empty array, `registerTaskProvider` returns NOP disposable).
 * - Explicitly throwing an error for `executeTask`.
 * - Exposing NOP event emitters (`onDidStartTask`, etc.).
 * - Implementing RPC stubs for methods expected in `ExtHostTaskServiceShape` (called by MainThread),
 *   primarily for contract definition and logging.
 *
 * Key Interactions:
 * - Registered with DI and made available as `vscode.tasks` via the API factory.
 * - In a full implementation, would interact with `MainThreadTaskService` via RPC.
 * - Uses `BaseCocoonShim` for logging.
 *
 * TODO (Major Features for Full Implementation):
 * - Implement `registerTaskProvider` with RPC to MainThread and local provider storage.
 * - Implement RPC handlers (`$provideTasks`, `$resolveTask`) to call registered providers.
 * - Implement `fetchTasks` to RPC to MainThread and convert `ITaskDTO[]` to `vscode.Task[]`.
 *   (Requires complex DTO for TaskDefinition, Shell/Process/CustomExecution, Scope, Group).
 * - Implement `executeTask` to RPC to MainThread, receive a `taskExecutionId`, return a
 *   functional `TaskExecution` proxy that handles termination and events.
 * - Implement all task lifecycle events (`onDidStartTask`, etc.) based on RPC notifications
 *   from MainThread (e.g., `$onDidStartTaskExecution`, `$onDidEndTaskExecution`).
 * - Implement robust type converters in `cocoon-type-converters.ts` for all task-related types.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// DTOs for tasks if implementing fully (used in RPC shape)
import {
	type ITaskDTO,
	type ITaskExecutionDTO,
	// type ITaskFilterDTO, // Not directly used in VscodeExtHostTaskServiceShape provided
	type TaskDefinitionDTO,
	type ExtHostTaskServiceShape as VscodeExtHostTaskServiceShape, // RPC Shape this service implements
	// MainContext, // If RPC proxying
	// ExtHostContext, // If being an RPC target for more than just basic shape
} from "vs/workbench/api/common/extHost.protocol";
// API types from 'vscode'
import {
	// TaskScope, // Enum, useful for Task.scope
	type Task,
	type TaskDefinition, // For Task constructor
	type TaskEndEvent,
	type TaskExecution,
	type TaskFilter,
	// type TaskGroup, // For Task.group
	type TaskProcessEndEvent,
	type TaskProcessStartEvent,
	type TaskProvider,
	type TaskStartEvent,
	// type WorkspaceFolder, // For Task.scope if creating Task objects
} from "vscode";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	// type ProxyIdentifier, // If getting proxy
} from "./_baseShim";

/**
 * Defines the service interface for `vscode.tasks` that this shim implements for DI.
 * Aligns with the public `vscode.tasks` API surface and the RPC shape methods from MainThread.
 */
export interface IExtHostTaskServiceShape
	extends VscodeExtHostTaskServiceShape {
	readonly _serviceBrand: undefined; // For DI registration
	readonly taskExecutions: readonly TaskExecution[];
	readonly onDidStartTask: VscodeEvent<TaskStartEvent>;
	readonly onDidEndTask: VscodeEvent<TaskEndEvent>;
	readonly onDidStartTaskProcess: VscodeEvent<TaskProcessStartEvent>;
	readonly onDidEndTaskProcess: VscodeEvent<TaskProcessEndEvent>;

	registerTaskProvider(type: string, provider: TaskProvider): IDisposable;
	fetchTasks(filter?: TaskFilter): Promise<Task[]>;
	executeTask(task: Task): Promise<TaskExecution>;
	// TODO: Add stubs for other vscode.tasks methods as needed.
}

/**
 * Cocoon's stub implementation of the `vscode.tasks` API.
 * Most methods are NOPs or return default/failure values in this MVP version.
 */
export class ShimExtHostTaskService
	extends BaseCocoonShim
	implements IExtHostTaskServiceShape
{
	public readonly _serviceBrand: undefined; // Implements DI shape
	// #mainThreadTaskProxy: VscodeMainThreadTaskServiceShape | null = null; // For RPC to MainThread

	public readonly taskExecutions: readonly TaskExecution[] = Object.freeze(
		[],
	); // Always empty for stub

	// Event Emitters
	private readonly _onDidStartTaskEmitter = this._instanceDisposables.add(
		new VscodeEmitter<TaskStartEvent>(),
	);
	public readonly onDidStartTask: VscodeEvent<TaskStartEvent> =
		this._onDidStartTaskEmitter.event;

	private readonly _onDidEndTaskEmitter = this._instanceDisposables.add(
		new VscodeEmitter<TaskEndEvent>(),
	);
	public readonly onDidEndTask: VscodeEvent<TaskEndEvent> =
		this._onDidEndTaskEmitter.event;

	private readonly _onDidStartTaskProcessEmitter =
		this._instanceDisposables.add(
			new VscodeEmitter<TaskProcessStartEvent>(),
		);
	public readonly onDidStartTaskProcess: VscodeEvent<TaskProcessStartEvent> =
		this._onDidStartTaskProcessEmitter.event;

	private readonly _onDidEndTaskProcessEmitter =
		this._instanceDisposables.add(new VscodeEmitter<TaskProcessEndEvent>());
	public readonly onDidEndTaskProcess: VscodeEvent<TaskProcessEndEvent> =
		this._onDidEndTaskProcessEmitter.event;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostTaskService", rpcService, logService);
		this._logInfo(
			"Initialized (STUBBED implementation). Full task functionality is NOT AVAILABLE.",
		);

		// Example of RPC proxy and self-registration (if this shim were more functional)
		// if (this._rpcService) {
		//     this.#mainThreadTaskProxy = this._getProxy(
		//         MainContext.MainThreadTaskService as ProxyIdentifier<VscodeMainThreadTaskServiceShape>
		//     );
		//     try {
		//         this._rpcService.set(ExtHostContext.ExtHostTaskService as ProxyIdentifier<VscodeExtHostTaskServiceShape>, this);
		//         this._logInfo("Registered self for RPC calls from MainThread (ExtHostTaskService).");
		//     } catch (e:any) {
		//         this._logError("Failed to register self as RPC target for ExtHostTaskService:", e);
		//     }
		// }
		// if (!this.#mainThreadTaskProxy) {
		//     this._logWarn("MainThreadTaskService RPC proxy NOT available. Task features will be severely limited.");
		// }
	}

	/**
	 * This shim, in its current stubbed form, does not require RPC for its implemented methods.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	public registerTaskProvider(
		type: string,
		_provider: TaskProvider,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.tasks.registerTaskProvider(type='${type}') called. This is a No-Operation. Returning NOP disposable.`,
		);
		// TODO (Full Implementation):
		// 1. Store the provider locally.
		// 2. Generate a unique handle for the provider.
		// 3. Call `this.#mainThreadTaskProxy?.$registerTaskProvider(handle, type, extensionId);`
		// 4. Return a Disposable that, when disposed, calls `$unregisterTaskProvider(handle)`.
		return Disposable.None;
	}

	public async fetchTasks(filter?: TaskFilter): Promise<Task[]> {
		this._logWarnOnce(
			`API STUB: vscode.tasks.fetchTasks(${filter ? `filter: ${JSON.stringify(filter)}` : "no filter"}) called. Returning an empty array.`,
		);
		// TODO (Full Implementation):
		// 1. Convert `filter` to `ITaskFilterDTO`.
		// 2. Call `this.#mainThreadTaskProxy?.$fetchTasks(filterDto)`.
		// 3. Receive `ITaskDTO[]` and convert them to `vscode.Task[]` using a type converter.
		return Promise.resolve([]);
	}

	public async executeTask(task: Task): Promise<TaskExecution> {
		const errorMsg = `API Not Implemented: vscode.tasks.executeTask for task '${task.name}' (source: '${task.source}', definition type: '${task.definition.type}') is not supported in this version of Cocoon.`;
		this._logError(errorMsg);
		// Throwing an error clearly indicates that the feature is unavailable.
		throw new Error(errorMsg);
		// TODO (Full Implementation):
		// 1. Convert `task` to `ITaskDTO`.
		// 2. Call `this.#mainThreadTaskProxy?.$executeTask(taskDto)`.
		// 3. Receive a `taskExecutionId` (or `ITaskExecutionDTO`).
		// 4. Create and return a functional `TaskExecution` proxy object that handles termination requests
		//    and receives lifecycle events (start, end, process start/end) via RPC notifications from MainThread.
	}

	// --- RPC Methods Called by MainThread (VscodeExtHostTaskServiceShape stubs) ---
	// These methods are part of the RPC contract defined by VscodeExtHostTaskServiceShape.
	// In a full implementation, they would handle calls from the MainThreadTaskService.

	public $onDidStartTaskExecution(
		executionKey: string,
		_dto: any /* TaskStartEventDTO */,
	): void {
		this._logWarnOnce(
			`RPC STUB: $onDidStartTaskExecution received for executionKey '${executionKey}'. This is a No-Operation in the current stub.`,
		);
		// TODO (Full Implementation):
		// 1. Find or create the local `TaskExecution` object associated with `executionKey`.
		// 2. Update its state.
		// 3. Fire the `_onDidStartTaskEmitter` with a converted `TaskStartEvent`.
	}

	public $onDidEndTaskExecution(
		executionKey: string,
		_dto: any /* TaskEndEventDTO */,
	): void {
		this._logWarnOnce(
			`RPC STUB: $onDidEndTaskExecution received for executionKey '${executionKey}'. This is a No-Operation.`,
		);
		// TODO (Full Implementation):
		// 1. Find the local `TaskExecution` object.
		// 2. Update its state (e.g., exit code).
		// 3. Fire the `_onDidEndTaskEmitter` with a converted `TaskEndEvent`.
		// 4. Remove the `TaskExecution` from the `taskExecutions` array.
	}

	public $onDidStartTaskProcess(
		executionKey: string,
		_dto: any /* TaskProcessStartEventDTO */,
	): void {
		this._logWarnOnce(
			`RPC STUB: $onDidStartTaskProcess received for executionKey '${executionKey}'. This is a No-Operation.`,
		);
		// TODO (Full Implementation):
		// 1. Find the local `TaskExecution` object.
		// 2. Fire the `_onDidStartTaskProcessEmitter` with a converted `TaskProcessStartEvent`.
	}

	public $onDidEndTaskProcess(
		executionKey: string,
		_dto: any /* TaskProcessEndEventDTO */,
	): void {
		this._logWarnOnce(
			`RPC STUB: $onDidEndTaskProcess received for executionKey '${executionKey}'. This is a No-Operation.`,
		);
		// TODO (Full Implementation):
		// 1. Find the local `TaskExecution` object.
		// 2. Fire the `_onDidEndTaskProcessEmitter` with a converted `TaskProcessEndEvent`.
	}

	public async $provideTasks(
		_handle: number,
		_tokenDto?: any /* CancellationToken DTO */,
	): Promise<{ tasks: ITaskDTO[]; incompatible?: boolean }> {
		this._logWarn(
			`RPC STUB: $provideTasks called for TaskProvider Handle=${_handle}. Returning empty tasks array.`,
		);
		// TODO (Full Implementation):
		// 1. Find the registered `TaskProvider` associated with `_handle`.
		// 2. Call its `provideTasks(token)` method.
		// 3. Convert the returned `vscode.Task[]` to `ITaskDTO[]`.
		// 4. Handle cancellation via `_tokenDto`.
		return { tasks: [] };
	}

	public async $resolveTask(
		_handle: number,
		_taskDto: ITaskDTO,
		_tokenDto?: any,
	): Promise<ITaskDTO | undefined> {
		this._logWarn(
			`RPC STUB: $resolveTask called for TaskProvider Handle=${_handle}. Returning undefined.`,
		);
		// TODO (Full Implementation):
		// 1. Find the registered `TaskProvider`.
		// 2. Convert `_taskDto` to `vscode.Task`.
		// 3. Call provider's `resolveTask(task, token)`.
		// 4. Convert the resolved `vscode.Task` back to `ITaskDTO`.
		return undefined;
	}

	public async $getTaskDefinition(
		_handle: number,
		_taskDto: ITaskDTO,
	): Promise<TaskDefinitionDTO | undefined> {
		this._logWarn(
			`RPC STUB: $getTaskDefinition called for Handle=${_handle}. Returning undefined.`,
		);
		// This method seems less common in standard VS Code ExtHostTaskService, might be custom or older.
		// If needed, it would likely involve a provider method.
		return undefined;
	}

	public async $getTaskExecution(
		_taskExecutionDTO: ITaskExecutionDTO,
	): Promise<ITaskExecutionDTO> {
		this._logWarn(
			`RPC STUB: $getTaskExecution called. Returning the original DTO as a NOP.`,
		);
		// This might be for synchronizing execution state or properties. In a stub, just echoing.
		return _taskExecutionDTO;
	}

	public async $resolveTaskDefinition(
		_taskDefinitionDTO: TaskDefinitionDTO,
	): Promise<TaskDefinitionDTO | undefined> {
		this._logWarn(
			`RPC STUB: $resolveTaskDefinition called. Returning undefined as a NOP.`,
		);
		// This would be for resolving a task definition that doesn't have full execution details.
		return undefined;
	}

	public override dispose(): void {
		super.dispose(); // BaseCocoonShim handles _instanceDisposables (which includes emitters)
		this._logInfo("Disposed.");
	}
}
