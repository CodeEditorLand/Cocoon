/**
 * @module Definition (Task)
 * @description The live implementation of the Tasks service.
 */

import { Effect, Ref } from "effect";
import { Disposable } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { ProvideTasks } from "./RPCHandlers/ProvideTasks.js";
import type { Interface } from "./Service.js";

let HandleCounter = 0;

export const Definition = Effect.gen(function* () {
	const IPCService = yield* IPC.Tag;
	const TaskProviders = yield* Ref.make(new Map<number, any>());

	IPCService.RegisterInvokeHandler("$provideTasks", ([handle, tokenID]) =>
		ProvideTasks(TaskProviders, handle, tokenID),
	);

	const OnDidStartTaskEvent = CreateEventStream<any>();
	const OnDidEndTaskEvent = CreateEventStream<any>();
	const OnDidStartTaskProcessEvent = CreateEventStream<any>();
	const OnDidEndTaskProcessEvent = CreateEventStream<any>();

	const ServiceImplementation: Interface = {
		onDidStartTask: OnDidStartTaskEvent.event,
		onDidEndTask: OnDidEndTaskEvent.event,
		onDidStartTaskProcess: OnDidStartTaskProcessEvent.event,
		onDidEndTaskProcess: OnDidEndTaskProcessEvent.event,
		taskExecutions: [],

		RegisterTaskProvider: (Type, Provider, Extension) =>
			Effect.sync(() => {
				const Handle = ++HandleCounter;
				Effect.runSync(
					Ref.update(TaskProviders, (map) =>
						map.set(Handle, { Type, Provider, Extension }),
					),
				);

				Effect.runFork(
					IPCService.SendNotification("$registerTaskProvider", [
						Handle,
						Type,
					]),
				);

				return new Disposable(() => {
					Effect.runSync(
						Ref.update(
							TaskProviders,
							(map) => (map.delete(Handle), map),
						),
					);
					Effect.runFork(
						IPCService.SendNotification("$unregisterTaskProvider", [
							Handle,
						]),
					);
				});
			}),

		FetchTasks: (Filter) =>
			IPCService.SendRequest<any[]>("$fetchTasks", [Filter]).pipe(
				Effect.map((dtos) =>
					dtos.map((dto) => TypeConverter.Task.ToAPI(dto)),
				),
			),

		ExecuteTask: (TaskToExecute, Extension) =>
			IPCService.SendRequest<any>("$executeTask", [
				TypeConverter.Task.FromAPI(TaskToExecute, Extension),
			]).pipe(
				Effect.map((dto) =>
					TypeConverter.Task.Execution.ToAPI(dto, TaskToExecute),
				),
			),
	};

	return ServiceImplementation;
});
