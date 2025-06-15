var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Module from "node:module";
import { Effect } from "effect";
import { URI } from "vs/base/common/uri.js";
import LogService from "../../Service/Log/Service.js";
import APIFactoryService from "../APIFactory/Service.js";
import ExtensionPathService from "../ExtensionPath/Service.js";
import NodeModuleShimService from "../NodeModuleShim/Service.js";
import VSCodeNodeModuleFactory from "./Factory/VSCode.js";
var Definition_default = Effect.gen(function* () {
  const APIFactory = yield* APIFactoryService;
  const ExtensionPath = yield* ExtensionPathService;
  const Log = yield* LogService;
  const NodeModuleShim = yield* NodeModuleShimService;
  const Factories = /* @__PURE__ */ new Map([
    ["vscode", new VSCodeNodeModuleFactory(APIFactory, ExtensionPath, Log)]
    // Other factories for modules like 'open' or 'electron' would be added here.
  ]);
  const OriginalRequire = Module.prototype.require;
  let IsInstalled = false;
  const Install = /* @__PURE__ */ __name(() => Effect.gen(function* () {
    if (IsInstalled) {
      return;
    }
    yield* Effect.sync(() => {
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
          const ShimResult = Effect.runSyncExit(
            NodeModuleShim.Load(Request, ParentURI)
          );
          if (ShimResult._tag === "Success") {
            return ShimResult.value;
          } else {
            throw ShimResult.cause;
          }
        }
        return OriginalRequire.call(this, Request);
      };
      IsInstalled = true;
    });
    yield* Log.Info(
      "Node.js require() interceptor has been successfully installed."
    );
  }), "Install");
  const RequireInterceptorImplementation = {
    Install
  };
  return RequireInterceptorImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
