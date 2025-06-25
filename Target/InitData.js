var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const DummyInitData = {
  extensions: { allExtensions: [] },
  environment: {},
  logLevel: 0,
  remote: {},
  telemetryInfo: {},
  uiKind: 0,
  quality: "",
  workspace: {}
};
class InitDataService extends Effect.Service()(
  "Service/InitData",
  {
    sync: /* @__PURE__ */ __name(() => DummyInitData, "sync")
  }
) {
  static {
    __name(this, "InitDataService");
  }
}
export {
  InitDataService
};
//# sourceMappingURL=InitData.js.map
