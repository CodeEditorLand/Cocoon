var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Uri } from "../Type/ExtHostTypes.js";
const SerializeFilters = /* @__PURE__ */ __name((filters) => {
  if (!filters) return void 0;
  return Object.entries(filters).map(([Name, Extensions]) => ({
    Name,
    Extensions
  }));
}, "SerializeFilters");
var OpenDialogOptions;
((OpenDialogOptions2) => {
  OpenDialogOptions2.ToDto = /* @__PURE__ */ __name((options) => {
    if (!options) return void 0;
    return {
      ...options,
      defaultUri: options.defaultUri?.toJSON(),
      // Use built-in toJSON
      filters: SerializeFilters(options.filters)
    };
  }, "ToDto");
})(OpenDialogOptions || (OpenDialogOptions = {}));
var SaveDialogOptions;
((SaveDialogOptions2) => {
  SaveDialogOptions2.ToDto = /* @__PURE__ */ __name((options) => {
    if (!options) return void 0;
    return {
      ...options,
      defaultUri: options.defaultUri?.toJSON(),
      filters: SerializeFilters(options.filters)
    };
  }, "ToDto");
})(SaveDialogOptions || (SaveDialogOptions = {}));
var DialogResult;
((DialogResult2) => {
  DialogResult2.ToUri = /* @__PURE__ */ __name((dto) => {
    if (!dto) return void 0;
    return Uri.revive(dto);
  }, "ToUri");
  DialogResult2.ToUriArray = /* @__PURE__ */ __name((dtos) => {
    if (!dtos || !Array.isArray(dtos)) return void 0;
    return dtos.map(DialogResult2.ToUri).filter((u) => !!u);
  }, "ToUriArray");
})(DialogResult || (DialogResult = {}));
export {
  DialogResult,
  OpenDialogOptions,
  SaveDialogOptions
};
//# sourceMappingURL=Dialog.js.map
