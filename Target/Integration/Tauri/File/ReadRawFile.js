var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Effect } from "effect";
import { IntegrationConfigurationProblem } from "../Configuration/Problem.js";
const ReadRawFile = /* @__PURE__ */ __name((Uri) => Effect.tryPromise({
  try: /* @__PURE__ */ __name(() => readTextFile(Uri.fsPath), "try"),
  catch: /* @__PURE__ */ __name((Cause) => new IntegrationConfigurationProblem({ Cause }), "catch")
}), "ReadRawFile");
export {
  ReadRawFile
};
//# sourceMappingURL=ReadRawFile.js.map
