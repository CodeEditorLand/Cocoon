/**
 * @module Dialog (TypeConverter)
 * @description Type converters for the Dialog APIs (`showOpenDialog`, `showSaveDialog`).
 */

import type { OpenDialogOptions, SaveDialogOptions, Uri } from "vscode";

import { URI as VscURI } from "../Type/ExtHostTypes.js";

const SerializeFilters = (Filters?: {
	readonly [Name: string]: readonly string[];
}) => {
	if (!Filters) {
		return undefined;
	}
	return Object.entries(Filters).map(([Name, Extensions]) => ({
		name: Name,
		extensions: Extensions,
	}));
};

const OpenDialogOption = {
	ToDTO: (Options?: OpenDialogOptions) => {
		if (!Options) {
			return undefined;
		}
		return {
			...Options,
			defaultUri: Options.defaultUri?.toJSON(),
			filters: SerializeFilters(Options.filters),
		};
	},
};

const SaveDialogOption = {
	ToDTO: (Options?: SaveDialogOptions) => {
		if (!Options) {
			return undefined;
		}
		return {
			...Options,
			defaultUri: Options.defaultUri?.toJSON(),
			filters: SerializeFilters(Options.filters),
		};
	},
};

const DialogResult = {
	ToURI: (DTO: any): Uri | undefined => {
		if (!DTO) {
			return undefined;
		}
		return VscURI.revive(DTO);
	},
	ToURIArray: (DTOs: any[] | undefined): Uri[] | undefined => {
		if (!DTOs || !Array.isArray(DTOs)) {
			return undefined;
		}
		return DTOs.map(DialogResult.ToURI).filter((URI): URI is Uri => !!URI);
	},
};

export default {
	OpenDialogOption,
	SaveDialogOption,
	DialogResult,
};
