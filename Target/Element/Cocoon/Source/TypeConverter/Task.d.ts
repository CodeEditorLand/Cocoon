/**
 * @module Task
 * @description Implements type converters for `vscode.Task` and related types.
 */
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
export declare const FromAPI: (TaskToConvert: VSCode.Task, Extension: IExtensionDescription) => any;
export declare const ToAPI: (DTO: any) => VSCode.Task;
export declare const ExecutionToAPI: (_DTO: any, TaskToExecute: VSCode.Task) => VSCode.TaskExecution;
