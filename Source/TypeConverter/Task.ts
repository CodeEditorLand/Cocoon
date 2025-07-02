/**
 * @module Task
 * @description Implements type converters for `vscode.Task` and related types.
 */

import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import {
	Task as ExtHostTask,
	ProcessExecution,
} from "../Platform/VSCode/Type.js";

export const FromAPI = (
	TaskToConvert: VSCode.Task,
	Extension: IExtensionDescription,
): any /* ITaskDTO */ => {
	const Definition: VSCode.TaskDefinition = TaskToConvert.definition;
	const Execution = TaskToConvert.execution;
	const Result: any = {
		_id: (TaskToConvert as any)._id,
		definition: { ...Definition, type: Definition.type },
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
		Result.execution = { ...(Execution as any) };
	}
	return Result;
};

export const ToAPI = (DTO: any /* ITaskDTO */): VSCode.Task => {
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
		DTO.name,
		DTO.source.label,
		Execution,
		DTO.problemMatchers,
	);
	(ConvertedTask as any)._id = DTO._id;
	return ConvertedTask;
};

export const ExecutionToAPI = (
	_DTO: any,
	TaskToExecute: VSCode.Task,
): VSCode.TaskExecution => {
	return {
		task: TaskToExecute,
		terminate: () => {},
	};
};
