var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Module from "node:module";
import { Cause, Effect, Exit } from "effect";
import { URI } from "vs/base/common/uri.js";
import LogService from "../../Service/Log/Service.js";
import APIFactoryService from "../APIFactory/Service.js";
import ExtensionPathService from "../ExtensionPath/Service.js";
import NodeModuleShimService from "../NodeModuleShim/Service.js";
import VSCodeNodeModuleFactory from "./Factory/VSCode.js";
var Definition_default = Effect.gen(function* (G) {
  const APIFactory = yield* G(APIFactoryService);
  const ExtensionPath = yield* G(ExtensionPathService);
  const Log = yield* G(LogService);
  const NodeModuleShim = yield* G(NodeModuleShimService);
  const Factories = /* @__PURE__ */ new Map([
    ["vscode", new VSCodeNodeModuleFactory(APIFactory, ExtensionPath, Log)]
  ]);
  const OriginalRequire = Module.prototype.require;
  let IsInstalled = false;
  const InstallEffect = /* @__PURE__ */ __name(() => Effect.gen(function* (G2) {
    if (IsInstalled) {
      return;
    }
    yield* G2(
      Effect.sync(() => {
        Module.prototype.require = function(Request) {
          const Factory = Factories.get(Request);
          if (Factory) {
            const ParentURI = this.filename ? URI.file(this.filename) : URI.parse("unknown:/unknown");
            return Factory.Load(
              Request,
              ParentURI,
              (Req) => OriginalRequire.call(this, Req)
            );
          }
          if (Module.builtinModules.includes(Request)) {
            const ParentURI = this.filename ? URI.file(this.filename) : URI.parse("unknown:/unknown");
            const ShimResult = NodeModuleShim.Load(
              Request,
              ParentURI
            );
            if (Exit.isSuccess(ShimResult)) {
              return ShimResult.value;
            } else {
              throw Cause.squash(ShimResult.cause);
            }
          }
          return OriginalRequire.call(this, Request);
        };
        IsInstalled = true;
      })
    );
    yield* G2(
      Log.Info(
        "Node.js require() interceptor has been successfully installed."
      )
    );
  }), "InstallEffect");
  const RequireInterceptorImplementation = {
    Install: InstallEffect
  };
  return RequireInterceptorImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
