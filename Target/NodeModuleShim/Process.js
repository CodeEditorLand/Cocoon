var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { EventEmitter } from "node:events";
class ProcessShimBase extends EventEmitter {
  static {
    __name(this, "ProcessShimBase");
  }
}
const ActualNodeProcess = process;
const CreateSanitizedEnvironment = /* @__PURE__ */ __name(() => {
  const SanitizedEnvironment = {};
  for (const key in ActualNodeProcess.env) {
    if (Object.prototype.hasOwnProperty.call(ActualNodeProcess.env, key)) {
      if (!key.startsWith("VSCODE_") && !key.startsWith("MOUNTAIN_") && !key.startsWith("COCOON_")) {
        SanitizedEnvironment[key] = ActualNodeProcess.env[key];
      }
    }
  }
  return Object.freeze(SanitizedEnvironment);
}, "CreateSanitizedEnvironment");
const ProcessShim = {
  ...new ProcessShimBase(),
  // --- Read-only Properties (safe to expose directly) ---
  get platform() {
    return ActualNodeProcess.platform;
  },
  get arch() {
    return ActualNodeProcess.arch;
  },
  get versions() {
    return { ...ActualNodeProcess.versions };
  },
  get pid() {
    return ActualNodeProcess.pid;
  },
  get ppid() {
    return ActualNodeProcess.ppid;
  },
  get execPath() {
    return ActualNodeProcess.execPath;
  },
  get title() {
    return "Cocoon Extension Host";
  },
  // --- Properties with Sanitization (return a safe copy) ---
  get env() {
    return CreateSanitizedEnvironment();
  },
  get argv() {
    return [...ActualNodeProcess.argv];
  },
  get execArgv() {
    return [...ActualNodeProcess.execArgv];
  },
  // --- Safe Methods (delegated directly) ---
  cwd: /* @__PURE__ */ __name(() => ActualNodeProcess.cwd(), "cwd"),
  memoryUsage: /* @__PURE__ */ __name(() => ActualNodeProcess.memoryUsage(), "memoryUsage"),
  hrtime: /* @__PURE__ */ __name((time) => ActualNodeProcess.hrtime(time), "hrtime"),
  uptime: /* @__PURE__ */ __name(() => ActualNodeProcess.uptime(), "uptime"),
  nextTick: /* @__PURE__ */ __name((callback, ...args) => ActualNodeProcess.nextTick(callback, ...args), "nextTick"),
  // --- Dangerous Methods (to be patched later) ---
  exit: /* @__PURE__ */ __name((code) => ActualNodeProcess.exit(code), "exit"),
  kill: /* @__PURE__ */ __name((pid, signal) => ActualNodeProcess.kill(pid, signal), "kill"),
  // --- Unsafe Methods (stubbed to prevent usage) ---
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
export {
  ProcessShim
};
//# sourceMappingURL=Process.js.map
