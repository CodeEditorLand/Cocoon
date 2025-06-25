var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Exit } from "effect";
import { InitDataService } from "./InitData.js";
import { LoggerService } from "./Logger.js";
import { ModuleBlockedProblem } from "./NodeModuleShim/ModuleBlockedProblem.js";
import { ModuleNotShimmedProblem } from "./NodeModuleShim/ModuleNotShimmedProblem.js";
import { CreateCryptoShim } from "./NodeModuleShim/Crypto.js";
import { CreateOsShim } from "./NodeModuleShim/Os.js";
import { ProcessShim } from "./NodeModuleShim/Process.js";
class NodeModuleShimService extends Effect.Service()(
  "Service/NodeModuleShim",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      const InitData = yield* InitDataService;
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
      const Load = /* @__PURE__ */ __name((Request, ParentUri) => {
        const RequesterPath = ParentUri?.fsPath || "unknown module";
        Effect.runFork(
          Logger.Trace(
            `Intercepted require('${Request}') from '${RequesterPath}'.`
          )
        );
        if (BlockedModules.has(Request)) {
          return Exit.fail(
            new ModuleBlockedProblem({ ModuleName: Request })
          );
        }
        const Shim = Shims.get(Request);
        if (Shim) {
          return Exit.succeed(Shim);
        }
        return Exit.fail(
          new ModuleNotShimmedProblem({ ModuleName: Request })
        );
      }, "Load");
      return { Load };
    })
  }
) {
  static {
    __name(this, "NodeModuleShimService");
  }
}
export {
  NodeModuleShimService
};
//# sourceMappingURL=NodeModuleShim.js.map
