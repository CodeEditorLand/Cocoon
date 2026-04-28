var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/LandFixLog.ts
var Mode = process.env["LAND_LANDFIX_LOG"] ?? "short";
var Enabled = Mode !== "off";
var Long = Mode === "long";
var DebugEnabled = Long;
var AllowList = (() => {
  const Raw = process.env["LAND_LANDFIX_TAGS"];
  if (!Raw || Raw.trim().length === 0) return void 0;
  const Tags = Raw.split(",").map((Entry) => Entry.trim()).filter((Entry) => Entry.length > 0);
  return Tags.length === 0 ? void 0 : new Set(Tags);
})();
var PadTwo = /* @__PURE__ */ __name((Value) => Value < 10 ? `0${Value}` : String(Value), "PadTwo");
var PadThree = /* @__PURE__ */ __name((Value) => Value < 10 ? `00${Value}` : Value < 100 ? `0${Value}` : String(Value), "PadThree");
var FormatTimestamp = /* @__PURE__ */ __name(() => {
  const Now = /* @__PURE__ */ new Date();
  if (Long) return Now.toISOString();
  return `${PadTwo(Now.getHours())}:${PadTwo(Now.getMinutes())}:${PadTwo(
    Now.getSeconds()
  )}.${PadThree(Now.getMilliseconds())}`;
}, "FormatTimestamp");
var SerializeContext = /* @__PURE__ */ __name((Context) => {
  const Seen = /* @__PURE__ */ new WeakSet();
  try {
    return JSON.stringify(Context, (_Key, Value) => {
      if (Value instanceof Error) {
        return { name: Value.name, message: Value.message };
      }
      if (typeof Value === "bigint") return String(Value);
      if (typeof Value === "function") return "[Function]";
      if (typeof Value === "object" && Value !== null) {
        if (Seen.has(Value)) return "[Circular]";
        Seen.add(Value);
      }
      return Value;
    });
  } catch {
    return '"[Unserializable]"';
  }
}, "SerializeContext");
var LevelTag = /* @__PURE__ */ __name((Level) => Level === "info" ? "" : ` ${Level.toUpperCase()}`, "LevelTag");
var FormatLine = /* @__PURE__ */ __name((Level, Tag, Message, Context) => {
  const Head = `${FormatTimestamp()} [LandFix:${Tag}]${LevelTag(Level)} ${Message}`;
  if (!Context) return `${Head}
`;
  return `${Head} ${SerializeContext(Context)}
`;
}, "FormatLine");
var Emit = /* @__PURE__ */ __name((Stream, Level, Tag, Message, Context) => {
  if (!Enabled) return;
  if (AllowList && !AllowList.has(Tag)) return;
  try {
    Stream.write(FormatLine(Level, Tag, Message, Context));
  } catch {
  }
}, "Emit");
var Info = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stdout, "info", Tag, Message, Context);
}, "Info");
var Warn = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stdout, "warn", Tag, Message, Context);
}, "Warn");
var ErrorLog = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stderr, "error", Tag, Message, Context);
}, "ErrorLog");
var Debug = /* @__PURE__ */ __name((Tag, Message, Context) => {
  if (!DebugEnabled) return;
  Emit(process.stdout, "debug", Tag, Message, Context);
}, "Debug");
var SeenOnce = /* @__PURE__ */ new Set();
var DebugOnce = /* @__PURE__ */ __name((Tag, Key, Message, Context) => {
  if (!DebugEnabled) return;
  const Combined = `${Tag}:${Key}`;
  if (SeenOnce.has(Combined)) return;
  SeenOnce.add(Combined);
  Emit(process.stdout, "debug", Tag, Message, Context);
}, "DebugOnce");
var InfoOnce = /* @__PURE__ */ __name((Tag, Key, Message, Context) => {
  const Combined = `${Tag}:${Key}`;
  if (SeenOnce.has(Combined)) return;
  SeenOnce.add(Combined);
  Emit(process.stdout, "info", Tag, Message, Context);
}, "InfoOnce");
var LandFixLog = {
  Info,
  InfoOnce,
  Warn,
  Error: ErrorLog,
  Debug,
  DebugOnce,
  IsEnabled: /* @__PURE__ */ __name(() => Enabled, "IsEnabled"),
  IsDebugEnabled: /* @__PURE__ */ __name(() => DebugEnabled, "IsDebugEnabled"),
  Mode: /* @__PURE__ */ __name(() => Mode === "off" ? "off" : Long ? "long" : "short", "Mode")
};
var LandFixLog_default = LandFixLog;

// Source/Telemetry/PostHog/Event.ts
var BaseProperties = {
  $app: "land-editor",
  $app_version: "0.0.1",
  $build_mode: "debug",
  $component: "cocoon",
  $tier: "cocoon",
  $lib: "cocoon-posthog-bridge"
};
var Create = /* @__PURE__ */ __name((Name, Properties = {}) => ({
  Name,
  Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
  Properties
}), "Create");
var Enrich = /* @__PURE__ */ __name((Properties) => ({
  ...Properties,
  ...BaseProperties,
  $node_version: process.version
}), "Enrich");
var Event_default = { Create, Enrich };

// Source/Telemetry/PostHog/Transport.ts
import * as NodeHttps from "node:https";
var RequestTimeoutMilliseconds = 5e3;
var Transport_default = /* @__PURE__ */ __name((Host, Key, DistinctIdentifier2, Batch) => {
  if (Batch.length === 0) return;
  const Payload = JSON.stringify({
    api_key: Key,
    batch: Batch.map((Entry) => ({
      event: Entry.Name,
      timestamp: Entry.Timestamp,
      distinct_id: DistinctIdentifier2,
      properties: Event_default.Enrich(Entry.Properties)
    }))
  });
  try {
    const Address = new URL("/batch/", Host);
    const Request = NodeHttps.request(
      {
        method: "POST",
        hostname: Address.hostname,
        port: Address.port || 443,
        path: Address.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(Payload)
        },
        timeout: RequestTimeoutMilliseconds
      },
      (Response) => {
        Response.resume();
      }
    );
    Request.on("error", () => {
    });
    Request.on("timeout", () => {
      Request.destroy();
    });
    Request.write(Payload);
    Request.end();
  } catch {
  }
}, "default");

// Source/Telemetry/PostHog/Buffer.ts
var Buffer_default = /* @__PURE__ */ __name((Config, DistinctIdentifier2) => {
  let Queue = [];
  let FlushTimer;
  const Send = /* @__PURE__ */ __name(() => {
    if (Queue.length === 0) return;
    const Pending = Queue;
    Queue = [];
    Transport_default(Config.Host, Config.Key, DistinctIdentifier2, Pending);
  }, "Send");
  const ScheduleFlush = /* @__PURE__ */ __name(() => {
    if (FlushTimer) return;
    FlushTimer = setTimeout(() => {
      FlushTimer = void 0;
      Send();
    }, Config.BatchWindowMilliseconds);
    FlushTimer.unref?.();
  }, "ScheduleFlush");
  return {
    Enqueue: /* @__PURE__ */ __name((Name, Properties) => {
      Queue.push(Event_default.Create(Name, Properties));
      if (Queue.length >= Config.BatchMaximum) {
        Send();
        return;
      }
      ScheduleFlush();
    }, "Enqueue"),
    Drain: /* @__PURE__ */ __name(() => {
      if (FlushTimer) {
        clearTimeout(FlushTimer);
        FlushTimer = void 0;
      }
      Send();
    }, "Drain")
  };
}, "default");

// Source/Telemetry/PostHog/Configuration.ts
var DefaultKey = "";
var DefaultHost = "https://eu.i.posthog.com";
var DefaultBatchWindowMilliseconds = 3e3;
var DefaultBatchMaximum = 50;
var ReadString = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  return Value && Value.length > 0 ? Value : Fallback;
}, "ReadString");
var ReadBoolean = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  if (Value === void 0) return Fallback;
  return !["false", "0", "off", ""].includes(Value.toLowerCase());
}, "ReadBoolean");
var ReadNumber = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  const Parsed = Value ? Number(Value) : Number.NaN;
  return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
}, "ReadNumber");
var Configuration_default = /* @__PURE__ */ __name(() => ({
  Key: ReadString("LAND_POSTHOG_KEY", DefaultKey),
  Host: ReadString("LAND_POSTHOG_HOST", DefaultHost),
  Enabled: ReadBoolean("LAND_POSTHOG_COCOON_ENABLED", true) && process.env["NODE_ENV"] !== "production",
  BatchWindowMilliseconds: ReadNumber(
    "LAND_POSTHOG_COCOON_BATCH_WINDOW_MS",
    DefaultBatchWindowMilliseconds
  ),
  BatchMaximum: ReadNumber(
    "LAND_POSTHOG_COCOON_BATCH_MAX",
    DefaultBatchMaximum
  ),
  DistinctIdentifierSeed: process.env["LAND_POSTHOG_DISTINCT_ID"] ?? ""
}), "default");

// Source/Telemetry/PostHog/Identifier.ts
var Identifier_default = /* @__PURE__ */ __name((Seed) => {
  if (Seed.length > 0) return Seed;
  const Username = process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";
  return `land-dev-${Username}`;
}, "default");

// Source/Telemetry/PostHogBridge.ts
var Configuration = Configuration_default();
var DistinctIdentifier = Identifier_default(
  Configuration.DistinctIdentifierSeed
);
var ActiveBuffer;
var Initialized = false;
var Buffered = /* @__PURE__ */ __name(() => {
  if (!Configuration.Enabled) return void 0;
  if (!ActiveBuffer) {
    ActiveBuffer = Buffer_default(Configuration, DistinctIdentifier);
  }
  return ActiveBuffer;
}, "Buffered");
var CaptureEvent = /* @__PURE__ */ __name((Name, Properties = {}) => {
  try {
    Buffered()?.Enqueue(Name, Properties);
  } catch {
  }
}, "CaptureEvent");
var CaptureError = /* @__PURE__ */ __name((Tag, Message, Extra = {}) => {
  const Bridge = Buffered();
  if (!Bridge) return;
  Bridge.Enqueue("cocoon:error", {
    ...Extra,
    error_tag: Tag,
    error_message: Message
  });
  Bridge.Drain();
}, "CaptureError");
var Initialize = /* @__PURE__ */ __name(() => {
  if (Initialized) return;
  Initialized = true;
  const Bridge = Buffered();
  if (!Bridge) return;
  const OnExit = /* @__PURE__ */ __name(() => Bridge.Drain(), "OnExit");
  process.once("exit", OnExit);
  process.once("SIGINT", OnExit);
  process.once("SIGTERM", OnExit);
  CaptureEvent("cocoon:session:start", {
    pid: process.pid,
    platform: process.platform,
    arch: process.arch
  });
}, "Initialize");
var PostHogBridge_default = { CaptureEvent, CaptureError, Initialize };

// Source/Services/Handler/VscodeAPI/WrapNamespaceWithHeuristics.ts
import { Effect } from "effect";
var NoopDisposable = { dispose: /* @__PURE__ */ __name(() => {
}, "dispose") };
var IsTrustFamily = /* @__PURE__ */ __name((Property) => Property === "requestResourceTrust" || Property === "isResourceTrusted" || Property === "requestWorkspaceTrust" || /^(?:request|is|has)[A-Za-z]*Trust(?:ed)?$/.test(Property), "IsTrustFamily");
var ClassifyProperty = /* @__PURE__ */ __name((Property) => {
  if (IsTrustFamily(Property)) {
    return {
      Kind: "trust",
      Sync: false,
      Produce: /* @__PURE__ */ __name(() => true, "Produce")
    };
  }
  if (Property.startsWith("onDid") || Property.startsWith("onWill")) {
    return {
      Kind: "event",
      Sync: true,
      Produce: /* @__PURE__ */ __name(() => NoopDisposable, "Produce")
    };
  }
  if (Property.startsWith("register")) {
    return {
      Kind: "register",
      Sync: true,
      Produce: /* @__PURE__ */ __name(() => NoopDisposable, "Produce")
    };
  }
  if (Property.startsWith("is") || Property.startsWith("has") || Property.startsWith("should")) {
    return {
      Kind: "bool-check",
      Sync: false,
      Produce: /* @__PURE__ */ __name(() => false, "Produce")
    };
  }
  if (Property.startsWith("create") || Property.startsWith("get") || Property.startsWith("make")) {
    return {
      Kind: "factory",
      Sync: true,
      Produce: /* @__PURE__ */ __name(() => void 0, "Produce")
    };
  }
  return {
    Kind: "default",
    Sync: false,
    Produce: /* @__PURE__ */ __name(() => void 0, "Produce")
  };
}, "ClassifyProperty");
var RecordGap = /* @__PURE__ */ __name((NamespaceName, Property, Kind) => {
  const Key = `${NamespaceName}.${Property}`;
  LandFixLog_default.InfoOnce(
    "VSCODE-API-GAP",
    Key,
    `${NamespaceName}.${Property} \u2192 ${Kind}`
  );
  CaptureEvent("cocoon:vscode_api_gap", {
    namespace: NamespaceName,
    method: Property,
    kind: Kind
  });
}, "RecordGap");
var BuildHeuristicMethod = /* @__PURE__ */ __name((NamespaceName, Property, Heuristic) => (...Arguments) => {
  const SpanName = `vscode.${NamespaceName}.${Property}`;
  const Program = Effect.gen(function* () {
    yield* Effect.sync(
      () => RecordGap(NamespaceName, Property, Heuristic.Kind)
    );
    return Heuristic.Produce(...Arguments);
  }).pipe(
    Effect.withSpan(SpanName, {
      attributes: {
        "vscode.namespace": NamespaceName,
        "vscode.method": Property,
        "vscode.heuristic": Heuristic.Kind
      }
    })
  );
  return Heuristic.Sync ? Effect.runSync(Program) : Effect.runPromise(Program);
}, "BuildHeuristicMethod");
var WrapNamespaceWithHeuristics = /* @__PURE__ */ __name((NamespaceName, Concrete, Overrides) => new Proxy(Concrete, {
  get(Target, Property) {
    if (Reflect.has(Target, Property)) {
      return Reflect.get(Target, Property);
    }
    if (typeof Property !== "string") return void 0;
    if (Property === "then") return void 0;
    if (Property === "toJSON") {
      return () => {
        const Out = {
          _namespace: NamespaceName
        };
        for (const Key of Object.keys(Target)) {
          const Value = Target[Key];
          const T = typeof Value;
          Out[Key] = T === "function" ? "[Function]" : T === "object" && Value !== null ? "[Object]" : Value;
        }
        return Out;
      };
    }
    if (Property === "toString" || Property === "valueOf") {
      return void 0;
    }
    const Heuristic = Overrides?.[Property] ?? ClassifyProperty(Property);
    return BuildHeuristicMethod(NamespaceName, Property, Heuristic);
  },
  has(Target, Property) {
    if (Reflect.has(Target, Property)) return true;
    return typeof Property === "string" && Property !== "then";
  }
}), "WrapNamespaceWithHeuristics");
var WrapNamespaceWithHeuristics_default = WrapNamespaceWithHeuristics;

// Source/Services/Handler/VscodeAPI/WrapEnvNamespace.ts
var WrapEnvNamespace = /* @__PURE__ */ __name((Concrete) => WrapNamespaceWithHeuristics_default("env", Concrete), "WrapEnvNamespace");
var WrapEnvNamespace_default = WrapEnvNamespace;

// Source/Services/Handler/VscodeAPI/EnvNamespace.ts
var CreateEnvNamespace = /* @__PURE__ */ __name((Context) => {
  const Env = Context.ExtensionHostInitData?.environment ?? {};
  const NormalizeAppRoot = /* @__PURE__ */ __name((Raw) => {
    if (typeof Raw !== "string" || Raw.length === 0) {
      LandFixLog_default.Warn(
        "EnvNs",
        "appRoot empty or non-string, returning ''"
      );
      return "";
    }
    if (!Raw.startsWith("file:")) {
      LandFixLog_default.Info("EnvNs", `appRoot already plain path: ${Raw}`);
      return Raw;
    }
    try {
      const Normalised = decodeURIComponent(
        new URL(Raw).pathname
      ).replace(/\/$/, "");
      LandFixLog_default.Info(
        "EnvNs",
        `appRoot normalised file-URL ${Raw} \u2192 ${Normalised}`
      );
      return Normalised;
    } catch (Error2) {
      const Fallback = Raw.replace(/^file:\/\//, "").replace(/\/$/, "");
      LandFixLog_default.Warn(
        "EnvNs",
        `appRoot URL parse failed; fallback ${Raw} \u2192 ${Fallback}`,
        {
          error: Error2 instanceof globalThis.Error ? Error2.message : String(Error2)
        }
      );
      return Fallback;
    }
  }, "NormalizeAppRoot");
  const Call = /* @__PURE__ */ __name(async (Method, Parameters) => {
    try {
      return await Context.MountainClient?.sendRequest(
        Method,
        Parameters
      );
    } catch {
      return void 0;
    }
  }, "Call");
  const Concrete = {
    appName: Env["appName"] ?? "CodeEditorLand",
    appRoot: NormalizeAppRoot(Env["appRoot"]),
    appHost: Env["appHost"] ?? "desktop",
    uiKind: 1,
    // vscode.UIKind.Desktop
    language: Env["language"] ?? "en",
    machineId: Context.ExtensionHostInitData?.telemetry?.machineId ?? Env["machineId"] ?? "land",
    sessionId: Env["sessionId"] ?? `land-session-${Date.now().toString(36)}`,
    // VS Code build identity strings. `vscode.tunnel-forwarding` and
    // other extensions read `appCommit?.substring(0, 7)` to surface a
    // short SHA in their telemetry / status bar. Returning the
    // heuristic Proxy fallback (a function) crashes that call with
    // `appCommit?.substring is not a function`. Default to empty
    // string so optional-chained reads short-circuit cleanly; populate
    // from build env when a real commit hash is available.
    appCommit: Env["appCommit"] ?? "",
    appQuality: Env["appQuality"] ?? "stable",
    isNewAppInstall: false,
    isAppPortable: false,
    isTelemetryEnabled: false,
    onDidChangeTelemetryEnabled: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidChangeTelemetryEnabled"),
    // Land's bundled shell is fixed for the session; there's no UI to
    // switch it, so this event can never fire. Stub preserves the
    // disposable contract extensions rely on at activation time.
    onDidChangeShell: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidChangeShell"),
    uriScheme: Env["uriScheme"] ?? "vscode",
    shell: Env["shell"] ?? process.env["SHELL"] ?? "",
    remoteName: void 0,
    clipboard: {
      // Primary path: Mountain's Clipboard.Read / Clipboard.Write (when
      // routed). Fallback: native OS clipboard CLI - pbcopy/pbpaste on
      // macOS, xclip/wl-paste on Linux, clip/Get-Clipboard on Windows.
      // Each branch swallows errors so the extension host never crashes
      // on an unavailable clipboard subsystem.
      readText: /* @__PURE__ */ __name(async () => {
        const FromMountain = await Call("Clipboard.Read", []);
        if (typeof FromMountain === "string") return FromMountain;
        try {
          const { spawn } = await import("node:child_process");
          const Candidates = process.platform === "darwin" ? [["pbpaste", []]] : process.platform === "win32" ? [
            [
              "powershell.exe",
              [
                "-NoProfile",
                "-Command",
                "Get-Clipboard -Raw"
              ]
            ]
          ] : [
            ["wl-paste", ["-n"]],
            [
              "xclip",
              ["-selection", "clipboard", "-o"]
            ],
            ["xsel", ["--clipboard", "--output"]]
          ];
          for (const [Cmd, Args] of Candidates) {
            const Text = await new Promise(
              (Resolve) => {
                const Child = spawn(Cmd, Args, {
                  stdio: ["ignore", "pipe", "ignore"]
                });
                let Out = "";
                Child.stdout.on(
                  "data",
                  (Chunk) => Out += Chunk.toString("utf8")
                );
                Child.once("error", () => Resolve(void 0));
                Child.once(
                  "close",
                  (Code) => Resolve(Code === 0 ? Out : void 0)
                );
              }
            );
            if (Text !== void 0) return Text;
          }
        } catch {
        }
        return "";
      }, "readText"),
      writeText: /* @__PURE__ */ __name(async (Value) => {
        await Call("Clipboard.Write", [Value]);
        try {
          const { spawn } = await import("node:child_process");
          const Candidates = process.platform === "darwin" ? [["pbcopy", []]] : process.platform === "win32" ? [["clip.exe", []]] : [
            ["wl-copy", []],
            ["xclip", ["-selection", "clipboard"]],
            ["xsel", ["--clipboard", "--input"]]
          ];
          for (const [Cmd, Args] of Candidates) {
            const Ok = await new Promise((Resolve) => {
              const Child = spawn(Cmd, Args, {
                stdio: ["pipe", "ignore", "ignore"]
              });
              Child.once("error", () => Resolve(false));
              Child.once("close", (Code) => Resolve(Code === 0));
              try {
                Child.stdin.end(Value);
              } catch {
                Resolve(false);
              }
            });
            if (Ok) return;
          }
        } catch {
        }
      }, "writeText")
    },
    openExternal: /* @__PURE__ */ __name(async (Target) => {
      const Url = typeof Target === "string" ? Target : String(Target);
      const OkFromMountain = await Call(
        "NativeHost.OpenExternal",
        [Url]
      );
      if (OkFromMountain === true) return true;
      try {
        const { spawn } = await import("node:child_process");
        const Command = process.platform === "darwin" ? ["open", [Url]] : process.platform === "win32" ? ["cmd.exe", ["/c", "start", "", Url]] : ["xdg-open", [Url]];
        const Ok = await new Promise((Resolve) => {
          const Child = spawn(Command[0], Command[1], {
            stdio: "ignore",
            detached: true
          });
          const Timer = setTimeout(() => {
            try {
              Child.kill();
            } catch {
            }
            Resolve(false);
          }, 2e3);
          Child.once("error", () => {
            clearTimeout(Timer);
            Resolve(false);
          });
          Child.once("close", (Code) => {
            clearTimeout(Timer);
            Resolve(Code === 0);
          });
          Child.unref();
        });
        return Ok;
      } catch {
        return false;
      }
    }, "openExternal"),
    asExternalUri: /* @__PURE__ */ __name(async (Target) => Target, "asExternalUri"),
    createTelemetryLogger: /* @__PURE__ */ __name((_Sender, _Options) => ({
      isUsageEnabled: false,
      isErrorsEnabled: false,
      onDidChangeEnableStates: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeEnableStates"),
      logUsage: /* @__PURE__ */ __name((_EventName, _Data) => {
      }, "logUsage"),
      logError: /* @__PURE__ */ __name((_EventNameOrError, _Data) => {
      }, "logError"),
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "createTelemetryLogger"),
    logLevel: 2,
    onDidChangeLogLevel: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidChangeLogLevel")
  };
  return WrapEnvNamespace_default(Concrete);
}, "CreateEnvNamespace");
var EnvNamespace_default = CreateEnvNamespace;
export {
  EnvNamespace_default as default
};
//# sourceMappingURL=EnvNamespace.js.map
