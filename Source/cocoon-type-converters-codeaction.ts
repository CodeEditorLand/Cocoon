/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters - CodeAction (cocoon-type-converters-codeaction.ts)
 * --------------------------------------------------------------------------------------------
 * Contains converters related to code actions.
 *--------------------------------------------------------------------------------------------*/

import { DisposableStore } from "vs/base/common/lifecycle";
import { IURITransformer } from "vs/base/common/uriIpc";
import * as languages from "vs/editor/common/languages";
import * as extHostProtocol from "vs/workbench/api/common/extHost.protocol";
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
import type * as vscode from "vscode";

import {
	DiagnosticConverter,
	Range,
	type CommandsConverter,
} from "./cocoon-type-converters-main"; // Assuming main file exports these
import {
	WorkspaceEdit,
	type WorkspaceEdit as WorkspaceEditConverterNS,
} from "./cocoon-type-converters-workspaceedit"; // Import WorkspaceEdit from its file

// --- CodeActionTriggerKind, CodeActionContext, CodeActionProviderMetadata ---
export namespace CodeActionTriggerKind {
	export function to(
		value: languages.CodeActionTriggerType,
	): vscode.CodeActionTriggerKind {
		switch (value) {
			case languages.CodeActionTriggerType.Invoke:
				return extHostTypes.CodeActionTriggerKind.Invoke;
			case languages.CodeActionTriggerType.Auto:
				return extHostTypes.CodeActionTriggerKind.Automatic;
		}
	}
}
export namespace CodeActionContext {
	export function toApiType(
		value: extHostProtocol.ExtHostCodeActionContextDto,
		uriTransformer?: IURITransformer,
	): vscode.CodeActionContext {
		return {
			diagnostics: value.diagnostics.map((data) =>
				DiagnosticConverter.toApi(data, uriTransformer),
			),
			only: value.only
				? new extHostTypes.CodeActionKind(value.only)
				: undefined,
			triggerKind: value.triggerKind
				? CodeActionTriggerKind.to(value.triggerKind)
				: undefined,
		};
	}
}
export namespace CodeActionProviderMetadata {
	export function toDto(
		metadata?: vscode.CodeActionProviderMetadata,
	): extHostProtocol.ICodeActionProviderMetadataDto | undefined {
		if (!metadata) return undefined;
		return {
			providedCodeActionKinds: metadata.providedCodeActionKinds?.map(
				(kind) => kind.value,
			),
			documentation: metadata.documentation?.map((doc) => ({
				value: doc.value,
				kind: doc.kind.value,
			})),
		};
	}
}

// --- CodeAction ---
export namespace CodeAction {
	export function from(
		action: vscode.CodeAction,
		commandsConverter: CommandsConverter,
		disposables: DisposableStore,
		uriTransformer?: IURITransformer,
		versionProvider?: WorkspaceEditConverterNS.IVersionInformationProvider,
	): extHostProtocol.ICodeActionDto {
		return {
			title: action.title,
			kind: action.kind?.value,
			isPreferred: action.isPreferred,
			isAI: (action as any).isAI,
			disabled: action.disabled?.reason,
			command: action.command
				? commandsConverter.toInternal(action.command, disposables)
				: undefined,
			diagnostics: action.diagnostics
				? DiagnosticConverter.fromApiArray(
						action.diagnostics,
						uriTransformer,
					)
				: undefined,
			edit: action.edit
				? WorkspaceEdit.fromApi(
						action.edit,
						versionProvider,
						commandsConverter,
						disposables,
						uriTransformer,
					)
				: undefined,
			ranges: (action as any).ranges?.map(
				(r: vscode.Range) => Range.from(r)!,
			),
		};
	}
	export function to(
		dto: extHostProtocol.ICodeActionDto,
		commandsConverter: CommandsConverter,
		uriTransformer?: IURITransformer,
	): vscode.CodeAction {
		const result = new extHostTypes.CodeAction(
			dto.title,
			dto.kind ? new extHostTypes.CodeActionKind(dto.kind) : undefined,
		);
		result.isPreferred = dto.isPreferred;
		if (dto.isAI) (result as any).isAI = dto.isAI;
		if (dto.disabled) result.disabled = { reason: dto.disabled };
		result.command = commandsConverter.fromInternal(dto.command);
		if (dto.diagnostics)
			result.diagnostics = DiagnosticConverter.toApiArray(
				dto.diagnostics as extHostProtocol.IMarkerData[],
				uriTransformer,
			);
		if (dto.edit)
			result.edit = WorkspaceEdit.toApi(
				dto.edit,
				uriTransformer,
				commandsConverter,
			);
		if (dto.ranges)
			(result as any).ranges = dto.ranges.map(
				(r) => Range.to(r as extHostProtocol.IRange)!,
			);
		return result;
	}
	export function fromList(
		list:
			| ReadonlyArray<vscode.Command | vscode.CodeAction>
			| vscode.ProviderResult<
					ReadonlyArray<vscode.Command | vscode.CodeAction>
			  >,
		cacheId: number,
		commandsConverter: CommandsConverter,
		listDisposables: DisposableStore,
		uriTransformer?: IURITransformer,
		versionProvider?: WorkspaceEditConverterNS.IVersionInformationProvider,
	): extHostProtocol.ICodeActionListDto | undefined {
		const actions = list as
			| ReadonlyArray<vscode.Command | vscode.CodeAction>
			| undefined
			| null;
		if (!actions || actions.length === 0) return undefined;
		const actionsDto: extHostProtocol.ICodeActionDto[] = actions.map(
			(item, i) => {
				let dto: extHostProtocol.ICodeActionDto;
				if (
					"title" in item &&
					("kind" in item ||
						"edit" in item ||
						"diagnostics" in item ||
						"isPreferred" in item)
				) {
					dto = CodeAction.from(
						item as vscode.CodeAction,
						commandsConverter,
						listDisposables,
						uriTransformer,
						versionProvider,
					);
				} else {
					const commandDto = commandsConverter.toInternal(
						item as vscode.Command,
						listDisposables,
					);
					dto = {
						title:
							commandDto?.title ||
							(item as vscode.Command).title ||
							"Untitled",
						command: commandDto,
						_isSynthetic: true,
					};
				}
				dto.cacheId = [cacheId, i];
				return dto;
			},
		);
		return { cacheId, actions: actionsDto };
	}
}
