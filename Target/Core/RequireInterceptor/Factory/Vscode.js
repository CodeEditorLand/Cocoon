var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { nullExtensionDescription } from "vs/platform/extensions/common/extensions.js";
class VscodeNodeModuleFactory {
  constructor(ApiFactoryService, ExtensionPathsService, LogService) {
    this.ApiFactoryService = ApiFactoryService;
    this.ExtensionPathsService = ExtensionPathsService;
    this.LogService = LogService;
  }
  static {
    __name(this, "VscodeNodeModuleFactory");
  }
  NodeModuleName = "vscode";
  ApiImplCache = /* @__PURE__ */ new Map();
  Load(_Request, ParentUri) {
    const Extension = this.ExtensionPathsService.FindSubstr(ParentUri);
    if (Extension) {
      let ApiImpl = this.ApiImplCache.get(Extension.identifier.value);
      if (!ApiImpl) {
        ApiImpl = this.ApiFactoryService.CreateApi(Extension);
        this.ApiImplCache.set(Extension.identifier.value, ApiImpl);
      }
      return ApiImpl;
    }
    this.LogService.Warn(
      `Could not identify extension for 'vscode' require call from ${ParentUri.fsPath}`
    );
    return this.ApiFactoryService.CreateApi(nullExtensionDescription);
  }
}
export {
  VscodeNodeModuleFactory
};
//# sourceMappingURL=Vscode.js.map
