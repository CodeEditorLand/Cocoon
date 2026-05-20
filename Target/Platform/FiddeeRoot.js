var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Platform/FiddeeRoot.ts
var DotfileName = ".fiddee";
function FiddeeRoot() {
  const Home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? null;
  if (typeof Home === "string" && Home.length > 0) {
    return `${Home}/${DotfileName}`;
  }
  return DotfileName;
}
__name(FiddeeRoot, "FiddeeRoot");
export {
  DotfileName,
  FiddeeRoot as default
};
//# sourceMappingURL=FiddeeRoot.js.map
