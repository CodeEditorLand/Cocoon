var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  Diagnostic,
  DiagnosticRelatedInformation,
  Location,
  Position,
  Range
} from "../Type/ExtHostTypes.js";
import URIConverter from "./Main/URI.js";
const ToMarkerSeverity = /* @__PURE__ */ __name((severity) => {
  return severity;
}, "ToMarkerSeverity");
const FromMarkerSeverity = /* @__PURE__ */ __name((severity) => {
  return severity;
}, "FromMarkerSeverity");
const RelatedInformationFromAPI = /* @__PURE__ */ __name((relatedInformation) => ({
  resource: relatedInformation.location.uri,
  message: relatedInformation.message,
  startLineNumber: relatedInformation.location.range.start.line + 1,
  startColumn: relatedInformation.location.range.start.character + 1,
  endLineNumber: relatedInformation.location.range.end.line + 1,
  endColumn: relatedInformation.location.range.end.character + 1
}), "RelatedInformationFromAPI");
const RelatedInformationToAPI = /* @__PURE__ */ __name((relatedInformationDTO) => new DiagnosticRelatedInformation(
  new Location(
    URIConverter.ToAPI(relatedInformationDTO.resource),
    new Range(
      new Position(
        relatedInformationDTO.startLineNumber - 1,
        relatedInformationDTO.startColumn - 1
      ),
      new Position(
        relatedInformationDTO.endLineNumber - 1,
        relatedInformationDTO.endColumn - 1
      )
    )
  ),
  relatedInformationDTO.message
), "RelatedInformationToAPI");
const FromAPI = /* @__PURE__ */ __name((diagnostic) => ({
  code: typeof diagnostic.code === "object" ? {
    value: String(diagnostic.code.value),
    target: diagnostic.code.target
  } : String(diagnostic.code),
  severity: ToMarkerSeverity(diagnostic.severity),
  message: diagnostic.message,
  source: diagnostic.source,
  startLineNumber: diagnostic.range.start.line + 1,
  startColumn: diagnostic.range.start.character + 1,
  endLineNumber: diagnostic.range.end.line + 1,
  endColumn: diagnostic.range.end.character + 1,
  relatedInformation: diagnostic.relatedInformation?.map(
    RelatedInformationFromAPI
  ),
  tags: diagnostic.tags
}), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((markerDataDTO) => {
  const RangeValue = new Range(
    new Position(
      markerDataDTO.startLineNumber - 1,
      markerDataDTO.startColumn - 1
    ),
    new Position(
      markerDataDTO.endLineNumber - 1,
      markerDataDTO.endColumn - 1
    )
  );
  const DiagnosticValue = new Diagnostic(
    RangeValue,
    markerDataDTO.message,
    FromMarkerSeverity(markerDataDTO.severity)
  );
  DiagnosticValue.source = markerDataDTO.source;
  if (typeof markerDataDTO.code === "object" && markerDataDTO.code) {
    DiagnosticValue.code = {
      value: markerDataDTO.code.value,
      target: URIConverter.ToAPI(markerDataDTO.code.target)
    };
  } else {
    DiagnosticValue.code = markerDataDTO.code;
  }
  DiagnosticValue.relatedInformation = markerDataDTO.relatedInformation?.map(
    RelatedInformationToAPI
  );
  DiagnosticValue.tags = markerDataDTO.tags;
  return DiagnosticValue;
}, "ToAPI");
const FromAPIArray = /* @__PURE__ */ __name((diagnostics) => diagnostics.map(FromAPI), "FromAPIArray");
var Diagnostic_default = { FromAPI, ToAPI, FromAPIArray };
export {
  Diagnostic_default as default
};
//# sourceMappingURL=Diagnostic.js.map
