/**
 * @module CodeAction (TypeConverter)
 * @description Implements type converters for `vscode.CodeAction` and related types,
 * translating between the rich API objects and their serializable DTOs for IPC.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
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
	ToAPI: (Kind: string): VSCode.CodeActionKind => {
		return new (ExtHostTypes as any).CodeActionKind(Kind);
	},
	FromAPI: (Kind: VSCode.CodeActionKind): string => {
		return Kind.value;
	},
};

const CodeActionTriggerKind = {
	ToAPI: (
		Trigger: Languages.CodeActionTriggerType,
	): VSCode.CodeActionTriggerKind => {
		return Trigger === Languages.CodeActionTriggerType.Invoke
			? (ExtHostTypes as any).CodeActionTriggerKind.Invoke
			: (ExtHostTypes as any).CodeActionTriggerKind.Automatic;
	},
};

const CodeActionContext = {
	ToAPI: (DTO: ExtHostCodeActionContext): VSCode.CodeActionContext => ({
		diagnostics: DTO.diagnostics.map((Diagnostic) =>
			DiagnosticConverter.ToAPI(Diagnostic),
		),
		only: DTO.only ? CodeActionKind.ToAPI(DTO.only) : undefined,
		triggerKind: DTO.trigger
			? CodeActionTriggerKind.ToAPI(DTO.trigger)
			: (ExtHostTypes as any).CodeActionTriggerKind.Invoke,
	}),
};

const CodeAction = {
	FromAPI: (
		Action: VSCode.CodeAction,
		CommandsConverter: CommandConverterDefinition,
		Disposables: IDisposable[],
		VersionProvider?: IVersionInformationProvider,
	): ICodeActionDto => {
		return {
			title: Action.title,
			kind: Action.kind ? CodeActionKind.FromAPI(Action.kind) : undefined,
			isPreferred: Action.isPreferred,
			disabled: Action.disabled?.reason,
			command: Action.command
				? CommandsConverter.ToInternal(Action.command, Disposables)
				: undefined,
			diagnostics: Action.diagnostics
				? DiagnosticConverter.FromAPIArray(Action.diagnostics)
				: undefined,
			edit: Action.edit
				? WorkSpaceEditConverter.FromAPI(Action.edit, VersionProvider)
				: undefined,
		};
	},

	ToAPI: (
		DTO: ICodeActionDto,
		CommandsConverter: CommandConverterDefinition,
	): VSCode.CodeAction => {
		const Action = new (ExtHostTypes as any).CodeAction(
			DTO.title,
			DTO.kind ? CodeActionKind.ToAPI(DTO.kind) : undefined,
		);
		Action.command = DTO.command
			? CommandsConverter.FromInternal(DTO.command)
			: undefined;
		Action.diagnostics = DTO.diagnostics?.map((Diagnostic) =>
			DiagnosticConverter.ToAPI(Diagnostic),
		);
		Action.edit = DTO.edit
			? WorkSpaceEditConverter.ToAPI(DTO.edit)
			: undefined;
		Action.isPreferred = DTO.isPreferred;
		if (DTO.disabled) {
			Action.disabled = { reason: DTO.disabled };
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
