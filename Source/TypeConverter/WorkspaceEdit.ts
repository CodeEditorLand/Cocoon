/*
 * File: Cocoon/Source/TypeConverter/WorkspaceEdit.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-07 05:37:31 UTC
 * Dependency: ./Main, vs/base/common/lifecycle, vs/base/common/uri, vs/base/common/uriIpc, vs/editor/common/languages, vs/platform/log/common/log, vs/workbench/api/common/extHost.protocol, vs/workbench/api/common/extHostTypes, vscode
 * Export: IVersionInformationProvider, from, fromApi, initializeWorkspaceEditConverterLogger, to, toApi
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters - WorkspaceEdit
 * --------------------------------------------------------------------------------------------
 * Contains converters related to WorkspaceEdits and their components.
 * This is one of the most complex areas of type conversion.
 *--------------------------------------------------------------------------------------------*/

import { DisposableStore } from "vs/base/common/lifecycle";
import { URI, type UriComponents } from "vs/base/common/uri";
import { IURITransformer } from "vs/base/common/uriIpc";
import * as languages from "vs/editor/common/languages";
import { ILogService } from "vs/platform/log/common/log";
import * as extHostProtocol from "vs/workbench/api/common/extHost.protocol";
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
import type * as vscode from "vscode";

import { Range, TextEdit, type CommandsConverter } from "./Main";

// Local logger instance
let _converterLogService: ILogService | undefined;
export function initializeWorkspaceEditConverterLogger(
	logger?: ILogService,
): void {
	_converterLogService = logger;
}
function _warnStub(
	converterName: string,
	direction: "toApi" | "fromApi",
	messageSuffix: string = "",
) {
	_converterLogService?.warn(
		`[TypeConverter STUB] ${converterName}.${direction} is STUBBED. ${messageSuffix} May not handle all fields correctly.`,
	);
}

// --- Notebook STUBS (Included for self-containment) ---
namespace NotebookCellDataConverter {
	export function fromApi(cellData: vscode.NotebookCellData): any {
		_warnStub("NotebookCellDataConverter.fromApi", "fromApi", "STUBBED.");
		return {
			kind: cellData.kind,
			source: cellData.value,
			language: cellData.languageId,
			mime: cellData.mime,
			outputs: cellData.outputs?.map((o) =>
				NotebookCellOutputConverter.fromApi(o),
			),
			metadata: cellData.metadata,
		};
	}
}
namespace NotebookCellOutputConverter {
	export function fromApi(output: vscode.NotebookCellOutput): any {
		_warnStub("NotebookCellOutputConverter.fromApi", "fromApi", "STUBBED.");
		return {
			outputId: output.id,
			items: output.items.map((i) => ({
				mime: i.mime,
				valueBytes: i.data,
			})),
			metadata: output.metadata,
		};
	}
}

// --- WorkspaceEditEntryMetadata, WorkspaceFileEditOptions, ThemeIconConverter ---
export namespace WorkspaceEditEntryMetadata {
	export function from(
		metadata: vscode.WorkspaceEditEntryMetadata,
	): extHostProtocol.IWorkspaceEditEntryMetadataDto {
		return {
			needsConfirmation: metadata.needsConfirmation,
			label: metadata.label,
			description: metadata.description,
			iconPath: metadata.iconPath
				? ThemeIconConverter.from(metadata.iconPath)
				: undefined,
		};
	}
	export function to(
		dto: extHostProtocol.IWorkspaceEditEntryMetadataDto,
	): vscode.WorkspaceEditEntryMetadata {
		return {
			needsConfirmation: dto.needsConfirmation,
			label: dto.label,
			description: dto.description,
			iconPath: dto.iconPath
				? ThemeIconConverter.to(dto.iconPath)
				: undefined,
		};
	}
}

export namespace WorkspaceFileEditOptions {
	export function from(
		options: vscode.WorkspaceFileEditOptions | undefined,
	): languages.WorkspaceFileEditOptions | undefined {
		if (!options) return undefined;
		return {
			overwrite: options.overwrite,
			ignoreIfNotExists: options.ignoreIfNotExists,
			ignoreIfExists: options.ignoreIfExists,
			recursive: options.recursive,
			copy: (options as any).copy,
			folder: (options as any).folder,
			maxSize: options.maxSize,
			contentsDeliveredConfirmously: (options as any)
				.contentsDeliveredConfirmously,
			undoStopBefore: (options as any).undoStopBefore,
			undoStopAfter: (options as any).undoStopAfter,
		};
	}
	export function to(
		dto: languages.WorkspaceFileEditOptions | undefined,
	): vscode.WorkspaceFileEditOptions | undefined {
		if (!dto) return undefined;
		const result: vscode.WorkspaceFileEditOptions = {};
		if (dto.overwrite !== undefined) result.overwrite = dto.overwrite;
		if (dto.ignoreIfNotExists !== undefined)
			result.ignoreIfNotExists = dto.ignoreIfNotExists;
		if (dto.recursive !== undefined) result.recursive = dto.recursive;
		if (dto.maxSize !== undefined) result.maxSize = dto.maxSize;
		if (dto.ignoreIfExists !== undefined)
			result.ignoreIfExists = dto.ignoreIfExists;
		return result;
	}
}

export namespace ThemeIconConverter {
	export function from(
		icon: vscode.ThemeIcon | URI | { light: URI; dark: URI },
	): extHostProtocol.IIconPathDto | undefined {
		if (!icon) return undefined;
		if (icon instanceof extHostTypes.ThemeIcon) {
			return { id: icon.id, color: icon.color?.id };
		}
		if (URI.isUri(icon)) {
			return icon.toJSON();
		}
		if (
			typeof icon === "object" &&
			URI.isUri(icon.light) &&
			URI.isUri(icon.dark)
		) {
			return { light: icon.light.toJSON(), dark: icon.dark.toJSON() };
		}
		return undefined;
	}
	export function to(
		dto: extHostProtocol.IIconPathDto,
	): vscode.ThemeIcon | URI | { light: URI; dark: URI } | undefined {
		if (!dto) return undefined;
		if (typeof (dto as { id: string }).id === "string") {
			const themeColor = (dto as { id: string; color?: string }).color
				? new extHostTypes.ThemeColor(
						(dto as { id: string; color?: string }).color!,
					)
				: undefined;
			return new extHostTypes.ThemeIcon(
				(dto as { id: string }).id,
				themeColor,
			);
		}
		const revivedLight = URI.revive(
			(dto as { light?: UriComponents }).light,
		);
		const revivedDark = URI.revive((dto as { dark?: UriComponents }).dark);
		if (revivedLight && revivedDark) {
			return { light: revivedLight, dark: revivedDark };
		}
		if (revivedLight) {
			return revivedLight;
		}
		if (revivedDark) {
			return revivedDark;
		}
		return URI.revive(dto as UriComponents);
	}
}

// --- WorkspaceEdit ---
export namespace WorkspaceEdit {
	export interface IVersionInformationProvider {
		getTextDocumentVersion(uri: vscode.Uri): number | undefined;
		getNotebookDocumentVersion?(uri: vscode.Uri): number | undefined;
	}

	export function fromApi(
		edit: vscode.WorkspaceEdit,
		versionProvider?: IVersionInformationProvider,
		_commandsConverter?: CommandsConverter,
		_disposablesForMetadataCommands?: DisposableStore,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IWorkspaceEditDto {
		const resultDto: extHostProtocol.IWorkspaceEditDto = { edits: [] };
		if (!(edit instanceof extHostTypes.WorkspaceEdit)) {
			_converterLogService?.error(
				"[WE.fromApi] Input not an instance of vscode.WorkspaceEdit.",
			);
			return resultDto;
		}
		const internalEdits = (edit as any)
			._edits as ReadonlyArray<extHostTypeConverter.FileEditTypeExtHost>;
		if (!Array.isArray(internalEdits)) {
			_converterLogService?.error(
				"[WE.fromApi] Cannot access internal _edits array.",
			);
			return resultDto;
		}

		for (const entry of internalEdits) {
			let marshalledEditEntry:
				| extHostProtocol.MainThreadWorkspaceEditDto
				| undefined = undefined;
			const dtoMetadata = entry.metadata
				? WorkspaceEditEntryMetadata.from(entry.metadata)
				: undefined;

			switch (entry._type) {
				case extHostTypes.FileEditType.Text:
				case extHostTypes.FileEditType.Snippet: {
					const textEntry =
						entry as extHostTypeConverter.ResourceTextEditExtHost;
					const textEditForDto = TextEdit.from(
						textEntry.edit as vscode.TextEdit,
					);
					if (
						textEntry.edit instanceof extHostTypes.SnippetTextEdit
					) {
						(textEditForDto as languages.TextEdit).insertAsSnippet =
							true;
					}
					marshalledEditEntry = {
						_type: extHostProtocol.FileEditType.Text,
						resource: uriTransformer
							? uriTransformer.transformOutgoing(textEntry.uri)
							: textEntry.uri.toJSON(),
						edit: textEditForDto,
						versionId: versionProvider?.getTextDocumentVersion(
							textEntry.uri,
						),
						metadata: dtoMetadata,
					} as extHostProtocol.IWorkspaceTextEditDto;
					break;
				}
				case extHostTypes.FileEditType.File: {
					const fileEntry =
						entry as extHostTypeConverter.ResourceFileEditExtHost;
					marshalledEditEntry = {
						_type: extHostProtocol.FileEditType.File,
						oldUri: fileEntry.from
							? uriTransformer
								? uriTransformer.transformOutgoing(
										fileEntry.from,
									)
								: fileEntry.from.toJSON()
							: undefined,
						newUri: fileEntry.to
							? uriTransformer
								? uriTransformer.transformOutgoing(fileEntry.to)
								: fileEntry.to.toJSON()
							: undefined,
						options: fileEntry.options
							? WorkspaceFileEditOptions.from(fileEntry.options)
							: undefined,
						metadata: dtoMetadata,
					} as extHostProtocol.IWorkspaceFileEditDto;
					break;
				}
				case extHostTypes.FileEditType.Cell:
				case extHostTypes.FileEditType.CellReplace:
				case extHostTypes.FileEditType.CellMetadata:
				case extHostTypes.FileEditType.DocumentMetadata: {
					_warnStub(
						"WorkspaceEdit.fromApi",
						"fromApi",
						`Notebook edit type ${entry._type} conversion is STUBBED.`,
					);
					const cellBasedEntry = entry as any;
					let cellEditOperationDto: any = {};
					if (entry._type === extHostTypes.FileEditType.CellReplace) {
						cellEditOperationDto = {
							editType: languages.CellEditType.Replace,
							index: cellBasedEntry.index,
							count: cellBasedEntry.count,
							cells: cellBasedEntry.cells.map((c: any) =>
								NotebookCellDataConverter.fromApi(c),
							),
						};
					}
					marshalledEditEntry = {
						_type: extHostProtocol.FileEditType.Cell,
						resource: uriTransformer
							? uriTransformer.transformOutgoing(
									cellBasedEntry.uri,
								)
							: cellBasedEntry.uri.toJSON(),
						notebookVersionId:
							versionProvider?.getNotebookDocumentVersion?.(
								cellBasedEntry.uri,
							),
						edit: cellEditOperationDto,
						metadata: dtoMetadata,
					} as extHostProtocol.IWorkspaceCellEditDto;
					break;
				}
			}
			if (marshalledEditEntry) {
				resultDto.edits.push(marshalledEditEntry);
			}
		}

		// Handle top-level metadata on the WorkspaceEdit object itself
		const apiEditWithMetadata = edit as vscode.WorkspaceEdit & {
			label?: string;
			description?: string;
			iconPath?:
				| vscode.ThemeIcon
				| vscode.Uri
				| { light: vscode.Uri; dark: vscode.Uri };
		};
		if (
			apiEditWithMetadata.label ||
			apiEditWithMetadata.description ||
			apiEditWithMetadata.iconPath
		) {
			(
				resultDto as extHostProtocol.IWorkspaceEditDto & {
					metadata?: extHostProtocol.IWorkspaceEditMetadataDto;
				}
			).metadata = {
				label: apiEditWithMetadata.label || "",
				description: apiEditWithMetadata.description,
				iconPath: apiEditWithMetadata.iconPath
					? ThemeIconConverter.from(apiEditWithMetadata.iconPath)
					: undefined,
			};
		}
		return resultDto;
	}

	export function toApi(
		dto: extHostProtocol.IWorkspaceEditDto,
		uriTransformer?: IURITransformer,
		commandsConverter?: CommandsConverter,
	): vscode.WorkspaceEdit {
		const result = new extHostTypes.WorkspaceEdit();
		const dtoWithMetadata = dto as extHostProtocol.IWorkspaceEditDto & {
			metadata?: extHostProtocol.IWorkspaceEditMetadataDto;
		};
		if (dtoWithMetadata.metadata) {
			(result as any).label = dtoWithMetadata.metadata.label;
			(result as any).description = dtoWithMetadata.metadata.description;
			(result as any).iconPath = dtoWithMetadata.metadata.iconPath
				? ThemeIconConverter.to(dtoWithMetadata.metadata.iconPath)
				: undefined;
		}

		for (const editDto of dto.edits) {
			const apiMetadata = (editDto as any).metadata
				? WorkspaceEditEntryMetadata.to((editDto as any).metadata)
				: undefined;
			const editTypeFromDto = (editDto as any)
				._type as extHostProtocol.FileEditType;

			switch (editTypeFromDto) {
				case extHostProtocol.FileEditType.Text: {
					const textEditDto =
						editDto as extHostProtocol.IWorkspaceTextEditDto;
					const revivedUri = URI.revive(
						uriTransformer
							? uriTransformer.transformIncoming(
									textEditDto.resource,
								)
							: textEditDto.resource,
					);
					const apiTextEdit = TextEdit.to(
						textEditDto.edit as languages.TextEdit,
					);
					if (
						(textEditDto.edit as languages.TextEdit).insertAsSnippet
					) {
						result.replace(
							revivedUri,
							apiTextEdit.range,
							new extHostTypes.SnippetString(apiTextEdit.newText),
							apiMetadata,
						);
					} else {
						result.set(revivedUri, [
							Object.assign(apiTextEdit, {
								metadata: apiMetadata,
							}),
						]);
					}
					break;
				}
				case extHostProtocol.FileEditType.File: {
					const fileEditDto =
						editDto as extHostProtocol.IWorkspaceFileEditDto;
					const oldUri = fileEditDto.oldUri
						? URI.revive(
								uriTransformer
									? uriTransformer.transformIncoming(
											fileEditDto.oldUri,
										)
									: fileEditDto.oldUri,
							)
						: undefined;
					const newUri = fileEditDto.newUri
						? URI.revive(
								uriTransformer
									? uriTransformer.transformIncoming(
											fileEditDto.newUri,
										)
									: fileEditDto.newUri,
							)
						: undefined;
					const options = fileEditDto.options
						? WorkspaceFileEditOptions.to(fileEditDto.options)
						: undefined;
					if (oldUri && newUri) {
						result.renameFile(oldUri, newUri, options, apiMetadata);
					} else if (newUri) {
						result.createFile(newUri, options, apiMetadata);
					} else if (oldUri) {
						result.deleteFile(oldUri, options, apiMetadata);
					}
					break;
				}
				case extHostProtocol.FileEditType.Cell:
					_warnStub(
						"WorkspaceEdit.toApi",
						"toApi",
						`Notebook DTO type ${editTypeFromDto} revival is STUBBED.`,
					);
					break;
				default:
					_converterLogService?.warn(
						"[WE.toApi] Unknown DTO _type in IWorkspaceEditDto.edits:",
						editDto,
					);
			}
		}
		return result;
	}
}
