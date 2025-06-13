/**
 * @module Definition (Tasks)
 * @description The live implementation of the Tasks service.
 */

import { Effect, Ref, Stream } from "effect";
import { Disposable } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPCProvider } from "../IPC.js";
import { ProvideTasks } from "./RPCHandlers/ProvideTasks.js";
import type { Interface } from "./Service.js";

// ... import other RPC handlers

let HandleCounter = 0;

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const TaskProviders = yield* _(Ref.make(new Map<number, any>()));

	// --- Register RPC Handlers ---
	IPC.RegisterInvokeHandler("$provideTasks", ([handle]) =>
		Effect.runPromise(ProvideTasks(TaskProviders, handle)),
	);
	// ... register handlers for $resolveTask, etc. ...

	const OnDidStartTaskEvent = CreateEventStream<any>();
	const OnDidEndTaskEvent = CreateEventStream<any>();

	const ServiceImplementation: Interface = {
		onDidStartTask: OnDidStartTaskEvent.Stream.pipe(Stream.toEvent),
		onDidEndTask: OnDidEndTaskEvent.Stream.pipe(Stream.toEvent),

		RegisterTaskProvider: (Type, Provider, Extension) =>
			Effect.acquireRelease(
				Effect.sync(() => {
					const Handle = ++HandleCounter;
					Ref.update(TaskProviders, (map) =>
						map.set(Handle, { Type, Provider, Extension }),
					).pipe(Effect.runSync);
					IPC.SendNotification("$registerTaskProvider", [
						Handle,
						Type,
					]).pipe(Effect.runFork);
					return new Disposable(() =>
						IPC.SendNotification("$unregisterTaskProvider", [
							Handle,
						]).pipe(Effect.runFork),
					);
				}),
				(disposable) => Effect.sync(() => disposable.dispose()),
			),

		FetchTasks: (Filter) =>
			IPC.SendRequest<any[]>("$fetchTasks", [Filter]).pipe(
				Effect.map((dtos) =>
					dtos.map((dto) => TypeConverter.Task.toAPI(dto)),
				),
			),

		ExecuteTask: (TaskToExecute, Extension) =>
			IPC.SendRequest<any>("$executeTask", [
				TypeConverter.Task.fromAPI(TaskToExecute, Extension),
			]).pipe(
				Effect.map((dto) =>
					TypeConverter.TaskExecution.toAPI(dto, TaskToExecute),
				),
			),
	};

	return ServiceImplementation;
});
