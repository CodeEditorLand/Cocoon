var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { URI } from "vs/base/common/uri.js";
class Definition_default {
  static {
    __name(this, "default");
  }
  Paths;
  constructor(Extensions) {
    const MutablePaths = [];
    for (const Extension of Extensions) {
      if (Extension.extensionLocation) {
        MutablePaths.push({
          Path: URI.revive(Extension.extensionLocation).fsPath,
          Identifier: Extension.identifier
        });
      }
    }
    MutablePaths.sort((a, b) => b.Path.length - a.Path.length);
    this.Paths = MutablePaths;
  }
  /**
   * Finds the extension description that corresponds to a given file URI by
   * checking if the URI's path is a child of any known extension path.
   *
   * @param PathURI The file URI to look up.
   * @returns The `IExtensionDescription` containing the identifier if a
   *   match is found, otherwise `undefined`.
   */
  FindSubstr(PathURI) {
    const FilePath = PathURI.fsPath;
    for (const Entry of this.Paths) {
      if (FilePath.startsWith(Entry.Path + Path.sep) || FilePath === Entry.Path) {
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
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
