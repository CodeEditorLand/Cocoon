/*
 * File: Cocoon/Source/Service/Task/Service.ts
 * Role: Defines the Task service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Implements the `vscode.tasks` API.
 *   - Manages the registration and lifecycle of `TaskProvider`s.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	type Event,
	type Task as VscTask,
	type TaskEndEvent,
	type TaskExecution,
	type TaskFilter,
	type TaskProcessEndEvent,
	type TaskProcessStartEvent,
	type TaskProvider,
	type TaskStartEvent,
} from "vscode";
import { Task as TaskConverter } from "../../TypeConverter/Task.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { Cancellation } from "../Cancellation/Service.js";
import { IPC } from "../IPC/Service.js";
import { ProvideTasksEffect } from "./RPCHandlers/ProvideTasks.js"; // This file should be moved into this service file as a helper.

// Assuming ProvideTasksEffect is moved into this file as an internal helper.
// You would copy the contents of that file here.

export interface ProviderEntry<T extends VscTask> {
	readonly Type: string;
	readonly Provider: TaskProvider<T>;
	readonly Extension: IExtensionDescription;
}

export class Task extends Effect.Service<Task>()("Service/Task", {
	effect: Effect.gen(function* (Generator) {
		const IPCService = yield* Generator(IPC);
		const CancellationService = yield* Generator(Cancellation);
		let HandleCounter = 0;
		const TaskProvidersRef = yield* Generator(
			Ref.make(new Map<number, ProviderEntry<any>>()),
		);

		// Register RPC Handler
		IPCService.RegisterInvokeHandler(
			"$provideTasks",
			([Handle, TokenID]: [number, number]) =>
				Effect.runPromise(
					ProvideTasksEffect(
						TaskProvidersRef,
						Handle,
						TokenID,
						CancellationService,
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

		const ServiceImplementation = {
			onDidStartTask: OnDidStartTaskEvent,
			onDidEndTask: OnDidEndTaskEvent,
			onDidStartTaskProcess: OnDidStartTaskProcessEvent,
			onDidEndTaskProcess: OnDidEndTaskProcessEvent,
			get taskExecutions(): readonly TaskExecution[] {
				return [];
			},

			RegisterTaskProvider: <T extends VscTask>(
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
						IPCService.SendNotification("$registerTaskProvider", [
							Handle,
							Type,
						]),
					);
					return new Disposable(() => {
						const CleanupEffect = Ref.update(
							TaskProvidersRef,
							(Map) => (Map.delete(Handle), Map),
						).pipe(
							Effect.andThen(
								IPCService.SendNotification(
									"$unregisterTaskProvider",
									[Handle],
								),
							),
						);
						Effect.runFork(CleanupEffect);
					});
				}),
			FetchTasks: (Filter?: TaskFilter) =>
				IPCService.SendRequest<any[]>("$fetchTasks", [Filter]).pipe(
					Effect.map((TaskDTOs) =>
						TaskDTOs.map((DTO) => TaskConverter.ToAPI(DTO)),
					),
					Effect.mapError((Cause) => new Error(String(Cause))),
				),
			ExecuteTask: (TaskToExecute, Extension) =>
				IPCService.SendRequest<any>("$executeTask", [
					TaskConverter.FromAPI(TaskToExecute, Extension),
				]).pipe(
					Effect.map((ExecutionDTO) =>
						TaskConverter.Execution.ToAPI(
							ExecutionDTO,
							TaskToExecute,
						),
					),
					Effect.mapError((Cause) => new Error(String(Cause))),
				),
		};
		return ServiceImplementation;
	}),
}) {}
