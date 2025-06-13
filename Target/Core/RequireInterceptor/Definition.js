var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Module from "node:module";
import { Effect } from "effect";
import { URI } from "vs/base/common/uri.js";
import { Log } from "../../Service/Log.js";
import { APIFactory } from "../APIFactory.js";
import { ExtensionPath } from "../ExtensionPath.js";
import { VscodeNodeModuleFactory } from "./Factory.js";
const Definition = Effect.gen(function* (_) {
  const APIFactoryService = yield* _(APIFactory.Tag);
  const ExtensionPathService = yield* _(ExtensionPath.Tag);
  const LogService = yield* _(Log.Tag);
  const Factories = /* @__PURE__ */ new Map();
  Factories.set(
    "vscode",
    new VscodeNodeModuleFactory(
      APIFactoryService,
      ExtensionPathService,
      LogService
    )
  );
  const OriginalRequire = Module.prototype.require;
  let isInstalled = false;
  const Install = /* @__PURE__ */ __name(() => Effect.sync(() => {
    if (isInstalled) {
      return;
    }
    Module.prototype.require = function(Request) {
      const Factory = Factories.get(Request);
      if (Factory) {
        const ParentURI = this.filename ? URI.file(this.filename) : URI.parse("unknown:/unknown");
        return Factory.Load(
          Request,
          ParentURI,
          (req) => OriginalRequire.call(this, req)
        );
      }
      return OriginalRequire.call(this, Request);
    };
    isInstalled = true;
    LogService.Info(
      "Node.js require() interceptor has been successfully installed."
    );
  }), "Install");
  const ServiceImplementation = {
    Install
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
