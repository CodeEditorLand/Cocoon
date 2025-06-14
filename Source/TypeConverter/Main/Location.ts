/**
 * @module Location (Main/TypeConverter)
 * @description Converts between `vscode.Location` and its DTO representation.
 */

import type { UriComponents } from "vs/base/common/uri.js";
import type { IRange } from "vs/editor/common/core/range.js";
import type { Location } from "vscode";

import { Range, Location as VscLocation } from "../../Type/ExtHostTypes.js";
import RangeConverter from "./Range.js";
import URIConverter from "./URI.js";

interface ILocationDTO {
	uri: UriComponents;
	range: IRange;
}

const FromAPI = (LocationInstance: Location): ILocationDTO => {
	return {
		uri: URIConverter.FromAPI(LocationInstance.uri),
		range: RangeConverter.FromAPI(LocationInstance.range as Range),
	};
};

const ToAPI = (LocationDTO: ILocationDTO): Location => {
	return new VscLocation(
		URIConverter.ToAPI(LocationDTO.uri),
		RangeConverter.ToAPI(LocationDTO.range),
	);
};

export default { FromAPI, ToAPI };
