var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { BaseDirectory, resolve } from "@tauri-apps/api/path";
import { Effect } from "effect";
import { URI } from "vscode-uri";
import { IntegrationPathProblem } from "./Problem.js";
const ResolveFinalDefaultPath = /* @__PURE__ */ __name(() => Effect.tryPromise({
  try: /* @__PURE__ */ __name(async () => {
    const appConfigPath = await resolve(
      BaseDirectory.AppConfig.toString()
    );
    return URI.file(appConfigPath);
  }, "try"),
  catch: /* @__PURE__ */ __name((Cause) => new IntegrationPathProblem({ Cause }), "catch")
}), "ResolveFinalDefaultPath");
export {
  ResolveFinalDefaultPath
};
//# sourceMappingURL=Default.js.map
