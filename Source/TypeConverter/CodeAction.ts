/*
 * File: Cocoon/Source/TypeConverter/CodeAction.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-07 05:37:32 UTC
 * Dependency: ./Main, vs/base/common/lifecycle, vs/base/common/uriIpc, vs/editor/common/languages, vs/workbench/api/common/extHost.protocol, vs/workbench/api/common/extHostTypes, vscode
 * Export: ConvertFromApi, ConvertFromApiList, ConvertToApi, ConvertToApiType, ConvertToDto
 */

// Defines type converters for the CodeAction feature, handling transformations
// between the `vscode` API types and the internal DTOs used for IPC.

import { DisposableStore } from "vs/base/common/lifecycle";
import { IURITransformer } from "vs/base/common/uriIpc";
import * as Languages from "vs/editor/common/languages";
import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol";
import * as ExtHostTypes from "vs/workbench/api/common/extHostTypes";
import type * as vscode from "vscode";

import { DiagnosticConverter, Range, type CommandsConverter } from "./Main";
import {
	WorkspaceEdit,
	type WorkspaceEdit as WorkspaceEditConverterNamespace,
} from "./WorkspaceEdit";

export namespace CodeActionTriggerKind {
	export const ConvertToApi = (
		TriggerType: Languages.CodeActionTriggerType,
	): vscode.CodeActionTriggerKind => {
		switch (TriggerType) {
			case Languages.CodeActionTriggerType.Invoke:
				return ExtHostTypes.CodeActionTriggerKind.Invoke;
			case Languages.CodeActionTriggerType.Auto:
				return ExtHostTypes.CodeActionTriggerKind.Automatic;
		}
	};
}

export namespace CodeActionContext {
	export const ConvertToApiType = (
		ContextDto: ExtHostProtocol.ExtHostCodeActionContextDto,
		UriTransformer?: IURITransformer,
	): vscode.CodeActionContext => ({
		diagnostics: ContextDto.diagnostics.map((DiagnosticData) =>
			DiagnosticConverter.toApi(DiagnosticData, UriTransformer),
		),
		only: ContextDto.only
			? new ExtHostTypes.CodeActionKind(ContextDto.only)
			: undefined,
		triggerKind: ContextDto.triggerKind
			? CodeActionTriggerKind.ConvertToApi(ContextDto.triggerKind)
			: undefined,
	});
}

export namespace CodeActionProviderMetadata {
	export const ConvertToDto = (
		ApiMetadata?: vscode.CodeActionProviderMetadata,
	): ExtHostProtocol.ICodeActionProviderMetadataDto | undefined => {
		if (!ApiMetadata) return undefined;
		return {
			providedCodeActionKinds: ApiMetadata.providedCodeActionKinds?.map(
				(Kind) => Kind.value,
			),
			documentation: ApiMetadata.documentation?.map((Documentation) => ({
				value: Documentation.value,
				kind: Documentation.kind.value,
			})),
		};
	};
}

export namespace CodeAction {
	export const ConvertFromApi = (
		ApiAction: vscode.CodeAction,
		CommandConverter: CommandsConverter,
		DisposableStore: DisposableStore,
		UriTransformer?: IURITransformer,
		VersionProvider?: WorkspaceEditConverterNamespace.IVersionInformationProvider,
	): ExtHostProtocol.ICodeActionDto => ({
		title: ApiAction.title,
		kind: ApiAction.kind?.value,
		isPreferred: ApiAction.isPreferred,
		isAI: (ApiAction as any).isAI,
		disabled: ApiAction.disabled?.reason,
		command: ApiAction.command
			? CommandConverter.toInternal(ApiAction.command, DisposableStore)
			: undefined,
		diagnostics: ApiAction.diagnostics
			? DiagnosticConverter.fromApiArray(
					ApiAction.diagnostics,
					UriTransformer,
				)
			: undefined,
		edit: ApiAction.edit
			? WorkspaceEdit.fromApi(
					ApiAction.edit,
					VersionProvider,
					CommandConverter,
					DisposableStore,
					UriTransformer,
				)
			: undefined,
		ranges: (ApiAction as any).ranges?.map(
			(RangeValue: vscode.Range) => Range.from(RangeValue)!,
		),
	});

	export const ConvertToApi = (
		ActionDto: ExtHostProtocol.ICodeActionDto,
		CommandConverter: CommandsConverter,
		UriTransformer?: IURITransformer,
	): vscode.CodeAction => {
		const ApiAction = new ExtHostTypes.CodeAction(
			ActionDto.title,
			ActionDto.kind
				? new ExtHostTypes.CodeActionKind(ActionDto.kind)
				: undefined,
		);
		ApiAction.isPreferred = ActionDto.isPreferred;
		if (ActionDto.isAI) (ApiAction as any).isAI = ActionDto.isAI;
		if (ActionDto.disabled)
			ApiAction.disabled = { reason: ActionDto.disabled };
		ApiAction.command = CommandConverter.fromInternal(ActionDto.command);
		if (ActionDto.diagnostics) {
			ApiAction.diagnostics = DiagnosticConverter.toApiArray(
				ActionDto.diagnostics as ExtHostProtocol.IMarkerData[],
				UriTransformer,
			);
		}
		if (ActionDto.edit) {
			ApiAction.edit = WorkspaceEdit.toApi(
				ActionDto.edit,
				UriTransformer,
				CommandConverter,
			);
		}
		if (ActionDto.ranges) {
			(ApiAction as any).ranges = ActionDto.ranges.map(
				(RangeDto) => Range.to(RangeDto as ExtHostProtocol.IRange)!,
			);
		}
		return ApiAction;
	};

	export const ConvertFromApiList = (
		ApiActionList:
			| ReadonlyArray<vscode.Command | vscode.CodeAction>
			| vscode.ProviderResult<
					ReadonlyArray<vscode.Command | vscode.CodeAction>
			  >,
		CacheId: number,
		CommandConverter: CommandsConverter,
		ListDisposableStore: DisposableStore,
		UriTransformer?: IURITransformer,
		VersionProvider?: WorkspaceEditConverterNamespace.IVersionInformationProvider,
	): ExtHostProtocol.ICodeActionListDto | undefined => {
		const ActionCollection = ApiActionList as
			| ReadonlyArray<vscode.Command | vscode.CodeAction>
			| undefined
			| null;

		if (!ActionCollection || ActionCollection.length === 0)
			return undefined;

		const ActionDtoCollection: ExtHostProtocol.ICodeActionDto[] =
			ActionCollection.map((ApiItem, ItemIndex) => {
				let ActionDto: ExtHostProtocol.ICodeActionDto;
				if (
					"title" in ApiItem &&
					("kind" in ApiItem ||
						"edit" in ApiItem ||
						"diagnostics" in ApiItem ||
						"isPreferred" in ApiItem)
				) {
					ActionDto = ConvertFromApi(
						ApiItem as vscode.CodeAction,
						CommandConverter,
						ListDisposableStore,
						UriTransformer,
						VersionProvider,
					);
				} else {
					const CommandDto = CommandConverter.toInternal(
						ApiItem as vscode.Command,
						ListDisposableStore,
					);
					ActionDto = {
						title:
							CommandDto?.title ||
							(ApiItem as vscode.Command).title ||
							"Untitled",
						command: CommandDto,
						_isSynthetic: true,
					};
				}
				(ActionDto as any).cacheId = [CacheId, ItemIndex];
				return ActionDto;
			});

		return { cacheId: CacheId, actions: ActionDtoCollection };
	};
}
