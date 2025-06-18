var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
class VSCode_default {
  constructor(APIFactory, ExtensionPath, Log) {
    this.APIFactory = APIFactory;
    this.ExtensionPath = ExtensionPath;
    this.Log = Log;
  }
  static {
    __name(this, "default");
  }
  Load(_Request, ParentURI, _OriginalRequire) {
    const Extension = this.ExtensionPath.FindSubstr(ParentURI);
    if (Extension) {
      return this.APIFactory.CreateAPI(Extension);
    }
    this.Log.Error(
      `FATAL: require('vscode') was called from an unknown location: ${ParentURI.fsPath}. Could not determine extension owner.`
    );
    throw new Error(
      "[Cocoon] `require('vscode')` may only be called from an extension."
    );
  }
}
export {
  VSCode_default as default
};
//# sourceMappingURL=VSCode.js.map
