/*
 * File: Cocoon/Source/Service/Task/Definition.ts
 * Role: Provides the live implementation of the Task service.
 * Responsibilities:
 *   - Implements the `vscode.tasks` API surface.
 *   - Manages the registration and lifecycle of `TaskProvider`s.
 *   - Orchestrates task fetching and execution by proxying requests to the host
 *     process via the IPC service.
 *   - Listens for and dispatches task-related events from the host.
 */

import { Effect, Ref } from "effect";
import { type IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	type Task,
	type TaskExecution,
	type TaskFilter,
	type TaskProvider,
} from "vscode";
import { Task as TaskConverter } from "../../TypeConverter/Task.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { Cancellation } from "../Cancellation/Service.js";
import { IPC } from "../IPC/Service.js";
import { ProvideTasksEffect } from "./RPCHandlers/ProvideTasks.js";
import { Task as TaskService } from "./Service.js";
import type { ProviderEntry } from "./Type.js";

let HandleCounter = 0;

/**
 * An `Effect` that builds the live implementation of the `Task` service.
 */
const Definition = Effect.gen(function* (Generator) {
	// --- Service Dependencies ---
	const IPCService = yield* Generator(IPC);
	const CancellationService = yield* Generator(Cancellation);

	// --- Internal State ---
	const TaskProvidersRef = yield* Generator(
		Ref.make(new Map<number, ProviderEntry<any>>()),
	);

	// --- RPC Handlers ---
	// Register the handler that the host will call to request tasks from a provider.
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

	// --- Event Emitters ---
	const { event: OnDidStartTaskEvent } = CreateEventStream<any>();
	const { event: OnDidEndTaskEvent } = CreateEventStream<any>();
	const { event: OnDidStartTaskProcessEvent } = CreateEventStream<any>();
	const { event: OnDidEndTaskProcessEvent } = CreateEventStream<any>();

	// --- Service Implementation ---
	const ServiceImplementation: TaskService["Type"] = {
		// --- Events ---
		onDidStartTask: OnDidStartTaskEvent,
		onDidEndTask: OnDidEndTaskEvent,
		onDidStartTaskProcess: OnDidStartTaskProcessEvent,
		onDidEndTaskProcess: OnDidEndTaskProcessEvent,

		// --- Properties ---
		get taskExecutions(): readonly TaskExecution[] {
			// A full implementation would need to track active executions.
			return [];
		},

		// --- Methods ---
		RegisterTaskProvider: <T extends Task>(
			Type: string,
			Provider: TaskProvider<T>,
			Extension: IExtensionDescription,
		): Effect.Effect<Disposable, Error> =>
			Effect.sync(() => {
				const Handle = ++HandleCounter;
				const Entry: ProviderEntry<T> = { Type, Provider, Extension };

				// Store the provider locally.
				Effect.runSync(
					Ref.update(TaskProvidersRef, (Map) =>
						Map.set(Handle, Entry),
					),
				);

				// Notify the host that a provider for this type is available.
				Effect.runFork(
					IPCService.SendNotification("$registerTaskProvider", [
						Handle,
						Type,
					]),
				);

				// Return a disposable to clean up the registration.
				return new Disposable(() => {
					const CleanupEffect = Ref.update(
						TaskProvidersRef,
						(Map) => (Map.delete(Handle), Map),
					).pipe(
						Effect.flatMap(() =>
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
					TaskConverter.Execution.ToAPI(ExecutionDTO, TaskToExecute),
				),
				Effect.mapError((Cause) => new Error(String(Cause))),
			),
	};

	return ServiceImplementation;
});

export default Definition;
