var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
const SerializeFilters = /* @__PURE__ */ __name((Filters) => {
  if (!Filters) {
    return void 0;
  }
  return Object.entries(Filters).map(([Name, Extensions]) => ({
    name: Name,
    extensions: Extensions
  }));
}, "SerializeFilters");
const OpenDialogOption = {
  ToDTO: /* @__PURE__ */ __name((Options) => {
    if (!Options) {
      return void 0;
    }
    return {
      ...Options,
      defaultUri: Options.defaultUri?.toJSON(),
      filters: SerializeFilters(Options.filters)
    };
  }, "ToDTO")
};
const SaveDialogOption = {
  ToDTO: /* @__PURE__ */ __name((Options) => {
    if (!Options) {
      return void 0;
    }
    return {
      ...Options,
      defaultUri: Options.defaultUri?.toJSON(),
      filters: SerializeFilters(Options.filters)
    };
  }, "ToDTO")
};
const DialogResult = {
  ToURI: /* @__PURE__ */ __name((DTO) => {
    if (!DTO) {
      return void 0;
    }
    return ExtHostTypes.URI.revive(DTO);
  }, "ToURI"),
  ToURIArray: /* @__PURE__ */ __name((DTOs) => {
    if (!DTOs || !Array.isArray(DTOs)) {
      return void 0;
    }
    return DTOs.map(DialogResult.ToURI).filter((URI) => !!URI);
  }, "ToURIArray")
};
var Dialog_default = {
  OpenDialogOption,
  SaveDialogOption,
  DialogResult
};
export {
  Dialog_default as default
};
//# sourceMappingURL=Dialog.js.map
