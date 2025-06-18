var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context } from "effect";
class FileSystemService extends Context.Tag(
  "Service/FileSystem"
)() {
  static {
    __name(this, "FileSystemService");
  }
}
export {
  FileSystemService as default
};
//# sourceMappingURL=Service.js.map
