/**
 * @module CodeAction (TypeConverter)
 * @description Implements type converters for `vscode.CodeAction` and related types,
 * translating between the rich API objects and their serializable DTOs for IPC.
 */

import { DisposableStore } from "vs/base/common/lifecycle.js";
import type { IURITransformer } from "vs/base/common/uriIpc.js";
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import type * as Vscode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Commands as CommandsConverter } from "./Commands.js";
import { Diagnostic as DiagnosticConverter } from "./Diagnostic.js";
import {
	WorkspaceEdit as WorkspaceEditConverter,
	type IVersionInformationProvider,
} from "./WorkspaceEdit.js";

// --- Namespace for CodeActionKind ---
export namespace CodeActionKind {
	export const toApi = (kind: string): Vscode.CodeActionKind =>
		new ExtHostTypes.CodeActionKind(kind);
	export const fromApi = (kind: Vscode.CodeActionKind): string => kind.value;
}

// --- Namespace for CodeActionTriggerKind ---
export namespace CodeActionTriggerKind {
	export const toApi = (
		trigger: Languages.CodeActionTriggerType,
	): Vscode.CodeActionTriggerKind =>
		trigger === Languages.CodeActionTriggerType.Invoke
			? ExtHostTypes.CodeActionTriggerKind.Invoke
			: ExtHostTypes.CodeActionTriggerKind.Automatic;
}

// --- Namespace for CodeActionContext ---
export namespace CodeActionContext {
	export const toApi = (
		dto: ExtHostProtocol.ExtHostCodeActionContextDto,
		uriTransformer?: IURITransformer,
	): Vscode.CodeActionContext => ({
		diagnostics: dto.diagnostics.map((diag) =>
			DiagnosticConverter.toApi(diag, uriTransformer),
		),
		only: dto.only ? CodeActionKind.toApi(dto.only) : undefined,
		triggerKind: dto.trigger
			? CodeActionTriggerKind.toApi(dto.trigger)
			: ExtHostTypes.CodeActionTriggerKind.Invoke,
	});
}

// --- Namespace for CodeAction ---
export namespace CodeAction {
	export const fromApi = (
		action: Vscode.CodeAction,
		commandsConverter: CommandsConverter.Interface,
		disposables: DisposableStore,
		uriTransformer?: IURITransformer,
		versionProvider?: IVersionInformationProvider,
	): ExtHostProtocol.ICodeActionDto => ({
		title: action.title,
		kind: action.kind ? CodeActionKind.fromApi(action.kind) : undefined,
		isPreferred: action.isPreferred,
		disabled: action.disabled?.reason,
		command: action.command
			? commandsConverter.ToInternal(action.command, disposables)
			: undefined,
		diagnostics: action.diagnostics
			? DiagnosticConverter.fromApiArray(
					action.diagnostics,
					uriTransformer,
				)
			: undefined,
		edit: action.edit
			? WorkspaceEditConverter.fromApi(
					action.edit,
					versionProvider,
					commandsConverter,
					disposables,
					uriTransformer,
				)
			: undefined,
	});

	export const toApi = (
		dto: ExtHostProtocol.ICodeActionDto,
		commandsConverter: CommandsConverter.Interface,
		uriTransformer?: IURITransformer,
	): Vscode.CodeAction => {
		const action = new ExtHostTypes.CodeAction(
			dto.title,
			dto.kind ? CodeActionKind.toApi(dto.kind) : undefined,
		);
		action.command = dto.command
			? commandsConverter.FromInternal(dto.command)
			: undefined;
		action.diagnostics = dto.diagnostics?.map((d) =>
			DiagnosticConverter.toApi(d, uriTransformer),
		);
		action.edit = dto.edit
			? WorkspaceEditConverter.toApi(
					dto.edit,
					uriTransformer,
					commandsConverter,
				)
			: undefined;
		action.isPreferred = dto.isPreferred;
		if (dto.disabled) {
			action.disabled = { reason: dto.disabled };
		}
		return action;
	};
}
