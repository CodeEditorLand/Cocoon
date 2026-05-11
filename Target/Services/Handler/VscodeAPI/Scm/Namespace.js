var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// Source/Telemetry/PostHog/Configuration.ts
var DefaultKey, DefaultHost, DefaultBatchWindowMilliseconds, DefaultBatchMaximum, ReadString, ReadBoolean, ReadNumber, TelemetryCaptureEnabled, Configuration_default;
var init_Configuration = __esm({
  "Source/Telemetry/PostHog/Configuration.ts"() {
    "use strict";
    DefaultKey = "";
    DefaultHost = "https://eu.i.posthog.com";
    DefaultBatchWindowMilliseconds = 3e3;
    DefaultBatchMaximum = 50;
    ReadString = /* @__PURE__ */ __name((Key, Fallback) => {
      const Value = process.env[Key];
      return Value && Value.length > 0 ? Value : Fallback;
    }, "ReadString");
    ReadBoolean = /* @__PURE__ */ __name((Key, Fallback) => {
      const Value = process.env[Key];
      if (Value === void 0) return Fallback;
      return !["false", "0", "off", ""].includes(Value.toLowerCase());
    }, "ReadBoolean");
    ReadNumber = /* @__PURE__ */ __name((Key, Fallback) => {
      const Value = process.env[Key];
      const Parsed = Value ? Number(Value) : Number.NaN;
      return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
    }, "ReadNumber");
    TelemetryCaptureEnabled = ReadBoolean("Capture", true);
    Configuration_default = /* @__PURE__ */ __name(() => ({
      Key: ReadString("Authorize", DefaultKey),
      Host: ReadString("Beam", DefaultHost),
      Enabled: ReadBoolean("Report", true) && TelemetryCaptureEnabled && process.env["NODE_ENV"] !== "production",
      BatchWindowMilliseconds: ReadNumber(
        "Buffer",
        DefaultBatchWindowMilliseconds
      ),
      BatchMaximum: ReadNumber("Batch", DefaultBatchMaximum),
      DistinctIdentifierSeed: process.env["Brand"] ?? "",
      OTLPEndpoint: ReadString("OTLPEndpoint", "http://127.0.0.1:4318"),
      OTLPEnabled: ReadBoolean("OTLPEnabled", true) && TelemetryCaptureEnabled && process.env["NODE_ENV"] !== "production"
    }), "default");
  }
});

// Source/Telemetry/OTLPBridge.ts
var OTLPBridge_exports = {};
__export(OTLPBridge_exports, {
  CaptureSpan: () => CaptureSpan,
  TraceIdentifier: () => TraceIdentifier,
  WithSpan: () => WithSpan,
  default: () => OTLPBridge_default
});
import * as NodeHttp from "node:http";
import * as NodeHttps from "node:https";
var Configuration, OTLPAvailable, RandomHex, TraceIdentifierCached, TraceIdentifier, NowNano, CaptureSpan, WithSpan, OTLPBridge_default;
var init_OTLPBridge = __esm({
  "Source/Telemetry/OTLPBridge.ts"() {
    "use strict";
    init_Configuration();
    Configuration = Configuration_default();
    OTLPAvailable = Configuration.OTLPEnabled;
    RandomHex = /* @__PURE__ */ __name((Bytes) => {
      let Output = "";
      for (let Index = 0; Index < Bytes; Index = Index + 1) {
        Output = Output + Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
      }
      return Output;
    }, "RandomHex");
    TraceIdentifier = /* @__PURE__ */ __name(() => {
      if (!TraceIdentifierCached) TraceIdentifierCached = RandomHex(16);
      return TraceIdentifierCached;
    }, "TraceIdentifier");
    NowNano = /* @__PURE__ */ __name(() => {
      const Hr = process.hrtime();
      return BigInt(Hr[0]) * 1000000000n + BigInt(Hr[1]);
    }, "NowNano");
    CaptureSpan = /* @__PURE__ */ __name((Name, StartNano, EndNano, Attributes = []) => {
      if (process.env["NODE_ENV"] === "production") return;
      if (!OTLPAvailable) return;
      const SpanIdentifier = RandomHex(8);
      const TraceIdentifierResolved = TraceIdentifier();
      const StatusCode = Name.includes("error") ? 2 : 1;
      const AttributesPayload = Attributes.map(([Key, Value]) => ({
        key: Key,
        value: { stringValue: Value }
      }));
      const Payload = JSON.stringify({
        resourceSpans: [
          {
            resource: {
              attributes: [
                {
                  key: "service.name",
                  value: { stringValue: "land-editor-cocoon" }
                },
                {
                  key: "service.version",
                  value: { stringValue: "0.0.1" }
                },
                {
                  key: "land.tier",
                  value: { stringValue: "cocoon" }
                }
              ]
            },
            scopeSpans: [
              {
                scope: { name: "land.cocoon", version: "1.0.0" },
                spans: [
                  {
                    traceId: TraceIdentifierResolved,
                    spanId: SpanIdentifier,
                    name: Name,
                    kind: 1,
                    startTimeUnixNano: StartNano.toString(),
                    endTimeUnixNano: EndNano.toString(),
                    attributes: AttributesPayload,
                    status: { code: StatusCode }
                  }
                ]
              }
            ]
          }
        ]
      });
      try {
        const Address = new URL("/v1/traces", Configuration.OTLPEndpoint);
        const HttpModule = Address.protocol === "https:" ? NodeHttps : NodeHttp;
        const Request = HttpModule.request(
          {
            method: "POST",
            hostname: Address.hostname,
            port: Address.port || (Address.protocol === "https:" ? 443 : 80),
            path: Address.pathname,
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(Payload)
            },
            timeout: 200
          },
          (Response) => {
            if (Response.statusCode === void 0 || Response.statusCode >= 300) {
              OTLPAvailable = false;
            }
            Response.resume();
          }
        );
        Request.on("error", () => {
          OTLPAvailable = false;
        });
        Request.on("timeout", () => {
          Request.destroy();
        });
        Request.write(Payload);
        Request.end();
      } catch {
        OTLPAvailable = false;
      }
    }, "CaptureSpan");
    WithSpan = /* @__PURE__ */ __name(async (Name, Body, Attributes = []) => {
      const StartNano = NowNano();
      try {
        const Output = await Body();
        const EndNano = NowNano();
        CaptureSpan(Name, StartNano, EndNano, Attributes);
        return Output;
      } catch (Error2) {
        const EndNano = NowNano();
        CaptureSpan(`${Name}:error`, StartNano, EndNano, [
          ...Attributes,
          ["error", String(Error2.message ?? Error2)]
        ]);
        throw Error2;
      }
    }, "WithSpan");
    OTLPBridge_default = { CaptureSpan, TraceIdentifier, WithSpan };
  }
});

// Source/Telemetry/PostHog/Event.ts
var BaseProperties, Create, CurrentTraceIdentifier, SetTraceIdentifier, Enrich, Event_default;
var init_Event = __esm({
  "Source/Telemetry/PostHog/Event.ts"() {
    "use strict";
    BaseProperties = {
      $app: "land-editor",
      $app_version: "0.0.1",
      $build_mode: "debug",
      $component: "cocoon",
      $tier: "cocoon",
      $lib: "cocoon-posthog-bridge"
    };
    Create = /* @__PURE__ */ __name((Name, Properties = {}) => ({
      Name,
      Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      Properties
    }), "Create");
    SetTraceIdentifier = /* @__PURE__ */ __name((Identifier) => {
      CurrentTraceIdentifier = Identifier;
    }, "SetTraceIdentifier");
    Enrich = /* @__PURE__ */ __name((Properties) => ({
      ...Properties,
      ...BaseProperties,
      $node_version: process.version,
      ...CurrentTraceIdentifier ? { $trace_id: CurrentTraceIdentifier } : {}
    }), "Enrich");
    Event_default = { Create, Enrich, SetTraceIdentifier };
  }
});

// Source/Telemetry/PostHog/Transport.ts
import * as NodeHttps2 from "node:https";
var RequestTimeoutMilliseconds, Transport_default;
var init_Transport = __esm({
  "Source/Telemetry/PostHog/Transport.ts"() {
    "use strict";
    init_Event();
    RequestTimeoutMilliseconds = 5e3;
    Transport_default = /* @__PURE__ */ __name((Host, Key, DistinctIdentifier2, Batch) => {
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
        const Request = NodeHttps2.request(
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
  }
});

// Source/Telemetry/PostHog/Buffer.ts
var Buffer_default;
var init_Buffer = __esm({
  "Source/Telemetry/PostHog/Buffer.ts"() {
    "use strict";
    init_Event();
    init_Transport();
    Buffer_default = /* @__PURE__ */ __name((Config, DistinctIdentifier2) => {
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
  }
});

// Source/Telemetry/PostHog/Identifier.ts
var Identifier_default;
var init_Identifier = __esm({
  "Source/Telemetry/PostHog/Identifier.ts"() {
    "use strict";
    Identifier_default = /* @__PURE__ */ __name((Seed) => {
      if (Seed.length > 0) return Seed;
      const Username = process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";
      return `land-dev-${Username}`;
    }, "default");
  }
});

// Source/Telemetry/Post/Hog/Bridge.ts
var Bridge_exports = {};
__export(Bridge_exports, {
  CaptureEntryLoad: () => CaptureEntryLoad,
  CaptureEntryLoaded: () => CaptureEntryLoaded,
  CaptureError: () => CaptureError,
  CaptureEvent: () => CaptureEvent,
  CaptureHandler: () => CaptureHandler,
  CaptureStub: () => CaptureStub,
  Initialize: () => Initialize,
  default: () => Bridge_default
});
var Configuration2, DistinctIdentifier, ActiveBuffer, Initialized, Buffered, CaptureEvent, CaptureError, Initialize, CaptureHandler, CaptureStub, CaptureEntryLoad, CaptureEntryLoaded, Bridge_default;
var init_Bridge = __esm({
  "Source/Telemetry/Post/Hog/Bridge.ts"() {
    "use strict";
    init_Buffer();
    init_Configuration();
    init_Event();
    init_Identifier();
    Configuration2 = Configuration_default();
    DistinctIdentifier = Identifier_default(
      Configuration2.DistinctIdentifierSeed
    );
    Initialized = false;
    Buffered = /* @__PURE__ */ __name(() => {
      if (!Configuration2.Enabled) return void 0;
      if (!ActiveBuffer) {
        ActiveBuffer = Buffer_default(Configuration2, DistinctIdentifier);
      }
      return ActiveBuffer;
    }, "Buffered");
    CaptureEvent = /* @__PURE__ */ __name((Name, Properties = {}) => {
      if (process.env["NODE_ENV"] === "production") return;
      try {
        Buffered()?.Enqueue(Name, Properties);
      } catch {
      }
    }, "CaptureEvent");
    CaptureError = /* @__PURE__ */ __name((Tag, Message, Extra = {}) => {
      if (process.env["NODE_ENV"] === "production") return;
      const Bridge = Buffered();
      if (!Bridge) return;
      Bridge.Enqueue("land:cocoon:error", {
        ...Extra,
        error_tag: Tag,
        error_message: Message
      });
      Bridge.Drain();
    }, "CaptureError");
    Initialize = /* @__PURE__ */ __name(() => {
      if (process.env["NODE_ENV"] === "production") return;
      if (Initialized) return;
      Initialized = true;
      const Bridge = Buffered();
      if (!Bridge) return;
      if (process.env["NODE_ENV"] !== "production") {
        void Promise.resolve().then(() => (init_OTLPBridge(), OTLPBridge_exports)).then((OTLP) => {
          Event_default.SetTraceIdentifier(OTLP.TraceIdentifier());
        }).catch(() => {
        });
      }
      const OnExit = /* @__PURE__ */ __name(() => Bridge.Drain(), "OnExit");
      process.once("exit", OnExit);
      process.once("SIGINT", OnExit);
      process.once("SIGTERM", OnExit);
      CaptureEvent("land:cocoon:session:start", {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        node_version: process.version
      });
    }, "Initialize");
    CaptureHandler = /* @__PURE__ */ __name((Feature, DurationMs, Ok) => {
      CaptureEvent("land:cocoon:handler:complete", {
        feature: Feature,
        duration_ms: DurationMs,
        ok: Ok
      });
    }, "CaptureHandler");
    CaptureStub = /* @__PURE__ */ __name((Feature, Reason) => {
      CaptureEvent("land:cocoon:stub:active", {
        feature: Feature,
        reason: Reason
      });
    }, "CaptureStub");
    CaptureEntryLoad = /* @__PURE__ */ __name((Entry) => {
      CaptureEvent("land:cocoon:entry:load", { entry: Entry });
    }, "CaptureEntryLoad");
    CaptureEntryLoaded = /* @__PURE__ */ __name((Entry, DurationMs) => {
      CaptureEvent("land:cocoon:entry:loaded", {
        entry: Entry,
        duration_ms: DurationMs
      });
    }, "CaptureEntryLoaded");
    Bridge_default = {
      CaptureEvent,
      CaptureError,
      CaptureHandler,
      CaptureStub,
      CaptureEntryLoad,
      CaptureEntryLoaded,
      Initialize
    };
  }
});

// Source/Services/Language/Provider/Registry.ts
var Callbacks = /* @__PURE__ */ new Map();
function Register(Handle, Provider) {
  Callbacks.set(Handle, Provider);
}
__name(Register, "Register");
function Unregister(Handle) {
  Callbacks.delete(Handle);
}
__name(Unregister, "Unregister");
function Get(Handle) {
  const Provider = Callbacks.get(Handle);
  if (process.env.Trace) {
    console.warn(
      `[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`
    );
  }
  return Provider;
}
__name(Get, "Get");
var NextHandle = 1e4;
function RegisterAutoHandle(Provider) {
  const Handle = NextHandle++;
  Callbacks.set(Handle, Provider);
  return Handle;
}
__name(RegisterAutoHandle, "RegisterAutoHandle");
function NextProviderHandle() {
  return NextHandle++;
}
__name(NextProviderHandle, "NextProviderHandle");
var Commands = /* @__PURE__ */ new Map();
function RegisterCommand(CommandId, Callback) {
  Commands.set(CommandId, Callback);
}
__name(RegisterCommand, "RegisterCommand");
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
__name(HasCommand, "HasCommand");
function ExecuteCommand(CommandId, ...Args) {
  const Handler = Commands.get(CommandId);
  if (Handler) return Handler(...Args);
  return void 0;
}
__name(ExecuteCommand, "ExecuteCommand");
function UnregisterCommand(CommandId) {
  Commands.delete(CommandId);
}
__name(UnregisterCommand, "UnregisterCommand");
function ListCommands() {
  return Array.from(Commands.keys());
}
__name(ListCommands, "ListCommands");
function ListHandles() {
  return Array.from(Callbacks.keys());
}
__name(ListHandles, "ListHandles");

// Source/Utility/Land/Fix/Log.ts
var Mode = process.env["Mend"] ?? "short";
var Enabled = Mode !== "off";
var Long = Mode === "long";
var DebugEnabled = Long;
var AllowList = (() => {
  const Raw = process.env["Mend"];
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
var Log_default = LandFixLog;

// Source/Services/Handler/VscodeAPI/Wrap/Namespace/With/Heuristics.ts
import { Effect } from "effect";
var LazyCaptureEvent;
if (process.env["NODE_ENV"] !== "production") {
  void Promise.resolve().then(() => (init_Bridge(), Bridge_exports)).then((Module) => {
    LazyCaptureEvent = Module.CaptureEvent;
  }).catch(() => {
  });
}
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
  Log_default.InfoOnce(
    "VSCODE-API-GAP",
    Key,
    `${NamespaceName}.${Property} \u2192 ${Kind}`
  );
  if (process.env["NODE_ENV"] !== "production") {
    LazyCaptureEvent?.("land:cocoon:vscode_api_gap", {
      namespace: NamespaceName,
      method: Property,
      kind: Kind
    });
  }
}, "RecordGap");
var BuildHeuristicMethod = /* @__PURE__ */ __name((NamespaceName, Property, Heuristic) => (...Arguments) => {
  const SpanName = `vscode.${NamespaceName}.${Property}`;
  const Program = Effect.gen(function* () {
    yield* Effect.sync(() => {
      try {
        RecordGap(NamespaceName, Property, Heuristic.Kind);
      } catch {
      }
    });
    try {
      return Heuristic.Produce(...Arguments);
    } catch {
      switch (Heuristic.Kind) {
        case "trust":
          return true;
        case "event":
          return NoopDisposable;
        case "register":
          return NoopDisposable;
        case "bool-check":
          return false;
        case "factory":
        case "default":
        default:
          return void 0;
      }
    }
  }).pipe(
    Effect.withSpan(SpanName, {
      attributes: {
        "vscode.namespace": NamespaceName,
        "vscode.method": Property,
        "vscode.heuristic": Heuristic.Kind
      }
    })
  );
  try {
    return Heuristic.Sync ? Effect.runSync(Program) : Effect.runPromise(Program);
  } catch {
    switch (Heuristic.Kind) {
      case "trust":
        return Heuristic.Sync ? true : Promise.resolve(true);
      case "event":
      case "register":
        return NoopDisposable;
      case "bool-check":
        return Heuristic.Sync ? false : Promise.resolve(false);
      default:
        return Heuristic.Sync ? void 0 : Promise.resolve(void 0);
    }
  }
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
var Heuristics_default = WrapNamespaceWithHeuristics;

// Source/Services/Handler/VscodeAPI/Wrap/Scm/Namespace.ts
var WrapScmNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("scm", Concrete), "WrapScmNamespace");
var Namespace_default = WrapScmNamespace;

// Source/Services/Handler/VscodeAPI/Scm/Namespace.ts
var ScmTraceEnabled = typeof process !== "undefined" && typeof process.env["Trace"] === "string";
var ScmTrace = /* @__PURE__ */ __name((Message) => {
  if (!ScmTraceEnabled) return;
  try {
    process.stdout.write(`[DEV:SCM-TRACE] ${Message}
`);
  } catch {
  }
}, "ScmTrace");
var SanitizeResourceState = /* @__PURE__ */ __name((Raw) => {
  if (Raw == null || typeof Raw !== "object") return Raw;
  const Source = Raw;
  const Out = {};
  if (Source["resourceUri"] !== void 0)
    Out["resourceUri"] = Source["resourceUri"];
  const Command = Source["command"];
  if (Command && typeof Command === "object") {
    const C = Command;
    Out["command"] = {
      title: C["title"] ?? "",
      command: C["command"] ?? "",
      tooltip: C["tooltip"] ?? ""
    };
  }
  const Decorations = Source["decorations"];
  if (Decorations && typeof Decorations === "object") {
    const D = Decorations;
    const SafeDecorations = {};
    for (const Key of [
      "strikeThrough",
      "faded",
      "tooltip",
      "iconPath",
      "light",
      "dark"
    ]) {
      if (D[Key] !== void 0) SafeDecorations[Key] = D[Key];
    }
    Out["decorations"] = SafeDecorations;
  }
  if (Source["contextValue"] !== void 0)
    Out["contextValue"] = Source["contextValue"];
  return Out;
}, "SanitizeResourceState");
var CreateScmNamespace = /* @__PURE__ */ __name((Context) => Namespace_default({
  createSourceControl: /* @__PURE__ */ __name((Id, Label, RootUri) => {
    const Handle = NextProviderHandle();
    const RootUriDescription = RootUri == null ? "null" : typeof RootUri === "string" ? `string("${RootUri}")` : typeof RootUri === "object" ? `object(scheme=${RootUri?.scheme ?? "<missing>"})` : typeof RootUri;
    ScmTrace(
      `createSourceControl id="${Id}" label="${Label}" rootUri=${RootUriDescription} handle=${Handle}`
    );
    const RootUriShape = RootUri && typeof RootUri === "object" ? {
      scheme: RootUri?.scheme ?? "",
      authority: RootUri?.authority ?? "",
      path: RootUri?.path ?? "",
      query: RootUri?.query ?? "",
      fragment: RootUri?.fragment ?? ""
    } : RootUri;
    const ProviderReady = Context.SendToMountain(
      "register_scm_provider",
      {
        handle: Handle,
        id: Id,
        label: Label,
        rootUri: RootUriShape,
        extensionId: ""
      }
    ).then(
      () => ScmTrace(
        `register_scm_provider ack id="${Id}" handle=${Handle}`
      )
    ).catch((Error2) => {
      const Message = Error2 instanceof globalThis.Error ? Error2.message : String(Error2);
      ScmTrace(
        `register_scm_provider FAILED id="${Id}" handle=${Handle} error=${Message}`
      );
    });
    const Groups = /* @__PURE__ */ new Map();
    const ConcreteSourceControl = {
      id: Id,
      label: Label,
      rootUri: RootUri,
      inputBox: Heuristics_default(
        `scm.sourceControl[${Id}].inputBox`,
        {
          value: "",
          placeholder: "",
          enabled: true,
          visible: true
        }
      ),
      createResourceGroup: /* @__PURE__ */ __name((GroupId, GroupLabel) => {
        const GroupHandle = `${Handle}/${GroupId}`;
        Groups.set(GroupId, {
          label: GroupLabel,
          resourceStates: []
        });
        ScmTrace(
          `createResourceGroup scm="${Id}" handle=${Handle} groupId="${GroupId}" groupLabel="${GroupLabel}"`
        );
        const GroupReady = ProviderReady.then(
          () => Context.SendToMountain("register_scm_resource_group", {
            scmHandle: Handle,
            groupHandle: GroupHandle,
            groupId: GroupId,
            label: GroupLabel
          })
        ).catch((Error2) => {
          ScmTrace(
            `register_scm_resource_group FAILED scm=${Handle} group="${GroupId}" error=${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
          );
        });
        const State = { resourceStates: [] };
        return {
          id: GroupId,
          label: GroupLabel,
          get resourceStates() {
            return State.resourceStates;
          },
          set resourceStates(Value) {
            State.resourceStates = Value;
            ScmTrace(
              `update_scm_group scm=${Handle} group="${GroupId}" resourceCount=${Array.isArray(Value) ? Value.length : 0}`
            );
            const SanitizedStates = Array.isArray(Value) ? Value.map((Raw) => SanitizeResourceState(Raw)) : [];
            GroupReady.then(
              () => Context.SendToMountain("update_scm_group", {
                scmHandle: Handle,
                groupHandle: GroupHandle,
                resourceStates: SanitizedStates
              })
            ).catch((Error2) => {
              ScmTrace(
                `update_scm_group FAILED scm=${Handle} group="${GroupId}" error=${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
              );
            });
          },
          dispose: /* @__PURE__ */ __name(() => {
            GroupReady.then(
              () => Context.SendToMountain(
                "unregister_scm_resource_group",
                {
                  scmHandle: Handle,
                  groupHandle: GroupHandle
                }
              )
            ).catch(() => {
            });
            Groups.delete(GroupId);
          }, "dispose")
        };
      }, "createResourceGroup"),
      statusBarCommands: [],
      count: 0,
      commitTemplate: "",
      acceptInputCommand: void 0,
      quickDiffProvider: void 0,
      dispose: /* @__PURE__ */ __name(() => {
        ProviderReady.then(
          () => Context.SendToMountain("unregister_scm_provider", {
            handle: Handle
          })
        ).catch(() => {
        });
        Groups.clear();
      }, "dispose")
    };
    return Heuristics_default(
      `scm.sourceControl[${Id}]`,
      ConcreteSourceControl
    );
  }, "createSourceControl"),
  inputBox: { value: "" }
}), "CreateScmNamespace");
var Namespace_default2 = CreateScmNamespace;
export {
  Namespace_default2 as default
};
//# sourceMappingURL=Namespace.js.map
