/**
 * @module Dialog (TypeConverter)
 * @description Type converters for the Dialog APIs.
 */

import type {
	OpenDialogOption,
	SaveDialogOption,
} from "../Service/Dialog/Type.js";
import { Uri } from "../Type/ExtHostTypes.js";

const SerializeFilters = (filters?: { [name: string]: readonly string[] }) => {
	if (!filters) return undefined;
	return Object.entries(filters).map(([Name, Extensions]) => ({
		Name,
		Extensions,
	}));
};

export namespace OpenDialogOption {
	export const ToDTO = (options?: OpenDialogOption) => {
		if (!options) return undefined;
		return {
			...options,
			defaultUri: options.defaultUri?.toJSON(), // Use built-in toJSON
			filters: SerializeFilters(options.filters),
		};
	};
}

export namespace SaveDialogOption {
	export const ToDTO = (options?: SaveDialogOption) => {
		if (!options) return undefined;
		return {
			...options,
			defaultUri: options.defaultUri?.toJSON(),
			filters: SerializeFilters(options.filters),
		};
	};
}

export namespace DialogResult {
	export const ToUri = (dto: any): Uri | undefined => {
		if (!dto) return undefined;
		return Uri.revive(dto);
	};
	export const ToUriArray = (dtos: any[] | undefined): Uri[] | undefined => {
		if (!dtos || !Array.isArray(dtos)) return undefined;
		return dtos.map(ToUri).filter((u): u is Uri => !!u);
	};
}
