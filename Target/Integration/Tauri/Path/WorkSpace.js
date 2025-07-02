var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { BaseDirectory, resolve } from "@tauri-apps/api/path";
import { Effect } from "effect";
import { URI } from "vscode-uri";
import { IntegrationPathProblem } from "./Problem.js";
const ResolveWorkSpacePath = /* @__PURE__ */ __name(() => Effect.tryPromise({
  // In this context, we'll treat the "workspace" as the app's config dir.
  // A more advanced implementation would get the actual open folder path.
  try: /* @__PURE__ */ __name(async () => {
    const workspaceConfigPath = await resolve(
      BaseDirectory.AppConfig.toString()
    );
    return URI.file(workspaceConfigPath);
  }, "try"),
  catch: /* @__PURE__ */ __name((Cause) => new IntegrationPathProblem({ Cause }), "catch")
}), "ResolveWorkSpacePath");
export {
  ResolveWorkSpacePath
};
//# sourceMappingURL=WorkSpace.js.map
