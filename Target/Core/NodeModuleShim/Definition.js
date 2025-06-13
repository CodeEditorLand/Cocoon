var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { InitData } from "../../Service/InitData.js";
import { Log } from "../../Service/Log.js";
import { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";
import { CryptoShim } from "./Shim/Crypto.js";
import { CreateOsShim } from "./Shim/Os.js";
import { ProcessShim } from "./Shim/Process.js";
const Definition = Effect.gen(function* (_) {
  const LogService = yield* _(Log.Tag);
  const InitDataService = yield* _(InitData.Tag);
  const OsShim = CreateOsShim(InitDataService);
  const Load = /* @__PURE__ */ __name((Request, ParentURI) => Effect.gen(function* (_2) {
    const RequesterPath = ParentURI?.fsPath || "unknown module";
    yield* _2(
      LogService.Trace(
        `Intercepted require('${Request}') from '${RequesterPath}'.`
      )
    );
    switch (Request) {
      // Blocked modules that interact directly with the filesystem or host.
      case "fs":
      case "node:fs":
      case "fs/promises":
      case "node:fs/promises":
      case "path":
      case "node:path":
      case "child_process":
      case "node:child_process":
      case "worker_threads":
      case "node:worker_threads":
      case "cluster":
      case "node:cluster":
      case "vm":
      case "node:vm":
        return yield* _2(
          Effect.fail(
            new ModuleBlockedError({ ModuleName: Request })
          )
        );
      // Safe, sandboxed shims.
      case "os":
      case "node:os":
        return OsShim;
      case "crypto":
      case "node:crypto":
        return CryptoShim;
      case "process":
      case "node:process":
        return ProcessShim;
      // Any other module is considered not shimmed and will fail.
      default:
        return yield* _2(
          Effect.fail(
            new ModuleNotShimmedError({ ModuleName: Request })
          )
        );
    }
  }), "Load");
  const ServiceImplementation = {
    Load
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
