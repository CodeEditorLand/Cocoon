var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/WebviewPanel/TypeConverter.ts
import { Effect } from "effect";
var TypeConverterService = class extends Effect.Service()(
  "TypeConverter/WebviewPanel",
  {
    effect: Effect.gen(function* () {
      const ConvertUriToString = /* @__PURE__ */ __name((Uri2) => {
        return Uri2.toString();
      }, "ConvertUriToString");
      const ConvertStringToUri = /* @__PURE__ */ __name((String) => {
        return {
          scheme: "",
          authority: "",
          path: String,
          query: "",
          fragment: "",
          fsPath: String,
          with: /* @__PURE__ */ __name((change) => ({ ...Uri, ...change }), "with"),
          toJSON: /* @__PURE__ */ __name(() => String, "toJSON"),
          toString: /* @__PURE__ */ __name(() => String, "toString")
        };
      }, "ConvertStringToUri");
      const ConvertViewColumnToNumber = /* @__PURE__ */ __name((ViewColumn) => {
        return ViewColumn;
      }, "ConvertViewColumnToNumber");
      const ConvertNumberToViewColumn = /* @__PURE__ */ __name((Number) => {
        return Number;
      }, "ConvertNumberToViewColumn");
      const ConvertPanelOptionsToDTO = /* @__PURE__ */ __name((Options) => {
        return {
          EnableScripts: Options.EnableScripts,
          RetainContextWhenHidden: Options.RetainContextWhenHidden,
          EnableFindWidget: Options.EnableFindWidget,
          LocalResourceRoots: Options.LocalResourceRoots,
          PortMapping: Options.PortMapping
        };
      }, "ConvertPanelOptionsToDTO");
      const ConvertDTOToPanelOptions = /* @__PURE__ */ __name((DTO) => {
        return {
          EnableScripts: DTO.EnableScripts,
          RetainContextWhenHidden: DTO.RetainContextWhenHidden,
          EnableFindWidget: DTO.EnableFindWidget,
          LocalResourceRoots: DTO.LocalResourceRoots,
          PortMapping: DTO.PortMapping
        };
      }, "ConvertDTOToPanelOptions");
      const ConvertPositionToDTO = /* @__PURE__ */ __name((Position) => {
        return {
          ViewColumn: Position.ViewColumn,
          PreservedFocus: Position.PreservedFocus
        };
      }, "ConvertPositionToDTO");
      const ConvertDTOToPosition = /* @__PURE__ */ __name((DTO) => {
        return {
          ViewColumn: DTO.ViewColumn,
          PreservedFocus: DTO.PreservedFocus
        };
      }, "ConvertDTOToPosition");
      const ConvertViewStateToDTO = /* @__PURE__ */ __name((ViewState) => {
        return {
          Active: ViewState.Active,
          Visible: ViewState.Visible,
          ViewColumn: ViewState.ViewColumn
        };
      }, "ConvertViewStateToDTO");
      const ConvertDTOToViewState = /* @__PURE__ */ __name((DTO) => {
        return {
          Active: DTO.Active,
          Visible: DTO.Visible,
          ViewColumn: DTO.ViewColumn
        };
      }, "ConvertDTOToViewState");
      return {
        ConvertUriToString,
        ConvertStringToUri,
        ConvertViewColumnToNumber,
        ConvertNumberToViewColumn,
        ConvertPanelOptionsToDTO,
        ConvertDTOToPanelOptions,
        ConvertPositionToDTO,
        ConvertDTOToPosition,
        ConvertViewStateToDTO,
        ConvertDTOToViewState
      };
    })
  }
) {
  static {
    __name(this, "TypeConverterService");
  }
};
export {
  TypeConverterService
};
//# sourceMappingURL=TypeConverter.js.map
