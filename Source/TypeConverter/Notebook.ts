/*
 * File: Cocoon/Source/TypeConverter/Notebook.ts
 * Responsibility: Provides type conversion logic for notebook cell outputs and data, enabling integration with VS Code's notebook features within the Land editor's architecture.
 * Modified: 2025-06-07 00:57:32 UTC
 * Dependency: vs/base/common/buffer, vs/workbench/api/common/extHostTypeConverters, vscode
 * Export: fromApi
 */

// Defines placeholder type converters for Notebook-related features.
// These are STUBBED and do not perform real conversions, as full notebook
// support is not yet implemented.

import { VSBuffer } from "vs/base/common/buffer";
import * as ExtHostTypeConverter from "vs/workbench/api/common/extHostTypeConverters";
import type * as vscode from "vscode";

const _WarnStub = (ConverterName: string) => {
	console.warn(
		`[TypeConverter STUB] ${ConverterName} is STUBBED. Notebook functionality is not implemented.`,
	);
};

// Placeholder DTO to satisfy dependencies in other converters.
interface NotebookCellDataDtoPlaceholder {
	kind: number;
	source: string;
	language: string;
	mime?: string;
	outputs?: any[];
	metadata?: Record<string, any>;
}

export namespace NotebookCellOutputConverter {
	export const fromApi = (Output: vscode.NotebookCellOutput): any => {
		_WarnStub("NotebookCellOutputConverter.fromApi");
		return {
			outputId: Output.id,
			items: Output.items.map((Item) => ({
				mime: Item.mime,
				valueBytes: VSBuffer.wrap(Item.data).buffer,
			})),
			metadata: Output.metadata,
		};
	};
}

export namespace NotebookCellDataConverter {
	export const fromApi = (
		CellData: vscode.NotebookCellData,
	): NotebookCellDataDtoPlaceholder => {
		_WarnStub("NotebookCellDataConverter.fromApi");
		return {
			kind: ExtHostTypeConverter.NotebookCellKind.from(CellData.kind),
			source: CellData.value,
			language: CellData.languageId,
			mime: CellData.mime,
			outputs: CellData.outputs?.map((Output) =>
				NotebookCellOutputConverter.fromApi(Output),
			),
			metadata: CellData.metadata,
		};
	};
}
