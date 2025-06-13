/**
 * @module Definition (Task)
 * @description The live implementation of the Tasks service.
 */

import { Effect, Ref, Stream } from "effect";
import { Disposable } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { ProvideTasks } from "./RPCHandlers/ProvideTasks.js";
// ... import other RPC handlers like ResolveTask
import type { Interface } from "./Service.js";

let HandleCounter = 0;

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const TaskProviders = yield* _(Ref.make(new Map<number, any>()));

	// --- Register RPC Handlers ---
	IPCService.RegisterInvokeHandler("$provideTasks", ([handle, tokenID]) =>
		Effect.runPromise(ProvideTasks(TaskProviders, handle, tokenID)),
	);
	// ... register handlers for $resolveTask, etc. ...

	const OnDidStartTaskEvent = CreateEventStream<any>();
	const OnDidEndTaskEvent = CreateEventStream<any>();
	const OnDidStartTaskProcessEvent = CreateEventStream<any>();
	const OnDidEndTaskProcessEvent = CreateEventStream<any>();

	const ServiceImplementation: Interface = {
		onDidStartTask: OnDidStartTaskEvent.Stream.pipe(Stream.toEvent),
		onDidEndTask: OnDidEndTaskEvent.Stream.pipe(Stream.toEvent),
		onDidStartTaskProcess: OnDidStartTaskProcessEvent.Stream.pipe(
			Stream.toEvent,
		),
		onDidEndTaskProcess: OnDidEndTaskProcessEvent.Stream.pipe(
			Stream.toEvent,
		),
		taskExecutions: [], // This would be managed by state from the host

		RegisterTaskProvider: (Type, Provider, Extension) =>
			Effect.sync(() => {
				const Handle = ++HandleCounter;
				Ref.update(TaskProviders, (map) =>
					map.set(Handle, { Type, Provider, Extension }),
				).pipe(Effect.runSync);

				IPCService.SendNotification("$registerTaskProvider", [
					Handle,
					Type,
				]).pipe(Effect.runFork);

				return new Disposable(() => {
					Ref.update(
						TaskProviders,
						(map) => (map.delete(Handle), map),
					).pipe(Effect.runSync);
					IPCService.SendNotification("$unregisterTaskProvider", [
						Handle,
					]).pipe(Effect.runFork);
				});
			}),

		FetchTasks: (Filter) =>
			IPCService.SendRequest<any[]>("$fetchTasks", [Filter]).pipe(
				Effect.map((dtos) =>
					dtos.map((dto) => TypeConverter.Task.toAPI(dto)),
				),
			),

		ExecuteTask: (TaskToExecute, Extension) =>
			IPCService.SendRequest<any>("$executeTask", [
				TypeConverter.Task.fromAPI(TaskToExecute, Extension),
			]).pipe(
				Effect.map((dto) =>
					TypeConverter.Task.Execution.toAPI(dto, TaskToExecute),
				),
			),
	};

	return ServiceImplementation;
});
