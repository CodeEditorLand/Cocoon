var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import { joinPath } from "@codeeditorland/output/vs/base/common/resources.js";
import { deepmerge } from "deepmerge-ts";
import { Effect } from "effect";
import { ApplicationConfigurationProblem } from "./ApplicationConfiguration/ApplicationConfigurationProblem.js";
import { ParseJSON } from "./Integration/Tauri/File/ParseJSON.js";
import { ReadRawFile } from "./Integration/Tauri/File/ReadRawFile.js";
import { ResolveFinalDefaultPath } from "./Integration/Tauri/Path/Default.js";
import { ResolveWorkSpacePath } from "./Integration/Tauri/Path/WorkSpace.js";
const ResolveConfigurationFile = /* @__PURE__ */ __name((ConfigDirectoryEffect, FileName) => Effect.flatMap(
  ConfigDirectoryEffect,
  (ConfigDirectory) => ReadRawFile(
    ConfigDirectory.with({
      path: joinPath(ConfigDirectory, FileName).path
    })
  ).pipe(
    Effect.flatMap(ParseJSON),
    Effect.catchAll(() => Effect.succeed({}))
  )
).pipe(
  Effect.mapError(
    (e) => e
  )
), "ResolveConfigurationFile");
const ResolveConfiguration = Effect.all(
  {
    User: ResolveConfigurationFile(
      ResolveFinalDefaultPath(),
      "settings.json"
    ),
    WorkSpace: ResolveConfigurationFile(
      ResolveWorkSpacePath(),
      "settings.json"
    )
  },
  { concurrency: "unbounded" }
).pipe(
  Effect.map(({ User, WorkSpace }) => deepmerge(User, WorkSpace)),
  Effect.mapError(
    (Cause) => new ApplicationConfigurationProblem({
      Cause,
      Context: "FailedToResolveConfiguration"
    })
  )
);
const GetValueFromObject = /* @__PURE__ */ __name((ConfigurationObject, Key) => {
  if (typeof ConfigurationObject !== "object" || ConfigurationObject === null) {
    return void 0;
  }
  return Key.split(".").reduce(
    (Current, Part) => Current?.[Part],
    ConfigurationObject
  );
}, "GetValueFromObject");
class ApplicationConfigurationService extends Effect.Service()(
  "vscode/ApplicationConfigurationService",
  {
    effect: Effect.gen(function* () {
      const ConfigurationData = yield* ResolveConfiguration;
      const Service = {
        _serviceBrand: void 0,
        getValue(section, _overrides) {
          const Key = typeof section === "string" ? section : void 0;
          if (!Key) {
            return ConfigurationData;
          }
          return GetValueFromObject(ConfigurationData, Key);
        },
        updateValue: /* @__PURE__ */ __name(() => Promise.resolve(), "updateValue"),
        inspect: /* @__PURE__ */ __name((key, _overrides) => {
          const value = Service.getValue(key, _overrides);
          return {
            key,
            value,
            defaultValue: value,
            userValue: value,
            workspaceValue: value,
            workspaceFolderValue: value
          };
        }, "inspect"),
        keys: /* @__PURE__ */ __name(() => ({
          default: [],
          user: [],
          workspace: [],
          workspaceFolder: []
        }), "keys"),
        reloadConfiguration: /* @__PURE__ */ __name(() => Promise.resolve(), "reloadConfiguration"),
        onDidChangeConfiguration: new Emitter().event
      };
      return Service;
    })
  }
) {
  static {
    __name(this, "ApplicationConfigurationService");
  }
}
export {
  ApplicationConfigurationService
};
//# sourceMappingURL=ApplicationConfiguration.js.map
