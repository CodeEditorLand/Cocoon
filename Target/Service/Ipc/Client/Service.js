var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context } from "effect";
class ClientService extends Context.Tag("IPC/Client")() {
  static {
    __name(this, "ClientService");
  }
}
export {
  ClientService as default
};
//# sourceMappingURL=Service.js.map
