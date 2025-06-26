var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { Effect } from "effect";
import { URI } from "vs/base/common/uri.js";
import { InitDataService } from "./InitData.js";
class ExtensionPathService extends Effect.Service()(
  "Service/ExtensionPath",
  {
    effect: Effect.gen(function* () {
      const InitData = yield* InitDataService;
      const Extensions = InitData.extensions.allExtensions;
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
      const Paths = MutablePaths;
      return {
        FindSubstr: /* @__PURE__ */ __name((PathUri) => {
          const FilePath = PathUri.fsPath;
          for (const Entry of Paths) {
            if (FilePath.startsWith(Entry.Path + Path.sep) || FilePath === Entry.Path) {
              return {
                identifier: Entry.Identifier,
                extensionLocation: URI.file(Entry.Path)
              };
            }
          }
          return void 0;
        }, "FindSubstr")
      };
    })
  }
) {
  static {
    __name(this, "ExtensionPathService");
  }
}
export {
  ExtensionPathService
};
//# sourceMappingURL=ExtensionPath.js.map
