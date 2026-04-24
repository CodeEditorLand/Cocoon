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
export {
  SerializeFilters
};
//# sourceMappingURL=Filter.js.map
