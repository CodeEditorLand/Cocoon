var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { APIFactoryService } from "./APIFactory.js";
import { ExtensionPathService } from "./ExtensionPath.js";
import { LoggerService } from "./Logger.js";
class ESMInterceptorService extends Effect.Service()(
  "Service/ESMInterceptor",
  {
    effect: Effect.gen(function* () {
      yield* APIFactoryService;
      yield* ExtensionPathService;
      const Logger = yield* LoggerService;
      const Install = /* @__PURE__ */ __name(() => Effect.gen(function* () {
        yield* Logger.Warn(
          "ESMInterceptor.Install is a stub and has no effect."
        );
      }), "Install");
      return { Install };
    })
  }
) {
  static {
    __name(this, "ESMInterceptorService");
  }
}
export {
  ESMInterceptorService
};
//# sourceMappingURL=ESMInterceptor.js.map
