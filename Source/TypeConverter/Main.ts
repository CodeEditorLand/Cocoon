/**
 * @module Main (TypeConverter)
 * @description Aggregates and exports all foundational type converters for the
 * most common, basic data types used throughout the vscode API.
 */

import Location from "./Main/Location.js";
import MarkdownString from "./Main/MarkdownString.js";
import Position from "./Main/Position.js";
import Range from "./Main/Range.js";
import Selection from "./Main/Selection.js";
import TextEdit from "./Main/TextEdit.js";
import URI from "./Main/URI.js";
import ViewColumn from "./Main/ViewColumn.js";
import WorkspaceFolder from "./Main/WorkspaceFolder.js";

export {
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
