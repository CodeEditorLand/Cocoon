var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { EventEmitter } from "events";
class ProcessShimBase extends EventEmitter {
  static {
    __name(this, "ProcessShimBase");
  }
}
const ActualNodeProcess = process;
const CreateSanitizedEnv = /* @__PURE__ */ __name(() => {
  const SanitizedEnv = {};
  for (const key in ActualNodeProcess.env) {
    if (Object.prototype.hasOwnProperty.call(ActualNodeProcess.env, key)) {
      if (!key.startsWith("VSCODE_") && !key.startsWith("MOUNTAIN_")) {
        SanitizedEnv[key] = ActualNodeProcess.env[key];
      }
    }
  }
  return Object.freeze(SanitizedEnv);
}, "CreateSanitizedEnv");
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
  // Return a copy
  get pid() {
    return ActualNodeProcess.pid;
  },
  get execPath() {
    return ActualNodeProcess.execPath;
  },
  get title() {
    return ActualNodeProcess.title;
  },
  // --- Properties with Sanitization (return a safe copy) ---
  get env() {
    return CreateSanitizedEnv();
  },
  get argv() {
    return [...ActualNodeProcess.argv];
  },
  // Return a copy
  get execArgv() {
    return [...ActualNodeProcess.execArgv];
  },
  // Return a copy
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
  kill: /* @__PURE__ */ __name((pid, signal) => ActualNodeProcess.kill(pid, signal), "kill")
};
export {
  ProcessShim
};
//# sourceMappingURL=Process.js.map
