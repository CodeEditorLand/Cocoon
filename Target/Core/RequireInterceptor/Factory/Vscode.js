var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { nullExtensionDescription } from "vs/platform/extensions/common/extensions.js";
class VscodeNodeModuleFactory {
  constructor(APIFactoryService, ExtensionPathService, LogService) {
    this.APIFactoryService = APIFactoryService;
    this.ExtensionPathService = ExtensionPathService;
    this.LogService = LogService;
  }
  static {
    __name(this, "VscodeNodeModuleFactory");
  }
  NodeModuleName = "vscode";
  APIImplementationCache = /* @__PURE__ */ new Map();
  Load(_Request, ParentURI) {
    const Extension = this.ExtensionPathService.FindSubstr(ParentURI);
    if (Extension) {
      const extensionId = Extension.identifier.value;
      let APIImplementation = this.APIImplementationCache.get(extensionId);
      if (!APIImplementation) {
        this.LogService.Trace(
          `Creating new vscode API for extension: ${extensionId}`
        );
        APIImplementation = this.APIFactoryService.CreateAPI(Extension);
        this.APIImplementationCache.set(extensionId, APIImplementation);
      }
      return APIImplementation;
    }
    this.LogService.Warn(
      `Could not identify extension for 'vscode' require call from ${ParentURI.fsPath}. Providing a default API object.`
    );
    return this.APIFactoryService.CreateAPI(nullExtensionDescription);
  }
}
export {
  VscodeNodeModuleFactory
};
//# sourceMappingURL=Vscode.js.map
