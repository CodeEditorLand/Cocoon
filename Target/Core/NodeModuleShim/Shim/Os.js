var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as NodeOs from "node:os";
import { InitDataService } from "../../../Service/InitData.js";
const CreateOsShim = /* @__PURE__ */ __name((InitData) => {
  const IsWindows = InitData.environment.isWindows;
  const OsShim = {
    EOL: IsWindows ? "\r\n" : "\n",
    arch: /* @__PURE__ */ __name(() => process.arch, "arch"),
    platform: /* @__PURE__ */ __name(() => process.platform, "platform"),
    constants: NodeOs.constants,
    cpus: /* @__PURE__ */ __name(() => NodeOs.cpus(), "cpus"),
    freemem: /* @__PURE__ */ __name(() => NodeOs.freemem(), "freemem"),
    homedir: /* @__PURE__ */ __name(() => InitData.environment.userHome.fsPath || process.env["HOME"] || process.env["USERPROFILE"] || "", "homedir"),
    hostname: /* @__PURE__ */ __name(() => InitData.environment.hostname || "localhost", "hostname"),
    networkInterfaces: /* @__PURE__ */ __name(() => NodeOs.networkInterfaces(), "networkInterfaces"),
    release: /* @__PURE__ */ __name(() => NodeOs.release(), "release"),
    tmpdir: /* @__PURE__ */ __name(() => NodeOs.tmpdir(), "tmpdir"),
    // tmpdir is generally safe to expose.
    totalmem: /* @__PURE__ */ __name(() => NodeOs.totalmem(), "totalmem"),
    type: /* @__PURE__ */ __name(() => NodeOs.type(), "type"),
    userInfo: /* @__PURE__ */ __name((_options) => {
      const Username = InitData.environment.userHome.fsPath.split(/\/|\\/).pop() || "cocoon-user";
      return {
        uid: -1,
        gid: -1,
        username: Username,
        homedir: InitData.environment.userHome.fsPath,
        shell: null
      };
    }, "userInfo")
  };
  return OsShim;
}, "CreateOsShim");
export {
  CreateOsShim
};
//# sourceMappingURL=Os.js.map
