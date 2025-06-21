/**
 * @module Diagnostic (TypeConverter)
 * @description Implements type converters for `vscode.Diagnostic` and related types,
 * translating between the rich API objects and their serializable DTOs for IPC.
 */

import { URI as VscURI } from "vs/base/common/uri.js";
import type {
	IMarkerData,
	IRelatedInformation,
	MarkerSeverity,
	MarkerTag,
} from "vs/platform/markers/common/markers.js";
import type * as VSCode from "vscode";
import type { DiagnosticTag } from "vscode";

import {
	Diagnostic,
	DiagnosticRelatedInformation,
	Location,
	Position,
	Range,
} from "../Type/ExtHostTypes.js";
import URIConverter from "./Main/URI.js";

const ToMarkerSeverity = (
	severity: VSCode.DiagnosticSeverity,
): MarkerSeverity => {
	return severity as unknown as MarkerSeverity;
};

const FromMarkerSeverity = (
	severity: MarkerSeverity,
): VSCode.DiagnosticSeverity => {
	return severity as unknown as VSCode.DiagnosticSeverity;
};

/**
 * Converts a `vscode.DiagnosticRelatedInformation` object into its DTO representation.
 * @param relatedInformation The `vscode.DiagnosticRelatedInformation` instance.
 * @returns The `IRelatedInformation` DTO.
 */
const RelatedInformationFromAPI = (
	relatedInformation: VSCode.DiagnosticRelatedInformation,
): IRelatedInformation => ({
	resource: relatedInformation.location.uri as VscURI,
	message: relatedInformation.message,
	startLineNumber: relatedInformation.location.range.start.line + 1,
	startColumn: relatedInformation.location.range.start.character + 1,
	endLineNumber: relatedInformation.location.range.end.line + 1,
	endColumn: relatedInformation.location.range.end.character + 1,
});

/**
 * Revives a related information DTO into a `vscode.DiagnosticRelatedInformation` instance.
 * @param relatedInformationDTO The `IRelatedInformation` DTO.
 * @returns A new `vscode.DiagnosticRelatedInformation` instance.
 */
const RelatedInformationToAPI = (
	relatedInformationDTO: IRelatedInformation,
): VSCode.DiagnosticRelatedInformation =>
	new DiagnosticRelatedInformation(
		new Location(
			URIConverter.ToAPI(relatedInformationDTO.resource),
			new Range(
				new Position(
					relatedInformationDTO.startLineNumber - 1,
					relatedInformationDTO.startColumn - 1,
				),
				new Position(
					relatedInformationDTO.endLineNumber - 1,
					relatedInformationDTO.endColumn - 1,
				),
			),
		),
		relatedInformationDTO.message,
	);

/**
 * Converts a `vscode.Diagnostic` object into a marker data DTO for IPC.
 * @param diagnostic The `vscode.Diagnostic` instance.
 * @returns The `IMarkerData` DTO.
 */
const FromAPI = (diagnostic: VSCode.Diagnostic): IMarkerData => ({
	code:
		typeof diagnostic.code === "object"
			? {
					value: String(diagnostic.code.value),
					target: diagnostic.code.target as VscURI,
				}
			: String(diagnostic.code),
	severity: ToMarkerSeverity(diagnostic.severity),
	message: diagnostic.message,
	source: diagnostic.source,
	startLineNumber: diagnostic.range.start.line + 1,
	startColumn: diagnostic.range.start.character + 1,
	endLineNumber: diagnostic.range.end.line + 1,
	endColumn: diagnostic.range.end.character + 1,
	relatedInformation: diagnostic.relatedInformation?.map(
		RelatedInformationFromAPI,
	),
	tags: diagnostic.tags as unknown as MarkerTag[],
});

/**
 * Revives a marker data DTO into a `vscode.Diagnostic` instance.
 * @param markerDataDTO The `IMarkerData` DTO.
 * @returns A new `vscode.Diagnostic` instance.
 */
const ToAPI = (markerDataDTO: IMarkerData): VSCode.Diagnostic => {
	const RangeValue = new Range(
		new Position(
			markerDataDTO.startLineNumber - 1,
			markerDataDTO.startColumn - 1,
		),
		new Position(
			markerDataDTO.endLineNumber - 1,
			markerDataDTO.endColumn - 1,
		),
	);
	const DiagnosticValue = new Diagnostic(
		RangeValue,
		markerDataDTO.message,
		FromMarkerSeverity(markerDataDTO.severity as MarkerSeverity),
	);
	DiagnosticValue.source = markerDataDTO.source;
	if (typeof markerDataDTO.code === "object" && markerDataDTO.code) {
		DiagnosticValue.code = {
			value: markerDataDTO.code.value,
			target: URIConverter.ToAPI(markerDataDTO.code.target),
		};
	} else {
		DiagnosticValue.code = markerDataDTO.code;
	}
	DiagnosticValue.relatedInformation = markerDataDTO.relatedInformation?.map(
		RelatedInformationToAPI,
	);
	DiagnosticValue.tags = markerDataDTO.tags as unknown as DiagnosticTag[];
	return DiagnosticValue;
};

/**
 * Converts an array of `vscode.Diagnostic` objects into an array of marker data DTOs.
 * @param diagnostics The array of `vscode.Diagnostic` instances.
 * @returns An array of `IMarkerData` DTOs.
 */
const FromAPIArray = (
	diagnostics: readonly VSCode.Diagnostic[],
): IMarkerData[] => diagnostics.map(FromAPI);

export default { FromAPI, ToAPI, FromAPIArray };
