/*
 * File: Cocoon/Source/Service/Task/Definition.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:50 UTC
 * Dependency: ../../TypeConverter/Task.js, ../../Utility/CreateEventStream.js, ../Cancellation.js, ../IPC/Service.js, ./RPCHandlers/ProvideTasks.js, ./Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
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
import { CancellationLive } from "../Cancellation.js";
import IPCService from "../IPC/Service.js";
import ProvideTasks from "./RPCHandlers/ProvideTasks.js";
import type Service from "./Service.js";

let HandleCounter = 0;

/**
 * An Effect that builds the live implementation of the Task service.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const TaskProviders = yield* Ref.make(new Map<number, any>());

	// --- RPC Handlers ---
	IPC.RegisterInvokeHandler("$provideTasks", ([Handle, TokenID]) =>
		Effect.runPromise(
			ProvideTasks(TaskProviders, Handle, TokenID).pipe(
				Effect.provide(CancellationLive),
			),
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
					Ref.update(TaskProviders, (Map) =>
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
						TaskProviders,
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
