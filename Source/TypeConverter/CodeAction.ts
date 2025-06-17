/*
 * File: Cocoon/Source/TypeConverter/CodeAction.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:07 UTC
 * Dependency: ./Command/Definition.js, ./Diagnostic.js, vs/base/common/lifecycle.js, vs/editor/common/languages.js, vscode
 */

/**
 * @module CodeAction (TypeConverter)
 * @description Implements type converters for `vscode.CodeAction` and related types,
 * translating between the rich API objects and their serializable DTOs for IPC.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import type * as VSCode from "vscode";
import {
	CodeAction as VscCodeAction,
	CodeActionTriggerKind as VscCodeActionTriggerKind,
} from "vscode";

import type CommandConverterDefinition from "./Command/Definition.js";
import { default as DiagnosticConverter } from "./Diagnostic.js";
import WorkSpaceEditConverter, {
	type IVersionInformationProvider,
} from "./WorkSpaceEdit.js";

// Placeholder DTOs based on usage
interface ExtHostCodeActionContext {
	diagnostics: any[];
	only?: string;
	trigger?: Languages.CodeActionTriggerType;
}
interface ICodeActionDto {
	title: string;
	kind?: string;
	isPreferred?: boolean;
	disabled?: string;
	command?: any;
	diagnostics?: any[];
	edit?: any;
}

const CodeActionKind = {
	ToAPI: (kind: string): VSCode.CodeActionKind => {
		// The constructor is reported as private, so we cannot use `new VscCodeActionKind(kind)`.
		// We'll create a structurally-compatible object instead.
		// This assumes the consumer only cares about the .value property.
		return { value: kind } as VSCode.CodeActionKind;
	},
	FromAPI: (kind: VSCode.CodeActionKind): string => {
		return kind.value;
	},
};

const CodeActionTriggerKind = {
	ToAPI: (
		trigger: Languages.CodeActionTriggerType,
	): VSCode.CodeActionTriggerKind => {
		return trigger === Languages.CodeActionTriggerType.Invoke
			? VscCodeActionTriggerKind.Invoke
			: VscCodeActionTriggerKind.Automatic;
	},
};

const CodeActionContext = {
	ToAPI: (dto: ExtHostCodeActionContext): VSCode.CodeActionContext => ({
		diagnostics: dto.diagnostics.map((diagnostic) =>
			DiagnosticConverter.ToAPI(diagnostic),
		),
		only: dto.only ? CodeActionKind.ToAPI(dto.only) : undefined,
		triggerKind: dto.trigger
			? CodeActionTriggerKind.ToAPI(dto.trigger)
			: VscCodeActionTriggerKind.Invoke,
	}),
};

const CodeAction = {
	FromAPI: (
		action: VSCode.CodeAction,
		commandsConverter: CommandConverterDefinition,
		disposables: IDisposable[],
		versionProvider?: IVersionInformationProvider,
	): ICodeActionDto => {
		return {
			title: action.title,
			kind: action.kind ? CodeActionKind.FromAPI(action.kind) : undefined,
			isPreferred: action.isPreferred,
			disabled: action.disabled?.reason,
			command: action.command
				? commandsConverter.ToInternal(action.command, disposables)
				: undefined,
			diagnostics: action.diagnostics
				? DiagnosticConverter.FromAPIArray(action.diagnostics)
				: undefined,
			edit: action.edit
				? WorkSpaceEditConverter.FromAPI(action.edit, versionProvider)
				: undefined,
		};
	},

	ToAPI: (
		dto: ICodeActionDto,
		commandsConverter: CommandConverterDefinition,
	): VSCode.CodeAction => {
		const Action = new VscCodeAction(
			dto.title,
			dto.kind ? CodeActionKind.ToAPI(dto.kind) : undefined,
		);
		Action.command = dto.command
			? commandsConverter.FromInternal(dto.command)
			: undefined;
		Action.diagnostics = dto.diagnostics?.map((diagnostic) =>
			DiagnosticConverter.ToAPI(diagnostic),
		);
		Action.edit = dto.edit
			? WorkSpaceEditConverter.ToAPI(dto.edit)
			: undefined;
		Action.isPreferred = dto.isPreferred;
		if (dto.disabled) {
			Action.disabled = { reason: dto.disabled };
		}
		return Action;
	},
};

export default {
	CodeActionKind,
	CodeActionTriggerKind,
	CodeActionContext,
	CodeAction,
};
