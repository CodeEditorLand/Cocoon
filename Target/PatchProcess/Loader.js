var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Archive/PatchProcess/ExitPreventedProblem.ts
var ExitPreventedProblem = class extends Error {
  static {
    __name(this, "ExitPreventedProblem");
  }
  _tag = "ExitPreventedProblem";
  constructor(Message) {
    super(Message ?? "Process exit was prevented");
  }
};
var ExitPreventedProblem_default = ExitPreventedProblem;

// Source/Services/InitData.ts
import { Context, Layer } from "effect";
var InitDataService = class extends Context.Tag("Cocoon/InitData")() {
  static {
    __name(this, "InitDataService");
  }
};
var InitDataLive = Layer.succeed(InitDataService, {
  commit: "dev",
  version: "0.0.1",
  parentPid: process.pid,
  extensions: [],
  workspace: null,
  environment: {}
});

// Source/Interfaces/IIPCService.ts
import { Context as Context2 } from "effect";
var IIPCService = Context2.Tag("IIPCService");

// Source/Services/IPCService.ts
import { Effect as Effect2, Layer as Layer2 } from "effect";
var CocoonVSBuffer = class _CocoonVSBuffer {
  constructor(_buffer) {
    this._buffer = _buffer;
  }
  _buffer;
  static {
    __name(this, "CocoonVSBuffer");
  }
  get buffer() {
    return this._buffer;
  }
  get byteLength() {
    return this._buffer.byteLength;
  }
  toString() {
    return new TextDecoder().decode(this._buffer);
  }
  slice(start, end) {
    return new _CocoonVSBuffer(this._buffer.slice(start, end));
  }
  static fromString(data) {
    return new _CocoonVSBuffer(new TextEncoder().encode(data));
  }
  static wrap(buffer) {
    return new _CocoonVSBuffer(buffer);
  }
};
var CocoonMessagePassingProtocol = class {
  constructor(_sendCallback) {
    this._sendCallback = _sendCallback;
  }
  _sendCallback;
  static {
    __name(this, "CocoonMessagePassingProtocol");
  }
  _onMessage = new Emitter();
  onMessage = this._onMessage.event;
  send(buffer) {
    if (this._sendCallback) {
      this._sendCallback(buffer);
    }
  }
  // Internal method for simulating message reception
  simulateMessage(buffer) {
    this._onMessage.fire(buffer);
  }
};
var IPCService = class {
  static {
    __name(this, "IPCService");
  }
  _serviceBrand;
  _protocol = null;
  _channels = /* @__PURE__ */ new Map();
  _isConnected = false;
  _connectionStartTime = 0;
  _messageCount = 0;
  _errorCount = 0;
  _lastPing = 0;
  _latencySamples = [];
  // Channel client for making requests
  _channelClient = null;
  constructor() {
    this._serviceBrand = void 0;
    console.log("[IPCService] Initializing advanced IPC service");
  }
  /**
   * Initialize IPC service with protocol
   */
  async initialize(protocol) {
    console.log("[IPCService] Initializing with protocol");
    this._protocol = protocol;
    protocol.onMessage((buffer) => {
      this._handleMessage(buffer);
    });
    await this._establishConnection();
    this._isConnected = true;
    this._connectionStartTime = Date.now();
    this._lastPing = Date.now();
    console.log("[IPCService] Advanced IPC service initialized");
  }
  /**
   * Establish connection with Mountain
   */
  async _establishConnection() {
    console.log("[IPCService] Establishing connection with Mountain");
    const handshakeBuffer = CocoonVSBuffer.fromString(
      JSON.stringify({
        type: "handshake",
        timestamp: Date.now(),
        version: "1.0.0"
      })
    );
    this._protocol.send(handshakeBuffer);
    const response = await new Promise((resolve2, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Handshake timeout"));
      }, 5e3);
      const handler = this._protocol.onMessage((buffer) => {
        try {
          const data = JSON.parse(buffer.toString());
          if (data.type === "handshake-response") {
            clearTimeout(timeout);
            resolve2(buffer);
          }
        } catch (error) {
        }
      });
    });
    console.log("[IPCService] Connection established with Mountain");
  }
  /**
   * Get channel for specific service
   */
  getChannel(channelName) {
    return {
      call: /* @__PURE__ */ __name(async (command, arg, cancellationToken) => {
        if (!this._isConnected) {
          throw new Error("Not connected to Mountain");
        }
        const startTime = Date.now();
        try {
          const message = {
            type: "call",
            channel: channelName,
            command,
            arg,
            timestamp: startTime,
            messageId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          const buffer = CocoonVSBuffer.fromString(
            JSON.stringify(message)
          );
          this._protocol.send(buffer);
          this._messageCount++;
          const response = await this._waitForResponse(
            message.messageId,
            cancellationToken
          );
          const latency = Date.now() - startTime;
          this._latencySamples.push(latency);
          return response;
        } catch (error) {
          this._errorCount++;
          throw error;
        }
      }, "call"),
      listen: /* @__PURE__ */ __name((event, arg) => {
        const emitter = new Emitter();
        return emitter.event;
      }, "listen")
    };
  }
  /**
   * Register server channel for handling requests
   */
  registerChannel(channelName, channel) {
    console.log(`[IPCService] Registering channel: ${channelName}`);
    this._channels.set(channelName, channel);
  }
  /**
   * Wait for response with cancellation support
   */
  async _waitForResponse(messageId, cancellationToken) {
    return new Promise((resolve2, reject) => {
      if (cancellationToken?.isCancellationRequested) {
        reject(new Error("Request cancelled"));
        return;
      }
      const timeout = setTimeout(() => {
        reject(new Error("Response timeout"));
      }, 3e4);
      const handler = this._protocol.onMessage((buffer) => {
        try {
          const data = JSON.parse(buffer.toString());
          if (data.messageId === messageId) {
            clearTimeout(timeout);
            if (data.success) {
              resolve2(data.result);
            } else {
              reject(new Error(data.error || "Request failed"));
            }
          }
        } catch (error) {
        }
      });
      if (cancellationToken) {
        cancellationToken.onCancellationRequested(() => {
          clearTimeout(timeout);
          reject(new Error("Request cancelled"));
        });
      }
    });
  }
  /**
   * Handle incoming messages
   */
  _handleMessage(buffer) {
    try {
      const data = JSON.parse(buffer.toString());
      if (data.type === "handshake-response") {
        console.log("[IPCService] Received handshake response");
        return;
      }
      if (data.type === "call" && data.channel) {
        this._handleCall(data);
        return;
      }
      console.log("[IPCService] Unhandled message type:", data.type);
    } catch (error) {
      console.error("[IPCService] Failed to handle message:", error);
    }
  }
  /**
   * Handle incoming call requests
   */
  async _handleCall(data) {
    const channel = this._channels.get(data.channel);
    if (!channel) {
      console.error(`[IPCService] Channel not found: ${data.channel}`);
      return;
    }
    try {
      const result = await channel.call(data.command, data.arg);
      const response = {
        type: "response",
        messageId: data.messageId,
        success: true,
        result,
        timestamp: Date.now()
      };
      const buffer = CocoonVSBuffer.fromString(JSON.stringify(response));
      this._protocol.send(buffer);
    } catch (error) {
      const response = {
        type: "response",
        messageId: data.messageId,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
      const buffer = CocoonVSBuffer.fromString(JSON.stringify(response));
      this._protocol.send(buffer);
    }
  }
  /**
   * Get connection status
   */
  getConnectionStatus() {
    const now = Date.now();
    const connectionUptime = this._isConnected ? now - this._connectionStartTime : 0;
    const averageLatency = this._latencySamples.length > 0 ? this._latencySamples.reduce((a, b) => a + b, 0) / this._latencySamples.length : void 0;
    return {
      connected: this._isConnected,
      lastPing: this._lastPing,
      errorCount: this._errorCount,
      connectionUptime,
      messageCount: this._messageCount,
      averageLatency
    };
  }
  /**
   * Reconnect to Mountain
   */
  async reconnect() {
    console.log("[IPCService] Reconnecting to Mountain");
    await this.dispose();
    if (this._protocol) {
      await this.initialize(this._protocol);
    }
    console.log("[IPCService] Reconnected to Mountain");
  }
  /**
   * Cleanup IPC service
   */
  dispose() {
    console.log("[IPCService] Disposing IPC service");
    this._isConnected = false;
    this._channels.clear();
    this._protocol = null;
    this._channelClient = null;
    console.log("[IPCService] IPC service disposed");
  }
};
var IPCServiceLayer = Layer2.effect(
  IIPCService,
  Effect2.sync(() => new IPCService())
);
var IPCServiceLive = Layer2.effect(
  IIPCService,
  Effect2.sync(() => new IPCService())
);

// Source/PatchProcess/Patcher.ts
import ModuleNS from "node:module";
import { Config, Data, Effect as Effect3 } from "effect";
var Module = ModuleNS;
var ModulePatchProblem = class extends Data.TaggedError("ModulePatchProblem") {
  static {
    __name(this, "ModulePatchProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to patch Node.js module loader: ${this.Context}`;
  }
};
var PatcherService = class extends Effect3.Service()(
  "PatchProcess/PatcherService",
  {
    effect: Effect3.gen(function* () {
      const AllowExit = yield* Config.boolean("AllowExit").pipe(
        Effect3.catchAll(
          (Error2) => Effect3.logWarning(
            "Failed to load Patcher config, using defaults.",
            { Error: Error2 }
          ).pipe(Effect3.as(false))
        )
      );
      const SecurityPolicy4 = yield* Config.string("SecurityPolicy").pipe(
        Effect3.catchTag(
          "MissingConfig",
          () => Effect3.succeed("default")
        ),
        Config.map((Value) => ParseSecurityPolicy(Value))
      );
      return {
        NativeExit: process.exit.bind(process),
        NativeCrash: process.crash,
        AllowExit: /* @__PURE__ */ __name(() => AllowExit, "AllowExit"),
        GetSecurityPolicy: /* @__PURE__ */ __name(() => SecurityPolicy4, "GetSecurityPolicy")
      };
    })
  }
) {
  static {
    __name(this, "PatcherService");
  }
};
var SetElectronRunAsNode = Effect3.sync(() => {
  process.env["ELECTRON_RUN_AS_NODE"] = "1";
}).pipe(
  Effect3.tap(
    () => Effect3.logTrace("Set `ELECTRON_RUN_AS_NODE` environment variable")
  )
);
var SetStackTraceLimit = Effect3.sync(() => {
  Error.stackTraceLimit = 100;
}).pipe(
  Effect3.tap(
    () => Effect3.logTrace("Increased `Error.stackTraceLimit` to 100")
  )
);
var PatchProcessCrash = Effect3.gen(function* () {
  const Service = yield* PatcherService;
  if (Service.NativeCrash) {
    process.crash = () => {
      const PreventionStack = new Error(
        "Stack trace for prevented process.crash()"
      ).stack;
      Effect3.runSync(
        Effect3.logWarning(
          `Call to 'process.crash()' intercepted and PREVENTED by host policy`,
          `Stack: ${PreventionStack ?? "(unavailable)"}`
        )
      );
    };
    yield* Effect3.logTrace("Successfully patched 'process.crash'");
  } else {
    yield* Effect3.logTrace(
      "'process.crash()' not found in environment, skipping patch"
    );
  }
});
var PatchProcessExit = Effect3.gen(function* () {
  const Service = yield* PatcherService;
  process.exit = (Code) => {
    if (Service.AllowExit()) {
      Effect3.runSync(
        Effect3.logInfo(
          `'process.exit(${Code ?? ""})' ALLOWED by host policy`
        )
      );
      return Service.NativeExit(Code);
    }
    const ErrorMessage = `'process.exit(${Code ?? ""})' PREVENTED by host policy`;
    const PreventionError = new ExitPreventedProblem({
      message: ErrorMessage,
      AttemptedCode: Code
    });
    Effect3.runSync(
      Effect3.logWarning("Blocked call to process.exit by host policy")
    );
    throw PreventionError;
  };
  yield* Effect3.logTrace("Successfully patched 'process.exit'");
});
var BlockNativesModule = Effect3.try({
  try: /* @__PURE__ */ __name(() => {
    if (typeof Module._load === "function") {
      const OriginalLoad = Module._load;
      Module._load = function(Request, Parent, IsMain) {
        if (Request === "natives") {
          const ErrorMessage = "Attempt to load deprecated 'natives' module blocked. Not available in Cocoon runtime";
          console.warn(`[Cocoon Patcher] ${ErrorMessage}`);
          throw new Error(ErrorMessage);
        }
        return OriginalLoad.call(this, Request, Parent, IsMain);
      };
    } else {
      console.warn(
        "[Cocoon Patcher] Module._load not found, skipping 'natives' block"
      );
    }
  }, "try"),
  catch: /* @__PURE__ */ __name((Cause) => new ModulePatchProblem({
    Context: "Failed during 'natives' block setup",
    Cause
  }), "catch")
}).pipe(
  Effect3.tap(
    () => Effect3.logTrace("Module._load patched to block 'natives' module")
  )
);
var SafeToString = /* @__PURE__ */ __name((Arguments) => {
  const Slices = [];
  for (let i = 0; i < Arguments.length; i++) {
    const Argument = Arguments[i];
    Slices.push(
      typeof Argument === "object" ? JSON.stringify(Argument, null, 2) : String(Argument)
    );
  }
  return Slices.join(" ");
}, "SafeToString");
var PipeLogging = Effect3.gen(function* () {
  if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
    return yield* Effect3.logTrace(
      "Console log piping disabled by environment variable"
    );
  }
  const IPC = yield* IPCService;
  const ForwardConsoleCall = /* @__PURE__ */ __name((Severity, Arguments) => {
    const Payload = {
      type: "__$console",
      severity: Severity,
      arguments: SafeToString(Arguments)
    };
    return IPC.SendNotification("$log", [Payload]);
  }, "ForwardConsoleCall");
  const OriginalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  console.log = (...args) => {
    OriginalConsole.log.apply(console, args);
    Effect3.runFork(ForwardConsoleCall("log", args));
  };
  console.warn = (...args) => {
    OriginalConsole.warn.apply(console, args);
    Effect3.runFork(ForwardConsoleCall("warn", args));
  };
  console.error = (...args) => {
    OriginalConsole.error.apply(console, args);
    Effect3.runFork(ForwardConsoleCall("error", args));
  };
  yield* Effect3.logTrace(
    "Global console object patched to pipe logs to host"
  );
});
var HandleException = Effect3.gen(function* () {
  if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
    return yield* Effect3.logTrace(
      "Skipping global exception handler, will be handled by RPC"
    );
  }
  const IPC = yield* IPCService;
  const LogError = /* @__PURE__ */ __name((Type, CaughtError) => {
    const Message = CaughtError instanceof Error ? CaughtError.stack || CaughtError.message : String(CaughtError);
    const Payload = {
      type: "__$error",
      severity: "error",
      arguments: `[${Type}] ${Message}`
    };
    return IPC.SendNotification("$log", [Payload]).pipe(
      Effect3.catchAll(
        (ErrorValue) => Effect3.sync(
          () => console.error(
            `[Patcher] Failed to send error to host: ${ErrorValue}`,
            Payload
          )
        )
      )
    );
  }, "LogError");
  process.on("uncaughtException", (Error2) => {
    Effect3.runFork(LogError("uncaughtException", Error2));
  });
  process.on("unhandledRejection", (Reason) => {
    Effect3.runFork(LogError("unhandledRejection", Reason));
  });
  yield* Effect3.logTrace("Global exception handlers installed");
});
var SetupEnvironment = Effect3.gen(function* () {
  const InitData2 = yield* InitDataService;
  if (InitData2.environment.useHostProxy) {
    yield* Effect3.logInfo(
      "Host proxy enabled. Proxy environment variables inherited"
    );
  }
}).pipe(
  Effect3.tap(() => Effect3.logTrace("Proxy environment variables configured"))
);
var TerminateOnParentExit = Effect3.gen(function* () {
  const ParentPidString = process.env["VSCODE_PID"];
  if (!ParentPidString) {
    return yield* Effect3.logTrace(
      "No VSCODE_PID found, skipping parent exit monitoring"
    );
  }
  const ParentPid = Number.parseInt(ParentPidString, 10);
  if (Number.isNaN(ParentPid)) {
    return yield* Effect3.logWarning(
      `Invalid VSCODE_PID '${ParentPidString}', cannot monitor parent process`
    );
  }
  yield* Effect3.logTrace(`Monitoring parent process ${ParentPid} for exit`);
  const MonitoringLoop = Effect3.gen(function* () {
    while (true) {
      try {
        process.kill(ParentPid, 0);
      } catch (Error2) {
        yield* Effect3.logInfo(
          `Parent process ${ParentPid} no longer running. Exiting gracefully`
        );
        process.exit(0);
      }
      yield* Effect3.sleep("5 seconds");
    }
  }).pipe(Effect3.forkDaemon);
  yield* MonitoringLoop;
});
var EnforceMemoryLimit = Effect3.gen(function* () {
  const Service = yield* PatcherService;
  const Policy = Service.GetSecurityPolicy();
  if (Policy.MaxMemoryMB > 0) {
    const MaxMemoryInBytes = Policy.MaxMemoryMB * 1024 * 1024;
    yield* Effect3.logDebug(
      `Memory limit configured: ${Policy.MaxMemoryMB}MB`
    );
  } else {
    yield* Effect3.logTrace("No memory limit configured");
  }
});
var RunPatchProcess = Effect3.gen(function* () {
  const AllPatches = [
    PatchProcessCrash,
    PatchProcessExit,
    SetStackTraceLimit,
    SetupEnvironment,
    SetElectronRunAsNode,
    BlockNativesModule,
    PipeLogging,
    HandleException,
    TerminateOnParentExit,
    EnforceMemoryLimit
  ];
  yield* Effect3.all(AllPatches, { discard: true, concurrency: "unbounded" });
}).pipe(
  Effect3.tap(
    () => Effect3.logDebug("All core process patches have been applied")
  ),
  Effect3.catchAll(
    (Error2) => Effect3.logFatal(
      "Critical error during process patching. Environment may be unstable",
      Error2
    )
  ),
  Effect3.provide(PatcherService.Default)
);
function ParseSecurityPolicy(PolicyString) {
  const Parts = PolicyString.split(",");
  const Policy = {
    AllowExit: false,
    MaxMemoryMB: 0,
    AllowNetwork: false,
    AllowChildProcesses: false
  };
  for (const Part of Parts) {
    const [Key, Value] = Part.split("=");
    switch (Key.trim()) {
      case "AllowExit":
        Policy.AllowExit = Value === "true";
        break;
      case "MaxMemoryMB":
        Policy.MaxMemoryMB = Number.parseInt(Value, 10) || 0;
        break;
      case "AllowNetwork":
        Policy.AllowNetwork = Value === "true";
        break;
      case "AllowChildProcesses":
        Policy.AllowChildProcesses = Value === "true";
        break;
    }
  }
  return Policy;
}
__name(ParseSecurityPolicy, "ParseSecurityPolicy");
var ReloadSecurityPolicy = Effect3.gen(function* () {
  yield* Effect3.logInfo("Reloading security policy...");
  const NewPolicyString = yield* Config.string("SecurityPolicy").pipe(
    Effect3.catchTag("MissingConfig", () => Effect3.succeed("default"))
  );
  const NewPolicy = ParseSecurityPolicy(NewPolicyString);
  yield* Effect3.logDebug("Security policy reloaded", { NewPolicy });
  return NewPolicy;
});

// Source/PatchProcess/Security.ts
import * as Path from "node:path";
import * as URL from "node:url";
import { Data as Data2, Effect as Effect4 } from "effect";
var DefaultSecurityPolicy = {
  AllowExit: false,
  MaxMemoryMB: 512,
  MaxCpuPercent: 50,
  AllowNetwork: false,
  AllowedEndpoints: [],
  AllowChildProcesses: false,
  AllowedChildCommands: [],
  AllowedPaths: [],
  DeniedPaths: ["/etc", "/proc", "/sys", "/root"],
  MaxFileDescriptors: 1024,
  MaxTimers: 1e3
};
var TrustedSecurityPolicy = {
  AllowExit: false,
  MaxMemoryMB: 1024,
  MaxCpuPercent: 80,
  AllowNetwork: true,
  AllowedEndpoints: ["^https?://(localhost|127\\.0\\.0\\.1):\\d+"],
  AllowChildProcesses: true,
  AllowedChildCommands: ["node", "npm"],
  AllowedPaths: [],
  DeniedPaths: ["/etc/shadow", "/etc/passwd"],
  MaxFileDescriptors: 4096,
  MaxTimers: 1e4
};
var MemoryLimitExceededError = class extends Data2.TaggedError(
  "MemoryLimitExceededError"
) {
  static {
    __name(this, "MemoryLimitExceededError");
  }
};
var FileAccessDeniedError = class extends Data2.TaggedError(
  "FileAccessDeniedError"
) {
  static {
    __name(this, "FileAccessDeniedError");
  }
};
var NetworkAccessDeniedError = class extends Data2.TaggedError(
  "NetworkAccessDeniedError"
) {
  static {
    __name(this, "NetworkAccessDeniedError");
  }
};
var ChildProcessDeniedError = class extends Data2.TaggedError(
  "ChildProcessDeniedError"
) {
  static {
    __name(this, "ChildProcessDeniedError");
  }
};
var CpuLimitExceededError = class extends Data2.TaggedError(
  "CpuLimitExceededError"
) {
  static {
    __name(this, "CpuLimitExceededError");
  }
};
var ValidatePathAccess = /* @__PURE__ */ __name((PathString, Operation, Policy = DefaultSecurityPolicy) => {
  const NormalizedPath = Path.normalize(PathString);
  const ResolvedPath = Path.resolve(NormalizedPath);
  for (const DeniedPath of Policy.DeniedPaths) {
    const ResolvedDeniedPath = Path.resolve(DeniedPath);
    if (ResolvedPath === ResolvedDeniedPath || ResolvedPath.startsWith(ResolvedDeniedPath + Path.sep)) {
      return false;
    }
  }
  if (Policy.AllowedPaths.length === 0) {
    return true;
  }
  for (const AllowedPath of Policy.AllowedPaths) {
    const ResolvedAllowedPath = Path.resolve(AllowedPath);
    if (ResolvedPath === ResolvedAllowedPath || ResolvedPath.startsWith(ResolvedAllowedPath + Path.sep)) {
      return true;
    }
  }
  return false;
}, "ValidatePathAccess");
var ValidateNetworkAccess = /* @__PURE__ */ __name((Endpoint, Policy = DefaultSecurityPolicy) => {
  if (!Policy.AllowNetwork) {
    return false;
  }
  if (Policy.AllowedEndpoints.length === 0) {
    return true;
  }
  let ParsedUrl;
  try {
    ParsedUrl = new URL.URL(Endpoint);
  } catch (Error2) {
    return true;
  }
  for (const Pattern of Policy.AllowedEndpoints) {
    const Regex = new RegExp(Pattern);
    if (Regex.test(Endpoint)) {
      return true;
    }
  }
  return false;
}, "ValidateNetworkAccess");
var ValidateChildProcess = /* @__PURE__ */ __name((Command, Arguments, Policy = DefaultSecurityPolicy) => {
  if (!Policy.AllowChildProcesses) {
    return false;
  }
  const CommandName = Command.split(Path.sep).pop() || Command;
  if (Policy.AllowedChildCommands.length === 0) {
    return true;
  }
  for (const AllowedCommand of Policy.AllowedChildCommands) {
    if (CommandName === AllowedCommand) {
      return true;
    }
  }
  return false;
}, "ValidateChildProcess");
var ValidateEnvironmentVariable = /* @__PURE__ */ __name((Name, Value) => {
  const BlockedVariables = [
    "NODE_OPTIONS",
    "NODE_DEBUG",
    "NODE_ENV",
    "NODE_EXTRA_CA_CERTS"
  ];
  if (BlockedVariables.includes(Name)) {
    return "";
  }
  const UnsafePatterns = [
    /--inspect/i,
    /--debug/i,
    /--eval/i,
    /--print/i,
    /-e\s+/i,
    /-p\s+/i
  ];
  for (const Pattern of UnsafePatterns) {
    if (Pattern.test(Value)) {
      return "";
    }
  }
  return Value;
}, "ValidateEnvironmentVariable");
var EnforceMemoryLimit2 = Effect4.gen(function* () {
  const Policy = DefaultSecurityPolicy;
  if (Policy.MaxMemoryMB <= 0) {
    return yield* Effect4.logTrace("No memory limit configured");
  }
  const MemoryUsage = process.memoryUsage();
  const UsedMemoryMB = MemoryUsage.heapUsed / (1024 * 1024);
  if (UsedMemoryMB > Policy.MaxMemoryMB) {
    yield* Effect4.logError(
      `Memory limit exceeded: ${UsedMemoryMB.toFixed(2)}MB / ${Policy.MaxMemoryMB}MB`
    );
    return yield* Effect4.fail(
      new MemoryLimitExceededError({
        LimitMB: Policy.MaxMemoryMB,
        AttemptedMB: UsedMemoryMB,
        ProcessId: process.pid
      })
    );
  }
  yield* Effect4.logTrace(
    `Memory usage within limits: ${UsedMemoryMB.toFixed(2)}MB / ${Policy.MaxMemoryMB}MB`
  );
});
var EnforceCpuLimit = Effect4.gen(function* () {
  const Policy = DefaultSecurityPolicy;
  if (Policy.MaxCpuPercent <= 0) {
    return yield* Effect4.logTrace("No CPU limit configured");
  }
  yield* Effect4.logDebug(
    `CPU limit configured: ${Policy.MaxCpuPercent}% (monitoring not yet implemented)`
  );
});
var PerformSecurityAudit = Effect4.gen(function* () {
  const Policy = DefaultSecurityPolicy;
  const Report = {
    MemoryUsage: process.memoryUsage(),
    Pid: process.pid,
    Ppid: process.ppid,
    Cwd: process.cwd(),
    ExecArgv: process.execArgv,
    Env: Object.keys(process.env).length,
    AllowedPaths: Policy.AllowedPaths,
    DeniedPaths: Policy.DeniedPaths,
    AllowNetwork: Policy.AllowNetwork,
    AllowChildProcesses: Policy.AllowChildProcesses,
    MaxMemoryMB: Policy.MaxMemoryMB,
    MaxCpuPercent: Policy.MaxCpuPercent,
    Timestamp: Date.now()
  };
  yield* Effect4.logInfo("Security audit completed", { Report });
  return Report;
});
var GetPolicyHash = /* @__PURE__ */ __name((Policy = DefaultSecurityPolicy) => {
  const PolicyString = JSON.stringify(Policy, Object.keys(Policy).sort());
  return Buffer.from(PolicyString).toString("base64").slice(0, 16);
}, "GetPolicyHash");
var MergeSecurityPolicies = /* @__PURE__ */ __name((Overrides) => {
  return {
    AllowExit: Overrides.AllowExit ?? DefaultSecurityPolicy.AllowExit,
    MaxMemoryMB: Overrides.MaxMemoryMB ?? DefaultSecurityPolicy.MaxMemoryMB,
    MaxCpuPercent: Overrides.MaxCpuPercent ?? DefaultSecurityPolicy.MaxCpuPercent,
    AllowNetwork: Overrides.AllowNetwork ?? DefaultSecurityPolicy.AllowNetwork,
    AllowedEndpoints: Overrides.AllowedEndpoints ?? DefaultSecurityPolicy.AllowedEndpoints,
    AllowChildProcesses: Overrides.AllowChildProcesses ?? DefaultSecurityPolicy.AllowChildProcesses,
    AllowedChildCommands: Overrides.AllowedChildCommands ?? DefaultSecurityPolicy.AllowedChildCommands,
    AllowedPaths: Overrides.AllowedPaths ?? DefaultSecurityPolicy.AllowedPaths,
    DeniedPaths: Overrides.DeniedPaths ?? DefaultSecurityPolicy.DeniedPaths,
    MaxFileDescriptors: Overrides.MaxFileDescriptors ?? DefaultSecurityPolicy.MaxFileDescriptors,
    MaxTimers: Overrides.MaxTimers ?? DefaultSecurityPolicy.MaxTimers
  };
}, "MergeSecurityPolicies");

// Source/PatchProcess/Validator.ts
import * as Process from "node:process";
import { Data as Data3, Effect as Effect5, Queue } from "effect";
var ValidationError = class extends Data3.TaggedError("ValidationError") {
  static {
    __name(this, "ValidationError");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Validation failed for process ${Properties.ProcessId}: ${Properties.Reason}`;
  }
};
var BehaviorViolationError = class extends Data3.TaggedError(
  "BehaviorViolationError"
) {
  static {
    __name(this, "BehaviorViolationError");
  }
};
var ValidationMetricsStore = class _ValidationMetricsStore {
  static {
    __name(this, "ValidationMetricsStore");
  }
  static _instance;
  _metrics = {
    TotalValidations: 0,
    FailedValidations: 0,
    LastValidationTime: 0,
    AverageValidationTime: 0
  };
  static GetInstance() {
    if (!_ValidationMetricsStore._instance) {
      _ValidationMetricsStore._instance = new _ValidationMetricsStore();
    }
    return _ValidationMetricsStore._instance;
  }
  RecordValidation(StartTime, Success) {
    const EndTime = Date.now();
    const Duration = EndTime - StartTime;
    this._metrics.TotalValidations++;
    this._metrics.LastValidationTime = EndTime;
    if (!Success) {
      this._metrics.FailedValidations++;
    }
    this._metrics.AverageValidationTime = (this._metrics.AverageValidationTime * (this._metrics.TotalValidations - 1) + Duration) / this._metrics.TotalValidations;
  }
  GetMetrics() {
    return { ...this._metrics };
  }
  Reset() {
    this._metrics = {
      TotalValidations: 0,
      FailedValidations: 0,
      LastValidationTime: 0,
      AverageValidationTime: 0
    };
  }
};
var ProcessValidationStates = /* @__PURE__ */ new Map();
var ValidationAlertQueue = null;
var InitializeProcessValidation = Effect5.gen(function* () {
  const State = {
    ProcessId: Process.pid,
    StartTime: Date.now(),
    FileAccessCount: /* @__PURE__ */ new Map(),
    NetworkAccessCount: /* @__PURE__ */ new Map(),
    ChildProcessCount: 0,
    ViolationCount: 0,
    SecurityPolicy: DefaultSecurityPolicy
  };
  ProcessValidationStates.set(Process.pid, State);
  ValidationAlertQueue = yield* Queue.unbounded();
  yield* Effect5.logInfo("Process validation initialized", {
    ProcessId: Process.pid
  });
  return State;
});
var ValidateFileSystemAccess = /* @__PURE__ */ __name((File, Operation) => Effect5.gen(function* () {
  const StartTime = Date.now();
  const Metrics = ValidationMetricsStore.GetInstance();
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    const Result2 = {
      Valid: false,
      Reason: "Process validation state not initialized",
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    return Result2;
  }
  const PathValid = ValidatePathAccess(
    File,
    Operation,
    State.SecurityPolicy
  );
  if (!PathValid) {
    State.ViolationCount++;
    const Count = (State.FileAccessCount.get(File) || 0) + 1;
    State.FileAccessCount.set(File, Count);
    const Result2 = {
      Valid: false,
      Reason: `File access denied: ${Operation} on ${File}`,
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    yield* Effect5.logWarning("File system access denied", {
      File,
      Operation,
      ProcessId: Process.pid
    });
    return Result2;
  }
  const Result = {
    Valid: true,
    Severity: "info",
    Timestamp: Date.now()
  };
  Metrics.RecordValidation(StartTime, true);
  return Result;
}), "ValidateFileSystemAccess");
var ValidateNetworkAccess2 = /* @__PURE__ */ __name((Endpoint, Operation) => Effect5.gen(function* () {
  const StartTime = Date.now();
  const Metrics = ValidationMetricsStore.GetInstance();
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    const Result2 = {
      Valid: false,
      Reason: "Process validation state not initialized",
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    return Result2;
  }
  const NetworkValid = ValidateNetworkAccess2(
    Endpoint,
    State.SecurityPolicy
  );
  if (!NetworkValid) {
    State.ViolationCount++;
    const Count = (State.NetworkAccessCount.get(Endpoint) || 0) + 1;
    State.NetworkAccessCount.set(Endpoint, Count);
    const Result2 = {
      Valid: false,
      Reason: `Network access denied: ${Operation} to ${Endpoint}`,
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    yield* Effect5.logWarning("Network access denied", {
      Endpoint,
      Operation,
      ProcessId: Process.pid
    });
    return Result2;
  }
  const Result = {
    Valid: true,
    Severity: "info",
    Timestamp: Date.now()
  };
  Metrics.RecordValidation(StartTime, true);
  return Result;
}), "ValidateNetworkAccess");
var ValidateChildProcessSpawn = /* @__PURE__ */ __name((Command, Arguments) => Effect5.gen(function* () {
  const StartTime = Date.now();
  const Metrics = ValidationMetricsStore.GetInstance();
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    const Result2 = {
      Valid: false,
      Reason: "Process validation state not initialized",
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    return Result2;
  }
  const SpawnValid = ValidateChildProcess(
    Command,
    Arguments,
    State.SecurityPolicy
  );
  if (!SpawnValid) {
    State.ViolationCount++;
    State.ChildProcessCount++;
    const Result2 = {
      Valid: false,
      Reason: `Child process spawning denied: ${Command}`,
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    yield* Effect5.logWarning("Child process spawn denied", {
      Command,
      Arguments,
      ProcessId: Process.pid
    });
    return Result2;
  }
  State.ChildProcessCount++;
  const Result = {
    Valid: true,
    Severity: "info",
    Timestamp: Date.now()
  };
  Metrics.RecordValidation(StartTime, true);
  return Result;
}), "ValidateChildProcessSpawn");
var ValidateMemoryUsage = Effect5.gen(function* () {
  const StartTime = Date.now();
  const Metrics = ValidationMetricsStore.GetInstance();
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    const Result2 = {
      Valid: false,
      Reason: "Process validation state not initialized",
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    return Result2;
  }
  const MemoryUsage = Process.memoryUsage();
  const UsedMemoryMB = MemoryUsage.heapUsed / (1024 * 1024);
  const MaxMemoryMB = State.SecurityPolicy.MaxMemoryMB;
  if (MaxMemoryMB > 0 && UsedMemoryMB > MaxMemoryMB) {
    State.ViolationCount++;
    const Result2 = {
      Valid: false,
      Reason: `Memory limit exceeded: ${UsedMemoryMB.toFixed(2)}MB / ${MaxMemoryMB}MB`,
      Severity: "critical",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    yield* Effect5.logError("Memory limit exceeded", {
      UsedMemoryMB,
      MaxMemoryMB,
      ProcessId: Process.pid
    });
    return Result2;
  }
  const Result = {
    Valid: true,
    Severity: "info",
    Timestamp: Date.now()
  };
  Metrics.RecordValidation(StartTime, true);
  return Result;
});
var DetectSuspiciousBehavior = Effect5.gen(function* () {
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    return yield* Effect5.fail(
      new ValidationError({
        ProcessId: Process.pid,
        ValidationType: "BehaviorDetection",
        Reason: "Process validation state not initialized",
        Severity: "error"
      })
    );
  }
  const UptimeMinutes = (Date.now() - State.StartTime) / 6e4;
  const AccessRate = Array.from(State.FileAccessCount.values()).reduce(
    (a, b) => a + b,
    0
  );
  const NetworkRate = Array.from(State.NetworkAccessCount.values()).reduce(
    (a, b) => a + b,
    0
  );
  if (UptimeMinutes > 0 && AccessRate / UptimeMinutes > 100) {
    yield* Effect5.logWarning("Suspicious file access rate detected", {
      AccessRate,
      UptimeMinutes,
      ProcessId: Process.pid
    });
  }
  if (UptimeMinutes > 0 && NetworkRate / UptimeMinutes > 10) {
    yield* Effect5.logWarning("Suspicious network activity detected", {
      NetworkRate,
      UptimeMinutes,
      ProcessId: Process.pid
    });
  }
  if (State.ChildProcessCount > 50) {
    yield* Effect5.logWarning("Excessive child process spawning", {
      ChildProcessCount: State.ChildProcessCount,
      ProcessId: Process.pid
    });
  }
  if (State.ViolationCount > 10) {
    yield* Effect5.logError("Multiple security violations detected", {
      ViolationCount: State.ViolationCount,
      ProcessId: Process.pid
    });
  }
  return {
    AccessRate,
    NetworkRate,
    ChildProcessCount: State.ChildProcessCount,
    ViolationCount: State.ViolationCount
  };
});
var GetValidationMetrics = /* @__PURE__ */ __name(() => {
  return ValidationMetricsStore.GetInstance().GetMetrics();
}, "GetValidationMetrics");
var ResetValidationMetrics = Effect5.sync(() => {
  ValidationMetricsStore.GetInstance().Reset();
  return;
});
var GetProcessValidationState = /* @__PURE__ */ __name((ProcessId = Process.pid) => {
  return ProcessValidationStates.get(ProcessId);
}, "GetProcessValidationState");
var ClearProcessValidationState = /* @__PURE__ */ __name((ProcessId = Process.pid) => {
  return Effect5.sync(() => {
    ProcessValidationStates.delete(ProcessId);
  });
}, "ClearProcessValidationState");
var RunSecurityValidation = Effect5.gen(function* () {
  yield* ValidateMemoryUsage;
  const BehaviorCheck = yield* DetectSuspiciousBehavior;
  const Result = {
    ProcessId: Process.pid,
    Timestamp: Date.now(),
    BehaviorCheck,
    Metrics: GetValidationMetrics()
  };
  yield* Effect5.logInfo(
    "Comprehensive security validation completed",
    Result
  );
  return Result;
});

// Source/PatchProcess/Loader.ts
import * as Process2 from "node:process";
import { Config as Config2, Effect as Effect6, Layer as Layer3 } from "effect";
var LoaderService = class extends Effect6.Service()(
  "PatchProcess/LoaderService",
  {
    effect: Effect6.gen(function* () {
      const SecurityPolicy4 = yield* Config2.string("SecurityPolicy").pipe(
        Effect6.catchTag(
          "MissingConfig",
          () => Effect6.succeed("default")
        )
      );
      const EnableMonitoring = yield* Config2.boolean(
        "EnableMonitoring"
      ).pipe(Effect6.catchAll(() => Effect6.succeed(true)));
      return {
        LoadSecurityPatches: RunPatchProcess,
        InitializeMonitoring: Effect6.gen(function* () {
          if (!EnableMonitoring) {
            return yield* Effect6.logInfo(
              "Security monitoring disabled by configuration"
            );
          }
          yield* InitializeProcessValidation;
          yield* Effect6.logInfo("Process monitoring initialized");
        }),
        GetSecurityPolicy: Effect6.succeed({
          AllowExit: false,
          MaxMemoryMB: 512,
          MaxCpuPercent: 50,
          AllowNetwork: false,
          AllowedEndpoints: [],
          AllowChildProcesses: false,
          AllowedChildCommands: [],
          AllowedPaths: [],
          DeniedPaths: ["/etc", "/proc", "/sys", "/root"],
          MaxFileDescriptors: 1024,
          MaxTimers: 1e3
        }),
        RunSecurityAudit: PerformSecurityAudit
      };
    })
  }
) {
  static {
    __name(this, "LoaderService");
  }
};
var InitializeSecurityLoader = Effect6.gen(function* () {
  const Loader2 = yield* LoaderService;
  yield* Effect6.logInfo("Initializing Security Loader...");
  yield* Effect6.logInfo("Loading security patches...");
  yield* Loader2.LoadSecurityPatches;
  yield* Effect6.logInfo("Initializing monitoring...");
  yield* Loader2.InitializeMonitoring;
  yield* Effect6.logInfo("Running initial security audit...");
  const AuditResult = yield* Loader2.RunSecurityAudit;
  yield* Effect6.logInfo("Initial security audit completed", { AuditResult });
  yield* StartPeriodicValidation;
  yield* Effect6.logInfo("Security Loader initialization completed");
});
var StartPeriodicValidation = Effect6.gen(function* () {
  const IntervalSeconds = 30;
  yield* Effect6.logDebug(
    `Starting periodic security validation (${IntervalSeconds}s interval)`
  );
  const ValidationLoop = Effect6.gen(function* () {
    while (true) {
      yield* Effect6.sleep(`${IntervalSeconds} seconds`);
      const ValidationResult = yield* RunSecurityValidation.pipe(
        Effect6.catchAll((Error2) => {
          return Effect6.logError(
            "Periodic security validation failed",
            {
              Error: Error2
            }
          );
        })
      );
      yield* Effect6.logTrace(
        "Periodic security validation completed",
        ValidationResult
      );
    }
  });
  yield* ValidationLoop.pipe(Effect6.forkDaemon);
});
var ValidateFileSystemAccessWrapper = /* @__PURE__ */ __name((File, Operation) => Effect6.gen(function* () {
  const Result = yield* ValidateFileSystemAccess(File, Operation);
  if (!Result.Valid) {
    yield* Effect6.logWarning("File system access prevented", {
      File,
      Operation,
      Reason: Result.Reason
    });
    return false;
  }
  return true;
}), "ValidateFileSystemAccessWrapper");
var ValidateNetworkAccessWrapper = /* @__PURE__ */ __name((Endpoint, Operation) => Effect6.gen(function* () {
  const Result = yield* ValidateNetworkAccess2(Endpoint, Operation);
  if (!Result.Valid) {
    yield* Effect6.logWarning("Network access prevented", {
      Endpoint,
      Operation,
      Reason: Result.Reason
    });
    return false;
  }
  return true;
}), "ValidateNetworkAccessWrapper");
var ValidateChildProcessSpawnWrapper = /* @__PURE__ */ __name((Command, Arguments) => Effect6.gen(function* () {
  const Result = yield* ValidateChildProcessSpawn(Command, Arguments);
  if (!Result.Valid) {
    yield* Effect6.logWarning("Child process spawn prevented", {
      Command,
      Arguments,
      Reason: Result.Reason
    });
    return false;
  }
  return true;
}), "ValidateChildProcessSpawnWrapper");
var InstallModuleHooks = Effect6.gen(function* () {
  yield* Effect6.logTrace("Module hooks not yet implemented");
});
var InstallFileSystemHooks = Effect6.gen(function* () {
  yield* Effect6.logTrace("Filesystem hooks not yet implemented");
});
var InstallChildProcessHooks = Effect6.gen(function* () {
  yield* Effect6.logTrace("Child process hooks not yet implemented");
});
var InstallSecurityHooks = Effect6.gen(function* () {
  yield* Effect6.logInfo("Installing security hooks...");
  yield* InstallModuleHooks;
  yield* InstallFileSystemHooks;
  yield* InstallChildProcessHooks;
  yield* Effect6.logInfo("Security hooks installed");
});
var SetResourceLimits = Effect6.gen(function* () {
  yield* Effect6.logTrace(
    "Resource limit setting not yet implemented (needs native integration)"
  );
});
var GetResourceUsage = Effect6.gen(function* () {
  return {
    Memory: Process2.memoryUsage(),
    CpuUsage: Process2.cpuUsage(),
    Uptime: Process2.uptime(),
    Pid: Process2.pid,
    Ppid: Process2.ppid,
    Platform: Process2.platform,
    Arch: Process2.arch,
    NodeVersion: Process2.version,
    Timestamp: Date.now()
  };
});
var CleanupSecurityLoader = Effect6.gen(function* () {
  yield* Effect6.logInfo("Cleaning up Security Loader...");
  yield* Effect6.logInfo("Security Loader cleanup completed");
});
var LoaderServiceLive = Layer3.effect(Loader, LoaderService.Default);
var SecurityLive = Layer3.provide(
  LoaderServiceLive,
  PatcherService.Default
);
export {
  CleanupSecurityLoader,
  GetResourceUsage,
  InitializeSecurityLoader,
  InstallSecurityHooks,
  LoaderService,
  LoaderServiceLive,
  SecurityLive,
  ValidateChildProcessSpawnWrapper,
  ValidateFileSystemAccessWrapper,
  ValidateNetworkAccessWrapper
};
//# sourceMappingURL=Loader.js.map
