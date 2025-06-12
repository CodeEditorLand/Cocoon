var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { Effect } from "effect";
import { Uri } from "vscode";
import { InitDataService } from "../InitData.js";
import { LogProvider } from "../Log.js";
import { EnsureDirectory } from "./Support/EnsureDirectory.js";
const Definition = Effect.gen(function* (_) {
  const InitData = yield* _(InitDataService);
  const Log = yield* _(LogProvider.Tag);
  const GlobalStorageUri = InitData.environment.globalStorageHome;
  const WorkspaceStorageUri = InitData.environment.workspaceStorageHome;
  yield* _(EnsureDirectory(GlobalStorageUri, "Global"));
  yield* _(EnsureDirectory(WorkspaceStorageUri, "Workspace"));
  const GetPathForExtension = /* @__PURE__ */ __name((BaseUri, Extension) => {
    if (!BaseUri || !Extension?.identifier?.value) {
      return void 0;
    }
    const ExtensionSubdir = Extension.identifier.value.toLowerCase().replace(/[^a-z0-9-]/g, "_");
    return Uri.joinPath(BaseUri, ExtensionSubdir);
  }, "GetPathForExtension");
  const ServiceImplementation = {
    GetWorkspaceStorageUri: /* @__PURE__ */ __name((Extension) => GetPathForExtension(WorkspaceStorageUri, Extension), "GetWorkspaceStorageUri"),
    GetGlobalStorageUri: /* @__PURE__ */ __name((Extension) => {
      const uri = GetPathForExtension(GlobalStorageUri, Extension);
      if (!uri) {
        const EmergencyPath = Path.join(
          process.cwd(),
          ".cocoon-data/global",
          Extension.identifier.value.toLowerCase()
        );
        Effect.runSync(
          Log.Error(
            `FATAL: Could not resolve global storage path for ${Extension.identifier.value}. Falling back to ${EmergencyPath}`
          )
        );
        return Uri.file(EmergencyPath);
      }
      return uri;
    }, "GetGlobalStorageUri")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
