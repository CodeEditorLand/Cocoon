var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Module from "node:module";
import { Effect } from "effect";
import { URI } from "vs/base/common/uri.js";
import { Tag as LogTag } from "../../Service/Log.js";
import { Tag as ApiFactoryTag } from "../ApiFactory/mod.js";
import { Tag as ExtensionPathsTag } from "../ExtensionPaths/mod.js";
import {
  VscodeNodeModuleFactory
} from "./Factory/mod.js";
const Definition = Effect.gen(function* (_) {
  const ApiFactory = yield* _(ApiFactoryTag);
  const ExtensionPaths = yield* _(ExtensionPathsTag);
  const Log = yield* _(LogTag);
  const Factories = /* @__PURE__ */ new Map();
  Factories.set(
    "vscode",
    new VscodeNodeModuleFactory(ApiFactory, ExtensionPaths, Log)
  );
  const OriginalRequire = Module.prototype.require;
  const InstallEffect = /* @__PURE__ */ __name(() => Effect.sync(() => {
    Module.prototype.require = function(Request) {
      const Factory = Factories.get(Request);
      if (Factory) {
        const ParentUri = this.filename ? URI.file(this.filename) : URI.file("/");
        return Factory.Load(
          Request,
          ParentUri,
          (req) => OriginalRequire.call(this, req)
        );
      }
      return OriginalRequire.call(this, Request);
    };
    Log.Info(
      "Node.js require() interceptor has been successfully installed."
    );
  }), "InstallEffect");
  const ServiceImplementation = {
    Install: InstallEffect
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
