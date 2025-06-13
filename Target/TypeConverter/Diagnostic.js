var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  Diagnostic,
  DiagnosticRelatedInformation,
  Location,
  Range
} from "../Type/ExtHostTypes.js";
import * as URIConverter from "./Main/URI.js";
function RelatedInformationFromAPI(RelatedInformation) {
  return {
    resource: URIConverter.FromAPI(RelatedInformation.location.uri),
    message: RelatedInformation.message,
    startLineNumber: RelatedInformation.location.range.start.line + 1,
    startColumn: RelatedInformation.location.range.start.character + 1,
    endLineNumber: RelatedInformation.location.range.end.line + 1,
    endColumn: RelatedInformation.location.range.end.character + 1
  };
}
__name(RelatedInformationFromAPI, "RelatedInformationFromAPI");
function RelatedInformationToAPI(RelatedInformationDTO) {
  return new DiagnosticRelatedInformation(
    new Location(
      URIConverter.ToAPI(RelatedInformationDTO.resource),
      new Range(
        RelatedInformationDTO.startLineNumber - 1,
        RelatedInformationDTO.startColumn - 1,
        RelatedInformationDTO.endLineNumber - 1,
        RelatedInformationDTO.endColumn - 1
      )
    ),
    RelatedInformationDTO.message
  );
}
__name(RelatedInformationToAPI, "RelatedInformationToAPI");
function FromAPI(Diagnostic2) {
  return {
    code: typeof Diagnostic2.code === "object" ? {
      value: String(Diagnostic2.code.value),
      target: URIConverter.FromAPI(Diagnostic2.code.target)
    } : String(Diagnostic2.code),
    severity: Diagnostic2.severity,
    message: Diagnostic2.message,
    source: Diagnostic2.source,
    startLineNumber: Diagnostic2.range.start.line + 1,
    startColumn: Diagnostic2.range.start.character + 1,
    endLineNumber: Diagnostic2.range.end.line + 1,
    endColumn: Diagnostic2.range.end.character + 1,
    relatedInformation: Diagnostic2.relatedInformation?.map(
      RelatedInformationFromAPI
    ),
    tags: Diagnostic2.tags
  };
}
__name(FromAPI, "FromAPI");
function ToAPI(MarkerDataDTO) {
  const range = new Range(
    MarkerDataDTO.startLineNumber - 1,
    MarkerDataDTO.startColumn - 1,
    MarkerDataDTO.endLineNumber - 1,
    MarkerDataDTO.endColumn - 1
  );
  const diagnostic = new Diagnostic(
    range,
    MarkerDataDTO.message,
    MarkerDataDTO.severity
  );
  diagnostic.source = MarkerDataDTO.source;
  diagnostic.code = typeof MarkerDataDTO.code === "object" ? {
    value: MarkerDataDTO.code.value,
    target: URIConverter.ToAPI(MarkerDataDTO.code.target)
  } : MarkerDataDTO.code;
  diagnostic.relatedInformation = MarkerDataDTO.relatedInformation?.map(
    RelatedInformationToAPI
  );
  diagnostic.tags = MarkerDataDTO.tags;
  return diagnostic;
}
__name(ToAPI, "ToAPI");
function FromAPIArray(Diagnostics) {
  return Diagnostics.map(FromAPI);
}
__name(FromAPIArray, "FromAPIArray");
export {
  FromAPI,
  FromAPIArray,
  ToAPI
};
//# sourceMappingURL=Diagnostic.js.map
