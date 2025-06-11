var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { deepClone } from "vs/base/common/objects.js";
const CreateWorkspaceConfiguration = /* @__PURE__ */ __name((Snapshot, SectionPrefix, IpcService, LogService) => {
  const get = /* @__PURE__ */ __name((key, defaultValue) => {
    const value = key.split(".").reduce((acc, part) => acc?.[part], Snapshot);
    return value !== void 0 ? deepClone(value) : defaultValue;
  }, "get");
  const update = /* @__PURE__ */ __name((key, value, target, overrideInLanguage) => {
    const updateEffect = IpcService.SendNotification(
      "$updateConfigurationOption",
      [target, `${SectionPrefix}.${key}`, value, overrideInLanguage]
    ).pipe(
      Effect.tapError(
        (err) => LogService.Error(
          `Configuration update for key '${key}' failed.`,
          err
        )
      )
    );
    return Effect.runPromise(updateEffect);
  }, "update");
  return {
    get,
    has: /* @__PURE__ */ __name((key) => get(key) !== void 0, "has"),
    inspect: /* @__PURE__ */ __name((key) => {
      return Promise.resolve(void 0);
    }, "inspect"),
    update
  };
}, "CreateWorkspaceConfiguration");
export {
  CreateWorkspaceConfiguration
};
//# sourceMappingURL=CreateWorkspaceConfiguration.js.map
