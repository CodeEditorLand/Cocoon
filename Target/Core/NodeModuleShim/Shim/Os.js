var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as NodeOs from "node:os";
const CreateOsShim = /* @__PURE__ */ __name((InitData) => {
  const IsWindows = process.platform === "win32";
  const UserHome = InitData.environment.globalStorageHome;
  const OsShim = {
    EOL: IsWindows ? "\r\n" : "\n",
    arch: /* @__PURE__ */ __name(() => process.arch, "arch"),
    platform: /* @__PURE__ */ __name(() => process.platform, "platform"),
    constants: NodeOs.constants,
    cpus: /* @__PURE__ */ __name(() => NodeOs.cpus(), "cpus"),
    freemem: /* @__PURE__ */ __name(() => NodeOs.freemem(), "freemem"),
    homedir: /* @__PURE__ */ __name(() => UserHome.fsPath || process.env["HOME"] || process.env["USERPROFILE"] || "", "homedir"),
    hostname: /* @__PURE__ */ __name(() => InitData.environment.appHost || "localhost", "hostname"),
    loadavg: /* @__PURE__ */ __name(() => NodeOs.loadavg(), "loadavg"),
    networkInterfaces: /* @__PURE__ */ __name(() => NodeOs.networkInterfaces(), "networkInterfaces"),
    release: /* @__PURE__ */ __name(() => NodeOs.release(), "release"),
    tmpdir: /* @__PURE__ */ __name(() => NodeOs.tmpdir(), "tmpdir"),
    // tmpdir is generally safe to expose.
    totalmem: /* @__PURE__ */ __name(() => NodeOs.totalmem(), "totalmem"),
    type: /* @__PURE__ */ __name(() => IsWindows ? "Windows_NT" : process.platform === "darwin" ? "Darwin" : "Linux", "type"),
    userInfo: /* @__PURE__ */ __name((_options) => {
      const Username = UserHome.fsPath.split(/\/|\\/).pop() || "cocoon-user";
      return {
        uid: -1,
        gid: -1,
        username: Username,
        homedir: UserHome.fsPath,
        shell: null
      };
    }, "userInfo"),
    uptime: /* @__PURE__ */ __name(() => NodeOs.uptime(), "uptime")
  };
  return Object.freeze(OsShim);
}, "CreateOsShim");
var Os_default = CreateOsShim;
export {
  Os_default as default
};
//# sourceMappingURL=Os.js.map
