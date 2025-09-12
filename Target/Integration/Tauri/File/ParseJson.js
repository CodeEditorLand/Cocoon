var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IntegrationConfigurationProblem } from "../Configuration/Problem.js";
const ParseJSON = /* @__PURE__ */ __name((JSONString) => Effect.try({
  try: /* @__PURE__ */ __name(() => JSON.parse(JSONString), "try"),
  catch: /* @__PURE__ */ __name((Cause) => new IntegrationConfigurationProblem({ Cause }), "catch")
}), "ParseJSON");
export {
  ParseJSON
};
//# sourceMappingURL=ParseJson.js.map
