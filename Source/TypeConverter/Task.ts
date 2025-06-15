/**
 * @module Task (TypeConverter)
 * @description Implements type converters for `vscode.Task` and related types.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

const FromAPI = (
	TaskToConvert: VSCode.Task,
	Extension: IExtensionDescription,
): any /* ITaskDTO */ => {
	const Definition: VSCode.TaskDefinition = TaskToConvert.definition;
	const Execution = TaskToConvert.execution;

	const Result: any = {
		_id: (TaskToConvert as any)._id,
		definition: {
			...Definition,
			type: Definition.type,
		},
		name: TaskToConvert.name,
		source: {
			id: Extension.identifier.value,
			label: TaskToConvert.source,
			scope: TaskToConvert.scope,
		},
		execution: undefined,
		isBackground: TaskToConvert.isBackground,
		group: TaskToConvert.group?.id,
		presentationOptions: TaskToConvert.presentationOptions,
		problemMatchers: TaskToConvert.problemMatchers,
		hasDefinedMatchers: (TaskToConvert as any).hasDefinedMatchers,
	};

	if (Execution) {
		// This part would need to convert ProcessExecution, ShellExecution, etc.
		// For now, it's a simplified placeholder.
		Result.execution = {
			...(Execution as any),
		};
	}
	return Result;
};

const ToAPI = (DTO: any /* ITaskDTO */): VSCode.Task => {
	// A real implementation would need to revive the execution object properly.
	const Execution = DTO.execution
		? new ProcessExecution(
				DTO.execution.process,
				DTO.execution.args,
				DTO.execution.options,
			)
		: undefined;

	const ConvertedTask = new ExtHostTask(
		DTO.definition,
		DTO.source.scope,
		DTO.source.label,
		DTO.source.id,
		Execution,
		DTO.problemMatchers,
	);
	(ConvertedTask as any)._id = DTO._id;
	return ConvertedTask;
};

const Execution = {
	ToAPI: (
		_DTO: any, // ITaskExecutionDTO
		TaskToExecute: VSCode.Task,
	): VSCode.TaskExecution => {
		return {
			task: TaskToExecute,
			terminate: () => {
				/* send ipc to terminate */
			},
		};
	},
};

export const Task = { FromAPI, ToAPI, Execution };
