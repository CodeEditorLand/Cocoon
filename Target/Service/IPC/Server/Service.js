var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context } from "effect";
class ServerService extends Context.Tag("IPC/Server")() {
  static {
    __name(this, "ServerService");
  }
}
export {
  ServerService as default
};
//# sourceMappingURL=Service.js.map
