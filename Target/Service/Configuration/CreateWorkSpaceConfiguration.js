var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { deepClone } from "vs/base/common/objects.js";
function CreateWorkSpaceConfiguration(Snapshot, SectionPrefix, IPCService, LogService) {
  const get = /* @__PURE__ */ __name((key, defaultValue) => {
    const value = key.split(".").reduce((acc, part) => acc?.[part], Snapshot);
    return value !== void 0 ? deepClone(value) : defaultValue;
  }, "get");
  const update = /* @__PURE__ */ __name((key, value, target, overrideInLanguage) => {
    const updateEffect = IPCService.SendNotification(
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
      const value = get(key);
      return Promise.resolve({
        key,
        defaultValue: value,
        globalValue: value,
        workspaceValue: value,
        workspaceFolderValue: value
      });
    }, "inspect"),
    update
  };
}
__name(CreateWorkSpaceConfiguration, "CreateWorkSpaceConfiguration");
export {
  CreateWorkSpaceConfiguration
};
//# sourceMappingURL=CreateWorkSpaceConfiguration.js.map
