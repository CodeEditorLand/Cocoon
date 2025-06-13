var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { EventEmitter } from "node:events";
class ProcessShimBase extends EventEmitter {
  static {
    __name(this, "ProcessShimBase");
  }
}
const ActualNodeProcess = process;
function CreateSanitizedEnvironment() {
  const SanitizedEnvironment = {};
  for (const key in ActualNodeProcess.env) {
    if (Object.prototype.hasOwnProperty.call(ActualNodeProcess.env, key)) {
      if (!key.startsWith("VSCODE_") && !key.startsWith("MOUNTAIN_") && !key.startsWith("COCOON_")) {
        SanitizedEnvironment[key] = ActualNodeProcess.env[key];
      }
    }
  }
  return Object.freeze(SanitizedEnvironment);
}
__name(CreateSanitizedEnvironment, "CreateSanitizedEnvironment");
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
  // --- Dangerous Methods ---
  // These are exposed initially but are expected to be patched by the `PatchProcess` module.
  // This allows us to control them without breaking extensions that expect them to exist.
  exit: /* @__PURE__ */ __name((code) => ActualNodeProcess.exit(code), "exit"),
  kill: /* @__PURE__ */ __name((pid, signal) => ActualNodeProcess.kill(pid, signal), "kill"),
  // --- Unsafe Methods (stubbed to prevent usage) ---
  chdir: /* @__PURE__ */ __name((directory) => {
    throw new Error("`process.chdir()` is not allowed in extensions.");
  }, "chdir"),
  setuid: /* @__PURE__ */ __name((id) => {
    throw new Error("`process.setuid()` is not allowed in extensions.");
  }, "setuid"),
  setgid: /* @__PURE__ */ __name((id) => {
    throw new Error("`process.setgid()` is not allowed in extensions.");
  }, "setgid")
};
export {
  ProcessShim
};
//# sourceMappingURL=Process.js.map
