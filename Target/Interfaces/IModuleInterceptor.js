// Source/Interfaces/IModuleInterceptor.ts
import { Context } from "effect";
var SecurityLevel = /* @__PURE__ */ ((SecurityLevel2) => {
  SecurityLevel2["TRUSTED"] = "TRUSTED";
  SecurityLevel2["SANDBOXED"] = "SANDBOXED";
  SecurityLevel2["RESTRICTED"] = "RESTRICTED";
  SecurityLevel2["BLOCKED"] = "BLOCKED";
  return SecurityLevel2;
})(SecurityLevel || {});
var IModuleInterceptor = Context.Tag("IModuleInterceptor");
export {
  IModuleInterceptor,
  SecurityLevel
};
//# sourceMappingURL=IModuleInterceptor.js.map
