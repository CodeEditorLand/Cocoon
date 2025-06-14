/**
 * @module CodeAction (TypeConverter)
 * @description Implements type converters for `vscode.CodeAction` and related types,
 * translating between the rich API objects and their serializable DTOs for IPC.
 */

import type { DisposableStore } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import type CommandConverter from "./Command/Definition.js";
import * as DiagnosticConverter from "./Diagnostic.js";
import WorkSpaceEditConverter from "./WorkSpaceEdit.js";

// Placeholders
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
	ToAPI(kind: string): VSCode.CodeActionKind {
		return new ExtHostTypes.CodeActionKind(kind);
	},
	FromAPI(kind: VSCode.CodeActionKind): string {
		return kind.value;
	},
};

const CodeActionTriggerKind = {
	ToAPI(
		trigger: Languages.CodeActionTriggerType,
	): VSCode.CodeActionTriggerKind {
		return trigger === Languages.CodeActionTriggerType.Invoke
			? ExtHostTypes.CodeActionTriggerKind.Invoke
			: ExtHostTypes.CodeActionTriggerKind.Automatic;
	},
};

export default {
	CodeActionKind,
	CodeActionTriggerKind,
	CodeActionContext: {
		ToAPI(DTO: ExtHostCodeActionContext): VSCode.CodeActionContext {
			return {
				diagnostics: DTO.diagnostics.map((diag) =>
					DiagnosticConverter.ToAPI(diag),
				),
				only: DTO.only ? CodeActionKind.ToAPI(DTO.only) : undefined,
				triggerKind: DTO.trigger
					? CodeActionTriggerKind.ToAPI(DTO.trigger)
					: ExtHostTypes.CodeActionTriggerKind.Invoke,
			};
		},
	},
	CodeAction: {
		FromAPI(
			Action: VSCode.CodeAction,
			CommandsConverter: CommandConverter,
			Disposables: DisposableStore,
			VersionProvider?: WorkSpaceEditConverter.IVersionInformationProvider,
		): ICodeActionDto {
			return {
				title: Action.title,
				kind: Action.kind
					? CodeActionKind.FromAPI(Action.kind)
					: undefined,
				isPreferred: Action.isPreferred,
				disabled: Action.disabled?.reason,
				command: Action.command
					? CommandsConverter.ToInternal(Action.command, Disposables)
					: undefined,
				diagnostics: Action.diagnostics
					? DiagnosticConverter.FromAPIArray(Action.diagnostics)
					: undefined,
				edit: Action.edit
					? WorkSpaceEditConverter.FromAPI(
							Action.edit,
							VersionProvider,
						)
					: undefined,
			};
		},

		ToAPI(
			DTO: ICodeActionDto,
			CommandsConverter: CommandConverter,
		): VSCode.CodeAction {
			const action = new ExtHostTypes.CodeAction(
				DTO.title,
				DTO.kind ? CodeActionKind.ToAPI(DTO.kind) : undefined,
			);
			action.command = DTO.command
				? CommandsConverter.FromInternal(DTO.command)
				: undefined;
			action.diagnostics = DTO.diagnostics?.map((d) =>
				DiagnosticConverter.ToAPI(d),
			);
			action.edit = DTO.edit
				? WorkSpaceEditConverter.ToAPI(DTO.edit)
				: undefined;
			action.isPreferred = DTO.isPreferred;
			if (DTO.disabled) {
				action.disabled = { reason: DTO.disabled };
			}
			return action;
		},
	},
};
