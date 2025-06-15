/**
 * @module Location (Main/TypeConverter)
 * @description Converts between `vscode.Location` and its DTO representation.
 */

import type { UriComponents } from "vs/base/common/uri.js";
import type { IRange } from "vs/editor/common/core/range.js";
import type { Location as VSCodeLocation } from "vscode";

import { Range, Location as VscLocation } from "../../Type/ExtHostTypes.js";
import PositionConverter from "./Position.js";
import RangeConverter from "./Range.js";
import URIConverter from "./URI.js";

interface ILocationDTO {
	uri: UriComponents;
	range: IRange;
}

const FromAPI = (LocationInstance: VSCodeLocation): ILocationDTO => {
	return {
		uri: URIConverter.FromAPI(LocationInstance.uri),
		range: RangeConverter.FromAPI(LocationInstance.range),
	};
};

const ToAPI = (LocationDTO: ILocationDTO): VSCodeLocation => {
	return new VscLocation(
		URIConverter.ToAPI(LocationDTO.uri),
		new Range(
			PositionConverter.ToAPI({
				lineNumber: LocationDTO.range.startLineNumber,
				column: LocationDTO.range.startColumn,
			}),
			PositionConverter.ToAPI({
				lineNumber: LocationDTO.range.endLineNumber,
				column: LocationDTO.range.endColumn,
			}),
		),
	);
};

export default { FromAPI, ToAPI };
