// Source/Interfaces/I/Module/Interceptor/Service.ts
import { Context } from "effect";
var SecurityLevel = /* @__PURE__ */ ((SecurityLevel2) => {
  SecurityLevel2["TRUSTED"] = "TRUSTED";
  SecurityLevel2["SANDBOXED"] = "SANDBOXED";
  SecurityLevel2["RESTRICTED"] = "RESTRICTED";
  SecurityLevel2["BLOCKED"] = "BLOCKED";
  return SecurityLevel2;
})(SecurityLevel || {});
var IModuleInterceptorService = Context.Tag(
  "IModuleInterceptorService"
);
export {
  IModuleInterceptorService,
  SecurityLevel
};
//# sourceMappingURL=Service.js.map
