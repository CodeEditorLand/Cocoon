/**
 * @module Definition (Task)
 * @description The live implementation of the Tasks service.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable } from "vscode";

import { Task as TaskConverter } from "../../TypeConverter/Task.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
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
	yield* IPC.RegisterInvokeHandler("$provideTasks", ([Handle, TokenID]) =>
		Effect.runPromise(ProvideTasks(TaskProviders, Handle, TokenID)),
	);

	// --- Event Emitters ---
	const OnDidStartTaskEvent = CreateEventStream<any>();
	const OnDidEndTaskEvent = CreateEventStream<any>();
	const OnDidStartTaskProcessEvent = CreateEventStream<any>();
	const OnDidEndTaskProcessEvent = CreateEventStream<any>();

	const TaskImplementation: Service = {
		onDidStartTask: OnDidStartTaskEvent.event,
		onDidEndTask: OnDidEndTaskEvent.event,
		onDidStartTaskProcess: OnDidStartTaskProcessEvent.event,
		onDidEndTaskProcess: OnDidEndTaskProcessEvent.event,
		taskExecutions: [],

		RegisterTaskProvider: (
			Type,
			Provider,
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

		FetchTasks: (Filter) =>
			IPC.SendRequest<any[]>("$fetchTasks", [Filter]).pipe(
				Effect.map((DTOs) =>
					DTOs.map((DTO) => TaskConverter.ToAPI(DTO)),
				),
			),

		ExecuteTask: (TaskToExecute, Extension) =>
			IPC.SendRequest<any>("$executeTask", [
				TaskConverter.FromAPI(TaskToExecute, Extension),
			]).pipe(
				Effect.map((DTO) =>
					TaskConverter.Execution.ToAPI(DTO, TaskToExecute),
				),
			),
	};

	return TaskImplementation;
});
