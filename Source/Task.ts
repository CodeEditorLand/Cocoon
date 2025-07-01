/**
 * @module Task
 * @description Defines the service for implementing the `vscode.tasks` API, which
 * manages the registration and lifecycle of `TaskProvider`s and orchestrates
 * task fetching and execution by proxying requests to the host process.
 */

import type { IExtensionDescription } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/platform/extensions/common/extensions.js";
import { Effect, Ref } from "effect";
import {
	Disposable,
	type Event,
	type TaskEndEvent,
	type TaskExecution,
	type TaskFilter,
	type TaskProcessEndEvent,
	type TaskProcessStartEvent,
	type TaskProvider,
	type TaskStartEvent,
	type Task as VSCodeTask,
} from "vscode";

import { CancellationService, type Cancellation } from "./Cancellation.js";
import { IPCService } from "./IPC.js";
import {
	ExecutionToAPI,
	FromAPI as TaskFromAPI,
	ToAPI as TaskToAPI,
} from "./TypeConverter/Task.js";
import { CreateEventStream } from "./Utility/EventStream.js";

/**
 * @interface ProviderEntry
 * @description An internal type associating a task provider with its metadata.
 */
export interface ProviderEntry<T extends VSCodeTask> {
	readonly Type: string;
	readonly Provider: TaskProvider<T>;
	readonly Extension: IExtensionDescription;
}

/**
 * @description An internal helper Effect that handles the `$provideTasks` RPC call from the host.
 * @param Registry A `Ref` containing all registered task providers.
 * @param Handle The handle of the specific provider to invoke.
 * @param TokenId The ID of the cancellation token for this operation.
 * @param Cancellation The service to obtain the cancellation token from.
 * @returns An `Effect` that resolves to an array of Task DTOs or fails.
 */
const ProvideTasks = (
	Registry: Ref.Ref<Map<number, ProviderEntry<VSCodeTask>>>,
	Handle: number,
	TokenId: number,
	Cancellation: Cancellation,
) => {
	return Effect.gen(function* () {
		const Entry = (yield* Ref.get(Registry)).get(Handle);
		if (!Entry)
			return yield* Effect.fail(
				new Error(`Task provider with handle ${Handle} not found.`),
			);

		const Provider = Entry.Provider as TaskProvider;
		if (!Provider.provideTasks) return [];

		const CancellationToken = yield* Cancellation.ObtainToken(TokenId);
		const Tasks = yield* Effect.tryPromise({
			try: () =>
				Provider.provideTasks(CancellationToken) as Promise<
					VSCodeTask[] | null | undefined
				>,
			catch: (CaughtError) => CaughtError as Error,
		});

		if (!Tasks) return [];
		return Tasks.map((TheTask: VSCodeTask) =>
			TaskFromAPI(TheTask, Entry.Extension),
		);
	}).pipe(
		Effect.scoped, // Ensures the CancellationToken's scope is properly managed
		Effect.catchAll(() => Effect.succeed([])), // Gracefully return empty array on any error
	);
};

/**
 * @interface Task
 * @description The contract for the Task service.
 */
export interface Task {
	readonly onDidStartTask: Event<TaskStartEvent>;
	readonly onDidEndTask: Event<TaskEndEvent>;
	readonly onDidStartTaskProcess: Event<TaskProcessStartEvent>;
	readonly onDidEndTaskProcess: Event<TaskProcessEndEvent>;
	readonly taskExecutions: readonly TaskExecution[];
	readonly RegisterTaskProvider: <T extends VSCodeTask>(
		type: string,
		provider: TaskProvider<T>,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;
	readonly FetchTasks: (
		filter?: TaskFilter,
	) => Effect.Effect<VSCodeTask[], Error>;
	readonly ExecuteTask: (
		task: VSCodeTask,
		extension: IExtensionDescription,
	) => Effect.Effect<TaskExecution, Error>;
}

/**
 * @class Task
 * @description The `Effect.Service` for the Task service.
 */
export class TaskService extends Effect.Service<TaskService>()("Service/Task", {
	effect: Effect.gen(function* () {
		const IPC = yield* IPCService;
		const Cancellation = yield* CancellationService;
		let HandleCounter = 0;
		const TaskProvidersRef = yield* Ref.make(
			new Map<number, ProviderEntry<any>>(),
		);

		IPC.RegisterInvokeHandler(
			"$provideTasks",
			([Handle, TokenId]: [number, number]) =>
				Effect.runPromise(
					ProvideTasks(
						TaskProvidersRef,
						Handle,
						TokenId,
						Cancellation,
					),
				),
		);

		const { event: OnDidStartTaskEvent } =
			CreateEventStream<TaskStartEvent>();
		const { event: OnDidEndTaskEvent } = CreateEventStream<TaskEndEvent>();
		const { event: OnDidStartTaskProcessEvent } =
			CreateEventStream<TaskProcessStartEvent>();
		const { event: OnDidEndTaskProcessEvent } =
			CreateEventStream<TaskProcessEndEvent>();

		return {
			onDidStartTask: OnDidStartTaskEvent,
			onDidEndTask: OnDidEndTaskEvent,
			onDidStartTaskProcess: OnDidStartTaskProcessEvent,
			onDidEndTaskProcess: OnDidEndTaskProcessEvent,
			get taskExecutions(): readonly TaskExecution[] {
				return [];
			},

			RegisterTaskProvider: <T extends VSCodeTask>(
				Type: string,
				Provider: TaskProvider<T>,
				Extension: IExtensionDescription,
			) =>
				Effect.sync(() => {
					const Handle = ++HandleCounter;
					const Entry: ProviderEntry<T> = {
						Type,
						Provider,
						Extension,
					};
					Effect.runSync(
						Ref.update(TaskProvidersRef, (Map) =>
							Map.set(Handle, Entry),
						),
					);
					Effect.runFork(
						IPC.SendNotification("$registerTaskProvider", [
							Handle,
							Type,
						]),
					);
					return new Disposable(() => {
						const Cleanup = Ref.update(
							TaskProvidersRef,
							(Map) => (Map.delete(Handle), Map),
						).pipe(
							Effect.andThen(
								IPC.SendNotification(
									"$unregisterTaskProvider",
									[Handle],
								),
							),
						);
						Effect.runFork(Cleanup);
					});
				}),
			FetchTasks: (Filter?: TaskFilter) =>
				IPC.SendRequest<any[]>("$fetchTasks", [Filter]).pipe(
					Effect.map((TaskDTOs) =>
						TaskDTOs.map((DTO) => TaskToAPI(DTO)),
					),
					Effect.mapError((Cause) => new Error(String(Cause))),
				),
			// FIX: Add explicit types to parameters
			ExecuteTask: (
				TaskToExecute: VSCodeTask,
				Extension: IExtensionDescription,
			) =>
				IPC.SendRequest<any>("$executeTask", [
					TaskFromAPI(TaskToExecute, Extension),
				]).pipe(
					Effect.map((ExecutionDTO) =>
						ExecutionToAPI(ExecutionDTO, TaskToExecute),
					),
					Effect.mapError((Cause) => new Error(String(Cause))),
				),
		};
	}),
}) {}
