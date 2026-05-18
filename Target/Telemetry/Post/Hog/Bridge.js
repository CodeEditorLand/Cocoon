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
var BaseProperties = {
  $app: "fiddee",
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
var CurrentTraceIdentifier;
var SetTraceIdentifier = /* @__PURE__ */ __name((Identifier) => {
  CurrentTraceIdentifier = Identifier;
}, "SetTraceIdentifier");
var Enrich = /* @__PURE__ */ __name((Properties) => ({
  ...Properties,
  ...BaseProperties,
  $node_version: process.version,
  ...CurrentTraceIdentifier ? { $trace_id: CurrentTraceIdentifier } : {}
}), "Enrich");
var Event_default = { Create, Enrich, SetTraceIdentifier };

// Source/Telemetry/PostHog/Transport.ts
import * as NodeHttps2 from "node:https";
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

// Source/Telemetry/PostHog/Identifier.ts
var Identifier_default = /* @__PURE__ */ __name((Seed) => {
  if (Seed.length > 0) return Seed;
  const Username = process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";
  return `land-dev-${Username}`;
}, "default");

// Source/Telemetry/Post/Hog/Bridge.ts
init_Configuration();
var Configuration2 = Configuration_default();
var DistinctIdentifier = Identifier_default(
  Configuration2.DistinctIdentifierSeed
);
var ActiveBuffer;
var Initialized = false;
var Buffered = /* @__PURE__ */ __name(() => {
  if (!Configuration2.Enabled) return void 0;
  if (!ActiveBuffer) {
    ActiveBuffer = Buffer_default(Configuration2, DistinctIdentifier);
  }
  return ActiveBuffer;
}, "Buffered");
var CaptureEvent = /* @__PURE__ */ __name((Name, Properties = {}) => {
  if (process.env["NODE_ENV"] === "production") return;
  try {
    Buffered()?.Enqueue(Name, Properties);
  } catch {
  }
}, "CaptureEvent");
var CaptureError = /* @__PURE__ */ __name((Tag, Message, Extra = {}) => {
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
var Initialize = /* @__PURE__ */ __name(() => {
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
var CaptureHandler = /* @__PURE__ */ __name((Feature, DurationMs, Ok) => {
  CaptureEvent("land:cocoon:handler:complete", {
    feature: Feature,
    duration_ms: DurationMs,
    ok: Ok
  });
}, "CaptureHandler");
var CaptureStub = /* @__PURE__ */ __name((Feature, Reason) => {
  CaptureEvent("land:cocoon:stub:active", {
    feature: Feature,
    reason: Reason
  });
}, "CaptureStub");
var CaptureEntryLoad = /* @__PURE__ */ __name((Entry) => {
  CaptureEvent("land:cocoon:entry:load", { entry: Entry });
}, "CaptureEntryLoad");
var CaptureEntryLoaded = /* @__PURE__ */ __name((Entry, DurationMs) => {
  CaptureEvent("land:cocoon:entry:loaded", {
    entry: Entry,
    duration_ms: DurationMs
  });
}, "CaptureEntryLoaded");
var Bridge_default = {
  CaptureEvent,
  CaptureError,
  CaptureHandler,
  CaptureStub,
  CaptureEntryLoad,
  CaptureEntryLoaded,
  Initialize
};
export {
  CaptureEntryLoad,
  CaptureEntryLoaded,
  CaptureError,
  CaptureEvent,
  CaptureHandler,
  CaptureStub,
  Initialize,
  Bridge_default as default
};
//# sourceMappingURL=Bridge.js.map
