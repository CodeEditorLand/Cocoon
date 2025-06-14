/**
 * @module Definition (Task)
 * @description The live implementation of the Tasks service.
 */

import { Context, Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable } from "vscode";

import * as TypeConverter from "../../TypeConverter/Task.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCServiceTag from "../IPC/Service.js";
import ProvideTasks from "./RPCHandlers/ProvideTasks.js";
import type TaskService from "./Service.js";

let HandleCounter = 0;

export default Effect.gen(function* (Yield) {
	const Ipc = yield* Yield(IPCServiceTag);
	const TaskProviders = yield* Yield(Ref.make(new Map<number, any>()));

	yield* Ipc.RegisterInvokeHandler("$provideTasks", ([Handle, TokenID]) =>
		ProvideTasks(TaskProviders, Handle, TokenID),
	);

	const OnDidStartTaskEvent = CreateEventStream<any>();
	const OnDidEndTaskEvent = CreateEventStream<any>();
	const OnDidStartTaskProcessEvent = CreateEventStream<any>();
	const OnDidEndTaskProcessEvent = CreateEventStream<any>();

	const ServiceImplementation: Context.Tag.Service<typeof TaskService> = {
		onDidStartTask: OnDidStartTaskEvent.Stream,
		onDidEndTask: OnDidEndTaskEvent.Stream,
		onDidStartTaskProcess: OnDidStartTaskProcessEvent.Stream,
		onDidEndTaskProcess: OnDidEndTaskProcessEvent.Stream,
		taskExecutions: [],

		RegisterTaskProvider: (
			Type,
			Provider,
			Extension: IExtensionDescription,
		) =>
			Effect.gen(function* () {
				const Handle = ++HandleCounter;
				yield* Ref.update(TaskProviders, (Map) =>
					Map.set(Handle, { Type, Provider, Extension }),
				);

				yield* Ipc.SendNotification("$registerTaskProvider", [
					Handle,
					Type,
				]);

				const CleanupEffect = Effect.gen(function* () {
					yield* Ref.update(
						TaskProviders,
						(Map) => (Map.delete(Handle), Map),
					);
					yield* Ipc.SendNotification("$unregisterTaskProvider", [
						Handle,
					]);
				});

				return new Disposable(() => {
					// This is the boundary where the Effect is run synchronously to comply with the VSCode API.
					Effect.runSync(CleanupEffect);
				});
			}),

		FetchTasks: (Filter) =>
			Ipc.SendRequest<any[]>("$fetchTasks", [Filter]).pipe(
				Effect.map((Dtos) =>
					Dtos.map((Dto) => TypeConverter.default.ToAPI(Dto)),
				),
			),

		ExecuteTask: (TaskToExecute, Extension) =>
			Ipc.SendRequest<any>("$executeTask", [
				TypeConverter.default.FromAPI(TaskToExecute, Extension),
			]).pipe(
				Effect.map((Dto) =>
					TypeConverter.default.Execution.ToAPI(Dto, TaskToExecute),
				),
			),
	};

	return ServiceImplementation;
});
