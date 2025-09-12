var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const On = (await import("../Cocoon.js")).On;
const Bundle = (await import("../Cocoon.js")).Bundle;
const Merge = (await import("deepmerge-ts")).deepmergeCustom({
  mergeArrays: false
});
var Compile_default = /* @__PURE__ */ __name(async (Current) => Merge(
  await (await import("../Target.js")).default(Current),
  {
    bundle: true,
    outbase: "Target",
    tsconfig: "Configuration/tsconfig/Target/Compile.json",
    plugins: [],
    allowOverwrite: true
  }
), "default");
export {
  Bundle,
  Merge,
  On,
  Compile_default as default
};
//# sourceMappingURL=Compile.js.map
