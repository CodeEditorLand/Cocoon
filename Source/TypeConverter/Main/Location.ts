/**
 * @module Location (Main/TypeConverter)
 * @description Converts between `vscode.Location` and its DTO representation.
 */

import type * as VscLocation from "vs/editor/common/languages.js";

import { Location, Range } from "../../Type/ExtHostTypes.js";
import * as RangeConverter from "./Range.js";
import * as URIConverter from "./URI.js";

/**
 * Converts a `vscode.Location` object into a plain DTO for IPC.
 * @param LocationInstance The `vscode.Location` instance to convert.
 * @returns The `VscLocation.ILocation` DTO.
 */
export function FromAPI(LocationInstance: Location): VscLocation.ILocation {
	return {
		uri: URIConverter.FromAPI(LocationInstance.uri),
		range: RangeConverter.FromAPI(LocationInstance.range as Range),
	};
}

/**
 * Revives a location DTO back into a `vscode.Location` class instance.
 * @param LocationDTO The `VscLocation.ILocation` DTO to revive.
 * @returns A new `vscode.Location` instance.
 */
export function ToAPI(LocationDTO: VscLocation.ILocation): Location {
	return new Location(
		URIConverter.ToAPI(LocationDTO.uri),
		RangeConverter.ToAPI(LocationDTO.range),
	);
}
