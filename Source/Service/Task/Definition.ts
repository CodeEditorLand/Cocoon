/*
 * File: Cocoon/Source/Service/Task/Definition.ts
 * Responsibility: The live implementation of the Tasks service.
 * Modified: 2025-06-17 11:16:40 UTC
 */

/**
 * @module Definition (Task)
 * @description The live implementation of the Tasks service.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, type TaskFilter, type TaskProvider } from "vscode";

import { Task as TaskConverter } from "../../TypeConverter/Task.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import ProvideTasksEffect from "./RPCHandlers/ProvideTasks.js";
import type Service from "./Service.js";

let HandleCounter = 0;

/**
 * An Effect that builds the live implementation of the Task service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const TaskProvidersRef = yield* G(Ref.make(new Map<number, any>()));

	// --- RPC Handlers ---
	IPC.RegisterInvokeHandler("$provideTasks", ([Handle, TokenID]) =>
		// The ProvideTasksEffect now correctly declares its dependencies,
		// and the runtime will provide them. We just need to run it.
		Effect.runPromise(
			ProvideTasksEffect(TaskProvidersRef, Handle, TokenID),
		),
	);

	// --- Event Emitters ---
	const OnDidStartTaskEvent = CreateEventStream<any>();
	const OnDidEndTaskEvent = CreateEventStream<any>();
	const OnDidStartTaskProcessEvent = CreateEventStream<any>();
	const OnDidEndTaskProcessEvent = CreateEventStream<any>();

	const TaskImplementation: Service["Type"] = {
		onDidStartTask: OnDidStartTaskEvent.event,
		onDidEndTask: OnDidEndTaskEvent.event,
		onDidStartTaskProcess: OnDidStartTaskProcessEvent.event,
		onDidEndTaskProcess: OnDidEndTaskProcessEvent.event,
		taskExecutions: [],

		RegisterTaskProvider: (
			Type: string,
			Provider: TaskProvider,
			Extension: IExtensionDescription,
		) =>
			Effect.sync(() => {
				const Handle = ++HandleCounter;
				Effect.runSync(
					Ref.update(TaskProvidersRef, (Map) =>
						Map.set(Handle, { Type, Provider, Extension }),
					),
				);

				Effect.runFork(
					IPC.SendNotification("$registerTaskProvider", [
						Handle,
						Type,
					]),
				);

				return new Disposable(() => {
					const CleanupEffect = Ref.update(
						TaskProvidersRef,
						(Map) => (Map.delete(Handle), Map),
					).pipe(
						Effect.flatMap(() =>
							IPC.SendNotification("$unregisterTaskProvider", [
								Handle,
							]),
						),
					);
					Effect.runFork(CleanupEffect);
				});
			}),

		FetchTasks: (Filter?: TaskFilter) =>
			IPC.SendRequest<any[]>("$fetchTasks", [Filter]).pipe(
				Effect.map((DTOs) =>
					DTOs.map((DTO) => TaskConverter.ToAPI(DTO)),
				),
				Effect.mapError((cause) => new Error(String(cause))),
			),

		ExecuteTask: (TaskToExecute, Extension) =>
			IPC.SendRequest<any>("$executeTask", [
				TaskConverter.FromAPI(TaskToExecute, Extension),
			]).pipe(
				Effect.map((DTO) =>
					TaskConverter.Execution.ToAPI(DTO, TaskToExecute),
				),
				Effect.mapError((cause) => new Error(String(cause))),
			),
	};

	return TaskImplementation;
});
