/**
 * @module Location (Main/TypeConverter)
 * @description Converts between `vscode.Location` and its DTO representation.
 */

import type { UriComponents } from "vs/base/common/uri.js";
import type { IRange } from "vs/editor/common/core/range.js";

import { Location, type Range } from "../../Type/ExtHostTypes.js";
import * as RangeConverter from "./Range.js";
import * as URIConverter from "./URI.js";

// Placeholder for the internal VS Code DTO
interface ILocationDTO {
	uri: UriComponents;
	range: IRange;
}

/**
 * Converts a `vscode.Location` object into a plain DTO for IPC.
 * @param LocationInstance The `vscode.Location` instance to convert.
 * @returns The `ILocationDTO` DTO.
 */
export function FromAPI(LocationInstance: Location): ILocationDTO {
	return {
		uri: URIConverter.FromAPI(LocationInstance.uri),
		range: RangeConverter.FromAPI(LocationInstance.range as Range),
	};
}

/**
 * Revives a location DTO back into a `vscode.Location` class instance.
 * @param LocationDTO The `ILocationDTO` DTO to revive.
 * @returns A new `vscode.Location` instance.
 */
export function ToAPI(LocationDTO: ILocationDTO): Location {
	return new Location(
		URIConverter.ToAPI(LocationDTO.uri),
		RangeConverter.ToAPI(LocationDTO.range),
	);
}
