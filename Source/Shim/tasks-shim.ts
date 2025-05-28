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
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import {
	type ICustomExecutionDTO,
	type IProcessExecutionDTO,
	type IShellExecutionDTO,
	// type MainThreadTaskServiceShape as VscodeMainThreadTaskServiceShape, // Proxy type
	// DTOs for tasks if implementing fully
	type ITaskDTO,
	type ITaskExecutionDTO,
	type ITaskFilterDTO,
	type TaskDefinitionDTO,
	// MainContext, // If RPC proxying
	// ExtHostContext, // If being an RPC target for more than just basic shape
	type ExtHostTaskServiceShape as VscodeExtHostTaskServiceShape, // RPC Shape this service implements
} from "vs/workbench/api/common/extHost.protocol";
import {
	// TaskScope, // Enum
	type Task,
	type TaskDefinition,
	type TaskEndEvent,
	type TaskExecution,
	type TaskFilter /* type TaskGroup, */,
	type TaskProcessEndEvent,
	type TaskProcessStartEvent,
	type TaskProvider,
	type TaskStartEvent,
	// type WorkspaceFolder, // For Task.scope
} from "vscode";

// API types

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	// type ProxyIdentifier, // If getting proxy
} from "./_baseShim";

export interface IExtHostTaskServiceShape
	extends VscodeExtHostTaskServiceShape {
	readonly _serviceBrand: undefined;
	readonly taskExecutions: readonly TaskExecution[];
	readonly onDidStartTask: VscodeEvent<TaskStartEvent>;
	readonly onDidEndTask: VscodeEvent<TaskEndEvent>;
	readonly onDidStartTaskProcess: VscodeEvent<TaskProcessStartEvent>;
	readonly onDidEndTaskProcess: VscodeEvent<TaskProcessEndEvent>;
	registerTaskProvider(type: string, provider: TaskProvider): IDisposable;
	fetchTasks(filter?: TaskFilter): Promise<Task[]>;
	executeTask(task: Task): Promise<TaskExecution>;
}

export class ShimExtHostTaskService
	extends BaseCocoonShim
	implements IExtHostTaskServiceShape
{
	// Implements DI shape and RPC shape
	public readonly _serviceBrand: undefined;
	// #mainThreadTaskProxy: VscodeMainThreadTaskServiceShape | null = null;

	public readonly taskExecutions: readonly TaskExecution[] = Object.freeze(
		[],
	); // Always empty for stub

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
		// if (this._rpcService) {
		// this.#mainThreadTaskProxy = this._getProxy(
		// MainContext.MainThreadTaskService as ProxyIdentifier<VscodeMainThreadTaskServiceShape>
		// );
		// // this._rpcService.set(ExtHostContext.ExtHostTaskService as ProxyIdentifier<VscodeExtHostTaskServiceShape>, this);
		// }
		// if (!this.#mainThreadTaskProxy) { this._logWarn("MainThreadTaskService RPC proxy NOT available."); }
	}

	protected override _requiresRpc(): boolean {
		return false;
	} // Stub doesn't require RPC

	public registerTaskProvider(
		type: string,
		_provider: TaskProvider,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.tasks.registerTaskProvider(type='${type}') called. NOP. Returning NOP disposable.`,
		);
		// TODO (Full Impl): Store provider, RPC to MainThread: $registerTaskProvider(handle, type, extensionId)
		return Disposable.None;
	}

	public async fetchTasks(filter?: TaskFilter): Promise<Task[]> {
		this._logWarnOnce(
			`API STUB: vscode.tasks.fetchTasks(${filter ? `filter: ${JSON.stringify(filter)}` : "no filter"}) called. Returning [].`,
		);
		// TODO (Full Impl): RPC to MainThread: $fetchTasks(filterDto), convert ITaskDTO[] to vscode.Task[]
		return Promise.resolve([]);
	}

	public async executeTask(task: Task): Promise<TaskExecution> {
		const errorMsg = `API Not Implemented: vscode.tasks.executeTask for task '${task.name}' (source: '${task.source}', type: '${task.definition.type}') is not supported in Cocoon MVP.`;
		this._logError(errorMsg);
		throw new Error(errorMsg);
		// TODO (Full Impl): Convert Task to DTO, RPC to MainThread: $executeTask(taskDto), return functional TaskExecution proxy.
	}

	// --- RPC Methods Called by MainThread (VscodeExtHostTaskServiceShape stubs) ---
	public $onDidStartTaskExecution(
		executionKey: string,
		_dto: any /* TaskStartEventDTO */,
	): void {
		this._logWarnOnce(
			`RPC STUB: $onDidStartTaskExecution for executionKey '${executionKey}' received. NOP.`,
		);
		// TODO (Full Impl): Find/create TaskExecution, fire _onDidStartTaskEmitter
	}
	public $onDidEndTaskExecution(
		executionKey: string,
		_dto: any /* TaskEndEventDTO */,
	): void {
		this._logWarnOnce(
			`RPC STUB: $onDidEndTaskExecution for executionKey '${executionKey}' received. NOP.`,
		);
		// TODO (Full Impl): Find TaskExecution, update state, fire _onDidEndTaskEmitter, remove from taskExecutions
	}
	public $onDidStartTaskProcess(
		executionKey: string,
		_dto: any /* TaskProcessStartEventDTO */,
	): void {
		this._logWarnOnce(
			`RPC STUB: $onDidStartTaskProcess for executionKey '${executionKey}' received. NOP.`,
		);
		// TODO (Full Impl): Find TaskExecution, fire _onDidStartTaskProcessEmitter
	}
	public $onDidEndTaskProcess(
		executionKey: string,
		_dto: any /* TaskProcessEndEventDTO */,
	): void {
		this._logWarnOnce(
			`RPC STUB: $onDidEndTaskProcess for executionKey '${executionKey}' received. NOP.`,
		);
		// TODO (Full Impl): Find TaskExecution, fire _onDidEndTaskProcessEmitter
	}
	public async $provideTasks(
		_handle: number,
		_tokenDto?: any,
	): Promise<{ tasks: ITaskDTO[]; incompatible?: boolean }> {
		this._logWarn(
			`RPC STUB: $provideTasks called for Handle=${_handle}. Returning empty tasks.`,
		);
		return { tasks: [] };
	}
	public async $resolveTask(
		_handle: number,
		_taskDto: ITaskDTO,
		_tokenDto?: any,
	): Promise<ITaskDTO | undefined> {
		this._logWarn(
			`RPC STUB: $resolveTask called for Handle=${_handle}. Returning undefined.`,
		);
		return undefined;
	}
	public async $getTaskDefinition(
		_handle: number,
		_taskDto: ITaskDTO,
	): Promise<TaskDefinitionDTO | undefined> {
		this._logWarn(
			`RPC STUB: $getTaskDefinition called for Handle=${_handle}. Returning undefined.`,
		);
		return undefined;
	}
	public async $getTaskExecution(
		_taskExecutionDTO: ITaskExecutionDTO,
	): Promise<ITaskExecutionDTO> {
		this._logWarn(
			`RPC STUB: $getTaskExecution called. Returning original DTO.`,
		);
		return _taskExecutionDTO; // Just echo for stub
	}
	public async $resolveTaskDefinition(
		_taskDefinitionDTO: TaskDefinitionDTO,
	): Promise<TaskDefinitionDTO | undefined> {
		this._logWarn(
			`RPC STUB: $resolveTaskDefinition called. Returning original DTO or undefined.`,
		);
		return undefined;
	}

	public override dispose(): void {
		super.dispose(); // BaseCocoonShim handles _instanceDisposables (which includes emitters)
		this._logInfo("Disposed.");
	}
}
