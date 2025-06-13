/**
 * @module CodeAction (TypeConverter)
 * @description Implements type converters for `vscode.CodeAction` and related types,
 * translating between the rich API objects and their serializable DTOs for IPC.
 */

import { DisposableStore } from "vs/base/common/lifecycle.js";
import type { IURITransformer } from "vs/base/common/uriIPC.js";
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Command as CommandConverter } from "./Command.js";
import { Diagnostic as DiagnosticConverter } from "./Diagnostic.js";
import {
	WorkSpaceEdit as WorkSpaceEditConverter,
	type IVersionInformationProvider,
} from "./WorkSpaceEdit.js";

// --- Namespace for CodeActionKind ---
export namespace CodeActionKind {
	export const toAPI = (kind: string): VSCode.CodeActionKind =>
		new ExtHostTypes.CodeActionKind(kind);
	export const fromAPI = (kind: VSCode.CodeActionKind): string => kind.value;
}

// --- Namespace for CodeActionTriggerKind ---
export namespace CodeActionTriggerKind {
	export const toAPI = (
		trigger: Languages.CodeActionTriggerType,
	): VSCode.CodeActionTriggerKind =>
		trigger === Languages.CodeActionTriggerType.Invoke
			? ExtHostTypes.CodeActionTriggerKind.Invoke
			: ExtHostTypes.CodeActionTriggerKind.Automatic;
}

// --- Namespace for CodeActionContext ---
export namespace CodeActionContext {
	export const toAPI = (
		dto: ExtHostProtocol.ExtHostCodeActionContextDTO,
		uriTransformer?: IURITransformer,
	): VSCode.CodeActionContext => ({
		diagnostics: dto.diagnostics.map((diag) =>
			DiagnosticConverter.toAPI(diag, uriTransformer),
		),
		only: dto.only ? CodeActionKind.toAPI(dto.only) : undefined,
		triggerKind: dto.trigger
			? CodeActionTriggerKind.toAPI(dto.trigger)
			: ExtHostTypes.CodeActionTriggerKind.Invoke,
	});
}

// --- Namespace for CodeAction ---
export namespace CodeAction {
	export const fromAPI = (
		action: VSCode.CodeAction,
		commandsConverter: CommandConverter.Interface,
		disposables: DisposableStore,
		uriTransformer?: IURITransformer,
		versionProvider?: IVersionInformationProvider,
	): ExtHostProtocol.ICodeActionDTO => ({
		title: action.title,
		kind: action.kind ? CodeActionKind.fromAPI(action.kind) : undefined,
		isPreferred: action.isPreferred,
		disabled: action.disabled?.reason,
		command: action.command
			? commandsConverter.ToInternal(action.command, disposables)
			: undefined,
		diagnostics: action.diagnostics
			? DiagnosticConverter.fromAPIArray(
					action.diagnostics,
					uriTransformer,
				)
			: undefined,
		edit: action.edit
			? WorkSpaceEditConverter.fromAPI(
					action.edit,
					versionProvider,
					commandsConverter,
					disposables,
					uriTransformer,
				)
			: undefined,
	});

	export const toAPI = (
		dto: ExtHostProtocol.ICodeActionDTO,
		commandsConverter: CommandConverter.Interface,
		uriTransformer?: IURITransformer,
	): VSCode.CodeAction => {
		const action = new ExtHostTypes.CodeAction(
			dto.title,
			dto.kind ? CodeActionKind.toAPI(dto.kind) : undefined,
		);
		action.command = dto.command
			? commandsConverter.FromInternal(dto.command)
			: undefined;
		action.diagnostics = dto.diagnostics?.map((d) =>
			DiagnosticConverter.toAPI(d, uriTransformer),
		);
		action.edit = dto.edit
			? WorkSpaceEditConverter.toAPI(
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
