var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { path } from "vs/base/common/path.js";
import { URI } from "vs/base/common/uri.js";
class Definition {
  static {
    __name(this, "Definition");
  }
  Paths;
  constructor(Extensions) {
    const mutablePaths = [];
    for (const Extension of Extensions) {
      if (Extension.extensionLocation) {
        mutablePaths.push({
          Path: URI.revive(Extension.extensionLocation).fsPath,
          Identifier: Extension.identifier
        });
      }
    }
    mutablePaths.sort((a, b) => b.Path.length - a.Path.length);
    this.Paths = mutablePaths;
  }
  /**
   * Finds the extension description that corresponds to a given file URI by
   * checking if the URI's path is a child of any known extension path.
   *
   * @param URI The file URI to look up.
   * @returns The `IExtensionDescription` containing the identifier if a
   *   match is found, otherwise `undefined`.
   */
  FindSubstr(uri) {
    const FilePath = uri.fsPath;
    for (const Entry of this.Paths) {
      if (FilePath.startsWith(Entry.Path + path.sep) || FilePath === Entry.Path) {
        return {
          identifier: Entry.Identifier,
          extensionLocation: URI.file(Entry.Path)
        };
      }
    }
    return void 0;
  }
}
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
