/**
 * @module Dialog (TypeConverter)
 * @description Type converters for the Dialog APIs (`showOpenDialog`, `showSaveDialog`).
 */

import type {
	OpenDialogOption,
	SaveDialogOption,
} from "../Service/Dialog/Type.js";
import { URI } from "../Type/ExtHostTypes.js";

function SerializeFilters(filters?: { [name: string]: readonly string[] }) {
	if (!filters) {
		return undefined;
	}
	return Object.entries(filters).map(([Name, Extensions]) => ({
		Name,
		Extensions,
	}));
}

export namespace OpenDialogOption {
	export function ToDTO(Option?: OpenDialogOption) {
		if (!Option) {
			return undefined;
		}
		return {
			...Option,
			defaultUri: Option.defaultUri?.toJSON(),
			filters: SerializeFilters(Option.filters),
		};
	}
}

export namespace SaveDialogOption {
	export function ToDTO(Option?: SaveDialogOption) {
		if (!Option) {
			return undefined;
		}
		return {
			...Option,
			defaultUri: Option.defaultUri?.toJSON(),
			filters: SerializeFilters(Option.filters),
		};
	}
}

export namespace DialogResult {
	export function ToURI(DTO: any): URI | undefined {
		if (!DTO) {
			return undefined;
		}
		return URI.revive(DTO);
	}
	export function ToURIArray(DTOs: any[] | undefined): URI[] | undefined {
		if (!DTOs || !Array.isArray(DTOs)) {
			return undefined;
		}
		return DTOs.map(ToURI).filter((u): u is URI => !!u);
	}
}
