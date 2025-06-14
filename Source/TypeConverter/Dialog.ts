/**
 * @module Dialog (TypeConverter)
 * @description Type converters for the Dialog APIs (`showOpenDialog`, `showSaveDialog`).
 */

import type { OpenDialogOptions, SaveDialogOptions } from "vscode";

import { URI } from "../Type/ExtHostTypes.js";

function SerializeFilters(filters?: { [name: string]: readonly string[] }) {
	if (!filters) {
		return undefined;
	}
	return Object.entries(filters).map(([Name, Extensions]) => ({
		name: Name,
		extensions: Extensions,
	}));
}

const OpenDialogOption = {
	ToDTO(Option?: OpenDialogOptions) {
		if (!Option) {
			return undefined;
		}
		return {
			...Option,
			defaultUri: Option.defaultUri?.toJSON(),
			filters: SerializeFilters(Option.filters),
		};
	},
};

const SaveDialogOption = {
	ToDTO(Option?: SaveDialogOptions) {
		if (!Option) {
			return undefined;
		}
		return {
			...Option,
			defaultUri: Option.defaultUri?.toJSON(),
			filters: SerializeFilters(Option.filters),
		};
	},
};

const DialogResult = {
	ToURI(DTO: any): URI | undefined {
		if (!DTO) {
			return undefined;
		}
		return URI.revive(DTO);
	},
	ToURIArray(DTOs: any[] | undefined): URI[] | undefined {
		if (!DTOs || !Array.isArray(DTOs)) {
			return undefined;
		}
		return DTOs.map(DialogResult.ToURI).filter((u): u is URI => !!u);
	},
};

export default {
	OpenDialogOption,
	SaveDialogOption,
	DialogResult,
};
