/**
 * @module Task (TypeConverter)
 * @description Implements type converters for `vscode.Task` and related types.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import { Task, TaskExecution } from "../Type/ExtHostTypes.js";

export const FromAPI = (
	task: VSCode.Task,
	extension: IExtensionDescription,
): any /* ITaskDTO */ => {
	const definition: VSCode.TaskDefinition = task.definition;
	const execution =
		task.execution && "value" in task.execution
			? task.execution.value
			: task.execution;

	const result: any = {
		_id: task._id,
		definition: {
			type: definition.type,
			...definition,
		},
		name: task.name,
		source: {
			id: extension.identifier.value,
			label: task.source,
			scope: task.scope,
		},
		execution: undefined,
		isBackground: task.isBackground,
		group: task.group?.id,
		presentationOptions: task.presentationOptions,
		problemMatchers: task.problemMatchers,
		hasDefinedMatchers: task.hasDefinedMatchers,
	};

	if (execution) {
		// This part would need to convert ProcessExecution, ShellExecution, etc.
		// For now, it's a simplified placeholder.
		result.execution = {
			...execution,
		};
	}
	return result;
};

export const ToAPI = (DTO: any /* ITaskDTO */): VSCode.Task => {
	// A real implementation would need to revive the execution object properly.
	const execution = DTO.execution
		? new (ExtHostTypes as any).ProcessExecution(
				DTO.execution.process,
				DTO.execution.args,
				DTO.execution.options,
			)
		: undefined;

	return new Task(
		DTO.definition,
		DTO.source.scope,
		DTO.source.label,
		DTO.source.id,
		execution,
		DTO.problemMatchers,
	);
};

const Execution = {
	ToAPI(
		DTO: any, // ITaskExecutionDTO
		task: VSCode.Task,
	): VSCode.TaskExecution {
		return {
			task,
			terminate: () => {
				/* send ipc to terminate */
			},
		};
	},
};

export default {
	FromAPI,
	ToAPI,
	Execution,
};
