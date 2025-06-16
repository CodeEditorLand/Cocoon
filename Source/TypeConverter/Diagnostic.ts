// Cocoon/Source/TypeConverter/Diagnostic.ts

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
import type { DiagnosticTag } from "vscode"; // Correct import

import {
	Diagnostic,
	DiagnosticRelatedInformation,
	Location,
	Position,
	Range,
	// FIX: The type is DiagnosticTag, not Diagnostic.

	// It's also part of the vscode namespace, not our custom types.
} from "../Type/ExtHostTypes.js";
import URIConverter from "./Main/URI.js";

const toMarkerSeverity = (
	severity: VSCode.DiagnosticSeverity,
): MarkerSeverity => {
	return severity as unknown as MarkerSeverity;
};

const fromMarkerSeverity = (
	severity: MarkerSeverity,
): VSCode.DiagnosticSeverity => {
	return severity as unknown as VSCode.DiagnosticSeverity;
};

/**
 * Converts a `vscode.DiagnosticRelatedInformation` object into its DTO representation.
 * @param RelatedInformation The `vscode.DiagnosticRelatedInformation` instance.
 * @returns The `IRelatedInformation` DTO.
 */
const RelatedInformationFromAPI = (
	RelatedInformation: VSCode.DiagnosticRelatedInformation,
): IRelatedInformation => ({
	resource: URIConverter.FromAPI(RelatedInformation.location.uri) as VscURI,
	message: RelatedInformation.message,
	startLineNumber: RelatedInformation.location.range.start.line + 1,
	startColumn: RelatedInformation.location.range.start.character + 1,
	endLineNumber: RelatedInformation.location.range.end.line + 1,
	endColumn: RelatedInformation.location.range.end.character + 1,
});

/**
 * Revives a related information DTO into a `vscode.DiagnosticRelatedInformation` instance.
 * @param RelatedInformationDTO The `IRelatedInformation` DTO.
 * @returns A new `vscode.DiagnosticRelatedInformation` instance.
 */
const RelatedInformationToAPI = (
	RelatedInformationDTO: IRelatedInformation,
): VSCode.DiagnosticRelatedInformation =>
	new DiagnosticRelatedInformation(
		new Location(
			URIConverter.ToAPI(RelatedInformationDTO.resource),
			new Range(
				new Position(
					RelatedInformationDTO.startLineNumber - 1,
					RelatedInformationDTO.startColumn - 1,
				),
				new Position(
					RelatedInformationDTO.endLineNumber - 1,
					RelatedInformationDTO.endColumn - 1,
				),
			),
		),
		RelatedInformationDTO.message,
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
					// FIX: The DTO expects the raw URI components, not the class instance.
					target: URIConverter.FromAPI(diagnostic.code.target),
				}
			: String(diagnostic.code),
	severity: toMarkerSeverity(diagnostic.severity),
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
 * @param MarkerDataDTO The `IMarkerData` DTO.
 * @returns A new `vscode.Diagnostic` instance.
 */
const ToAPI = (MarkerDataDTO: IMarkerData): VSCode.Diagnostic => {
	const range = new Range(
		new Position(
			MarkerDataDTO.startLineNumber - 1,
			MarkerDataDTO.startColumn - 1,
		),
		new Position(
			MarkerDataDTO.endLineNumber - 1,
			MarkerDataDTO.endColumn - 1,
		),
	);
	const diagnostic = new Diagnostic(
		range,
		MarkerDataDTO.message,
		fromMarkerSeverity(MarkerDataDTO.severity as MarkerSeverity),
	);
	diagnostic.source = MarkerDataDTO.source;
	if (typeof MarkerDataDTO.code === "object" && MarkerDataDTO.code) {
		diagnostic.code = {
			value: MarkerDataDTO.code.value,
			target: URIConverter.ToAPI(MarkerDataDTO.code.target),
		};
	} else {
		diagnostic.code = MarkerDataDTO.code;
	}
	diagnostic.relatedInformation = MarkerDataDTO.relatedInformation?.map(
		RelatedInformationToAPI,
	);
	diagnostic.tags = MarkerDataDTO.tags as unknown as DiagnosticTag[];
	return diagnostic;
};

/**
 * Converts an array of `vscode.Diagnostic` objects into an array of marker data DTOs.
 * @param Diagnostics The array of `vscode.Diagnostic` instances.
 * @returns An array of `IMarkerData` DTOs.
 */
const FromAPIArray = (
	Diagnostics: readonly VSCode.Diagnostic[],
): IMarkerData[] => Diagnostics.map(FromAPI);

export default { FromAPI, ToAPI, FromAPIArray };
