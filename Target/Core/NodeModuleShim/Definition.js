var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { InitDataService } from "../../Service/InitData.js";
import { LogProvider } from "../../Service/Log.js";
import { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";
import { CryptoShim } from "./Shim/Crypto.js";
import { CreateOsShim } from "./Shim/Os.js";
import { ProcessShim } from "./Shim/Process.js";
const Definition = Effect.gen(function* (_) {
  const Log = yield* _(LogProvider.Tag);
  const InitData = yield* _(InitDataService);
  const OsShim = CreateOsShim(InitData);
  const LoadEffect = /* @__PURE__ */ __name((Request, ParentUri) => Effect.gen(function* (_2) {
    const RequesterPath = ParentUri?.fsPath || "unknown module";
    yield* _2(
      Log.Trace(
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
        return yield* _2(
          Effect.fail(
            new ModuleBlockedError({ moduleName: Request })
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
            new ModuleNotShimmedError({ moduleName: Request })
          )
        );
    }
  }), "LoadEffect");
  const ServiceImplementation = {
    Load: LoadEffect
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
