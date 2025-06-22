/*
 * File: Cocoon/Source/TypeConverter/Hover.ts
 * Role: Implements type converters for `vscode.Hover`, translating between
 *       the rich API object and its serializable DTO for IPC.
 * Responsibilities:
 *   - Convert `vscode.Hover` instances to a JSON-serializable DTO (`FromAPI`).
 *   - Convert the DTO back into a `vscode.Hover` instance (`ToAPI`).
 */

import type { IMarkdownString } from "vs/base/common/htmlContent.js";
import type { IRange } from "vs/editor/common/core/range.js";
import type { Hover as VscodeHover } from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import MarkdownStringConverter from "./Main/MarkdownString.js";
import RangeConverter from "./Main/Range.js";

// This is the DTO structure expected by Mountain's HoverResultDTO
interface HoverDTO {
	Contents: IMarkdownString[];
	Range?: IRange;
}

const FromAPI = (Hover: VscodeHover): HoverDTO => {
	const NormalizedContents = Array.isArray(Hover.contents)
		? Hover.contents
		: [Hover.contents];

	return {
		Contents: NormalizedContents.map((Content) => {
			if (Content instanceof ExtHostTypes.MarkdownString) {
				return MarkdownStringConverter.FromAPI(Content);
			}
			// Treat plain strings as markdown, wrapping them in the DTO structure.
			return { value: Content as string, isTrusted: false };
		}),
		Range: Hover.range ? RangeConverter.FromAPI(Hover.range) : undefined,
	};
};

const ToAPI = (DTO: HoverDTO): VscodeHover => {
	const Contents = DTO.Contents.map((ContentDTO) =>
		MarkdownStringConverter.ToAPI(ContentDTO),
	);
	const Range = DTO.Range ? RangeConverter.ToAPI(DTO.Range) : undefined;

	return new ExtHostTypes.Hover(Contents, Range);
};

const HoverConverter = { FromAPI, ToAPI };
export default HoverConverter;
