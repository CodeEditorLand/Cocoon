/**
 * @module Handler/VscodeAPI/TasksNamespace
 * @description
 * Factory for the vscode.tasks namespace shim. Bridges provider registration
 * and execution to Mountain via `register_task_provider`, `execute_task`,
 * `terminate_task` gRPC RPCs. Task lifecycle events arrive through
 * `Context.Emitter` on `"task.*"` channels.
 */

import type { HandlerContext } from "../HandlerContext.js";
import { NextProviderHandle } from "../../LanguageProviderRegistry.js";
import WrapTasksNamespace from "./WrapTasksNamespace.js";

const EventSubscriber =
	(Context: HandlerContext, EventName: string) =>
	(Listener: (...Arguments: any[]) => any) => {
		Context.Emitter.on(EventName, Listener);
		return {
			dispose: () => {
				Context.Emitter.off(EventName, Listener);
			},
		};
	};

const CreateTasksNamespace = (Context: HandlerContext) => WrapTasksNamespace({
	registerTaskProvider: (TaskType: string, _Provider: unknown) => {
		const Handle = NextProviderHandle();
		Context.SendToMountain("register_task_provider", {
			handle: Handle,
			taskType: TaskType,
			extensionId: "",
		}).catch(() => {});
		return {
			dispose: () => {
				Context.SendToMountain("unregister_task_provider", {
					handle: Handle,
				}).catch(() => {});
			},
		};
	},

	fetchTasks: async (Filter?: unknown): Promise<unknown[]> => {
		try {
			const Response = await Context.MountainClient?.sendRequest(
				"Task.Fetch",
				[Filter],
			);
			return Array.isArray(Response) ? Response : [];
		} catch {
			return [];
		}
	},

	executeTask: async (Task: unknown): Promise<unknown> => {
		try {
			return await Context.MountainClient?.sendRequest("Task.Execute", [
				Task,
			]);
		} catch {
			return undefined;
		}
	},

	onDidStartTask: EventSubscriber(Context, "task.didStart"),
	onDidEndTask: EventSubscriber(Context, "task.didEnd"),
	onDidStartTaskProcess: EventSubscriber(Context, "task.didStartProcess"),
	onDidEndTaskProcess: EventSubscriber(Context, "task.didEndProcess"),

	taskExecutions: [] as unknown[],
});

export default CreateTasksNamespace;
