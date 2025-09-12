var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Module from "node:module";
import { URI } from "@codeeditorland/output/vs/base/common/uri.js";
import { Cause, Effect, Exit } from "effect";
import { APIFactoryService } from "./APIFactory.js";
import { ExtensionPathService } from "./ExtensionPath.js";
import { LoggerService } from "./Logger.js";
import { NodeModuleShimService } from "./NodeModuleShim.js";
class VsCodeNodeModuleFactory {
  constructor(APIFactory, ExtensionPath, Logger) {
    this.APIFactory = APIFactory;
    this.ExtensionPath = ExtensionPath;
    this.Logger = Logger;
  }
  static {
    __name(this, "VsCodeNodeModuleFactory");
  }
  Load(_Request, ParentUri) {
    const Extension = this.ExtensionPath.FindSubstr(ParentUri);
    if (Extension) {
      return this.APIFactory.CreateAPI(Extension);
    }
    const ErrorMessage = `FATAL: require('vscode') was called from an unknown location: ${ParentUri.fsPath}. Could not determine extension owner.`;
    this.Logger.Error(ErrorMessage);
    throw new Error(
      "[Cocoon] `require('vscode')` may only be called from an extension."
    );
  }
}
class RequireInterceptorService extends Effect.Service()(
  "Service/RequireInterceptor",
  {
    effect: Effect.gen(function* () {
      const APIFactory = yield* APIFactoryService;
      const ExtensionPath = yield* ExtensionPathService;
      const Logger = yield* LoggerService;
      const NodeModuleShim = yield* NodeModuleShimService;
      const Factories = /* @__PURE__ */ new Map([
        [
          "vscode",
          new VsCodeNodeModuleFactory(
            APIFactory,
            ExtensionPath,
            Logger
          )
        ]
      ]);
      const OriginalRequire = Module.prototype.require;
      let IsInstalled = false;
      const Install = /* @__PURE__ */ __name(() => Effect.gen(function* () {
        if (IsInstalled) return;
        yield* Effect.sync(() => {
          Module.prototype.require = function(Request) {
            const Factory = Factories.get(Request);
            if (Factory) {
              const ParentUri = this.filename ? URI.file(this.filename) : URI.parse("unknown:/unknown");
              return Factory.Load(Request, ParentUri);
            }
            if (Module.builtinModules.includes(Request)) {
              const ParentUri = this.filename ? URI.file(this.filename) : URI.parse("unknown:/unknown");
              const ShimResult = NodeModuleShim.Load(
                Request,
                ParentUri
              );
              if (Exit.isSuccess(ShimResult)) {
                return ShimResult.value;
              }
              throw Cause.squash(ShimResult.cause);
            }
            return OriginalRequire.call(this, Request);
          };
          IsInstalled = true;
        });
        yield* Logger.Info(
          "Node.js require() interceptor has been successfully installed."
        );
      }), "Install");
      return { Install };
    })
  }
) {
  static {
    __name(this, "RequireInterceptorService");
  }
}
export {
  RequireInterceptorService,
  VsCodeNodeModuleFactory
};
//# sourceMappingURL=RequireInterceptor.js.map
