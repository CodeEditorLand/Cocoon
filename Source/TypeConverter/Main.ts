/**
 * @module Main (TypeConverter)
 * @description Aggregates and exports all foundational type converters for the
 * most common, basic data types used throughout the vscode API.
 */

import * as Location from "./Main/Location.js";
import * as MarkdownString from "./Main/MarkdownString.js";
import * as Position from "./Main/Position.js";
import * as Range from "./Main/Range.js";
import * as Selection from "./Main/Selection.js";
import * as TextEdit from "./Main/TextEdit.js";
import * as URI from "./Main/URI.js";
import * as ViewColumn from "./Main/ViewColumn.js";
import * as WorkspaceFolder from "./Main/WorkspaceFolder.js";

export default {
	Location,
	MarkdownString,
	Position,
	Range,
	Selection,
	TextEdit,
	URI,
	ViewColumn,
	WorkspaceFolder,
};
