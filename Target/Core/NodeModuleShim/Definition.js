var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as NodeCrypto from "node:crypto";
import { EventEmitter } from "node:events";
import * as NodeOs from "node:os";
import { Effect } from "effect";
import InitDataService from "../../Service/InitData/Service.js";
import LogService from "../../Service/Log/Service.js";
import { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";
const CreateSanitizedEnvironment = /* @__PURE__ */ __name(() => {
  const SanitizedEnvironment = {};
  for (const Key in process.env) {
    if (Object.prototype.hasOwnProperty.call(process.env, Key)) {
      if (!Key.startsWith("VSCODE_") && !Key.startsWith("MOUNTAIN_") && !Key.startsWith("COCOON_")) {
        SanitizedEnvironment[Key] = process.env[Key];
      }
    }
  }
  return Object.freeze(SanitizedEnvironment);
}, "CreateSanitizedEnvironment");
const ProcessShim = {
  ...new class extends EventEmitter {
  }(),
  get platform() {
    return process.platform;
  },
  get arch() {
    return process.arch;
  },
  get versions() {
    return { ...process.versions };
  },
  get pid() {
    return process.pid;
  },
  get ppid() {
    return process.ppid;
  },
  get execPath() {
    return process.execPath;
  },
  get title() {
    return "Cocoon Extension Host";
  },
  get env() {
    return CreateSanitizedEnvironment();
  },
  get argv() {
    return [...process.argv];
  },
  get execArgv() {
    return [...process.execArgv];
  },
  cwd: /* @__PURE__ */ __name(() => process.cwd(), "cwd"),
  memoryUsage: /* @__PURE__ */ __name(() => process.memoryUsage(), "memoryUsage"),
  hrtime: /* @__PURE__ */ __name((time) => process.hrtime(time), "hrtime"),
  uptime: /* @__PURE__ */ __name(() => process.uptime(), "uptime"),
  nextTick: /* @__PURE__ */ __name((callback, ...args) => process.nextTick(callback, ...args), "nextTick"),
  exit: /* @__PURE__ */ __name((code) => process.exit(code), "exit"),
  kill: /* @__PURE__ */ __name((pid, signal) => process.kill(pid, signal), "kill"),
  chdir: /* @__PURE__ */ __name((_directory) => {
    throw new Error("`process.chdir()` is not allowed in extensions.");
  }, "chdir"),
  setuid: /* @__PURE__ */ __name((_id) => {
    throw new Error("`process.setuid()` is not allowed in extensions.");
  }, "setuid"),
  setgid: /* @__PURE__ */ __name((_id) => {
    throw new Error("`process.setgid()` is not allowed in extensions.");
  }, "setgid")
};
const CreateOsShim = /* @__PURE__ */ __name((InitData) => {
  const IsWindows = InitData.environment.isWindows;
  const UserHome = InitData.environment.userHome;
  return Object.freeze({
    EOL: IsWindows ? "\r\n" : "\n",
    arch: /* @__PURE__ */ __name(() => process.arch, "arch"),
    platform: /* @__PURE__ */ __name(() => process.platform, "platform"),
    constants: NodeOs.constants,
    cpus: /* @__PURE__ */ __name(() => NodeOs.cpus(), "cpus"),
    freemem: /* @__PURE__ */ __name(() => NodeOs.freemem(), "freemem"),
    homedir: /* @__PURE__ */ __name(() => UserHome.fsPath || process.env["HOME"] || process.env["USERPROFILE"] || "", "homedir"),
    hostname: /* @__PURE__ */ __name(() => InitData.environment.hostname || "localhost", "hostname"),
    loadavg: /* @__PURE__ */ __name(() => NodeOs.loadavg(), "loadavg"),
    networkInterfaces: /* @__PURE__ */ __name(() => NodeOs.networkInterfaces(), "networkInterfaces"),
    release: /* @__PURE__ */ __name(() => NodeOs.release(), "release"),
    tmpdir: /* @__PURE__ */ __name(() => NodeOs.tmpdir(), "tmpdir"),
    totalmem: /* @__PURE__ */ __name(() => NodeOs.totalmem(), "totalmem"),
    type: /* @__PURE__ */ __name(() => NodeOs.type(), "type"),
    userInfo: /* @__PURE__ */ __name((_options) => ({
      uid: -1,
      gid: -1,
      username: UserHome.fsPath.split(/\/|\\/).pop() || "cocoon-user",
      homedir: UserHome.fsPath,
      shell: null
    }), "userInfo"),
    uptime: /* @__PURE__ */ __name(() => NodeOs.uptime(), "uptime")
  });
}, "CreateOsShim");
const CreateCryptoShim = /* @__PURE__ */ __name(() => {
  const CreateStub = /* @__PURE__ */ __name((Name) => () => {
    throw new Error(
      `[Cocoon Crypto Shim] 'crypto.${Name}' is not implemented or is disallowed.`
    );
  }, "CreateStub");
  return {
    ...NodeCrypto,
    generatePrime: NodeCrypto.generatePrime ? CreateStub("generatePrime") : void 0,
    generateKeyPair: CreateStub("generateKeyPair"),
    generateKeyPairSync: CreateStub("generateKeyPairSync"),
    createCipheriv: CreateStub("createCipheriv"),
    createDecipheriv: CreateStub("createDecipheriv"),
    createSign: CreateStub("createSign"),
    createVerify: CreateStub("createVerify")
  };
}, "CreateCryptoShim");
var Definition_default = Effect.gen(function* () {
  const Log = yield* LogService;
  const InitData = yield* InitDataService;
  const OsShim = CreateOsShim(InitData);
  const CryptoShim = CreateCryptoShim();
  const BlockedModules = /* @__PURE__ */ new Set([
    "fs",
    "node:fs",
    "fs/promises",
    "node:fs/promises",
    "path",
    "node:path",
    "child_process",
    "node:child_process",
    "worker_threads",
    "node:worker_threads",
    "cluster",
    "node:cluster",
    "vm",
    "node:vm"
  ]);
  const Shims = /* @__PURE__ */ new Map([
    ["os", OsShim],
    ["node:os", OsShim],
    ["crypto", CryptoShim],
    ["node:crypto", CryptoShim],
    ["process", ProcessShim],
    ["node:process", ProcessShim]
  ]);
  const Load = /* @__PURE__ */ __name((Request, ParentURI) => Effect.gen(function* () {
    const RequesterPath = ParentURI?.fsPath || "unknown module";
    yield* Log.Trace(
      `Intercepted require('${Request}') from '${RequesterPath}'.`
    );
    if (BlockedModules.has(Request)) {
      return yield* new ModuleBlockedError({ ModuleName: Request });
    }
    const Shim = Shims.get(Request);
    if (Shim) {
      return Shim;
    }
    return yield* new ModuleNotShimmedError({ ModuleName: Request });
  }), "Load");
  const NodeModuleShimImplementation = { Load };
  return NodeModuleShimImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
