var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { deepClone } from "vs/base/common/objects.js";
const CreateWorkSpaceConfiguration = /* @__PURE__ */ __name((Snapshot, SectionPrefix, IPC, Log) => {
  const Get = /* @__PURE__ */ __name((Key, DefaultValue) => {
    const Value = Key.split(".").reduce(
      (Accumulator, Part) => Accumulator?.[Part],
      Snapshot
    );
    return Value !== void 0 ? deepClone(Value) : DefaultValue;
  }, "Get");
  const Update = /* @__PURE__ */ __name((Key, Value, Target, OverrideInLanguage) => {
    const UpdateEffect = IPC.SendNotification(
      "$updateConfigurationOption",
      [Target, `${SectionPrefix}.${Key}`, Value, OverrideInLanguage]
    ).pipe(
      Effect.tapError(
        (Error2) => Log.Error(
          `Configuration update for key '${Key}' failed.`,
          Error2
        )
      )
    );
    return Effect.runPromise(UpdateEffect);
  }, "Update");
  return {
    get: Get,
    has: /* @__PURE__ */ __name((Key) => Get(Key) !== void 0, "has"),
    inspect: /* @__PURE__ */ __name((Key) => {
      const Value = Get(Key);
      return Promise.resolve({
        key: Key,
        defaultValue: Value,
        globalValue: Value,
        workspaceValue: Value,
        workspaceFolderValue: Value
      });
    }, "inspect"),
    update: Update
  };
}, "CreateWorkSpaceConfiguration");
var CreateWorkSpaceConfiguration_default = CreateWorkSpaceConfiguration;
export {
  CreateWorkSpaceConfiguration_default as default
};
//# sourceMappingURL=CreateWorkSpaceConfiguration.js.map
