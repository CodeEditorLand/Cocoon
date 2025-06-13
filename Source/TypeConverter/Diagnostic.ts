/**
 * @module Diagnostic (TypeConverter)
 * @description Implements type converters for `vscode.Diagnostic` and related types,
 * translating between the rich API objects and their serializable DTOs for IPC.
 */

import type {
	IMarkerData,
	IRelatedInformation,
} from "vs/platform/markers/common/markers.js";
import type * as VSCode from "vscode";

import {
	Diagnostic,
	DiagnosticRelatedInformation,
	Location,
	Range,
	URI,
} from "../Type/ExtHostTypes.js";
import * as LocationConverter from "./Main/Location.js";
import * as RangeConverter from "./Main/Range.js";
import * as URIConverter from "./Main/URI.js";

/**
 * Converts a `vscode.DiagnosticRelatedInformation` object into its DTO representation.
 * @param RelatedInformation The `vscode.DiagnosticRelatedInformation` instance.
 * @returns The `IRelatedInformation` DTO.
 */
function RelatedInformationFromAPI(
	RelatedInformation: VSCode.DiagnosticRelatedInformation,
): IRelatedInformation {
	return {
		resource: URIConverter.FromAPI(RelatedInformation.location.uri),
		message: RelatedInformation.message,
		startLineNumber: RelatedInformation.location.range.start.line + 1,
		startColumn: RelatedInformation.location.range.start.character + 1,
		endLineNumber: RelatedInformation.location.range.end.line + 1,
		endColumn: RelatedInformation.location.range.end.character + 1,
	};
}

/**
 * Revives a related information DTO into a `vscode.DiagnosticRelatedInformation` instance.
 * @param RelatedInformationDTO The `IRelatedInformation` DTO.
 * @returns A new `vscode.DiagnosticRelatedInformation` instance.
 */
function RelatedInformationToAPI(
	RelatedInformationDTO: IRelatedInformation,
): VSCode.DiagnosticRelatedInformation {
	return new DiagnosticRelatedInformation(
		new Location(
			URIConverter.ToAPI(RelatedInformationDTO.resource),
			new Range(
				RelatedInformationDTO.startLineNumber - 1,
				RelatedInformationDTO.startColumn - 1,
				RelatedInformationDTO.endLineNumber - 1,
				RelatedInformationDTO.endColumn - 1,
			),
		),
		RelatedInformationDTO.message,
	);
}

/**
 * Converts a `vscode.Diagnostic` object into a marker data DTO for IPC.
 * @param Diagnostic The `vscode.Diagnostic` instance.
 * @returns The `IMarkerData` DTO.
 */
export function FromAPI(Diagnostic: VSCode.Diagnostic): IMarkerData {
	return {
		code:
			typeof Diagnostic.code === "object"
				? {
						value: String(Diagnostic.code.value),
						target: URIConverter.FromAPI(Diagnostic.code.target),
					}
				: String(Diagnostic.code),
		severity: Diagnostic.severity,
		message: Diagnostic.message,
		source: Diagnostic.source,
		startLineNumber: Diagnostic.range.start.line + 1,
		startColumn: Diagnostic.range.start.character + 1,
		endLineNumber: Diagnostic.range.end.line + 1,
		endColumn: Diagnostic.range.end.character + 1,
		relatedInformation: Diagnostic.relatedInformation?.map(
			RelatedInformationFromAPI,
		),
		tags: Diagnostic.tags,
	};
}

/**
 * Revives a marker data DTO into a `vscode.Diagnostic` instance.
 * @param MarkerDataDTO The `IMarkerData` DTO.
 * @returns A new `vscode.Diagnostic` instance.
 */
export function ToAPI(MarkerDataDTO: IMarkerData): VSCode.Diagnostic {
	const range = new Range(
		MarkerDataDTO.startLineNumber - 1,
		MarkerDataDTO.startColumn - 1,
		MarkerDataDTO.endLineNumber - 1,
		MarkerDataDTO.endColumn - 1,
	);
	const diagnostic = new Diagnostic(
		range,
		MarkerDataDTO.message,
		MarkerDataDTO.severity,
	);
	diagnostic.source = MarkerDataDTO.source;
	diagnostic.code =
		typeof MarkerDataDTO.code === "object"
			? {
					value: MarkerDataDTO.code.value,
					target: URIConverter.ToAPI(MarkerDataDTO.code.target),
				}
			: MarkerDataDTO.code;
	diagnostic.relatedInformation = MarkerDataDTO.relatedInformation?.map(
		RelatedInformationToAPI,
	);
	diagnostic.tags = MarkerDataDTO.tags;
	return diagnostic;
}

/**
 * Converts an array of `vscode.Diagnostic` objects into an array of marker data DTOs.
 * @param Diagnostics The array of `vscode.Diagnostic` instances.
 * @returns An array of `IMarkerData` DTOs.
 */
export function FromAPIArray(
	Diagnostics: readonly VSCode.Diagnostic[],
): IMarkerData[] {
	return Diagnostics.map(FromAPI);
}
