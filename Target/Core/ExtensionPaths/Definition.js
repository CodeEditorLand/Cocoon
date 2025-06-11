var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI } from "vs/base/common/uri.js";
import {
  ExtensionIdentifier
} from "vs/platform/extensions/common/extensions.js";
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
   * checking if the URI's path is a substring of any known extension path.
   *
   * @param Uri - The file URI to look up.
   * @returns A minimal `IExtensionDescription` containing the identifier if a
   *   match is found, otherwise `undefined`.
   */
  FindSubstr(Uri) {
    const FilePath = Uri.fsPath;
    for (const Entry of this.Paths) {
      if (FilePath.startsWith(Entry.Path)) {
        return {
          identifier: Entry.Identifier
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
