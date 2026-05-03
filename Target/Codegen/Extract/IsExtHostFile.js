var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Codegen/Extract/IsExtHostFile.ts
var ExtHostPathSegments = [
  "vs/workbench/api/common/extHost",
  "vs/workbench/api/browser/extHost",
  "vs/workbench/api/worker/extHost",
  "vs/workbench/api/electron-browser/extHost"
];
var IsExtHostFile = /* @__PURE__ */ __name((sourcePath) => {
  const Normalised = sourcePath.replace(/\\/g, "/");
  for (const Segment of ExtHostPathSegments) {
    if (Normalised.includes(Segment)) return true;
  }
  return false;
}, "IsExtHostFile");
var IsExtHostFile_default = IsExtHostFile;
export {
  IsExtHostFile,
  IsExtHostFile_default as default
};
//# sourceMappingURL=IsExtHostFile.js.map
