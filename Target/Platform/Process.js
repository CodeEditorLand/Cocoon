var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// Source/Platform/Process.ts
import { Effect, Option } from "effect";
var ProcessSignal = /* @__PURE__ */ ((ProcessSignal2) => {
  ProcessSignal2["SIGHUP"] = "SIGHUP";
  ProcessSignal2["SIGINT"] = "SIGINT";
  ProcessSignal2["SIGQUIT"] = "SIGQUIT";
  ProcessSignal2["SIGILL"] = "SIGILL";
  ProcessSignal2["SIGTRAP"] = "SIGTRAP";
  ProcessSignal2["SIGABRT"] = "SIGABRT";
  ProcessSignal2["SIGBUS"] = "SIGBUS";
  ProcessSignal2["SIGFPE"] = "SIGFPE";
  ProcessSignal2["SIGKILL"] = "SIGKILL";
  ProcessSignal2["SIGUSR1"] = "SIGUSR1";
  ProcessSignal2["SIGSEGV"] = "SIGSEGV";
  ProcessSignal2["SIGUSR2"] = "SIGUSR2";
  ProcessSignal2["SIGPIPE"] = "SIGPIPE";
  ProcessSignal2["SIGALRM"] = "SIGALRM";
  ProcessSignal2["SIGTERM"] = "SIGTERM";
  ProcessSignal2["SIGCHLD"] = "SIGCHLD";
  ProcessSignal2["SIGCONT"] = "SIGCONT";
  ProcessSignal2["SIGSTOP"] = "SIGSTOP";
  ProcessSignal2["SIGTSTP"] = "SIGTSTP";
  ProcessSignal2["SIGTTIN"] = "SIGTTIN";
  ProcessSignal2["SIGTTOU"] = "SIGTTOU";
  ProcessSignal2["SIGURG"] = "SIGURG";
  ProcessSignal2["SIGXCPU"] = "SIGXCPU";
  ProcessSignal2["SIGXFSZ"] = "SIGXFSZ";
  ProcessSignal2["SIGVTALRM"] = "SIGVTALRM";
  ProcessSignal2["SIGPROF"] = "SIGPROF";
  ProcessSignal2["SIGWINCH"] = "SIGWINCH";
  ProcessSignal2["SIGIO"] = "SIGIO";
  ProcessSignal2["SIGPOLL"] = "SIGPOLL";
  ProcessSignal2["SIGPWR"] = "SIGPWR";
  ProcessSignal2["SIGSYS"] = "SIGSYS";
  ProcessSignal2["SIGSTKFLT"] = "SIGSTKFLT";
  ProcessSignal2["SIGUNUSED"] = "SIGUNUSED";
  return ProcessSignal2;
})(ProcessSignal || {});
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_MAX_BUFFER = 1024 * 1024;
var DEFAULT_HEARTBEAT_INTERVAL = 5e3;
var DEFAULT_KILL_TIMEOUT = 5e3;
var DEFAULT_MAX_RESTARTS = 3;
var DEFAULT_RESTART_DELAY = 1e3;
var ProcessRegistry = /* @__PURE__ */ new Map();
function IsChildProcessAvailable() {
  try {
    return typeof __require === "function" && __require("child_process");
  } catch {
    return false;
  }
}
__name(IsChildProcessAvailable, "IsChildProcessAvailable");
function GetChildProcessModule() {
  if (!IsChildProcessAvailable()) {
    return null;
  }
  try {
    return __require("child_process");
  } catch {
    return null;
  }
}
__name(GetChildProcessModule, "GetChildProcessModule");
function ValidateCommand(command) {
  if (!command || typeof command !== "string") {
    return false;
  }
  const trimmed = command.trim();
  if (trimmed === "") {
    return false;
  }
  const dangerousPatterns = [
    /;\s*\w/,
    // Command chaining
    /\|\s*\w/,
    // Pipe chaining
    /&&\s*\w/,
    // AND operator
    /\|\|\s*\w/,
    // OR operator
    />\s*\/dev/,
    // Redirect output
    />\s*\/tmp/,
    // Write to temp
    /`[^`]*`/,
    // Command substitution
    /\$\(.*,?\)/,
    // Command substitution
    /\/\.\.\/|\\\\\\.\\/,
    // Path traversal
    /rm\s+-rf/
    // Dangerous command
  ];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return false;
    }
  }
  return true;
}
__name(ValidateCommand, "ValidateCommand");
function ValidateArgs(args) {
  if (!Array.isArray(args)) {
    return false;
  }
  const dangerousPatterns = [
    /;\s*\w/,
    /`\s*[^`]*`/,
    /\$\s*\(\s*[^)]*\)/,
    />\s*\//,
    />\s*\w/
  ];
  for (const arg of args) {
    if (!arg || typeof arg !== "string") {
      return false;
    }
    for (const pattern of dangerousPatterns) {
      if (pattern.test(arg)) {
        return false;
      }
    }
  }
  return true;
}
__name(ValidateArgs, "ValidateArgs");
async function SpawnProcess(command, args = [], options = {}) {
  if (!ValidateCommand(command)) {
    console.error("[Process] Invalid command:", command);
    return null;
  }
  if (!ValidateArgs(args)) {
    console.error("[Process] Invalid arguments:", args);
    return null;
  }
  const childProcess = GetChildProcessModule();
  if (!childProcess) {
    console.error("[Process] child_process module not available");
    return null;
  }
  try {
    const spawnOptions = {
      cwd: options.cwd,
      env: options.env || GetMergedEnvironment(options.env),
      detached: options.detached || false,
      shell: options.shell || false,
      windowsHide: options.windowsHide !== false,
      stdio: ["pipe", "pipe", "pipe"]
    };
    const childProc = childProcess.spawn(command, args, spawnOptions);
    const processInfo = {
      pid: childProc.pid,
      command,
      args,
      cwd: options.cwd || process.cwd(),
      env: options.env || {},
      startTime: Date.now(),
      status: "running",
      exitCode: null,
      signal: null,
      parentPid: process.pid
    };
    ProcessRegistry.set(childProc.pid, processInfo);
    childProc.on(
      "exit",
      (code, signal) => {
        processInfo.status = "stopped";
        processInfo.exitCode = code;
        processInfo.signal = signal;
        console.log(
          `[Process] Process ${childProc.pid} exited: code=${code}, signal=${signal}`
        );
      }
    );
    childProc.on("error", (error) => {
      processInfo.status = "error";
      console.error(`[Process] Process ${childProc.pid} error:`, error);
    });
    console.log(
      `[Process] Spawned process: pid=${childProc.pid}, command=${command}`
    );
    return processInfo;
  } catch (error) {
    console.error("[Process] Failed to spawn process:", error);
    return null;
  }
}
__name(SpawnProcess, "SpawnProcess");
async function ExecuteCommand(command, args = [], options = {}) {
  if (!ValidateCommand(command)) {
    throw new Error("Invalid command");
  }
  if (!ValidateArgs(args)) {
    throw new Error("Invalid arguments");
  }
  const childProcess = GetChildProcessModule();
  if (!childProcess) {
    throw new Error("child_process module not available");
  }
  return new Promise((resolve) => {
    const execOptions = {
      cwd: options.cwd,
      env: options.env || GetMergedEnvironment(options.env),
      timeout: options.timeout || DEFAULT_TIMEOUT,
      maxBuffer: options.maxBuffer || DEFAULT_MAX_BUFFER,
      windowsHide: options.windowsHide !== false,
      killSignal: "SIGTERM"
    };
    childProcess.execFile(
      command,
      args,
      execOptions,
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            stdout: stdout || "",
            stderr: stderr || error.message || "",
            exitCode: error.code || null
          });
        } else {
          resolve({
            stdout: stdout || "",
            stderr: stderr || "",
            exitCode: 0
          });
        }
      }
    );
  });
}
__name(ExecuteCommand, "ExecuteCommand");
async function ForkProcess(modulePath, args = [], options = {}) {
  const childProcess = GetChildProcessModule();
  if (!childProcess) {
    console.error("[Process] child_process module not available");
    return null;
  }
  if (!modulePath || typeof modulePath !== "string" || modulePath.trim() === "") {
    console.error("[Process] Invalid module path");
    return null;
  }
  try {
    const forkOptions = {
      cwd: options.cwd,
      env: options.env || GetMergedEnvironment(options.env),
      silent: false,
      windowsHide: options.windowsHide !== false
    };
    const childProc = childProcess.fork(modulePath, args, forkOptions);
    const processInfo = {
      pid: childProc.pid,
      command: "node",
      args: [modulePath, ...args],
      cwd: options.cwd || process.cwd(),
      env: options.env || {},
      startTime: Date.now(),
      status: "running",
      exitCode: null,
      signal: null,
      parentPid: process.pid
    };
    ProcessRegistry.set(childProc.pid, processInfo);
    childProc.on(
      "exit",
      (code, signal) => {
        processInfo.status = "stopped";
        processInfo.exitCode = code;
        processInfo.signal = signal;
      }
    );
    console.log(
      `[Process] Forked process: pid=${childProc.pid}, module=${modulePath}`
    );
    return processInfo;
  } catch (error) {
    console.error("[Process] Failed to fork process:", error);
    return null;
  }
}
__name(ForkProcess, "ForkProcess");
function SendSignal(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    console.error(
      `[Process] Failed to send signal ${signal} to pid ${pid}:`,
      error
    );
    return false;
  }
}
__name(SendSignal, "SendSignal");
function TerminateProcess(pid, timeout = DEFAULT_KILL_TIMEOUT) {
  const processInfo = ProcessRegistry.get(pid);
  if (!processInfo) {
    console.warn(`[Process] Process ${pid} not found in registry`);
    return false;
  }
  if (processInfo.status !== "running") {
    console.warn(`[Process] Process ${pid} is not running`);
    return false;
  }
  try {
    if (!SendSignal(pid, "SIGTERM" /* SIGTERM */)) {
      return false;
    }
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const updatedInfo = ProcessRegistry.get(pid);
      if (!updatedInfo || updatedInfo.status !== "running") {
        clearInterval(checkInterval);
        return;
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        SendSignal(pid, "SIGKILL" /* SIGKILL */);
      }
    }, 100);
    return true;
  } catch (error) {
    console.error(`[Process] Failed to terminate process ${pid}:`, error);
    return false;
  }
}
__name(TerminateProcess, "TerminateProcess");
function KillProcess(pid) {
  const processInfo = ProcessRegistry.get(pid);
  if (!processInfo) {
    console.warn(`[Process] Process ${pid} not found in registry`);
    return false;
  }
  if (!SendSignal(pid, "SIGKILL" /* SIGKILL */)) {
    return false;
  }
  console.log(`[Process] Killed process ${pid}`);
  return true;
}
__name(KillProcess, "KillProcess");
function GetProcess(pid) {
  const processInfo = ProcessRegistry.get(pid);
  return processInfo ? Option.some(processInfo) : Option.none();
}
__name(GetProcess, "GetProcess");
function GetAllProcesses() {
  return Array.from(ProcessRegistry.values());
}
__name(GetAllProcesses, "GetAllProcesses");
function GetRunningProcesses() {
  return Array.from(ProcessRegistry.values()).filter(
    (p) => p.status === "running"
  );
}
__name(GetRunningProcesses, "GetRunningProcesses");
function GetStoppedProcesses() {
  return Array.from(ProcessRegistry.values()).filter(
    (p) => p.status === "stopped" || p.status === "error"
  );
}
__name(GetStoppedProcesses, "GetStoppedProcesses");
function UnregisterProcess(pid) {
  return ProcessRegistry.delete(pid);
}
__name(UnregisterProcess, "UnregisterProcess");
function CleanupAllProcesses() {
  const processes = GetRunningProcesses();
  for (const procInfo of processes) {
    console.log(`[Process] Cleaning up process ${procInfo.pid}`);
    KillProcess(procInfo.pid);
  }
  ProcessRegistry.clear();
}
__name(CleanupAllProcesses, "CleanupAllProcesses");
function GetMergedEnvironment(additionalEnv) {
  const env = {};
  if (typeof process !== "undefined" && process.env) {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== void 0) {
        env[key] = value;
      }
    }
  }
  if (additionalEnv) {
    for (const [key, value] of Object.entries(additionalEnv)) {
      if (value !== void 0) {
        env[key] = value;
      }
    }
  }
  return env;
}
__name(GetMergedEnvironment, "GetMergedEnvironment");
async function MonitorProcess(pid, options = {}) {
  const processInfo = ProcessRegistry.get(pid);
  if (!processInfo) {
    return false;
  }
  const heartbeatInterval = options.heartbeatInterval || DEFAULT_HEARTBEAT_INTERVAL;
  const killTimeout = options.killTimeout || DEFAULT_KILL_TIMEOUT;
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const updatedInfo = ProcessRegistry.get(pid);
      if (!updatedInfo) {
        clearInterval(interval);
        resolve(false);
        return;
      }
      if (updatedInfo.status !== "running") {
        clearInterval(interval);
        resolve(updatedInfo.status === "stopped");
        return;
      }
    }, heartbeatInterval);
    setTimeout(() => {
      clearInterval(interval);
      if (ProcessRegistry.has(pid)) {
        TerminateProcess(pid, killTimeout);
      }
      resolve(false);
    }, killTimeout * 10);
  });
}
__name(MonitorProcess, "MonitorProcess");
function IsProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
__name(IsProcessRunning, "IsProcessRunning");
function GetCurrentPid() {
  return process.pid;
}
__name(GetCurrentPid, "GetCurrentPid");
function GetParentPid() {
  return process.ppid;
}
__name(GetParentPid, "GetParentPid");
function SpawnProcessEffect(command, args, options) {
  return Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => SpawnProcess(command, args, options), "try"),
    catch: /* @__PURE__ */ __name((error) => new Error(`Failed to spawn process: ${error}`), "catch")
  });
}
__name(SpawnProcessEffect, "SpawnProcessEffect");
function ExecuteCommandEffect(command, args, options = {}) {
  return Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => ExecuteCommand(command, args, options), "try"),
    catch: /* @__PURE__ */ __name((error) => new Error(`Failed to execute command: ${error}`), "catch")
  });
}
__name(ExecuteCommandEffect, "ExecuteCommandEffect");
function SendSignalEffect(pid, signal) {
  return Effect.try(() => {
    if (!SendSignal(pid, signal)) {
      throw new Error(
        `Failed to send signal ${signal} to process ${pid}`
      );
    }
  });
}
__name(SendSignalEffect, "SendSignalEffect");
function GetProcessEffect(pid) {
  return Effect.sync(() => GetProcess(pid));
}
__name(GetProcessEffect, "GetProcessEffect");
var Process = {
  ValidateCommand,
  ValidateArgs,
  SpawnProcess,
  ExecuteCommand,
  ForkProcess,
  SendSignal,
  TerminateProcess,
  KillProcess,
  GetProcess,
  GetAllProcesses,
  GetRunningProcesses,
  GetStoppedProcesses,
  UnregisterProcess,
  CleanupAllProcesses,
  MonitorProcess,
  IsProcessRunning,
  GetCurrentPid,
  GetParentPid
};
var ProcessConstants = {
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_BUFFER,
  DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_KILL_TIMEOUT,
  DEFAULT_MAX_RESTARTS,
  DEFAULT_RESTART_DELAY
};
export {
  CleanupAllProcesses,
  DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_KILL_TIMEOUT,
  DEFAULT_MAX_BUFFER,
  DEFAULT_MAX_RESTARTS,
  DEFAULT_RESTART_DELAY,
  DEFAULT_TIMEOUT,
  ExecuteCommand,
  ExecuteCommandEffect,
  ForkProcess,
  GetAllProcesses,
  GetCurrentPid,
  GetParentPid,
  GetProcess,
  GetProcessEffect,
  GetRunningProcesses,
  GetStoppedProcesses,
  IsProcessRunning,
  KillProcess,
  MonitorProcess,
  Process,
  ProcessConstants,
  ProcessSignal,
  SendSignal,
  SendSignalEffect,
  SpawnProcess,
  SpawnProcessEffect,
  TerminateProcess,
  UnregisterProcess,
  ValidateArgs,
  ValidateCommand
};
//# sourceMappingURL=Process.js.map
