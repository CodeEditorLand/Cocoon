var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Dialog/Filter.ts
var SerializeFilters = /* @__PURE__ */ __name((Filters) => {
  if (!Filters) {
    return void 0;
  }
  return Object.entries(Filters).map(([Name, Extensions]) => ({
    name: Name,
    extensions: Extensions
  }));
}, "SerializeFilters");

// Source/TypeConverter/Dialog/SaveDialogOption.ts
var ToDTO = /* @__PURE__ */ __name((Options) => {
  if (!Options) {
    return void 0;
  }
  return {
    ...Options,
    defaultUri: Options.defaultUri?.toJSON(),
    filters: SerializeFilters(Options.filters)
  };
}, "ToDTO");
export {
  ToDTO
};
//# sourceMappingURL=SaveDialogOption.js.map
