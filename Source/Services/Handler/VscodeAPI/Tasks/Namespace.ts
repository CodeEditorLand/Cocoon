/**
 * @module Handler/VscodeAPI/TasksNamespace
 * @description
 * Factory for the vscode.tasks namespace shim. Bridges provider registration
 * and execution to Mountain via `register_task_provider`, `execute_task`,
 * `terminate_task` gRPC RPCs. Task lifecycle events arrive through
 * `Context.Emitter` on `"task.*"` channels.
 */

import { NextProviderHandle } from "../../../Language/Provider/Registry.js";
import type { HandlerContext } from "../../Handler/Context.js";
import WrapTasksNamespace from "../Wrap/Tasks/Namespace.js";

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

const CreateTasksNamespace = (Context: HandlerContext) => {
	// Track active task executions. VS Code's `vscode.tasks.taskExecutions`
	// is a live array reflecting every running TaskExecution. Extensions
	// (Mocha, Jest, Cargo runners) read this to skip launching duplicate
	// tasks. Mountain fires `task.didStart` / `task.didEnd` notifications
	// so we keep the array in sync.
	const Executions = new Map<string, unknown>();

	Context.Emitter.on(
		"task.didStart",

		(Event: { execution?: { id?: string }; id?: string }) => {
			const Id = String(Event?.execution?.id ?? Event?.id ?? "");

			if (Id && Event?.execution) {
				Executions.set(Id, Event.execution);
			}
		},
	);

	Context.Emitter.on(
		"task.didEnd",

		(Event: { execution?: { id?: string }; id?: string }) => {
			const Id = String(Event?.execution?.id ?? Event?.id ?? "");

			if (Id) {
				Executions.delete(Id);
			}
		},
	);

	return WrapTasksNamespace({
		registerTaskProvider: (TaskType: string, Provider: unknown) => {
			const Handle = NextProviderHandle();

			Context.SendToMountain("register_task_provider", {
				handle: Handle,
				type: TaskType,
				extensionId: "",
			}).catch(() => {});

			const ProviderKey = `__taskProvider:${Handle}`;

			Context.ExtensionRegistry.set(ProviderKey, Provider);

			return {
				dispose: () => {
					Context.ExtensionRegistry.delete(ProviderKey);

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

		// Return a real TaskExecution object: `{ task, terminate() }`.
		// Extensions chain `.terminate()` on the returned value when they
		// need to kill a long-running task (test runners cancelling a
		// previous run before launching a new one). A bare null silently
		// breaks this pattern.
		executeTask: async (Task: unknown): Promise<unknown> => {
			try {
				const Response = await Context.MountainClient?.sendRequest(
					"Task.Execute",

					[Task],
				);

				const Resolved = Response as
					| { id?: string; task?: unknown }
					| undefined;

				const TaskId = String(Resolved?.id ?? "");

				const Execution = {
					task: Resolved?.task ?? Task,
					terminate: () => {
						Context.SendToMountain("terminate_task", {
							id: TaskId,
						}).catch(() => {});

						Executions.delete(TaskId);
					},
				};

				if (TaskId) Executions.set(TaskId, Execution);

				return Execution;
			} catch {
				return undefined;
			}
		},

		onDidStartTask: EventSubscriber(Context, "task.didStart"),
		onDidEndTask: EventSubscriber(Context, "task.didEnd"),
		onDidStartTaskProcess: EventSubscriber(Context, "task.didStartProcess"),
		onDidEndTaskProcess: EventSubscriber(Context, "task.didEndProcess"),

		// Live getter so iteration sees current executions, not the
		// snapshot at module-construction time.
		get taskExecutions() {
			return Array.from(Executions.values());
		},
	});
};

export default CreateTasksNamespace;
