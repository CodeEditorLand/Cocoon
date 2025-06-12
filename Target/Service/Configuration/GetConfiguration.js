var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const GetConfiguration = /* @__PURE__ */ __name((Section, Scope) => Effect.sync(() => Vscode.workspace.getConfiguration(Section, Scope)), "GetConfiguration");
export {
  GetConfiguration
};
//# sourceMappingURL=GetConfiguration.js.map
