/**
 * @module CodeAction (TypeConverter)
 * @description Implements type converters for `vscode.CodeAction` and related types,
 * translating between the rich API objects and their serializable DTOs for IPC.
 */

import { DisposableStore } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import type * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as CommandConverter from "./Command.js";
import * as DiagnosticConverter from "./Diagnostic.js";
import {
	WorkSpaceEdit as WorkSpaceEditConverter,
	type IVersionInformationProvider,
} from "./WorkSpaceEdit.js";

// --- Namespace for CodeActionKind ---
export namespace CodeActionKind {
	export function ToAPI(kind: string): VSCode.CodeActionKind {
		return new ExtHostTypes.CodeActionKind(kind);
	}
	export function FromAPI(kind: VSCode.CodeActionKind): string {
		return kind.value;
	}
}

// --- Namespace for CodeActionTriggerKind ---
export namespace CodeActionTriggerKind {
	export function ToAPI(
		trigger: Languages.CodeActionTriggerType,
	): VSCode.CodeActionTriggerKind {
		return trigger === Languages.CodeActionTriggerType.Invoke
			? ExtHostTypes.CodeActionTriggerKind.Invoke
			: ExtHostTypes.CodeActionTriggerKind.Automatic;
	}
}

// --- Namespace for CodeActionContext ---
export namespace CodeActionContext {
	export function ToAPI(
		DTO: ExtHostProtocol.ExtHostCodeActionContext,
	): VSCode.CodeActionContext {
		return {
			diagnostics: DTO.diagnostics.map((diag) =>
				DiagnosticConverter.ToAPI(diag),
			),
			only: DTO.only ? CodeActionKind.ToAPI(DTO.only) : undefined,
			triggerKind: DTO.trigger
				? CodeActionTriggerKind.ToAPI(DTO.trigger)
				: ExtHostTypes.CodeActionTriggerKind.Invoke,
		};
	}
}

// --- Namespace for CodeAction ---
export namespace CodeAction {
	export function FromAPI(
		Action: VSCode.CodeAction,
		CommandsConverter: CommandConverter.Interface,
		Disposables: DisposableStore,
		VersionProvider?: IVersionInformationProvider,
	): ExtHostProtocol.ICodeActionDto {
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
	}

	export function ToAPI(
		DTO: ExtHostProtocol.ICodeActionDto,
		CommandsConverter: CommandConverter.Interface,
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
	}
}
