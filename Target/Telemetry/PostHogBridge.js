var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

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
  Key: ReadString("Authorize", DefaultKey),
  Host: ReadString("Beam", DefaultHost),
  Enabled: ReadBoolean("Report", true) && process.env["NODE_ENV"] !== "production",
  BatchWindowMilliseconds: ReadNumber(
    "Buffer",
    DefaultBatchWindowMilliseconds
  ),
  BatchMaximum: ReadNumber(
    "Batch",
    DefaultBatchMaximum
  ),
  DistinctIdentifierSeed: process.env["Brand"] ?? ""
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
export {
  CaptureError,
  CaptureEvent,
  Initialize,
  PostHogBridge_default as default
};
//# sourceMappingURL=PostHogBridge.js.map
