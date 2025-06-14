/**
 * @module Location (Main/TypeConverter)
 * @description Converts between `vscode.Location` and its DTO representation.
 */

import type { UriComponents } from "vs/base/common/uri.js";
import type { IRange } from "vs/editor/common/core/range.js";

import { Location, Range } from "../../Type/ExtHostTypes.js";
import * as RangeConverter from "./Range.js";
import * as URIConverter from "./URI.js";

interface ILocationDTO {
	uri: UriComponents;
	range: IRange;
}

export function FromAPI(LocationInstance: Location): ILocationDTO {
	return {
		uri: URIConverter.FromAPI(LocationInstance.uri),
		range: RangeConverter.FromAPI(LocationInstance.range as Range),
	};
}

export function ToAPI(LocationDTO: ILocationDTO): Location {
	return new Location(
		URIConverter.ToAPI(LocationDTO.uri),
		RangeConverter.ToAPI(LocationDTO.range),
	);
}
