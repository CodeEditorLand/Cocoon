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
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Handshake timeout"));
      }, 5e3);
      const handler = this._protocol.onMessage((buffer) => {
        try {
          const data = JSON.parse(buffer.toString());
          if (data.type === "handshake-response") {
            clearTimeout(timeout);
            resolve(buffer);
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
    return new Promise((resolve, reject) => {
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
              resolve(data.result);
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
      const SecurityPolicy2 = yield* Config.string("SecurityPolicy").pipe(
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
        GetSecurityPolicy: /* @__PURE__ */ __name(() => SecurityPolicy2, "GetSecurityPolicy")
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
export {
  PatcherService,
  ReloadSecurityPolicy,
  RunPatchProcess
};
//# sourceMappingURL=Patcher.js.map
