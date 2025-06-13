var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { Effect } from "effect";
import { Uri } from "vscode";
import { InitData } from "../InitData.js";
import { Log } from "../Log.js";
import { EnsureDirectory } from "./Support/EnsureDirectory.js";
const Definition = Effect.gen(function* (_) {
  const InitDataService = yield* _(InitData.Tag);
  const LogService = yield* _(Log.Tag);
  const GlobalStorageURI = InitDataService.environment.globalStorageHome;
  const WorkSpaceStorageURI = InitDataService.environment.workspaceStorageHome;
  yield* _(EnsureDirectory(GlobalStorageURI, "Global"));
  yield* _(EnsureDirectory(WorkSpaceStorageURI, "WorkSpace"));
  const GetPathForExtension = /* @__PURE__ */ __name((BaseURI, Extension) => {
    if (!BaseURI || !Extension?.identifier?.value) {
      return void 0;
    }
    const ExtensionSubdirectory = Extension.identifier.value.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
    return Uri.joinPath(BaseURI, ExtensionSubdirectory);
  }, "GetPathForExtension");
  const ServiceImplementation = {
    GetWorkSpaceStorageURI: /* @__PURE__ */ __name((Extension) => GetPathForExtension(WorkSpaceStorageURI, Extension), "GetWorkSpaceStorageURI"),
    GetGlobalStorageURI: /* @__PURE__ */ __name((Extension) => {
      const uri = GetPathForExtension(GlobalStorageURI, Extension);
      if (!uri) {
        const EmergencyPath = Path.join(
          process.cwd(),
          ".cocoon-data/global",
          Extension.identifier.value.toLowerCase()
        );
        Effect.runSync(
          LogService.Error(
            `FATAL: Could not resolve global storage path for ${Extension.identifier.value}. Falling back to ${EmergencyPath}`
          )
        );
        return Uri.file(EmergencyPath);
      }
      return uri;
    }, "GetGlobalStorageURI")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
