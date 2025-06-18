import { Effect, Exit } from "effect";
import InitDataService from "../../Service/InitData/Service.js";
import LogService from "../../Service/Log/Service.js";
import ModuleBlockedError from "./Error/ModuleBlockedError.js";
import ModuleNotShimmedError from "./Error/ModuleNotShimmedError.js";
import CreateCryptoShim from "./Shim/Crypto.js";
import CreateOsShim from "./Shim/Os.js";
import ProcessShim from "./Shim/Process.js";
var Definition_default = Effect.gen(function* (G) {
  const Log = yield* G(LogService);
  const InitData = yield* G(InitDataService);
  const OsShim = CreateOsShim(InitData);
  const CryptoShim = CreateCryptoShim();
  const BlockedModules = /* @__PURE__ */ new Set([
    "fs",
    "node:fs",
    "fs/promises",
    "node:fs/promises",
    "path",
    "node:path",
    "child_process",
    "node:child_process",
    "worker_threads",
    "node:worker_threads",
    "cluster",
    "node:cluster",
    "vm",
    "node:vm"
  ]);
  const Shims = /* @__PURE__ */ new Map([
    ["os", OsShim],
    ["node:os", OsShim],
    ["crypto", CryptoShim],
    ["node:crypto", CryptoShim],
    ["process", ProcessShim],
    ["node:process", ProcessShim]
  ]);
  const NodeModuleShim = {
    Load(Request, ParentURI) {
      const RequesterPath = ParentURI?.fsPath || "unknown module";
      Effect.runFork(
        Log.Trace(
          `Intercepted require('${Request}') from '${RequesterPath}'.`
        )
      );
      if (BlockedModules.has(Request)) {
        return Exit.fail(
          new ModuleBlockedError({ ModuleName: Request })
        );
      }
      const Shim = Shims.get(Request);
      if (Shim) {
        return Exit.succeed(Shim);
      }
      return Exit.fail(
        new ModuleNotShimmedError({ ModuleName: Request })
      );
    }
  };
  return NodeModuleShim;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
